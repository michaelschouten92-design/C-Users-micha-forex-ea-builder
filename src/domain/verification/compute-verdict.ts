import { createHash } from "node:crypto";
import { VERIFICATION } from "./constants";
import type { VerificationInput, VerificationResult, ReasonCode } from "./types";

// Lazy-cached thresholds hash (computed once per process)
let cachedHash: string | null = null;

function computeThresholdsHash(): string {
  if (cachedHash) return cachedHash;
  const obj: Record<string, unknown> = {
    configVersion: VERIFICATION.CONFIG_VERSION,
    extremeSharpeDegradationPct: VERIFICATION.EXTREME_SHARPE_DEGRADATION_PCT,
    maxSharpeDegradationPct: VERIFICATION.MAX_SHARPE_DEGRADATION_PCT,
    minOosTradeCount: VERIFICATION.MIN_OOS_TRADE_COUNT,
    minTradeCount: VERIFICATION.MIN_TRADE_COUNT,
    monteCarloIterations: VERIFICATION.MONTE_CARLO_ITERATIONS,
    notDeployableThreshold: VERIFICATION.NOT_DEPLOYABLE_THRESHOLD,
    readyConfidenceThreshold: VERIFICATION.READY_CONFIDENCE_THRESHOLD,
    ruinProbabilityCeiling: VERIFICATION.RUIN_PROBABILITY_CEILING,
  };
  const json = JSON.stringify(obj); // keys already sorted above
  cachedHash = createHash("sha256").update(json).digest("hex");
  return cachedHash;
}

function buildThresholdsUsed() {
  return {
    configVersion: VERIFICATION.CONFIG_VERSION,
    thresholdsHash: computeThresholdsHash(),
    minTradeCount: VERIFICATION.MIN_TRADE_COUNT,
    readyConfidenceThreshold: VERIFICATION.READY_CONFIDENCE_THRESHOLD,
    notDeployableThreshold: VERIFICATION.NOT_DEPLOYABLE_THRESHOLD,
    maxSharpeDegradationPct: VERIFICATION.MAX_SHARPE_DEGRADATION_PCT,
    extremeSharpeDegradationPct: VERIFICATION.EXTREME_SHARPE_DEGRADATION_PCT,
    minOosTradeCount: VERIFICATION.MIN_OOS_TRADE_COUNT,
    ruinProbabilityCeiling: VERIFICATION.RUIN_PROBABILITY_CEILING,
    monteCarloIterations: VERIFICATION.MONTE_CARLO_ITERATIONS,
  };
}

export function computeVerdict(input: VerificationInput): VerificationResult {
  const { strategyId, strategyVersion, tradeHistory } = input;
  const sampleSize = tradeHistory.length;
  const reasonCodes: ReasonCode[] = [];
  const warnings: string[] = [];

  // --- D0: MIN_TRADE_COUNT gate (short-circuits all subsequent rules) ---
  if (sampleSize < VERIFICATION.MIN_TRADE_COUNT) {
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
      thresholdsUsed: buildThresholdsUsed(),
      warnings,
    };
  }

  // --- D1–D3: Not yet implemented (future PRs) ---
  // Without analysis stages, composite is 0 and no flags are raised.

  // Near-minimum sample warning
  if (sampleSize < VERIFICATION.MIN_TRADE_COUNT * 2) {
    warnings.push("Sample size near minimum threshold");
  }

  // --- D4/D5: No NOT_DEPLOYABLE or UNCERTAIN flags, composite is 0 → UNCERTAIN ---
  reasonCodes.push("COMPOSITE_IN_UNCERTAIN_BAND");

  return {
    strategyId,
    strategyVersion,
    verdict: "UNCERTAIN",
    reasonCodes,
    scores: {
      composite: 0,
      walkForwardDegradationPct: null,
      walkForwardOosSampleSize: null,
      monteCarloRuinProbability: null,
      sampleSize,
    },
    thresholdsUsed: buildThresholdsUsed(),
    warnings,
  };
}
