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

export interface HealthResult {
  status: HealthStatusType;
  overallScore: number;
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
