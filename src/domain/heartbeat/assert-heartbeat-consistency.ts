/**
 * Control Consistency Guard — read-side integrity check.
 *
 * Verifies that a heartbeat decision is logically consistent with the
 * current lifecycle + operator + suppression state. If an inconsistency
 * is detected, the decision is overridden to PAUSE.
 *
 * Design rules:
 * - Pure function: no I/O, no side effects, deterministic.
 * - May only PRESERVE or DOWNGRADE to PAUSE — never escalate to STOP.
 * - Does not replace decideHeartbeatAction — this is a cross-check layer.
 */

import type { HeartbeatInput, HeartbeatDecision, HeartbeatAction } from "./decide-heartbeat-action";

const INCONSISTENCY: HeartbeatDecision = {
  action: "PAUSE",
  reasonCode: "CONTROL_INCONSISTENCY_DETECTED",
};

/** Lifecycle states that grant live trading authority. Must match decideHeartbeatAction. */
const LIVE_STATES: ReadonlySet<string> = new Set(["LIVE_MONITORING", "EDGE_AT_RISK"]);

/**
 * Determine the expected action given the current state.
 * Follows the same strict priority order as decideHeartbeatAction.
 */
function expectedAction(input: HeartbeatInput): HeartbeatAction {
  if (!input.authorityReady) return "PAUSE";
  if (input.operatorHold === "HALTED") return "STOP";
  if (input.lifecycleState === "INVALIDATED") return "STOP";
  if (!LIVE_STATES.has(input.lifecycleState!)) return "PAUSE";
  if (input.lifecycleState === "EDGE_AT_RISK") return "PAUSE";
  if (input.monitoringSuppressedUntil && input.now < input.monitoringSuppressedUntil)
    return "PAUSE";
  return "RUN";
}

/**
 * Assert that a heartbeat decision is consistent with the input state.
 *
 * Returns the original decision if consistent, or a corrected
 * PAUSE + CONTROL_INCONSISTENCY_DETECTED if not.
 *
 * Invariant: this function never returns STOP. If the expected action
 * is STOP but the decision disagrees, the guard downgrades to PAUSE
 * (it cannot autonomously escalate severity).
 */
export function assertHeartbeatConsistency(
  input: HeartbeatInput | null,
  decision: HeartbeatDecision
): HeartbeatDecision {
  // No state to cross-check — only PAUSE is safe without input
  if (!input || input.lifecycleState === null) {
    return decision.action === "PAUSE" ? decision : INCONSISTENCY;
  }

  const expected = expectedAction(input);

  // Decision matches expectation — consistent
  if (decision.action === expected) {
    return decision;
  }

  // Inconsistency detected — downgrade to PAUSE (never escalate to STOP)
  return INCONSISTENCY;
}
