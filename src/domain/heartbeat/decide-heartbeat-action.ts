/**
 * Pure, deterministic heartbeat decision function.
 * Returns a control signal for an EA/bot based on current DB state.
 * No side effects, no I/O — safe to call from any context.
 */

import type { AuthorityBlockReason } from "./authority-readiness";

export type HeartbeatAction = "RUN" | "PAUSE" | "STOP";

export type HeartbeatReasonCode =
  | "OK"
  | "STRATEGY_HALTED"
  | "MONITORING_AT_RISK"
  | "MONITORING_SUPPRESSED"
  | "STRATEGY_INVALIDATED"
  | "NO_INSTANCE"
  | "CONFIG_UNAVAILABLE"
  | "COMPUTATION_FAILED"
  | "NO_HEARTBEAT_PROOF"
  | "CONTROL_INCONSISTENCY_DETECTED"
  | "AUTHORITY_UNINITIALIZED";

/**
 * Compile-time exhaustive check: every HeartbeatReasonCode must appear here.
 * If a new member is added to the union without updating this record,
 * TypeScript will produce a compile error.
 */
const _REASON_CODE_REGISTRY: Record<HeartbeatReasonCode, true> = {
  OK: true,
  STRATEGY_HALTED: true,
  MONITORING_AT_RISK: true,
  MONITORING_SUPPRESSED: true,
  STRATEGY_INVALIDATED: true,
  NO_INSTANCE: true,
  CONFIG_UNAVAILABLE: true,
  COMPUTATION_FAILED: true,
  NO_HEARTBEAT_PROOF: true,
  CONTROL_INCONSISTENCY_DETECTED: true,
  AUTHORITY_UNINITIALIZED: true,
};

/** Runtime-accessible list of all HeartbeatReasonCode values. */
export const ALL_HEARTBEAT_REASON_CODES = Object.keys(
  _REASON_CODE_REGISTRY
) as HeartbeatReasonCode[];

export interface HeartbeatInput {
  lifecycleState: string | null;
  operatorHold: "NONE" | "HALTED" | "OVERRIDE_PENDING" | null;
  monitoringSuppressedUntil: Date | null;
  now: Date;
  authorityReady: boolean;
  authorityReasons?: AuthorityBlockReason[];
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
 *   1. NO_INSTANCE             → PAUSE  (fail-closed: no state to evaluate)
 *   2. AUTHORITY_UNINITIALIZED → PAUSE  (user lacks strategies or live instances)
 *   3. HALTED                  → STOP   (operator authority is orthogonal to lifecycle;
 *                                        an explicit HALT always produces STOP regardless
 *                                        of lifecycle state, suppression, or risk flags)
 *   4. INVALIDATED             → STOP   (terminal lifecycle state)
 *   5. EDGE_AT_RISK            → PAUSE  (monitoring detected risk)
 *   6. SUPPRESSED              → PAUSE  (monitoring temporarily suppressed)
 *   7. otherwise               → RUN    (all clear)
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

  // 2) Authority not initialized — user lacks strategies or live instances
  if (!input.authorityReady) {
    return { action: "PAUSE", reasonCode: "AUTHORITY_UNINITIALIZED" };
  }

  // 3) Operator hold: HALTED overrides everything (orthogonal authority)
  if (input.operatorHold === "HALTED") {
    return { action: "STOP", reasonCode: "STRATEGY_HALTED" };
  }

  // 4) Terminal lifecycle: invalidated
  if (input.lifecycleState === "INVALIDATED") {
    return { action: "STOP", reasonCode: "STRATEGY_INVALIDATED" };
  }

  // 5) Edge at risk
  if (input.lifecycleState === "EDGE_AT_RISK") {
    return { action: "PAUSE", reasonCode: "MONITORING_AT_RISK" };
  }

  // 6) Monitoring suppressed (time-bounded)
  if (input.monitoringSuppressedUntil && input.now < input.monitoringSuppressedUntil) {
    return { action: "PAUSE", reasonCode: "MONITORING_SUPPRESSED" };
  }

  // 7) All clear
  return { action: "RUN", reasonCode: "OK" };
}
