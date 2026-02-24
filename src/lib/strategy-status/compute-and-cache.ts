/**
 * Strategy Status — compute, cache, and emit events.
 *
 * Gathers all inputs from the database, calls resolveStrategyStatus(),
 * and updates the cached value on LiveEAInstance if it changed.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { triggerAlert } from "@/lib/alerts";
import { logAuditEvent } from "@/lib/audit";
import {
  resolveStrategyStatus,
  resolveStatusConfidence,
  type StrategyStatus,
  type StatusInput,
  type StatusConfidence,
} from "./resolver";

const log = logger.child({ module: "strategy-status" });

/** Transitions that are expected progress and should not generate alerts */
const SILENT_TRANSITIONS = new Set([
  "TESTING→MONITORING",
  "TESTING→VERIFIED",
  "MONITORING→VERIFIED",
]);

export interface ComputeResult {
  status: StrategyStatus;
  confidence: StatusConfidence;
  changed: boolean;
}

/**
 * Compute the strategy status for an instance, cache it, and fire events if changed.
 */
export async function computeAndCacheStatus(instanceId: string): Promise<ComputeResult> {
  // 1. Load instance
  const instance = await prisma.liveEAInstance.findUnique({
    where: { id: instanceId },
    select: {
      id: true,
      userId: true,
      eaName: true,
      status: true,
      lastHeartbeat: true,
      createdAt: true,
      deletedAt: true,
      lifecyclePhase: true,
      strategyVersionId: true,
      strategyStatus: true,
    },
  });

  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  // 2. Load latest health snapshot
  const healthSnapshot = await prisma.healthSnapshot.findFirst({
    where: { instanceId },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      driftDetected: true,
      tradesSampled: true,
      windowDays: true,
      confidenceLower: true,
      confidenceUpper: true,
    },
  });

  // 3. Check if baseline exists
  let hasBaseline = false;
  if (instance.strategyVersionId) {
    const baseline = await prisma.backtestBaseline.findUnique({
      where: { strategyVersionId: instance.strategyVersionId },
      select: { id: true },
    });
    hasBaseline = baseline !== null;
  }

  // 4. Check chain integrity (has at least one event)
  let chainVerified = false;
  const trackState = await prisma.trackRecordState.findUnique({
    where: { instanceId },
    select: { lastSeqNo: true },
  });
  if (trackState && trackState.lastSeqNo > 0) {
    chainVerified = true;
  }

  // 5. Build input and resolve
  const statusInput: StatusInput = {
    eaStatus: instance.status as "ONLINE" | "OFFLINE" | "ERROR",
    lastHeartbeat: instance.lastHeartbeat,
    createdAt: instance.createdAt,
    deletedAt: instance.deletedAt,
    lifecyclePhase: instance.lifecyclePhase as "NEW" | "PROVING" | "PROVEN" | "RETIRED",
    healthStatus: healthSnapshot
      ? (healthSnapshot.status as "HEALTHY" | "WARNING" | "DEGRADED" | "INSUFFICIENT_DATA")
      : null,
    driftDetected: healthSnapshot?.driftDetected ?? false,
    hasBaseline,
    chainVerified,
  };

  const newStatus = resolveStrategyStatus(statusInput);

  // Compute confidence
  const confidence = healthSnapshot
    ? resolveStatusConfidence({
        tradeCount: healthSnapshot.tradesSampled,
        windowDays: healthSnapshot.windowDays,
        confidenceInterval: {
          lower: healthSnapshot.confidenceLower,
          upper: healthSnapshot.confidenceUpper,
        },
      })
    : ("LOW" as StatusConfidence);

  // 6. Check if changed
  const previousStatus = instance.strategyStatus as StrategyStatus | null;
  const changed = previousStatus !== newStatus;

  if (changed) {
    // Update database
    await prisma.liveEAInstance.update({
      where: { id: instanceId },
      data: {
        strategyStatus: newStatus,
        strategyStatusUpdatedAt: new Date(),
      },
    });

    log.info({ instanceId, from: previousStatus, to: newStatus }, "Strategy status changed");

    // Fire alert for meaningful transitions
    const transitionKey = `${previousStatus}→${newStatus}`;
    if (!SILENT_TRANSITIONS.has(transitionKey)) {
      triggerAlert({
        userId: instance.userId,
        instanceId,
        eaName: instance.eaName,
        alertType: "STRATEGY_STATUS_CHANGE",
        message: `Strategy status changed from ${previousStatus} to ${newStatus}`,
      }).catch((err) => {
        log.error({ err, instanceId }, "Failed to trigger strategy status change alert");
      });
    }

    // Audit log
    logAuditEvent({
      userId: instance.userId,
      eventType: "live.strategy_status_change",
      resourceType: "live_ea_instance",
      resourceId: instanceId,
      metadata: {
        from: previousStatus,
        to: newStatus,
        confidence,
      },
    }).catch((err) => {
      log.error({ err, instanceId }, "Failed to log strategy status change audit event");
    });
  }

  return { status: newStatus, confidence, changed };
}
