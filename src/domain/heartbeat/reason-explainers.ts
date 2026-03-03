/**
 * Deterministic mapping from heartbeat reason codes to human-readable
 * explanation strings. Used by the Ops UI — never sent to EA clients.
 *
 * Reason codes are stable enum strings defined in HEARTBEAT_CONTRACT.md §5.
 * This mapping must stay aligned with those codes.
 */

const REASON_EXPLAINERS: Record<string, string> = {
  OK: "All governance checks passed \u2014 execution authorized.",
  STRATEGY_HALTED: "Operator HALT is active \u2014 execution must STOP.",
  STRATEGY_INVALIDATED: "Strategy invalidated \u2014 execution must STOP.",
  MONITORING_AT_RISK: "Edge at risk \u2014 execution should PAUSE.",
  MONITORING_SUPPRESSED: "Monitoring suppression window active \u2014 execution should PAUSE.",
  NO_INSTANCE: "No live instance found \u2014 default PAUSE.",
  CONFIG_UNAVAILABLE: "Configuration unavailable \u2014 default PAUSE.",
  COMPUTATION_FAILED: "System uncertainty \u2014 default PAUSE.",
  NO_HEARTBEAT_PROOF: "No recorded heartbeat decisions yet \u2014 default PAUSE.",
  CONTROL_INCONSISTENCY_DETECTED:
    "Control consistency guard detected a mismatch between state and decision \u2014 forced PAUSE.",
  AUTHORITY_UNINITIALIZED:
    "Authority not initialized \u2014 user lacks strategies or live instances \u2014 default PAUSE.",
};

const FALLBACK_EXPLANATION = "Unknown reason code \u2014 default PAUSE.";

/**
 * Returns a human-readable explanation for a heartbeat reason code.
 * Never returns raw errors or internal details.
 */
export function explainReasonCode(reasonCode: string): string {
  return REASON_EXPLAINERS[reasonCode] ?? FALLBACK_EXPLANATION;
}

/** All known reason codes with explanations (for testing completeness). */
export const KNOWN_REASON_CODES = Object.keys(REASON_EXPLAINERS);
