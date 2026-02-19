/**
 * MACD (Moving Average Convergence Divergence) matching MT5's iMACD.
 * Fast EMA - Slow EMA = MACD line, Signal EMA of MACD line, Histogram = MACD - Signal.
 */

import { calcEMA } from "./moving-average";

export interface MACDResult {
  main: number[]; // MACD line (fast EMA - slow EMA)
  signal: number[]; // Signal line (EMA of MACD)
  histogram: number[]; // MACD - Signal
}

export function calcMACD(
  data: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): MACDResult {
  const len = data.length;
  const main = new Array<number>(len).fill(NaN);
  const signal = new Array<number>(len).fill(NaN);
  const histogram = new Array<number>(len).fill(NaN);

  if (len < slowPeriod) return { main, signal, histogram };

  const fastEMA = calcEMA(data, fastPeriod);
  const slowEMA = calcEMA(data, slowPeriod);

  // MACD line = fast EMA - slow EMA (valid from slowPeriod-1 onwards)
  for (let i = slowPeriod - 1; i < len; i++) {
    if (!isNaN(fastEMA[i]) && !isNaN(slowEMA[i])) {
      main[i] = fastEMA[i] - slowEMA[i];
    }
  }

  // Signal line = EMA of MACD line
  // Need to extract valid MACD values for EMA calculation
  const validStart = slowPeriod - 1;
  const macdValues = main.slice(validStart).map((v) => (isNaN(v) ? 0 : v));
  const signalEMA = calcEMA(macdValues, signalPeriod);

  for (let i = 0; i < signalEMA.length; i++) {
    if (!isNaN(signalEMA[i])) {
      signal[validStart + i] = signalEMA[i];
      if (!isNaN(main[validStart + i])) {
        histogram[validStart + i] = main[validStart + i] - signalEMA[i];
      }
    }
  }

  return { main, signal, histogram };
}
