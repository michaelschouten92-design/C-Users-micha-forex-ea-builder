/**
 * Pure Authority Readiness evaluator.
 *
 * Determines whether a user's authority is initialized — i.e., the user
 * has both strategies (projects) and live EA instances. If either is
 * missing, the heartbeat engine must PAUSE (fail-closed).
 *
 * Design rules:
 * - Pure function: no I/O, no side effects, deterministic.
 * - Fail-closed: ready is true ONLY when all conditions are met.
 * - Reason codes are stable enums — never concatenated messages.
 */

export type AuthorityBlockReason = "NO_STRATEGIES" | "NO_LIVE_INSTANCE";

export interface AuthorityReadinessResult {
  ready: boolean;
  reasons: AuthorityBlockReason[];
}

export function evaluateAuthorityReadiness(
  strategyCount: number,
  liveEACount: number
): AuthorityReadinessResult {
  const reasons: AuthorityBlockReason[] = [];

  if (strategyCount === 0) {
    reasons.push("NO_STRATEGIES");
  }
  if (liveEACount === 0) {
    reasons.push("NO_LIVE_INSTANCE");
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}
