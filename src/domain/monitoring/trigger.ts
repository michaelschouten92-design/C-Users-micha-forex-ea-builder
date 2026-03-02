/**
 * Monitoring trigger — called after LIVE trade ingest to schedule a monitoring run.
 *
 * NOT fire-and-forget: runs synchronously, persists MonitoringRun row.
 * Respects DB-based per-strategy cooldown.
 */

import { logger } from "@/lib/logger";
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
  strategyId: string
): Promise<TriggerMonitoringResult> {
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
