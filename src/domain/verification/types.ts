export type VerificationVerdict = "READY" | "UNCERTAIN" | "NOT_DEPLOYABLE";

export type ReasonCode =
  | "INSUFFICIENT_DATA"
  | "RUIN_PROBABILITY_EXCEEDED"
  | "COMPOSITE_BELOW_MINIMUM"
  | "COMPUTATION_FAILED"
  | "INVALID_SCORE"
  | "INCOMPLETE_ANALYSIS"
  | "ALL_CHECKS_PASSED"
  | "COMPOSITE_IN_UNCERTAIN_BAND"
  | "CONFIG_SNAPSHOT_MISSING"
  | "CONFIG_HASH_MISMATCH"
  | "SNAPSHOT_BUILD_FAILED";

/** Placeholder — expanded as analysis stages are added (D1+). */
export type TradeRecord = Record<string, unknown>;

/** Placeholder — expanded as analysis stages are added (D1+). */
export type BacktestParameters = Record<string, unknown>;

export interface VerificationInput {
  strategyId: string;
  strategyVersion: number;
  tradeHistory: TradeRecord[];
  backtestParameters: BacktestParameters;
  /** Pre-computed stage results. Omitted stages treated as not-yet-run. */
  intermediateResults?: {
    robustnessScores?: { composite: number };
    monteCarlo?: {
      /** Dollar PnL per trade from backtest. */
      tradePnls: number[];
      /** Starting equity for simulation paths. */
      initialBalance: number;
    };
  };
}

export interface VerificationResult {
  strategyId: string;
  strategyVersion: number;
  verdict: VerificationVerdict;
  reasonCodes: ReasonCode[];
  scores: {
    composite: number;
    monteCarloRuinProbability: number | null;
    sampleSize: number;
  };
  thresholdsUsed: {
    configVersion: string;
    thresholdsHash: string;
    minTradeCount: number;
    readyConfidenceThreshold: number;
    notDeployableThreshold: number;
    ruinProbabilityCeiling: number;
    monteCarloIterations?: number;
  };
  warnings: string[];
}
