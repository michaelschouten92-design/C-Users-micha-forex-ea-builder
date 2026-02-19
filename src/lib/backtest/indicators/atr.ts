/**
 * ATR (Average True Range) matching MT5's iATR.
 * Uses Wilder's smoothing (SMMA).
 */

import type { OHLCVBar } from "../types";

export function calcATR(bars: OHLCVBar[], period: number): number[] {
  const len = bars.length;
  const result = new Array<number>(len).fill(NaN);
  if (len < period + 1) return result;

  // True Range for each bar (starting from bar 1)
  const tr = new Array<number>(len).fill(0);
  for (let i = 1; i < len; i++) {
    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - bars[i - 1].close);
    const lc = Math.abs(bars[i].low - bars[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  // SMA seed for first ATR value
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  result[period] = sum / period;

  // Wilder's smoothing
  for (let i = period + 1; i < len; i++) {
    result[i] = (result[i - 1] * (period - 1) + tr[i]) / period;
  }

  return result;
}
