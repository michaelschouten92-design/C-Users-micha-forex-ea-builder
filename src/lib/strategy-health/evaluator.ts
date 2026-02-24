/**
 * Health evaluator — orchestrates live metric collection, baseline loading, scoring, and storage.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { triggerAlert } from "@/lib/alerts";
import { collectLiveMetrics } from "./collector";
import { computeHealth } from "./scorer";
import { HEALTH_EVAL_COOLDOWN_MS, HEALTH_STALE_THRESHOLD_MS } from "./thresholds";
import type { BaselineMetrics, HealthResult, HealthStatusType } from "./types";

/**
 * Evaluate health for an instance, rate-limited to once per hour.
 * Called fire-and-forget after TRADE_CLOSE events.
 */
export async function evaluateHealthIfDue(instanceId: string): Promise<void> {
  // Check rate limit: skip if last snapshot is less than COOLDOWN_MS old
  const lastSnapshot = await prisma.healthSnapshot.findFirst({
    where: { instanceId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (lastSnapshot) {
    const elapsed = Date.now() - lastSnapshot.createdAt.getTime();
    if (elapsed < HEALTH_EVAL_COOLDOWN_MS) return;
  }

  await evaluateHealth(instanceId);
}

/**
 * Full health evaluation: collect metrics, load baseline, score, store snapshot.
 * Returns the health result (also stored in DB).
 */
export async function evaluateHealth(instanceId: string): Promise<HealthResult> {
  // Load instance with strategy version info + user context for alerts
  const instance = await prisma.liveEAInstance.findUnique({
    where: { id: instanceId },
    select: {
      strategyVersionId: true,
      status: true,
      userId: true,
      eaName: true,
    },
  });

  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  // Don't evaluate during OFFLINE status
  if (instance.status === "OFFLINE") {
    throw new Error("Instance is offline, skipping health evaluation");
  }

  // Collect live metrics (30-day rolling window)
  const liveMetrics = await collectLiveMetrics(instanceId, 30);

  // Load baseline if available
  let baseline: BaselineMetrics | null = null;
  if (instance.strategyVersionId) {
    const backtestBaseline = await prisma.backtestBaseline.findUnique({
      where: { strategyVersionId: instance.strategyVersionId },
    });

    if (backtestBaseline) {
      // Normalize baseline return to 30-day window using geometric compounding.
      // Arithmetic scaling (r/days*30) overestimates for large returns.
      const days = backtestBaseline.backtestDurationDays;
      const r = backtestBaseline.netReturnPct;
      const returnPct30d =
        days > 0 && Math.abs(r) > 0.001 ? (Math.pow(1 + r / 100, 30 / days) - 1) * 100 : 0;

      // Scale baseline DD to 30-day equivalent.
      // Max drawdown scales roughly with sqrt(observation period).
      // A 10% DD over 180 days ≈ 10% * sqrt(30/180) ≈ 4.1% over 30 days.
      // This removes the systematic bias where 30-day live DD always looks
      // better than the full-backtest baseline DD.
      const baselineDD = backtestBaseline.maxDrawdownPct;
      const scaledDD = days > 30 ? baselineDD * Math.sqrt(30 / days) : baselineDD;

      baseline = {
        returnPct: returnPct30d,
        maxDrawdownPct: scaledDD,
        winRate: backtestBaseline.winRate,
        tradesPerDay: backtestBaseline.avgTradesPerDay,
        sharpeRatio: backtestBaseline.sharpeRatio,
        volatility: backtestBaseline.volatility,
      };
    }
  }

  // Load previous snapshot for hysteresis and transition detection
  const previousSnapshot = await prisma.healthSnapshot.findFirst({
    where: { instanceId },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });

  // Compute health scores (with hysteresis from previous status)
  const previousStatus = previousSnapshot
    ? (previousSnapshot.status as HealthStatusType)
    : undefined;
  const result = computeHealth(liveMetrics, baseline, previousStatus);

  // Detect status transitions and fire alerts on degradation
  if (previousSnapshot && previousSnapshot.status !== result.status) {
    const prev = previousSnapshot.status as HealthStatusType;
    logger.info(
      { instanceId, from: prev, to: result.status, score: result.overallScore },
      "Health status changed"
    );

    // Fire alert when health degrades (not on improvement or INSUFFICIENT_DATA)
    const isDegrading =
      (prev === "HEALTHY" && (result.status === "WARNING" || result.status === "DEGRADED")) ||
      (prev === "WARNING" && result.status === "DEGRADED");

    if (isDegrading) {
      const scoreStr = Math.round(result.overallScore * 100);
      triggerAlert({
        userId: instance.userId,
        instanceId,
        eaName: instance.eaName,
        alertType: "HEALTH_DEGRADED",
        message:
          `Strategy health changed from ${prev} to ${result.status} (score: ${scoreStr}%). ` +
          `Check your live performance metrics.`,
      }).catch((err) => {
        logger.error({ err, instanceId }, "Failed to trigger health degradation alert");
      });
    }
  }

  // Store snapshot
  await prisma.healthSnapshot.create({
    data: {
      instanceId,
      strategyVersionId: instance.strategyVersionId,
      status: result.status,
      overallScore: result.overallScore,
      returnScore: result.metrics.return.score,
      volatilityScore: result.metrics.volatility.score,
      drawdownScore: result.metrics.drawdown.score,
      winRateScore: result.metrics.winRate.score,
      tradeFrequencyScore: result.metrics.tradeFrequency.score,
      liveReturnPct: liveMetrics.returnPct,
      liveVolatility: liveMetrics.volatility,
      liveMaxDrawdownPct: liveMetrics.maxDrawdownPct,
      liveWinRate: liveMetrics.winRate,
      liveTradesPerDay: liveMetrics.tradesPerDay,
      baselineReturnPct: baseline?.returnPct ?? null,
      baselineMaxDDPct: baseline?.maxDrawdownPct ?? null,
      baselineWinRate: baseline?.winRate ?? null,
      baselineTradesPerDay: baseline?.tradesPerDay ?? null,
      tradesSampled: liveMetrics.totalTrades,
      windowDays: liveMetrics.windowDays,
      confidenceLower: result.confidenceInterval.lower,
      confidenceUpper: result.confidenceInterval.upper,
      driftCusumValue: result.drift.cusumValue,
      driftDetected: result.drift.driftDetected,
      driftSeverity: result.drift.driftSeverity,
    },
  });

  return result;
}

/**
 * Get the latest health snapshot, recalculating if stale.
 */
export async function getHealthWithFreshness(instanceId: string): Promise<{
  snapshot: Awaited<ReturnType<typeof prisma.healthSnapshot.findFirst>>;
  fresh: boolean;
}> {
  const latest = await prisma.healthSnapshot.findFirst({
    where: { instanceId },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) {
    // No snapshot exists — try to evaluate now
    try {
      await evaluateHealth(instanceId);
      const fresh = await prisma.healthSnapshot.findFirst({
        where: { instanceId },
        orderBy: { createdAt: "desc" },
      });
      return { snapshot: fresh, fresh: true };
    } catch {
      return { snapshot: null, fresh: false };
    }
  }

  const elapsed = Date.now() - latest.createdAt.getTime();
  if (elapsed > HEALTH_STALE_THRESHOLD_MS) {
    // Stale — recalculate in background (don't block response)
    evaluateHealth(instanceId).catch((err) => {
      logger.error({ err, instanceId }, "Background health evaluation failed");
    });
    return { snapshot: latest, fresh: false };
  }

  return { snapshot: latest, fresh: true };
}
