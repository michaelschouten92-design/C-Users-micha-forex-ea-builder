/**
 * Live metrics collector — queries track record events to compute live trading metrics.
 */

import { prisma } from "@/lib/prisma";
import type { LiveMetrics } from "./types";

/**
 * Collect live trading metrics for a given instance over a rolling window.
 */
export async function collectLiveMetrics(
  instanceId: string,
  windowDays: number = 30
): Promise<LiveMetrics> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Fetch track record state, closed trades, and cashflows in the window
  const [state, tradeCloseEvents, cashflowEvents] = await Promise.all([
    prisma.trackRecordState.findUnique({
      where: { instanceId },
      select: {
        balance: true,
        equity: true,
        highWaterMark: true,
        maxDrawdownPct: true,
        totalTrades: true,
        winCount: true,
        lossCount: true,
      },
    }),
    prisma.trackRecordEvent.findMany({
      where: {
        instanceId,
        eventType: "TRADE_CLOSE",
        timestamp: { gte: windowStart },
      },
      select: {
        payload: true,
        timestamp: true,
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.trackRecordEvent.findMany({
      where: {
        instanceId,
        eventType: "CASHFLOW",
        timestamp: { gte: windowStart },
      },
      select: { payload: true },
    }),
  ]);

  if (!state) {
    return {
      returnPct: 0,
      volatility: 0,
      maxDrawdownPct: 0,
      winRate: 0,
      tradesPerDay: 0,
      totalTrades: 0,
      windowDays,
    };
  }

  const closedTrades = tradeCloseEvents.map((e) => {
    const payload = e.payload as Record<string, unknown>;
    return {
      profit: (payload.profit as number) || 0,
      swap: (payload.swap as number) || 0,
      commission: (payload.commission as number) || 0,
      timestamp: e.timestamp,
    };
  });

  const tradeCount = closedTrades.length;

  // Calculate return percentage from trades in window
  const totalPnL = closedTrades.reduce((sum, t) => sum + t.profit + t.swap + t.commission, 0);

  // Net cashflows in the window (deposits - withdrawals).
  // Without this, deposits inflate the balance and suppress returnPct.
  const netCashflow = cashflowEvents.reduce((sum, e) => {
    const p = e.payload as Record<string, unknown>;
    const amount = (p.amount as number) || 0;
    const type = p.type as string;
    return sum + (type === "DEPOSIT" ? amount : -amount);
  }, 0);

  // estimatedStartBalance = currentBalance - tradePnL - netCashflows
  const estimatedStartBalance = Math.max(state.balance - totalPnL - netCashflow, 1);
  const returnPct = (totalPnL / estimatedStartBalance) * 100;

  // Calculate daily returns for volatility
  const dailyReturns = computeDailyReturns(closedTrades, estimatedStartBalance);
  const volatility = computeAnnualizedVolatility(dailyReturns);

  // Max drawdown computed from trades within the window (not cumulative all-time).
  // This ensures old drawdown events don't permanently depress the health score.
  const maxDrawdownPct = computeWindowedMaxDrawdown(closedTrades, estimatedStartBalance);

  // Win rate from trades in window
  const wins = closedTrades.filter((t) => t.profit + t.swap + t.commission > 0).length;
  const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;

  // Calculate actual days with data
  let actualDays = windowDays;
  if (closedTrades.length > 0) {
    const firstTrade = closedTrades[0].timestamp;
    const lastTrade = closedTrades[closedTrades.length - 1].timestamp;
    actualDays = Math.max(1, (lastTrade.getTime() - firstTrade.getTime()) / (24 * 60 * 60 * 1000));
  }

  const tradesPerDay = tradeCount / Math.max(actualDays, 1);

  return {
    returnPct,
    volatility,
    maxDrawdownPct,
    winRate,
    tradesPerDay,
    totalTrades: tradeCount,
    windowDays: Math.round(actualDays),
  };
}

/**
 * Group trades into daily buckets and compute daily return percentages.
 */
function computeDailyReturns(
  trades: Array<{ profit: number; swap: number; commission: number; timestamp: Date }>,
  startBalance: number
): number[] {
  if (trades.length === 0) return [];

  const dailyPnL = new Map<string, number>();

  for (const trade of trades) {
    const dayKey = trade.timestamp.toISOString().slice(0, 10);
    const pnl = trade.profit + trade.swap + trade.commission;
    dailyPnL.set(dayKey, (dailyPnL.get(dayKey) || 0) + pnl);
  }

  let runningBalance = startBalance;
  const returns: number[] = [];

  // Sort days chronologically
  const sortedDays = [...dailyPnL.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [, pnl] of sortedDays) {
    if (runningBalance > 0) {
      returns.push(pnl / runningBalance);
    }
    runningBalance += pnl;
  }

  return returns;
}

/**
 * Compute max drawdown % from trades within the window.
 * Walks the equity curve trade-by-trade and tracks peak-to-trough.
 */
function computeWindowedMaxDrawdown(
  trades: Array<{ profit: number; swap: number; commission: number }>,
  startBalance: number
): number {
  if (trades.length === 0) return 0;

  let equity = startBalance;
  let peak = equity;
  let maxDD = 0;

  for (const trade of trades) {
    equity += trade.profit + trade.swap + trade.commission;
    if (equity > peak) peak = equity;
    if (peak > 0) {
      const dd = ((peak - equity) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }

  return maxDD;
}

/**
 * Compute annualized volatility from daily returns.
 */
function computeAnnualizedVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (dailyReturns.length - 1);

  const dailyStdDev = Math.sqrt(variance);
  // Annualize: assuming ~252 trading days
  return dailyStdDev * Math.sqrt(252);
}
