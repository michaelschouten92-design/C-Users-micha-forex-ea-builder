import type { VerificationInput, VerificationResult, ReasonCode } from "./types";
import type { VerificationThresholdsSnapshot } from "./config-snapshot";

export function computeVerdict(
  input: VerificationInput,
  config: VerificationThresholdsSnapshot
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

  // --- D1–D3: Not yet implemented (future PRs) ---
  // Without analysis stages, no flags are raised.

  const composite = input.intermediateResults?.robustnessScores?.composite ?? 0;

  // Near-minimum sample warning
  if (sampleSize < thresholds.minTradeCount * 2) {
    warnings.push("Sample size near minimum threshold");
  }

  // --- D4: Verdict decision (contract §5 accumulation rules) ---
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
      walkForwardDegradationPct: null,
      walkForwardOosSampleSize: null,
      monteCarloRuinProbability: null,
      sampleSize,
    },
    thresholdsUsed,
    warnings,
  };
}
