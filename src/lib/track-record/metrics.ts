/**
 * Risk-adjusted performance metrics for the track record system.
 *
 * Computes Sharpe, Sortino, Calmar, and profit factor from trade results.
 */

/**
 * Cap for profit factor when there are no losing trades. Raw JavaScript
 * Infinity silently serializes to JSON null (per ECMA-404), which breaks
 * frontend display and downstream filtering. A finite cap preserves the
 * "practically infinite" signal while staying JSON-safe. Rounded down from
 * 1000 so it's visually distinct from legitimate real-world values (~0-10).
 */
export const PROFIT_FACTOR_MAX = 999.99;

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

  // Calmar ratio: total return % / max drawdown % (dimensionally consistent,
  // matches industry convention). Previously divided dollars by a decimal
  // which gave nonsense values ($500 / 0.10 = 5000).
  let maxDrawdownPct = 0;
  for (const point of equityCurve) {
    if (point.dd > maxDrawdownPct) {
      maxDrawdownPct = point.dd;
    }
  }

  const totalReturnDollars = tradeResults.reduce((a, b) => a + b, 0);
  const initialBalance = equityCurve[0]?.b ?? 0;
  const totalReturnPct = initialBalance > 0 ? (totalReturnDollars / initialBalance) * 100 : 0;
  const calmarRatio =
    maxDrawdownPct > 0 ? Math.round((totalReturnPct / maxDrawdownPct) * 100) / 100 : 0;

  // Profit factor — capped at PROFIT_FACTOR_MAX instead of Infinity so it
  // survives JSON serialization (JSON.stringify(Infinity) -> null).
  const grossProfit = tradeResults.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(tradeResults.filter((r) => r < 0).reduce((a, b) => a + b, 0));
  const profitFactor =
    grossLoss > 0
      ? Math.round((grossProfit / grossLoss) * 100) / 100
      : grossProfit > 0
        ? PROFIT_FACTOR_MAX
        : 0;

  return { sharpeRatio, sortinoRatio, calmarRatio, profitFactor };
}
