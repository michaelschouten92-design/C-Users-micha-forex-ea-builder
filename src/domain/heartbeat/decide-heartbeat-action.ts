/**
 * Pure, deterministic heartbeat decision function.
 * Returns a control signal for an EA/bot based on current DB state.
 * No side effects, no I/O — safe to call from any context.
 */

export type HeartbeatAction = "RUN" | "PAUSE" | "STOP";

export type HeartbeatReasonCode =
  | "OK"
  | "STRATEGY_HALTED"
  | "MONITORING_AT_RISK"
  | "MONITORING_SUPPRESSED"
  | "STRATEGY_INVALIDATED"
  | "NO_INSTANCE"
  | "CONFIG_UNAVAILABLE"
  | "COMPUTATION_FAILED";

export interface HeartbeatInput {
  lifecycleState: string | null;
  operatorHold: "NONE" | "HALTED" | "OVERRIDE_PENDING" | null;
  monitoringSuppressedUntil: Date | null;
  now: Date;
}

export interface HeartbeatDecision {
  action: HeartbeatAction;
  reasonCode: HeartbeatReasonCode;
}

/**
 * Decide the heartbeat action for a strategy instance.
 *
 * Rules are evaluated in strict priority order — first match wins:
 *
 *   1. NO_INSTANCE        → PAUSE  (fail-closed: no state to evaluate)
 *   2. HALTED              → STOP   (operator authority is orthogonal to lifecycle;
 *                                    an explicit HALT always produces STOP regardless
 *                                    of lifecycle state, suppression, or risk flags)
 *   3. INVALIDATED         → STOP   (terminal lifecycle state)
 *   4. EDGE_AT_RISK        → PAUSE  (monitoring detected risk)
 *   5. SUPPRESSED          → PAUSE  (monitoring temporarily suppressed)
 *   6. otherwise           → RUN    (all clear)
 *
 * Invariants:
 * - Fail-closed: when in doubt, PAUSE (never RUN on uncertainty).
 * - Operator authority is orthogonal: HALT overrides any lifecycle state.
 * - Pure function: no I/O, no side effects, deterministic output.
 * - Reason codes are stable enum strings — never concatenated error messages.
 */
export function decideHeartbeatAction(input: HeartbeatInput | null): HeartbeatDecision {
  // 1) No instance found — fail-closed without destructive STOP
  if (!input || input.lifecycleState === null) {
    return { action: "PAUSE", reasonCode: "NO_INSTANCE" };
  }

  // 2) Operator hold: HALTED overrides everything (orthogonal authority)
  if (input.operatorHold === "HALTED") {
    return { action: "STOP", reasonCode: "STRATEGY_HALTED" };
  }

  // 3) Terminal lifecycle: invalidated
  if (input.lifecycleState === "INVALIDATED") {
    return { action: "STOP", reasonCode: "STRATEGY_INVALIDATED" };
  }

  // 4) Edge at risk
  if (input.lifecycleState === "EDGE_AT_RISK") {
    return { action: "PAUSE", reasonCode: "MONITORING_AT_RISK" };
  }

  // 5) Monitoring suppressed (time-bounded)
  if (input.monitoringSuppressedUntil && input.now < input.monitoringSuppressedUntil) {
    return { action: "PAUSE", reasonCode: "MONITORING_SUPPRESSED" };
  }

  // 6) All clear
  return { action: "RUN", reasonCode: "OK" };
}
