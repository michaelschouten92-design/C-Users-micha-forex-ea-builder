/**
 * Live metrics computation — pure functions for monitoring evaluation.
 *
 * All functions are deterministic, take explicit inputs, no IO.
 * Sharpe methodology matches track-record/metrics.ts (per-trade, mean/stdDev).
 */

/**
 * Compute max drawdown % from an equity curve built from trade PnLs.
 * Returns 0 if no drawdown occurs. Always non-negative.
 */
export function computeLiveMaxDrawdownPct(tradePnls: number[], initialBalance: number): number {
  if (tradePnls.length === 0 || initialBalance <= 0) return 0;

  let equity = initialBalance;
  let peak = initialBalance;
  let maxDrawdownPct = 0;

  for (const pnl of tradePnls) {
    equity += pnl;
    if (equity > peak) peak = equity;
    if (peak > 0) {
      const drawdownPct = ((peak - equity) / peak) * 100;
      if (drawdownPct > maxDrawdownPct) maxDrawdownPct = drawdownPct;
    }
  }

  return maxDrawdownPct;
}

/**
 * Per-trade Sharpe ratio: mean / stdDev of profits.
 * Returns 0 if fewer than 2 trades (matches track-record/metrics.ts).
 * Uses sample standard deviation (n-1).
 */
export function computeSharpe(tradePnls: number[]): number {
  if (tradePnls.length < 2) return 0;

  const n = tradePnls.length;
  const mean = tradePnls.reduce((a, b) => a + b, 0) / n;
  const variance = tradePnls.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return Math.round((mean / stdDev) * 100) / 100;
}

/**
 * Count consecutive losing trades from the most recent trade backward.
 * A loss is a trade with profit <= 0.
 */
export function computeCurrentLosingStreak(tradePnls: number[]): number {
  let streak = 0;
  for (let i = tradePnls.length - 1; i >= 0; i--) {
    if (tradePnls[i] <= 0) streak++;
    else break;
  }
  return streak;
}

/**
 * Calendar days since the latest trade date.
 * Deterministic: takes `now` as an explicit parameter.
 */
export function computeDaysSinceLastTrade(latestTradeDate: Date, now: Date): number {
  const diffMs = now.getTime() - latestTradeDate.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}
