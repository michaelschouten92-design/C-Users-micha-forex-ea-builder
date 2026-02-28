import { logger } from "@/lib/logger";

const log = logger.child({ module: "ea-trading-state" });

export type EATradingState = "TRADING" | "PAUSED";

const VALID_TRANSITIONS: Record<EATradingState, readonly EATradingState[]> = {
  TRADING: ["PAUSED"],
  PAUSED: ["TRADING"],
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
