/**
 * CUSUM (Cumulative Sum) drift detector for strategy expectancy.
 *
 * Tracks cumulative deviations from the expected mean PnL per trade.
 * When the CUSUM statistic exceeds a threshold, it signals that the
 * strategy's edge is persistently decaying — not just noisy variation.
 *
 * This catches gradual degradation that point-in-time tolerance bands miss.
 *
 * Algorithm (one-sided lower CUSUM for detecting decrease in mean):
 *   S_n = max(0, S_{n-1} + (μ₀ - x_n) - k)
 *
 *   μ₀ = expected mean PnL per trade (from baseline)
 *   x_n = observed PnL of trade n (normalized as % of balance)
 *   k   = allowance parameter (half the shift we want to detect)
 *   h   = decision threshold (CUSUM > h signals drift)
 *
 * We use k = 0.5σ and h = 4σ (standard ARL₀ ≈ 100+ observations
 * before false alarm at these settings).
 */

export interface CusumState {
  /** Cumulative sum statistic (0 = no drift detected) */
  cusumValue: number;
  /** Whether drift threshold has been exceeded */
  driftDetected: boolean;
  /** Number of trades processed */
  tradesProcessed: number;
  /** Current expected mean (from baseline) */
  expectedMean: number;
  /** Estimated standard deviation of per-trade returns */
  estimatedStdDev: number;
}

export interface CusumResult {
  /** Current CUSUM value (higher = more persistent negative drift) */
  cusumValue: number;
  /** True when CUSUM exceeds decision threshold */
  driftDetected: boolean;
  /** Severity: 0.0 (no drift) to 1.0 (threshold exceeded) */
  driftSeverity: number;
}

/**
 * Compute CUSUM drift statistic from a series of trade returns.
 *
 * @param tradeReturns - Array of per-trade PnL as percentage of balance
 * @param expectedMean - Expected mean per-trade return from baseline (%)
 * @param stdDev - Standard deviation of per-trade returns (%). If 0, estimated from data.
 */
export function computeCusum(
  tradeReturns: number[],
  expectedMean: number,
  stdDev: number
): CusumResult {
  if (tradeReturns.length < 5) {
    return { cusumValue: 0, driftDetected: false, driftSeverity: 0 };
  }

  // Estimate std dev from the data if not provided
  let sigma = stdDev;
  if (sigma <= 0) {
    const mean = tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length;
    const variance =
      tradeReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (tradeReturns.length - 1);
    sigma = Math.sqrt(variance);
    if (sigma <= 0) sigma = 1; // fallback
  }

  // CUSUM parameters
  // k = allowance = 0.5σ (detect shifts of 1σ magnitude)
  // h = decision threshold = 4σ (ARL₀ ≈ 100+, good false alarm rate)
  const k = 0.5 * sigma;
  const h = 4 * sigma;

  // One-sided lower CUSUM: detect decrease in mean
  let cusumLower = 0;
  for (const ret of tradeReturns) {
    // S_n = max(0, S_{n-1} + (μ₀ - x_n) - k)
    // When x_n is below μ₀ by more than k, cusum accumulates
    cusumLower = Math.max(0, cusumLower + (expectedMean - ret) - k);
  }

  const driftDetected = cusumLower > h;
  // Severity: linear ramp from 0 (at 0) to 1 (at h)
  const driftSeverity = Math.min(1.0, cusumLower / Math.max(h, 0.001));

  return { cusumValue: cusumLower, driftDetected, driftSeverity };
}

/**
 * Compute per-trade returns as percentage of running balance.
 * Used as input to the CUSUM detector.
 */
export function computeTradeReturns(
  trades: Array<{ profit: number; swap: number; commission: number }>,
  startBalance: number
): number[] {
  if (trades.length === 0 || startBalance <= 0) return [];

  const returns: number[] = [];
  let balance = startBalance;

  for (const trade of trades) {
    const pnl = trade.profit + trade.swap + trade.commission;
    if (balance > 0) {
      returns.push((pnl / balance) * 100);
    }
    balance += pnl;
  }

  return returns;
}
