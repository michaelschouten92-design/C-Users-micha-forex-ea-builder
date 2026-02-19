/**
 * Bollinger Bands matching MT5's iBands.
 * Middle = MA, Upper = MA + deviation * StdDev, Lower = MA - deviation * StdDev.
 */

import { calcMA, type MAMethod } from "./moving-average";

export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function calcBollingerBands(
  data: number[],
  period: number,
  deviation: number,
  method: MAMethod = "SMA"
): BollingerResult {
  const len = data.length;
  const upper = new Array<number>(len).fill(NaN);
  const middle = calcMA(data, period, method);
  const lower = new Array<number>(len).fill(NaN);

  for (let i = period - 1; i < len; i++) {
    if (isNaN(middle[i])) continue;

    // Standard deviation over the period
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j] - middle[i];
      sumSq += diff * diff;
    }
    const stdDev = Math.sqrt(sumSq / period);

    upper[i] = middle[i] + deviation * stdDev;
    lower[i] = middle[i] - deviation * stdDev;
  }

  return { upper, middle, lower };
}
