/**
 * Baseline metric extractor — extracts normalized metrics from backtest results.
 */

import type { BaselineMetrics } from "./types";

interface BacktestResultJson {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  netProfit: number;
  sharpeRatio: number;
  initialDeposit: number;
  finalBalance: number;
  equityCurve?: Array<{ trade: number; equity: number }>;
}

/**
 * Extract baseline metrics from a parsed BacktestResult JSON.
 *
 * Normalizes values to be comparable with live metrics:
 * - returnPct: net profit as percentage of initial deposit
 * - maxDrawdownPct: already a percentage
 * - winRate: already a percentage
 * - tradesPerDay: estimated from total trades and duration
 * - sharpeRatio: as-is from backtest
 */
export function extractBaselineMetrics(
  backtestResult: BacktestResultJson,
  backtestDurationDays: number
): {
  metrics: BaselineMetrics;
  raw: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdownPct: number;
    avgTradesPerDay: number;
    netReturnPct: number;
    sharpeRatio: number;
    initialDeposit: number;
    backtestDurationDays: number;
  };
} {
  const initialDeposit = backtestResult.initialDeposit || 10000;
  const netReturnPct = (backtestResult.netProfit / initialDeposit) * 100;
  const avgTradesPerDay =
    backtestDurationDays > 0 ? backtestResult.totalTrades / backtestDurationDays : 0;

  // Normalize return to 30-day window for comparison
  const dailyReturnPct = backtestDurationDays > 0 ? netReturnPct / backtestDurationDays : 0;
  const returnPct30d = dailyReturnPct * 30;

  const metrics: BaselineMetrics = {
    returnPct: returnPct30d,
    maxDrawdownPct: backtestResult.maxDrawdownPercent || 0,
    winRate: backtestResult.winRate || 0,
    tradesPerDay: avgTradesPerDay,
    sharpeRatio: backtestResult.sharpeRatio || 0,
  };

  const raw = {
    totalTrades: backtestResult.totalTrades,
    winRate: backtestResult.winRate,
    profitFactor: backtestResult.profitFactor,
    maxDrawdownPct: backtestResult.maxDrawdownPercent || 0,
    avgTradesPerDay,
    netReturnPct,
    sharpeRatio: backtestResult.sharpeRatio || 0,
    initialDeposit,
    backtestDurationDays,
  };

  return { metrics, raw };
}

/**
 * Estimate backtest duration in days from equity curve or trade count.
 * Falls back to a rough estimate if no equity curve is available.
 */
export function estimateBacktestDuration(backtestResult: BacktestResultJson): number {
  // If we have an equity curve, use the trade count as a rough proxy
  // Assuming ~1 trade per day as a default (conservative estimate)
  if (backtestResult.totalTrades > 0) {
    // A typical backtest on H1 timeframe might do 1-5 trades per day
    // Use 2 trades/day as default estimate
    return Math.max(30, Math.round(backtestResult.totalTrades / 2));
  }

  return 90; // Default to 3 months
}
