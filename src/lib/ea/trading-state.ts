import { logger } from "@/lib/logger";

const log = logger.child({ module: "ea-trading-state" });

export type EATradingState = "TRADING" | "PAUSED";
export type EAAlertState = "ACTIVE" | "DISABLED";

const VALID_TRANSITIONS: Record<EATradingState, readonly EATradingState[]> = {
  TRADING: ["PAUSED"],
  PAUSED: ["TRADING"],
};

const VALID_ALERT_TRANSITIONS: Record<EAAlertState, readonly EAAlertState[]> = {
  ACTIVE: ["DISABLED"],
  DISABLED: ["ACTIVE"],
};

/**
 * Log a trading state transition with structured fields.
 * Warns (never blocks) on unexpected transitions.
 */
export function logTradingStateTransition(
  instanceId: string,
  from: EATradingState,
  to: EATradingState,
  reason: string
): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    log.warn({ instanceId, from, to, reason }, "Unexpected trading state transition");
  }
  log.info({ instanceId, from, to, reason }, "Trading state transition");
}

/**
 * Log an alert state transition with structured fields.
 * Warns (never blocks) on unexpected transitions.
 */
export function logAlertStateTransition(
  configId: string,
  from: EAAlertState,
  to: EAAlertState,
  reason: string
): void {
  const allowed = VALID_ALERT_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    log.warn({ configId, from, to, reason }, "Unexpected alert state transition");
  }
  log.info({ configId, from, to, reason }, "Alert state transition");
}
