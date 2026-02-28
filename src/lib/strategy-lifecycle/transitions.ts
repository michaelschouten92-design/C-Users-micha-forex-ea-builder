export type StrategyLifecycleState =
  | "DRAFT"
  | "BACKTESTED"
  | "VERIFIED"
  | "LIVE_MONITORING"
  | "EDGE_AT_RISK"
  | "INVALIDATED";

/**
 * Allowed transitions per FOUNDATION.md §5.2.
 * Recovery path EDGE_AT_RISK → LIVE_MONITORING is explicit per CONTRIBUTING.md §3.5.
 * INVALIDATED is terminal — restarting requires a new strategy version.
 */
export const VALID_LIFECYCLE_TRANSITIONS: Record<
  StrategyLifecycleState,
  readonly StrategyLifecycleState[]
> = {
  DRAFT: ["BACKTESTED"],
  BACKTESTED: ["VERIFIED", "DRAFT"],
  VERIFIED: ["LIVE_MONITORING"],
  LIVE_MONITORING: ["EDGE_AT_RISK", "INVALIDATED"],
  EDGE_AT_RISK: ["LIVE_MONITORING", "INVALIDATED"],
  INVALIDATED: [],
};

/**
 * Guard function for strategy lifecycle transitions.
 *
 * Unlike `transitionTradingState()` which warns on invalid transitions,
 * this function **throws** because lifecycle transitions are driven by
 * internal systems where an invalid transition signals a bug.
 *
 * Pure, synchronous, no side effects. Callers handle DB updates and logging.
 */
export function transitionLifecycle(
  from: StrategyLifecycleState,
  to: StrategyLifecycleState
): void {
  const allowed = VALID_LIFECYCLE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid lifecycle transition: ${from} → ${to}`);
  }
}
