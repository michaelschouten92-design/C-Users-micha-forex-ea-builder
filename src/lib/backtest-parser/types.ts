/**
 * Types for MT5 backtest HTML report parsing.
 */

export interface ParsedMetadata {
  eaName: string | null;
  symbol: string;
  timeframe: string;
  period: string;
  initialDeposit: number;
  broker?: string;
  currency?: string;
  leverage?: string;
}

export interface ParsedMetrics {
  totalNetProfit: number;
  profitFactor: number;
  maxDrawdownPct: number;
  maxDrawdownAbs: number | null;
  sharpeRatio: number | null;
  recoveryFactor: number | null;
  expectedPayoff: number;
  totalTrades: number;
  winRate: number;
  longWinRate: number | null;
  shortWinRate: number | null;
  grossProfit?: number;
  grossLoss?: number;
  largestProfitTrade?: number;
  largestLossTrade?: number;
  avgProfitTrade?: number;
  avgLossTrade?: number;
  maxConsecutiveWins?: number;
  maxConsecutiveLosses?: number;
}

export interface ParsedDeal {
  ticket: number;
  openTime: string;
  type: string; // "buy" | "sell" | "balance"
  volume: number;
  price: number;
  sl?: number;
  tp?: number;
  profit: number;
  symbol?: string;
  comment?: string;
}

export interface ParsedReport {
  metadata: ParsedMetadata;
  metrics: ParsedMetrics;
  deals: ParsedDeal[];
  detectedLocale: string | null;
  parseWarnings: string[];
}

export interface HealthScoreBreakdown {
  metric: string;
  value: number;
  score: number;
  weight: number;
  maxScore: number;
}

export interface HealthScoreResult {
  score: number; // 0-100
  status: "ROBUST" | "MODERATE" | "WEAK" | "INSUFFICIENT_DATA";
  breakdown: HealthScoreBreakdown[];
  warnings: string[];
  /** Algorithm version — changes when scoring logic is modified. */
  version: number;
  /** Confidence interval (±margin) based on sample size. Wider with fewer trades. */
  confidenceInterval: { lower: number; upper: number };
}
