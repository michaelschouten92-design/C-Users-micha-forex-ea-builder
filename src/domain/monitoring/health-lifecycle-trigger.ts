/**
 * Health-based lifecycle trigger — converts sustained health degradation
 * into a LIVE_MONITORING → EDGE_AT_RISK lifecycle transition.
 *
 * Owned by the monitoring/governance side, NOT by the health evaluator.
 * Reads persisted HealthSnapshots as input — no scoring or drift computation.
 *
 * Rule: transition fires only when ALL of these hold:
 *   1. Instance lifecycle state is exactly LIVE_MONITORING
 *   2. The last N snapshots ALL have status = DEGRADED
 *   3. The last N snapshots ALL have driftDetected = true
 *   4. The last N snapshots ALL have tradesSampled >= MIN_TRADES
 *
 * N = CONSECUTIVE_DEGRADED_REQUIRED (3, matches CUSUM_DRIFT_CONSECUTIVE_SNAPSHOTS)
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { performLifecycleTransitionInTx } from "@/lib/strategy-lifecycle/transition-service";
import { appendProofEventInTx } from "@/lib/proof/events";
import { randomUUID } from "crypto";
import { MONITORING } from "./constants";
import * as Sentry from "@sentry/nextjs";

const log = logger.child({ module: "health-lifecycle-trigger" });

/** Number of consecutive qualifying snapshots required to trigger transition */
const CONSECUTIVE_DEGRADED_REQUIRED = MONITORING.CUSUM_DRIFT_CONSECUTIVE_SNAPSHOTS;

/** Minimum trades sampled per snapshot to consider evidence sufficient */
const MIN_TRADES_FOR_TRIGGER = 10;

/**
 * Evaluate whether a health-driven lifecycle transition should fire.
 *
 * Called fire-and-forget after health evaluation on TRADE_CLOSE.
 * Safe to call repeatedly — guards against duplicate transitions
 * by checking current lifecycle state before acting.
 */
export async function evaluateHealthLifecycleTrigger(instanceId: string): Promise<void> {
  // 1. Check current lifecycle state — only LIVE_MONITORING is eligible
  const instance = await prisma.liveEAInstance.findUnique({
    where: { id: instanceId },
    select: {
      lifecycleState: true,
      strategyVersion: {
        select: { strategyIdentity: { select: { strategyId: true } } },
      },
    },
  });

  if (!instance || instance.lifecycleState !== "LIVE_MONITORING") {
    return; // Not eligible — no-op
  }

  // 2. Load the most recent N snapshots
  const snapshots = await prisma.healthSnapshot.findMany({
    where: { instanceId },
    orderBy: { createdAt: "desc" },
    take: CONSECUTIVE_DEGRADED_REQUIRED,
    select: { status: true, driftDetected: true, tradesSampled: true },
  });

  // Need exactly N snapshots to evaluate
  if (snapshots.length < CONSECUTIVE_DEGRADED_REQUIRED) {
    return;
  }

  // 3. All N snapshots must be DEGRADED + drift detected + sufficient trades
  const allQualify = snapshots.every(
    (s) =>
      s.status === "DEGRADED" &&
      s.driftDetected === true &&
      s.tradesSampled >= MIN_TRADES_FOR_TRIGGER
  );

  if (!allQualify) {
    return;
  }

  // 4. All conditions met — perform lifecycle transition
  log.info(
    {
      instanceId,
      consecutiveDegraded: CONSECUTIVE_DEGRADED_REQUIRED,
      latestTradesSampled: snapshots[0].tradesSampled,
    },
    "Health lifecycle trigger: LIVE_MONITORING → EDGE_AT_RISK"
  );

  const strategyId = instance.strategyVersion?.strategyIdentity?.strategyId;

  try {
    await prisma.$transaction(
      async (tx) => {
        if (strategyId) {
          await appendProofEventInTx(tx, strategyId, "LIFECYCLE_EDGE_AT_RISK", {
            eventType: "LIFECYCLE_EDGE_AT_RISK",
            recordId: randomUUID(),
            strategyId,
            instanceId,
            from: "LIVE_MONITORING",
            to: "EDGE_AT_RISK",
            reason: "health_drift_degradation",
            consecutiveDegraded: CONSECUTIVE_DEGRADED_REQUIRED,
            timestamp: new Date().toISOString(),
          });
        }
        await performLifecycleTransitionInTx(
          tx,
          instanceId,
          "LIVE_MONITORING",
          "EDGE_AT_RISK",
          "health_drift_degradation",
          "monitoring"
        );
      },
      { isolationLevel: "Serializable" }
    );
  } catch (err) {
    // If the instance is no longer in LIVE_MONITORING (race condition),
    // transitionLifecycle will throw. This is expected and safe.
    log.warn(
      { err, instanceId },
      "Health lifecycle transition failed (likely state already changed)"
    );
    Sentry.captureException(err, {
      extra: { instanceId, context: "health-lifecycle-trigger" },
      level: "warning",
    });
  }
}
