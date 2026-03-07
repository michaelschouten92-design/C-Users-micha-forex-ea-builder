/**
 * Monitoring trigger — called after LIVE trade ingest to schedule a monitoring run.
 *
 * NOT fire-and-forget: runs synchronously, persists MonitoringRun row.
 * Respects DB-based per-strategy cooldown.
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
 * Trigger a monitoring run for a strategy after LIVE ingest.
 *
 * Checks:
 *   1. Per-strategy cooldown (DB-based, 5 min default)
 *
 * Returns a result describing what happened (triggered or skipped + reason).
 * Errors from the monitoring run propagate — caller decides error handling.
 */
export async function triggerMonitoringAfterIngest(
  strategyId: string,
  now: Date = new Date()
): Promise<TriggerMonitoringResult> {
  // Check operator hold — skip monitoring entirely when HALTED
  const instance = await prisma.liveEAInstance.findFirst({
    where: { strategyVersion: { strategyIdentity: { strategyId } }, deletedAt: null },
    select: { operatorHold: true, monitoringSuppressedUntil: true },
  });
  if (instance?.operatorHold === "HALTED") {
    log.info({ strategyId }, "Monitoring skipped: operator hold HALTED");
    return { triggered: false, reason: "OPERATOR_HALTED" };
  }

  // Check suppression window (set after override apply)
  if (instance?.monitoringSuppressedUntil && now < instance.monitoringSuppressedUntil) {
    log.info(
      { strategyId, suppressedUntil: instance.monitoringSuppressedUntil },
      "Monitoring skipped: suppression window active"
    );
    return { triggered: false, reason: "MONITORING_SUPPRESSED" };
  }

  // Check cooldown
  const cooldownExpired = await isMonitoringCooldownExpired(strategyId);
  if (!cooldownExpired) {
    log.debug({ strategyId }, "Monitoring run skipped: cooldown active");
    return { triggered: false, reason: "COOLDOWN_ACTIVE" };
  }

  log.info({ strategyId }, "Triggering monitoring run after LIVE ingest");

  const result = await runMonitoring({
    strategyId,
    source: "live_ingest",
  });

  return { triggered: true, reason: "OK", result };
}
