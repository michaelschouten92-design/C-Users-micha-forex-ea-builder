/**
 * Stochastic Oscillator matching MT5's iStochastic.
 * %K with slowing, %D = SMA of %K.
 */

import type { OHLCVBar } from "../types";
import { calcMA, type MAMethod } from "./moving-average";

export interface StochasticResult {
  main: number[]; // %K line
  signal: number[]; // %D line
}

export function calcStochastic(
  bars: OHLCVBar[],
  kPeriod: number,
  dPeriod: number,
  slowing: number,
  maMethod: MAMethod = "SMA"
): StochasticResult {
  const len = bars.length;
  const main = new Array<number>(len).fill(NaN);
  const signal = new Array<number>(len).fill(NaN);

  if (len < kPeriod + slowing - 1) return { main, signal };

  // Step 1: Raw %K (before slowing)
  // For each bar, compute (Close - LowestLow) / (HighestHigh - LowestLow) * 100
  const rawK = new Array<number>(len).fill(NaN);
  for (let i = kPeriod - 1; i < len; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (bars[j].high > hh) hh = bars[j].high;
      if (bars[j].low < ll) ll = bars[j].low;
    }
    const range = hh - ll;
    rawK[i] = range > 0 ? ((bars[i].close - ll) / range) * 100 : 50;
  }

  // Step 2: Apply slowing (SMA of rawK over `slowing` periods)
  if (slowing <= 1) {
    for (let i = 0; i < len; i++) main[i] = rawK[i];
  } else {
    const startIdx = kPeriod - 1;
    for (let i = startIdx + slowing - 1; i < len; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - slowing + 1; j <= i; j++) {
        if (!isNaN(rawK[j])) {
          sum += rawK[j];
          count++;
        }
      }
      if (count === slowing) main[i] = sum / slowing;
    }
  }

  // Step 3: %D = MA of %K
  const validMainValues: number[] = [];
  const validMainIndices: number[] = [];
  for (let i = 0; i < len; i++) {
    if (!isNaN(main[i])) {
      validMainValues.push(main[i]);
      validMainIndices.push(i);
    }
  }

  const dValues = calcMA(validMainValues, dPeriod, maMethod);
  for (let i = 0; i < dValues.length; i++) {
    if (!isNaN(dValues[i])) {
      signal[validMainIndices[i]] = dValues[i];
    }
  }

  return { main, signal };
}
