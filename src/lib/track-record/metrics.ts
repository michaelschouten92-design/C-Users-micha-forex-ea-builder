/**
 * Risk-adjusted performance metrics for the track record system.
 *
 * Computes Sharpe, Sortino, Calmar, and profit factor from trade results.
 */

export interface TrackRecordMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  profitFactor: number;
}

/**
 * Compute risk-adjusted metrics from an array of trade results (net P&L per trade)
 * and equity curve points.
 *
 * Assumptions:
 * - Trade results are chronologically ordered
 * - Annualization uses 252 trading days
 * - Risk-free rate = 0 (simplification)
 */
export function computeMetrics(
  tradeResults: number[],
  equityCurve: { t: string; b: number; e: number; dd: number }[]
): TrackRecordMetrics {
  if (tradeResults.length < 2) {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      profitFactor: 0,
    };
  }

  const n = tradeResults.length;
  const mean = tradeResults.reduce((a, b) => a + b, 0) / n;

  // Standard deviation (for Sharpe)
  const variance = tradeResults.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  // Downside deviation (for Sortino) — only negative returns
  const downsideVariance =
    tradeResults.reduce((sum, r) => {
      const d = Math.min(0, r - 0); // target return = 0
      return sum + d * d;
    }, 0) /
    (n - 1);
  const downsideStdDev = Math.sqrt(downsideVariance);

  // Sharpe ratio (annualized: assume ~252 trades/year scaling)
  // For per-trade Sharpe, no annualization is applied
  const sharpeRatio = stdDev > 0 ? Math.round((mean / stdDev) * 100) / 100 : 0;

  // Sortino ratio
  const sortinoRatio = downsideStdDev > 0 ? Math.round((mean / downsideStdDev) * 100) / 100 : 0;

  // Calmar ratio: annualized return / max drawdown
  // Use equity curve to find max drawdown percentage
  let maxDrawdownPct = 0;
  for (const point of equityCurve) {
    if (point.dd > maxDrawdownPct) {
      maxDrawdownPct = point.dd;
    }
  }

  const totalReturn = tradeResults.reduce((a, b) => a + b, 0);
  const calmarRatio =
    maxDrawdownPct > 0 ? Math.round((totalReturn / (maxDrawdownPct / 100)) * 100) / 100 : 0;

  // Profit factor
  const grossProfit = tradeResults.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(tradeResults.filter((r) => r < 0).reduce((a, b) => a + b, 0));
  const profitFactor =
    grossLoss > 0
      ? Math.round((grossProfit / grossLoss) * 100) / 100
      : grossProfit > 0
        ? Infinity
        : 0;

  return { sharpeRatio, sortinoRatio, calmarRatio, profitFactor };
}
