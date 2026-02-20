/**
 * Health evaluator — orchestrates live metric collection, baseline loading, scoring, and storage.
 */

import { prisma } from "@/lib/prisma";
import { collectLiveMetrics } from "./collector";
import { computeHealth } from "./scorer";
import { HEALTH_EVAL_COOLDOWN_MS, HEALTH_STALE_THRESHOLD_MS } from "./thresholds";
import type { BaselineMetrics, HealthResult } from "./types";

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
  // Load instance with strategy version info
  const instance = await prisma.liveEAInstance.findUnique({
    where: { id: instanceId },
    select: {
      strategyVersionId: true,
      status: true,
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
      // Normalize baseline return to 30-day window
      const dailyReturnPct =
        backtestBaseline.backtestDurationDays > 0
          ? backtestBaseline.netReturnPct / backtestBaseline.backtestDurationDays
          : 0;

      baseline = {
        returnPct: dailyReturnPct * 30,
        maxDrawdownPct: backtestBaseline.maxDrawdownPct,
        winRate: backtestBaseline.winRate,
        tradesPerDay: backtestBaseline.avgTradesPerDay,
        sharpeRatio: backtestBaseline.sharpeRatio,
      };
    }
  }

  // Compute health scores
  const result = computeHealth(liveMetrics, baseline);

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
    evaluateHealth(instanceId).catch(() => {});
    return { snapshot: latest, fresh: false };
  }

  return { snapshot: latest, fresh: true };
}
