/**
 * Monitoring trigger — called after LIVE trade ingest to schedule a monitoring run.
 *
 * Instance-first: accepts instanceId as the primary key.
 * Resolves strategyId from instance → strategyVersion → strategyIdentity.
 *
 * NOT fire-and-forget: runs synchronously, persists MonitoringRun row.
 * Respects DB-based per-instance cooldown.
 */

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { runMonitoring, isMonitoringCooldownExpired } from "./run-monitoring";
import type { RunMonitoringResult } from "./run-monitoring";

const log = logger.child({ service: "monitoring-trigger" });

export interface TriggerMonitoringResult {
  triggered: boolean;
  reason: string;
  result?: RunMonitoringResult;
}

/**
 * Trigger a monitoring run for a specific instance after LIVE ingest.
 *
 * Checks:
 *   1. Operator hold (skip if HALTED)
 *   2. Suppression window (skip if active)
 *   3. Per-instance cooldown (DB-based, 5 min default)
 *
 * Returns a result describing what happened (triggered or skipped + reason).
 * Errors from the monitoring run propagate — caller decides error handling.
 */
export async function triggerMonitoringAfterIngest(
  instanceId: string,
  now: Date = new Date()
): Promise<TriggerMonitoringResult> {
  // Load instance with monitoring-relevant fields
  const instance = await prisma.liveEAInstance.findUnique({
    where: { id: instanceId },
    select: {
      operatorHold: true,
      monitoringSuppressedUntil: true,
      strategyVersion: {
        select: {
          strategyIdentity: { select: { strategyId: true } },
        },
      },
    },
  });

  if (!instance) {
    log.warn({ instanceId }, "Monitoring skipped: instance not found");
    return { triggered: false, reason: "INSTANCE_NOT_FOUND" };
  }

  // Resolve strategyId through canonical chain
  const strategyId = instance.strategyVersion?.strategyIdentity?.strategyId;
  if (!strategyId) {
    log.info({ instanceId }, "Monitoring skipped: no strategy linked");
    return { triggered: false, reason: "NO_STRATEGY_LINKED" };
  }

  // Check operator hold — skip monitoring entirely when HALTED
  if (instance.operatorHold === "HALTED") {
    log.info({ instanceId, strategyId }, "Monitoring skipped: operator hold HALTED");
    return { triggered: false, reason: "OPERATOR_HALTED" };
  }

  // Check suppression window (set after override apply)
  if (instance.monitoringSuppressedUntil && now < instance.monitoringSuppressedUntil) {
    log.info(
      { instanceId, strategyId, suppressedUntil: instance.monitoringSuppressedUntil },
      "Monitoring skipped: suppression window active"
    );
    return { triggered: false, reason: "MONITORING_SUPPRESSED" };
  }

  // Check per-instance cooldown
  const cooldownExpired = await isMonitoringCooldownExpired(instanceId);
  if (!cooldownExpired) {
    log.debug({ instanceId, strategyId }, "Monitoring run skipped: cooldown active");
    return { triggered: false, reason: "COOLDOWN_ACTIVE" };
  }

  log.info({ instanceId, strategyId }, "Triggering monitoring run after LIVE ingest");

  const result = await runMonitoring({
    instanceId,
    strategyId,
    source: "live_ingest",
  });

  return { triggered: true, reason: "OK", result };
}
