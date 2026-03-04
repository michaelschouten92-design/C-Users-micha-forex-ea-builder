import type { AuthorityDecision, DecisionContext, RecentDecision } from "./load-monitor-data";

/**
 * Shape used by ControlExplanationPanel and DecisionContextPanel —
 * the union of what an AuthorityDecision and a RecentDecision can provide.
 */
export interface SelectedDecision {
  action: string;
  reasonCode: string;
  context?: DecisionContext;
}

/**
 * Deterministic, pure selection of which decision to display
 * in the ControlExplanationPanel.
 *
 * Priority:
 *   A) selectedId matches a RecentDecision → use that decision
 *   B) else → use current authority decision
 *   C) authority is null → fail-closed fallback (PAUSE / COMPUTATION_FAILED)
 *
 * Never throws. Invalid/missing selectedId silently falls back.
 */
export function selectDecision(
  recentDecisions: RecentDecision[],
  authority: AuthorityDecision | null,
  selectedId: string | undefined
): { decision: SelectedDecision; selectedId: string | null } {
  // A) URL param matches a recent decision
  if (selectedId) {
    const match = recentDecisions.find((d) => d.id === selectedId);
    if (match) {
      return {
        decision: {
          action: match.action,
          reasonCode: match.reasonCode,
          ...(match.context ? { context: match.context } : {}),
        },
        selectedId: match.id,
      };
    }
  }

  // B) Fall back to current authority
  if (authority) {
    return {
      decision: { action: authority.action, reasonCode: authority.reasonCode },
      selectedId: null,
    };
  }

  // C) Fail-closed fallback
  return {
    decision: { action: "PAUSE", reasonCode: "COMPUTATION_FAILED" },
    selectedId: null,
  };
}
