import type { VerificationInput, VerificationResult, ReasonCode } from "./types";
import type { VerificationThresholdsSnapshot } from "./config-snapshot";
import { evaluateWalkForwardDegradation } from "./rules/walk-forward";
import { evaluateMonteCarloRuin } from "./rules/monte-carlo-ruin";

export interface ComputeVerdictOptions {
  monteCarloSeed?: number;
}

export function computeVerdict(
  input: VerificationInput,
  config: VerificationThresholdsSnapshot,
  options?: ComputeVerdictOptions
): VerificationResult {
  const { strategyId, strategyVersion, tradeHistory } = input;
  const sampleSize = tradeHistory.length;
  const reasonCodes: ReasonCode[] = [];
  const warnings: string[] = [];

  const { thresholds } = config;

  const thresholdsUsed = {
    configVersion: config.configVersion,
    thresholdsHash: config.thresholdsHash,
    ...thresholds,
  };

  // Mutable scores — stages populate their fields as they run.
  let walkForwardDegradationPct: number | null = null;
  let walkForwardOosSampleSize: number | null = null;

  // --- D0: MIN_TRADE_COUNT gate (short-circuits all subsequent rules) ---
  if (sampleSize < thresholds.minTradeCount) {
    reasonCodes.push("INSUFFICIENT_DATA");
    return {
      strategyId,
      strategyVersion,
      verdict: "NOT_DEPLOYABLE",
      reasonCodes,
      scores: {
        composite: 0,
        walkForwardDegradationPct: null,
        walkForwardOosSampleSize: null,
        monteCarloRuinProbability: null,
        sampleSize,
      },
      thresholdsUsed,
      warnings,
    };
  }

  // --- D1: Walk-Forward Degradation (3-tier guard) ---
  // Runs only when walk-forward stage results are provided.
  // Omitted stage = not-yet-run; no flag raised.
  const wf = input.intermediateResults?.walkForward;
  if (wf) {
    // Validate walk-forward input completeness
    if (
      !Number.isFinite(wf.sharpeDegradationPct) ||
      !Number.isFinite(wf.outOfSampleTradeCount) ||
      wf.outOfSampleTradeCount < 0
    ) {
      reasonCodes.push("INVALID_SCORE");
    } else {
      try {
        const d1 = evaluateWalkForwardDegradation(wf, thresholds);
        walkForwardDegradationPct = d1.measured.sharpeDegradationPct;
        walkForwardOosSampleSize = d1.measured.outOfSampleTradeCount;
        if (d1.reasonCode) {
          reasonCodes.push(d1.reasonCode);
        }
      } catch {
        // Defense-in-depth: unexpected error in D1 evaluation → fail-closed
        reasonCodes.push("COMPUTATION_FAILED");
      }
    }
  }

  // --- D2: Monte Carlo Ruin Probability ---
  let monteCarloRuinProbability: number | null = null;

  const mc = input.intermediateResults?.monteCarlo;
  if (mc && options?.monteCarloSeed !== undefined) {
    if (
      !Number.isFinite(mc.initialBalance) ||
      mc.initialBalance <= 0 ||
      mc.tradePnls.length === 0 ||
      mc.tradePnls.some((p) => !Number.isFinite(p))
    ) {
      reasonCodes.push("INVALID_SCORE");
    } else {
      try {
        const d2 = evaluateMonteCarloRuin(mc, thresholds, options.monteCarloSeed);
        monteCarloRuinProbability = d2.measured.ruinProbability;
        if (d2.reasonCode) reasonCodes.push(d2.reasonCode);
      } catch {
        reasonCodes.push("COMPUTATION_FAILED");
      }
    }
  }

  // --- D3: Not yet implemented (future PRs) ---

  const composite = input.intermediateResults?.robustnessScores?.composite ?? 0;

  // Near-minimum sample warning
  if (sampleSize < thresholds.minTradeCount * 2) {
    warnings.push("Sample size near minimum threshold");
  }

  // --- D4: Verdict decision (contract §5 accumulation rules) ---
  // Non-shortcircuiting: all reason codes accumulated above feed into verdict.
  const hasNotDeployable = reasonCodes.some((rc) =>
    (
      [
        "INSUFFICIENT_DATA",
        "WALK_FORWARD_DEGRADATION_EXTREME",
        "RUIN_PROBABILITY_EXCEEDED",
        "COMPOSITE_BELOW_MINIMUM",
        "COMPUTATION_FAILED",
        "INVALID_SCORE",
      ] as ReasonCode[]
    ).includes(rc)
  );

  const hasUncertain = reasonCodes.some((rc) =>
    (
      [
        "INCOMPLETE_ANALYSIS",
        "COMPOSITE_IN_UNCERTAIN_BAND",
        "WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE",
      ] as ReasonCode[]
    ).includes(rc)
  );

  let verdict: VerificationResult["verdict"];

  if (hasNotDeployable) {
    verdict = "NOT_DEPLOYABLE";
  } else if (hasUncertain) {
    verdict = "UNCERTAIN";
  } else if (composite >= thresholds.readyConfidenceThreshold) {
    verdict = "READY";
    reasonCodes.push("ALL_CHECKS_PASSED");
  } else {
    verdict = "UNCERTAIN";
    reasonCodes.push("COMPOSITE_IN_UNCERTAIN_BAND");
  }

  return {
    strategyId,
    strategyVersion,
    verdict,
    reasonCodes,
    scores: {
      composite,
      walkForwardDegradationPct,
      walkForwardOosSampleSize,
      monteCarloRuinProbability,
      sampleSize,
    },
    thresholdsUsed,
    warnings,
  };
}
