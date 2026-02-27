import type { ParsedDeal } from "./types";

// ============================================
// Types
// ============================================

export interface WalkForwardOptions {
  numWindows?: number;
}

interface WindowMetrics {
  profitFactor: number;
  winRate: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalTrades: number;
  netProfit: number;
}

export interface WalkForwardWindow {
  windowIndex: number;
  inSample: WindowMetrics;
  outOfSample: WindowMetrics;
  degradation: {
    profitFactor: number;
    winRate: number;
    sharpeRatio: number;
  };
}

export interface WalkForwardResult {
  windows: WalkForwardWindow[];
  consistencyScore: number;
  overfitProbability: number;
  verdict: "ROBUST" | "MODERATE" | "OVERFITTED";
  totalDeals: number;
  numWindows: number;
  /** Actual OOS ratio used (= 1/numWindows for leave-one-out cross-validation). */
  oosRatio: number;
}

// ============================================
// Metrics calculation
// ============================================

function calculateMetrics(deals: ParsedDeal[], initialDeposit: number): WindowMetrics {
  const tradingDeals = deals.filter((d) => d.type !== "balance");
  if (tradingDeals.length === 0) {
    return {
      profitFactor: 0,
      winRate: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      totalTrades: 0,
      netProfit: 0,
    };
  }

  const wins = tradingDeals.filter((d) => d.profit > 0);
  const losses = tradingDeals.filter((d) => d.profit < 0);
  const grossProfit = wins.reduce((s, d) => s + d.profit, 0);
  const grossLoss = Math.abs(losses.reduce((s, d) => s + d.profit, 0));
  const netProfit = tradingDeals.reduce((s, d) => s + d.profit, 0);

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;
  const winRate = (wins.length / tradingDeals.length) * 100;

  // Max drawdown
  let equity = initialDeposit;
  let peak = equity;
  let maxDD = 0;
  for (const deal of tradingDeals) {
    equity += deal.profit;
    if (equity > peak) peak = equity;
    if (peak > 0) {
      const dd = ((peak - equity) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }

  // Sharpe ratio — computed from DAILY returns, not per-trade returns.
  // Group deals by date, compute daily P&L, then annualize with sqrt(252).
  // This avoids over/under-stating Sharpe for strategies with multiple trades
  // per day or infrequent trades.
  const dailyPnL = new Map<string, number>();
  for (const deal of tradingDeals) {
    // Extract date portion from normalized ISO timestamp or raw format
    const dayKey = deal.openTime.slice(0, 10);
    dailyPnL.set(dayKey, (dailyPnL.get(dayKey) || 0) + deal.profit);
  }

  let sharpeRatio = 0;
  const dailyReturns = [...dailyPnL.values()];
  if (dailyReturns.length >= 2) {
    const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;
  }

  return {
    profitFactor: Math.min(profitFactor, 10),
    winRate,
    maxDrawdownPct: maxDD,
    sharpeRatio,
    totalTrades: tradingDeals.length,
    netProfit,
  };
}

// ============================================
// Walk-Forward Engine
// ============================================

export function runWalkForward(
  deals: ParsedDeal[],
  initialDeposit: number,
  options: WalkForwardOptions = {}
): WalkForwardResult {
  const { numWindows = 5 } = options;
  const oosRatio = 1 / numWindows; // leave-one-out: each window is OOS once

  // Filter out balance deals and sort by time
  const tradingDeals = deals
    .filter((d) => d.type !== "balance")
    .sort((a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime());

  if (tradingDeals.length < numWindows * 20) {
    return {
      windows: [],
      consistencyScore: 0,
      overfitProbability: 1,
      verdict: "OVERFITTED",
      totalDeals: tradingDeals.length,
      numWindows,
      oosRatio,
    };
  }

  const windowSize = Math.floor(tradingDeals.length / numWindows);
  const windows: WalkForwardWindow[] = [];

  for (let i = 0; i < numWindows; i++) {
    // Out-of-sample = current window
    const oosStart = i * windowSize;
    const oosEnd = i === numWindows - 1 ? tradingDeals.length : (i + 1) * windowSize;
    const oosDealSlice = tradingDeals.slice(oosStart, oosEnd);

    // In-sample = all other windows
    const isDealSlice = [...tradingDeals.slice(0, oosStart), ...tradingDeals.slice(oosEnd)];

    const inSample = calculateMetrics(isDealSlice, initialDeposit);
    const outOfSample = calculateMetrics(oosDealSlice, initialDeposit);

    // Calculate degradation (IS -> OOS gap)
    const degradation = {
      profitFactor:
        inSample.profitFactor > 0
          ? ((inSample.profitFactor - outOfSample.profitFactor) / inSample.profitFactor) * 100
          : 0,
      winRate:
        inSample.winRate > 0
          ? ((inSample.winRate - outOfSample.winRate) / inSample.winRate) * 100
          : 0,
      sharpeRatio:
        inSample.sharpeRatio > 0
          ? ((inSample.sharpeRatio - outOfSample.sharpeRatio) / inSample.sharpeRatio) * 100
          : 0,
    };

    windows.push({
      windowIndex: i,
      inSample,
      outOfSample,
      degradation,
    });
  }

  // Consistency score: based on OOS metrics stability (0-100)
  const oosPFs = windows.map((w) => w.outOfSample.profitFactor);
  const oosWRs = windows.map((w) => w.outOfSample.winRate);
  const oosSharpes = windows.map((w) => w.outOfSample.sharpeRatio);

  const pfConsistency = calculateConsistency(oosPFs);
  const wrConsistency = calculateConsistency(oosWRs);
  const sharpeConsistency = calculateConsistency(oosSharpes);

  // Profitable OOS windows
  const profitableWindows = windows.filter((w) => w.outOfSample.netProfit > 0).length;
  const profitabilityScore = (profitableWindows / numWindows) * 100;

  const consistencyScore = Math.round(
    pfConsistency * 0.3 + wrConsistency * 0.2 + sharpeConsistency * 0.2 + profitabilityScore * 0.3
  );

  // Overfit probability: composite of all three IS→OOS degradation metrics.
  // PF degradation is most informative, Sharpe second, win rate third.
  const avgPFDeg =
    windows.reduce((s, w) => s + Math.abs(w.degradation.profitFactor), 0) / windows.length;
  const avgSharpeDeg =
    windows.reduce((s, w) => s + Math.abs(w.degradation.sharpeRatio), 0) / windows.length;
  const avgWRDeg =
    windows.reduce((s, w) => s + Math.abs(w.degradation.winRate), 0) / windows.length;

  // Weighted composite: PF 50%, Sharpe 30%, WinRate 20%
  const compositeDegradation = avgPFDeg * 0.5 + avgSharpeDeg * 0.3 + avgWRDeg * 0.2;
  const overfitProbability = 1 / (1 + Math.exp(-0.08 * (compositeDegradation - 40)));

  // Verdict
  let verdict: "ROBUST" | "MODERATE" | "OVERFITTED";
  if (consistencyScore >= 70 && overfitProbability < 0.3) {
    verdict = "ROBUST";
  } else if (consistencyScore >= 40 && overfitProbability < 0.6) {
    verdict = "MODERATE";
  } else {
    verdict = "OVERFITTED";
  }

  return {
    windows,
    consistencyScore,
    overfitProbability,
    verdict,
    totalDeals: tradingDeals.length,
    numWindows,
    oosRatio,
  };
}

function calculateConsistency(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // When mean is near zero, CV is undefined (division by ~0).
  // Fall back to absolute spread: if values are tightly clustered near zero,
  // that's still consistent. Map stdDev 0→100, ≥1→0.
  if (Math.abs(mean) < 0.01) {
    return Math.max(0, Math.min(100, (1 - stdDev) * 100));
  }

  const cv = stdDev / Math.abs(mean); // Coefficient of variation
  // Lower CV = more consistent. Map CV 0->100, 1->0
  return Math.max(0, Math.min(100, (1 - cv) * 100));
}
