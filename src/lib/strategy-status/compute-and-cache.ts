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
import * as Sentry from "@sentry/nextjs";
import {
  resolveStrategyStatus,
  resolveStatusConfidence,
  type StrategyStatus,
  type StatusInput,
  type StatusConfidence,
  type StatusResult,
} from "./resolver";

const log = logger.child({ module: "strategy-status" });

/** Transitions that are expected progress and should not generate alerts */
const SILENT_TRANSITIONS = new Set([
  "TESTING→MONITORING",
  "TESTING→CONSISTENT",
  "MONITORING→CONSISTENT",
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

  const statusResult = resolveStrategyStatus(statusInput);
  const newStatus = statusResult.status;

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

    // Flapping detection: suppress alerts if status is flip-flopping
    const isFlapping = await detectFlapping(instanceId);

    // Fire alert for meaningful transitions (unless flapping)
    const transitionKey = `${previousStatus}→${newStatus}`;
    if (!SILENT_TRANSITIONS.has(transitionKey) && !isFlapping) {
      triggerAlert({
        userId: instance.userId,
        instanceId,
        eaName: instance.eaName,
        alertType: "STRATEGY_STATUS_CHANGE",
        message: `Strategy status changed from ${previousStatus} to ${newStatus}`,
      }).catch((err) => {
        log.error({ err, instanceId }, "Failed to trigger strategy status change alert");
        Sentry.captureException(err, {
          extra: { instanceId, alertType: "STRATEGY_STATUS_CHANGE" },
        });
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
      Sentry.captureException(err, { extra: { instanceId, context: "strategy-status-audit-log" } });
    });
  }

  return { status: newStatus, confidence, changed };
}

const FLAPPING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const FLAPPING_THRESHOLD = 6; // 6+ transitions in window = flapping

/**
 * Detect status flapping: if the same status pair flips back and forth
 * 3+ times in 24 hours, suppress alerts to avoid noise.
 */
async function detectFlapping(instanceId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - FLAPPING_WINDOW_MS);
  const recentChanges = await prisma.auditLog.findMany({
    where: {
      resourceId: instanceId,
      eventType: "live.strategy_status_change",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    take: FLAPPING_THRESHOLD,
    select: { metadata: true },
  });

  if (recentChanges.length < FLAPPING_THRESHOLD) return false;

  // Count transition pairs — if A→B and B→A both appear 3+ times, it's flapping
  const pairCounts = new Map<string, number>();
  for (const change of recentChanges) {
    const meta = change.metadata as { from?: string; to?: string } | null;
    if (meta?.from && meta?.to) {
      const pair = [meta.from, meta.to].sort().join("↔");
      pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
    }
  }

  for (const count of pairCounts.values()) {
    if (count >= 3) {
      log.warn({ instanceId }, "Status flapping detected — suppressing alerts");
      return true;
    }
  }

  return false;
}
