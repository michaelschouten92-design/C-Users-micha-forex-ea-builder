import { computeVerdict } from "./compute-verdict";
import type {
  VerificationInput,
  VerificationResult,
  TradeRecord,
  BacktestParameters,
} from "./types";
import type { StrategyLifecycleState } from "@/lib/strategy-lifecycle/transitions";
import { applyLifecycleTransition } from "@/lib/strategy-lifecycle/lifecycle-transition";
import { appendVerificationRunProof } from "@/lib/proof/events";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "verification" });

/** Pure domain value object — replaces boolean flags for lifecycle decisions. */
export type TransitionDecision =
  | {
      kind: "TRANSITION";
      from: StrategyLifecycleState;
      to: StrategyLifecycleState;
      reason: string;
    }
  | { kind: "NO_TRANSITION"; reason: string };

export interface RunVerificationParams {
  strategyId: string;
  strategyVersion: number;
  currentLifecycleState: StrategyLifecycleState;
  tradeHistory: TradeRecord[];
  backtestParameters: BacktestParameters;
  intermediateResults?: VerificationInput["intermediateResults"];
}

export interface RunVerificationResult {
  verdictResult: VerificationResult;
  lifecycleState: StrategyLifecycleState;
  decision: TransitionDecision;
}

/**
 * Pure decision: should we transition the lifecycle?
 * No IO — safe to call before persistence.
 */
function decideTransition(
  verdict: VerificationResult["verdict"],
  currentState: StrategyLifecycleState
): TransitionDecision {
  if (verdict === "READY" && currentState === "BACKTESTED") {
    return {
      kind: "TRANSITION",
      from: "BACKTESTED",
      to: "VERIFIED",
      reason: "verification_passed",
    };
  }

  if (verdict !== "READY") {
    return { kind: "NO_TRANSITION", reason: `verdict_${verdict.toLowerCase()}` };
  }

  return {
    kind: "NO_TRANSITION",
    reason: `state_not_eligible:${currentState}`,
  };
}

/**
 * Orchestrates verdict computation, proof persistence, and lifecycle transition.
 *
 * Ordering guarantee: the lifecycle transition result
 * (decision.kind="TRANSITION", lifecycleState="VERIFIED") is only
 * constructed AFTER proof ledger persistence succeeds. If persistence
 * fails, no transitioned result ever exists — the error propagates
 * to the caller (fail-closed).
 */
export async function runVerification(
  params: RunVerificationParams
): Promise<RunVerificationResult> {
  const {
    strategyId,
    strategyVersion,
    currentLifecycleState,
    tradeHistory,
    backtestParameters,
    intermediateResults,
  } = params;

  const input: VerificationInput = {
    strategyId,
    strategyVersion,
    tradeHistory,
    backtestParameters,
    intermediateResults,
  };

  const verdictResult = computeVerdict(input);
  const decision = decideTransition(verdictResult.verdict, currentLifecycleState);

  // Persist proof events BEFORE finalizing the lifecycle result.
  // The transitioned result must never exist unless the audit trail is intact.
  const recordId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    await appendVerificationRunProof({
      strategyId,
      recordId,
      runCompletedPayload: {
        eventType: "VERIFICATION_RUN_COMPLETED",
        strategyId,
        strategyVersion,
        verdict: verdictResult.verdict,
        reasonCodes: verdictResult.reasonCodes,
        thresholdsHash: verdictResult.thresholdsUsed.thresholdsHash,
        recordId,
        timestamp,
      },
      passedPayload:
        decision.kind === "TRANSITION"
          ? {
              eventType: "VERIFICATION_PASSED",
              strategyId,
              strategyVersion,
              recordId,
              timestamp,
            }
          : undefined,
    });
  } catch (err) {
    log.error(
      { err, recordId, timestamp, strategyId, strategyVersion, decision },
      "Failed to persist verification events"
    );
    throw err;
  }

  // Lifecycle transition only applied after proof persistence succeeded.
  if (decision.kind === "TRANSITION") {
    const newState = applyLifecycleTransition(
      strategyId,
      strategyVersion,
      decision.from,
      decision.to,
      decision.reason
    );
    return { verdictResult, lifecycleState: newState, decision };
  }

  return { verdictResult, lifecycleState: currentLifecycleState, decision };
}
