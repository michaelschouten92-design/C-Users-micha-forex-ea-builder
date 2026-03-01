export type VerificationVerdict = "READY" | "UNCERTAIN" | "NOT_DEPLOYABLE";

export type ReasonCode =
  | "INSUFFICIENT_DATA"
  | "WALK_FORWARD_DEGRADATION_EXTREME"
  | "RUIN_PROBABILITY_EXCEEDED"
  | "COMPOSITE_BELOW_MINIMUM"
  | "COMPUTATION_FAILED"
  | "INVALID_SCORE"
  | "INCOMPLETE_ANALYSIS"
  | "ALL_CHECKS_PASSED"
  | "COMPOSITE_IN_UNCERTAIN_BAND"
  | "WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE";

/** Placeholder — expanded as analysis stages are added (D1+). */
export type TradeRecord = Record<string, unknown>;

/** Placeholder — expanded as analysis stages are added (D1+). */
export type BacktestParameters = Record<string, unknown>;

export interface VerificationInput {
  strategyId: string;
  strategyVersion: number;
  tradeHistory: TradeRecord[];
  backtestParameters: BacktestParameters;
}

export interface VerificationResult {
  strategyId: string;
  strategyVersion: number;
  verdict: VerificationVerdict;
  reasonCodes: ReasonCode[];
  scores: {
    composite: number;
    walkForwardDegradationPct: number | null;
    walkForwardOosSampleSize: number | null;
    monteCarloRuinProbability: number | null;
    sampleSize: number;
  };
  thresholdsUsed: {
    configVersion: string;
    thresholdsHash: string;
    minTradeCount: number;
    readyConfidenceThreshold: number;
    notDeployableThreshold: number;
    maxSharpeDegradationPct: number;
    extremeSharpeDegradationPct: number;
    minOosTradeCount: number;
    ruinProbabilityCeiling: number;
    monteCarloIterations?: number;
  };
  warnings: string[];
}
