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

  // Normalize return to 30-day window using geometric compounding.
  // Arithmetic scaling (r/days*30) overestimates baseline for large returns.
  // Geometric: ((1 + r/100)^(30/days) - 1) * 100
  const returnPct30d =
    backtestDurationDays > 0 && Math.abs(netReturnPct) > 0.001
      ? (Math.pow(1 + netReturnPct / 100, 30 / backtestDurationDays) - 1) * 100
      : 0;

  // Compute annualized volatility from equity curve if available.
  // Uses daily return approximation: total return spread evenly, then annualized.
  // This is a rough estimate; a proper computation requires per-trade or per-day PnL data.
  let volatility: number | null = null;
  if (backtestDurationDays > 1 && backtestResult.totalTrades > 1) {
    // Approximate daily return std dev from total return and Sharpe ratio
    // If Sharpe is available and non-zero: vol ≈ |annualReturn / Sharpe|
    const annualReturnPct =
      backtestDurationDays > 0 ? (netReturnPct / backtestDurationDays) * 252 : 0;
    if (Math.abs(backtestResult.sharpeRatio) > 0.01) {
      volatility = Math.abs(annualReturnPct / backtestResult.sharpeRatio) / 100;
    } else if (backtestResult.equityCurve && backtestResult.equityCurve.length >= 2) {
      // Compute from equity curve changes
      const curve = backtestResult.equityCurve;
      const returns: number[] = [];
      for (let i = 1; i < curve.length; i++) {
        if (curve[i - 1].equity > 0) {
          returns.push((curve[i].equity - curve[i - 1].equity) / curve[i - 1].equity);
        }
      }
      if (returns.length >= 2) {
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
        // Approximate annualization using trades-per-day ratio
        const tradesPerPeriod = Math.max(avgTradesPerDay, 1);
        volatility = Math.sqrt(variance * tradesPerPeriod) * Math.sqrt(252);
      }
    }
  }

  const metrics: BaselineMetrics = {
    returnPct: returnPct30d,
    maxDrawdownPct: backtestResult.maxDrawdownPercent || 0,
    winRate: backtestResult.winRate || 0,
    tradesPerDay: avgTradesPerDay,
    sharpeRatio: backtestResult.sharpeRatio || 0,
    volatility,
  };

  const raw = {
    totalTrades: backtestResult.totalTrades,
    winRate: backtestResult.winRate,
    profitFactor: backtestResult.profitFactor,
    maxDrawdownPct: backtestResult.maxDrawdownPercent || 0,
    avgTradesPerDay,
    netReturnPct,
    sharpeRatio: backtestResult.sharpeRatio || 0,
    volatility,
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
