/**
 * ADX (Average Directional Index) matching MT5's iADX.
 * Includes +DI, -DI, and ADX lines. Uses Wilder's smoothing.
 */

import type { OHLCVBar } from "../types";

export interface ADXResult {
  adx: number[]; // ADX main line
  plusDI: number[]; // +DI line
  minusDI: number[]; // -DI line
}

export function calcADX(bars: OHLCVBar[], period: number): ADXResult {
  const len = bars.length;
  const adx = new Array<number>(len).fill(NaN);
  const plusDI = new Array<number>(len).fill(NaN);
  const minusDI = new Array<number>(len).fill(NaN);

  if (len < period * 2 + 1) return { adx, plusDI, minusDI };

  // Step 1: Calculate +DM, -DM, and TR
  const plusDM = new Array<number>(len).fill(0);
  const minusDM = new Array<number>(len).fill(0);
  const tr = new Array<number>(len).fill(0);

  for (let i = 1; i < len; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;

    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;

    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - bars[i - 1].close);
    const lc = Math.abs(bars[i].low - bars[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  // Step 2: Smooth with Wilder's (SMA seed, then SMMA)
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;
  let smoothTR = 0;

  for (let i = 1; i <= period; i++) {
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
    smoothTR += tr[i];
  }

  // First DI values
  plusDI[period] = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
  minusDI[period] = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

  // Continue Wilder's smoothing for DI
  for (let i = period + 1; i < len; i++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    smoothTR = smoothTR - smoothTR / period + tr[i];

    plusDI[i] = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    minusDI[i] = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
  }

  // Step 3: Calculate DX and smooth into ADX
  const dx = new Array<number>(len).fill(NaN);
  for (let i = period; i < len; i++) {
    if (!isNaN(plusDI[i]) && !isNaN(minusDI[i])) {
      const diSum = plusDI[i] + minusDI[i];
      dx[i] = diSum > 0 ? (Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100 : 0;
    }
  }

  // ADX = Wilder's smoothed DX (SMA seed of first `period` DX values)
  const adxStart = period * 2;
  if (adxStart >= len) return { adx, plusDI, minusDI };

  let dxSum = 0;
  for (let i = period; i < adxStart; i++) {
    dxSum += isNaN(dx[i]) ? 0 : dx[i];
  }
  adx[adxStart - 1] = dxSum / period;

  for (let i = adxStart; i < len; i++) {
    const dxVal = isNaN(dx[i]) ? 0 : dx[i];
    adx[i] = (adx[i - 1] * (period - 1) + dxVal) / period;
  }

  return { adx, plusDI, minusDI };
}
