/**
 * Strategy Health Monitor types.
 */

export interface LiveMetrics {
  returnPct: number;
  volatility: number;
  maxDrawdownPct: number;
  winRate: number;
  tradesPerDay: number;
  totalTrades: number;
  windowDays: number;
  /** Per-trade returns as % of balance (for CUSUM drift detection) */
  tradeReturns: number[];
}

export interface BaselineMetrics {
  returnPct: number;
  maxDrawdownPct: number;
  winRate: number;
  tradesPerDay: number;
  sharpeRatio: number;
  /** Annualized volatility from backtest daily returns. Null if not computed. */
  volatility: number | null;
}

export type HealthStatusType = "HEALTHY" | "WARNING" | "DEGRADED" | "INSUFFICIENT_DATA";

export interface MetricScore {
  name: string;
  score: number;
  weight: number;
  liveValue: number;
  baselineValue: number | null;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
}

export interface DriftInfo {
  /** CUSUM statistic value (higher = more persistent negative drift) */
  cusumValue: number;
  /** Whether drift threshold has been exceeded */
  driftDetected: boolean;
  /** 0.0 (no drift) to 1.0 (threshold exceeded) */
  driftSeverity: number;
}

export interface HealthResult {
  status: HealthStatusType;
  overallScore: number;
  /** Confidence interval on overall score based on sample size */
  confidenceInterval: ConfidenceInterval;
  /** CUSUM drift detection on strategy expectancy */
  drift: DriftInfo;
  metrics: {
    return: MetricScore;
    volatility: MetricScore;
    drawdown: MetricScore;
    winRate: MetricScore;
    tradeFrequency: MetricScore;
  };
  live: LiveMetrics;
  baseline: BaselineMetrics | null;
}
