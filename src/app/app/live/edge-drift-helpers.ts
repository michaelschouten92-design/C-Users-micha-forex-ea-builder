/**
 * Edge drift helpers for live winrate derivation.
 * Pure functions — no I/O, no side effects.
 */

export const EDGE_DRIFT_TRADES_N = 50;
export const EDGE_DRIFT_MIN_TRADES = 20;

export interface LiveWinrateResult {
  ok: boolean;
  liveWinrate?: number; // 0..100
  sampleSize: number;
  needed: number;
}

/**
 * Compute live winrate from closed trades.
 *
 * Win definition: profit > 0 (strict).
 * profit === 0 counts as NOT a win.
 *
 * Returns ok:false when sampleSize < EDGE_DRIFT_MIN_TRADES.
 */
export function computeLiveWinrateFromTrades(
  trades: { profit: number | null }[]
): LiveWinrateResult {
  // Filter to trades with non-null profit
  const valid = trades.filter((t): t is { profit: number } => t.profit !== null);
  const sampleSize = valid.length;

  if (sampleSize < EDGE_DRIFT_MIN_TRADES) {
    return { ok: false, sampleSize, needed: EDGE_DRIFT_TRADES_N };
  }

  const wins = valid.filter((t) => t.profit > 0).length;
  const liveWinrate = (wins / sampleSize) * 100;

  return { ok: true, liveWinrate, sampleSize, needed: EDGE_DRIFT_TRADES_N };
}
