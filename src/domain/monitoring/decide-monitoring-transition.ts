/**
 * Pure decision function for monitoring-driven lifecycle transitions.
 *
 * Determines whether a monitoring verdict should trigger a lifecycle
 * state transition. No IO, no side effects, fully deterministic.
 *
 * Transition table:
 *   LIVE_MONITORING + AT_RISK       → EDGE_AT_RISK
 *   LIVE_MONITORING + INVALIDATED   → NO_TRANSITION (must pass through EDGE_AT_RISK)
 *   LIVE_MONITORING + HEALTHY       → NO_TRANSITION
 *   EDGE_AT_RISK   + INVALIDATED   → INVALIDATED
 *   EDGE_AT_RISK   + AT_RISK       → NO_TRANSITION (already at risk)
 *   EDGE_AT_RISK   + HEALTHY (≥N)  → LIVE_MONITORING (recovery)
 *   EDGE_AT_RISK   + HEALTHY (<N)  → NO_TRANSITION (recovering)
 *   Other states   + any           → NO_TRANSITION (state not eligible)
 */

import type { MonitoringVerdict } from "./types";

export interface TransitionInput {
  currentLifecycleState: string;
  monitoringVerdict: MonitoringVerdict;
  reasons: string[];
  consecutiveHealthyRuns: number;
  recoveryRunsRequired: number;
}

export type TransitionDecision =
  | { type: "NO_TRANSITION"; reason: string }
  | { type: "TRANSITION"; from: string; to: string; reason: string; proofEventType: string };

const ELIGIBLE_STATES = new Set(["LIVE_MONITORING", "EDGE_AT_RISK"]);

export function decideMonitoringTransition(input: TransitionInput): TransitionDecision {
  const {
    currentLifecycleState,
    monitoringVerdict,
    reasons,
    consecutiveHealthyRuns,
    recoveryRunsRequired,
  } = input;

  if (!ELIGIBLE_STATES.has(currentLifecycleState)) {
    return { type: "NO_TRANSITION", reason: "state_not_eligible" };
  }

  if (currentLifecycleState === "LIVE_MONITORING") {
    if (monitoringVerdict === "AT_RISK") {
      return {
        type: "TRANSITION",
        from: "LIVE_MONITORING",
        to: "EDGE_AT_RISK",
        reason: `Monitoring verdict AT_RISK: ${reasons.join(", ")}`,
        proofEventType: "STRATEGY_EDGE_AT_RISK",
      };
    }
    if (monitoringVerdict === "INVALIDATED") {
      return { type: "NO_TRANSITION", reason: "must_pass_through_edge_at_risk" };
    }
    // HEALTHY
    return { type: "NO_TRANSITION", reason: "healthy" };
  }

  // EDGE_AT_RISK
  if (monitoringVerdict === "INVALIDATED") {
    return {
      type: "TRANSITION",
      from: "EDGE_AT_RISK",
      to: "INVALIDATED",
      reason: `Monitoring verdict INVALIDATED: ${reasons.join(", ")}`,
      proofEventType: "STRATEGY_INVALIDATED",
    };
  }

  if (monitoringVerdict === "AT_RISK") {
    return { type: "NO_TRANSITION", reason: "already_at_risk" };
  }

  // HEALTHY — check recovery threshold
  if (consecutiveHealthyRuns >= recoveryRunsRequired) {
    return {
      type: "TRANSITION",
      from: "EDGE_AT_RISK",
      to: "LIVE_MONITORING",
      reason: `Recovered after ${consecutiveHealthyRuns} consecutive healthy runs`,
      proofEventType: "STRATEGY_RECOVERED",
    };
  }

  return { type: "NO_TRANSITION", reason: "recovering" };
}
