import { computeVerdict } from "./compute-verdict";
import type {
  VerificationInput,
  VerificationResult,
  TradeRecord,
  BacktestParameters,
} from "./types";
import type { StrategyLifecycleState } from "@/lib/strategy-lifecycle/transitions";
import { applyLifecycleTransition } from "@/lib/strategy-lifecycle/lifecycle-transition";

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
  transitioned: boolean;
}

/**
 * Orchestrates verdict computation and lifecycle transition.
 *
 * Calls the pure `computeVerdict`, checks if the strategy is eligible
 * for BACKTESTED → VERIFIED transition, and validates via the pure
 * `transitionLifecycle()` guard. No DB writes — the caller is
 * responsible for persistence.
 */
export function runVerification(params: RunVerificationParams): RunVerificationResult {
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

  if (verdictResult.verdict === "READY" && currentLifecycleState === "BACKTESTED") {
    const newState = applyLifecycleTransition(
      strategyId,
      "BACKTESTED",
      "VERIFIED",
      "verification_passed",
      strategyVersion
    );
    return { verdictResult, lifecycleState: newState, transitioned: true };
  }

  return {
    verdictResult,
    lifecycleState: currentLifecycleState,
    transitioned: false,
  };
}
