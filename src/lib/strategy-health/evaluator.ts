/**
 * Health evaluator — orchestrates live metric collection, baseline loading, scoring, and storage.
 *
 * This module is intentionally informational only. It evaluates health, detects drift,
 * and persists HealthSnapshots. It does NOT mutate lifecycle phase, lifecycle state,
 * or governance. Lifecycle transitions are owned by the monitoring system
 * (run-monitoring.ts) and the lifecycle API.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { triggerAlert } from "@/lib/alerts";
import { emitControlLayerAlert } from "@/lib/alerts/control-layer-alerts";
import { computeEdgeProjection, generateEdgeDecayAlert } from "@/domain/monitoring/edge-projection";
import { collectLiveMetrics } from "./collector";
import { computeHealth } from "./scorer";
import { HEALTH_EVAL_COOLDOWN_MS, HEALTH_STALE_THRESHOLD_MS } from "./thresholds";
import type { BaselineMetrics, HealthResult, HealthStatusType } from "./types";
import { computeAndCacheStatus } from "@/lib/strategy-status/compute-and-cache";
import * as Sentry from "@sentry/nextjs";

/** Number of recent snapshots to consider for EWMA trend computation */
const EWMA_WINDOW = 10;
/** EWMA decay factor: higher = more responsive to recent changes (0–1) */
const EWMA_ALPHA = 0.3;
/** Score difference threshold to call it "improving" or "declining" */
const TREND_THRESHOLD = 0.03;
/** Number of consecutive DEGRADED snapshots before escalation alert */
const ESCALATION_THRESHOLD = 3;

/**
 * Compute score trend by comparing current score to EWMA of recent history.
 * Returns "improving" | "stable" | "declining" | null (if no history).
 */
