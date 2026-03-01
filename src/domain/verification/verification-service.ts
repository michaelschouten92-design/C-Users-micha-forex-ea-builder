import { computeVerdict } from "./compute-verdict";
import type {
  VerificationInput,
  VerificationResult,
  TradeRecord,
  BacktestParameters,
} from "./types";
import type { StrategyLifecycleState } from "@/lib/strategy-lifecycle/transitions";
import { applyLifecycleTransition } from "@/lib/strategy-lifecycle/lifecycle-transition";
import { appendProofEvent } from "@/lib/proof/events";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "verification" });

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

  let result: RunVerificationResult;

  if (verdictResult.verdict === "READY" && currentLifecycleState === "BACKTESTED") {
    const newState = applyLifecycleTransition(
      strategyId,
      strategyVersion,
      currentLifecycleState,
      "VERIFIED",
      "verification_passed"
    );
    result = { verdictResult, lifecycleState: newState, transitioned: true };
  } else {
    result = {
      verdictResult,
      lifecycleState: currentLifecycleState,
      transitioned: false,
    };
  }

  // Event persistence policy: fail-closed for all verdicts.
  // Verification results are only trustworthy if the audit trail is intact.
  const recordId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    await appendProofEvent(strategyId, "VERIFICATION_RUN_COMPLETED", {
      eventType: "VERIFICATION_RUN_COMPLETED",
      strategyId,
      strategyVersion,
      verdict: verdictResult.verdict,
      reasonCodes: verdictResult.reasonCodes,
      thresholdsHash: verdictResult.thresholdsUsed.thresholdsHash,
      recordId,
      timestamp,
    });
  } catch (err) {
    log.error(
      {
        err,
        eventType: "VERIFICATION_RUN_COMPLETED",
        recordId,
        timestamp,
        strategyId,
        strategyVersion,
      },
      "Failed to persist verification event"
    );
    throw err;
  }

  if (verdictResult.verdict === "READY") {
    try {
      await appendProofEvent(strategyId, "VERIFICATION_PASSED", {
        eventType: "VERIFICATION_PASSED",
        strategyId,
        strategyVersion,
        recordId,
        timestamp,
      });
    } catch (err) {
      log.error(
        { err, eventType: "VERIFICATION_PASSED", recordId, timestamp, strategyId, strategyVersion },
        "Failed to persist verification event"
      );
      throw err;
    }
  }

  return result;
}
