import type { VerificationInput, VerificationResult, ReasonCode } from "./types";
import type { VerificationThresholdsSnapshot } from "./config-snapshot";
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
        monteCarloRuinProbability: null,
        sampleSize,
      },
      thresholdsUsed,
      warnings,
    };
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
        "RUIN_PROBABILITY_EXCEEDED",
        "COMPOSITE_BELOW_MINIMUM",
        "COMPUTATION_FAILED",
        "INVALID_SCORE",
      ] as ReasonCode[]
    ).includes(rc)
  );

  const hasUncertain = reasonCodes.some((rc) =>
    (["INCOMPLETE_ANALYSIS", "COMPOSITE_IN_UNCERTAIN_BAND"] as ReasonCode[]).includes(rc)
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
      monteCarloRuinProbability,
      sampleSize,
    },
    thresholdsUsed,
    warnings,
  };
}