function computeScoreTrend(
  currentScore: number,
  recentSnapshots: Array<{ overallScore: number }>
): string | null {
  if (recentSnapshots.length < 2) return null;

  // Compute EWMA from oldest to newest (recentSnapshots is desc order, so reverse)
  const scores = recentSnapshots.map((s) => s.overallScore).reverse();
  let ewma = scores[0];
  for (let i = 1; i < scores.length; i++) {
    ewma = EWMA_ALPHA * scores[i] + (1 - EWMA_ALPHA) * ewma;
  }

  const diff = currentScore - ewma;
  if (diff > TREND_THRESHOLD) return "improving";
  if (diff < -TREND_THRESHOLD) return "declining";
  return "stable";
}

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
      balance: true,
      peakScore: true,
      baselineDecay: true,
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
      // Apply decay factor to account for natural strategy degradation
      // A live strategy shouldn't be expected to exactly match backtest returns
      const returnPct30d =
        days > 0 && Math.abs(r) > 0.001
          ? (Math.pow(1 + r / 100, 30 / days) - 1) * 100 * instance.baselineDecay
          : 0;

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

  // Load recent snapshots for hysteresis, EWMA trend, and escalation
  const recentSnapshots = await prisma.healthSnapshot.findMany({
    where: { instanceId },
    orderBy: { createdAt: "desc" },
    take: EWMA_WINDOW,
    select: { status: true, overallScore: true, expectancy: true, createdAt: true },
  });

  const previousSnapshot = recentSnapshots[0] ?? null;

  // Compute health scores (with hysteresis from previous status)
  const previousStatus = previousSnapshot
    ? (previousSnapshot.status as HealthStatusType)
    : undefined;
  const result = computeHealth(liveMetrics, baseline, previousStatus);

  // EWMA trend: compare current score to exponentially weighted average of recent scores
  const scoreTrend = computeScoreTrend(result.overallScore, recentSnapshots);

  // Rolling expectancy: avg PnL per trade as % of balance
  const expectancy =
    liveMetrics.tradeReturns.length > 0
      ? liveMetrics.tradeReturns.reduce((a, b) => a + b, 0) / liveMetrics.tradeReturns.length
      : null;

  // Count consecutive DEGRADED snapshots for severity escalation
  let consecutiveDegraded = 0;
  for (const snap of recentSnapshots) {
    if (snap.status === "DEGRADED") consecutiveDegraded++;
    else break;
  }

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

      // Control-layer alert: deduplicated, delivers via email/telegram/slack/webhook
      emitControlLayerAlert(prisma, {
        userId: instance.userId,
        instanceId,
        alertType: "HEALTH_DEGRADED",
        reasons: [`Health score dropped to ${scoreStr}% — edge performance needs attention`],
      }).catch((err) => {
        logger.error({ err, instanceId }, "Failed to emit HEALTH_DEGRADED control-layer alert");
        Sentry.captureException(err, { extra: { instanceId, alertType: "HEALTH_DEGRADED" } });
      });

      // Legacy EAAlertConfig path (fires if user has matching alert configs)
      triggerAlert({
        userId: instance.userId,
        instanceId,
        eaName: instance.eaName,
        alertType: "HEALTH_DEGRADED",
        message:
          `Strategy edge at risk — health score dropped to ${scoreStr}%. ` +
          `Review your live performance metrics.`,
      }).catch((err) => {
        logger.error({ err, instanceId }, "Failed to trigger health degradation alert");
        Sentry.captureException(err, { extra: { instanceId, alertType: "HEALTH_DEGRADED" } });
      });
    }
  }

  // Severity escalation: fire critical alert after 3+ consecutive DEGRADED snapshots
  if (
    result.status === "DEGRADED" &&
    consecutiveDegraded >= ESCALATION_THRESHOLD &&
    consecutiveDegraded % ESCALATION_THRESHOLD === 0
  ) {
    const scoreStr = Math.round(result.overallScore * 100);

    // Control-layer alert: deduplicated, delivers via email/telegram/slack/webhook
    emitControlLayerAlert(prisma, {
      userId: instance.userId,
      instanceId,
      alertType: "HEALTH_CRITICAL",
      reasons: [
        `Edge at risk for ${consecutiveDegraded + 1} consecutive evaluations (score: ${scoreStr}%)`,
      ],
    }).catch((err) => {
      logger.error({ err, instanceId }, "Failed to emit HEALTH_CRITICAL control-layer alert");
      Sentry.captureException(err, { extra: { instanceId, alertType: "HEALTH_CRITICAL" } });
    });

    // Legacy EAAlertConfig path (fires if user has matching alert configs)
    triggerAlert({
      userId: instance.userId,
      instanceId,
      eaName: instance.eaName,
      alertType: "HEALTH_CRITICAL",
      message:
        `Strategy edge has been at risk for ${consecutiveDegraded + 1} consecutive evaluations ` +
        `(score: ${scoreStr}%). Consider pausing live trading.`,
    }).catch((err) => {
      logger.error({ err, instanceId }, "Failed to trigger health critical alert");
      Sentry.captureException(err, { extra: { instanceId, alertType: "HEALTH_CRITICAL" } });
    });
  }

  // Track peak score (informational only — no lifecycle mutation)
  if (result.overallScore > instance.peakScore) {
    await prisma.liveEAInstance.update({
      where: { id: instanceId },
      data: { peakScore: result.overallScore, peakScoreAt: new Date() },
    });
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
      primaryDriver: result.primaryDriver,
      scoreTrend,
      expectancy,
    },
  });

  // ── Predictive edge decay alert ──────────────────────────
  // After snapshot creation, check if edge is declining and alert proactively.
  if (recentSnapshots.length >= 5) {
    try {
      const projectionInput = recentSnapshots.map((s) => ({
        overallScore: s.overallScore,
        expectancy: s.expectancy ?? null,
        createdAt: s.createdAt.toISOString(),
      }));
      const projection = computeEdgeProjection(
        projectionInput,
        instance.balance ?? 0,
        expectancy ?? null
      );
      const alertMsg = generateEdgeDecayAlert(projection, instance.eaName, result.overallScore);
      if (alertMsg) {
        emitControlLayerAlert(prisma, {
          userId: instance.userId,
          instanceId,
          alertType: "EDGE_DECAY_WARNING",
          reasons: [alertMsg],
        }).catch((err) => {
          logger.error({ err, instanceId }, "Failed to emit EDGE_DECAY_WARNING alert");
        });
      }
    } catch (err) {
      logger.warn({ err, instanceId }, "Edge projection computation failed (non-critical)");
    }
  }

  // Recompute unified strategy status after health evaluation
  await computeAndCacheStatus(instanceId).catch((err) => {
    logger.error({ err, instanceId }, "Failed to compute strategy status after health eval");
    Sentry.captureException(err, {
      extra: { instanceId, context: "post-health-eval status compute" },
    });
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
    } catch (err) {
      logger.error({ err, instanceId }, "Initial health evaluation failed");
      Sentry.captureException(err, { extra: { instanceId, context: "initial-health-eval" } });
      return { snapshot: null, fresh: false };
    }
  }

  const elapsed = Date.now() - latest.createdAt.getTime();
  if (elapsed > HEALTH_STALE_THRESHOLD_MS) {
    // Stale — recalculate in background (don't block response)
    evaluateHealth(instanceId).catch((err) => {
      logger.error({ err, instanceId }, "Background health evaluation failed");
      Sentry.captureException(err, { extra: { instanceId, context: "background-health-eval" } });
    });
    return { snapshot: latest, fresh: false };
  }

  return { snapshot: latest, fresh: true };
}
