/**
 * Moving Average calculations matching MT5 exactly.
 * Supports SMA, EMA, SMMA (Wilder), LWMA.
 */

export type MAMethod = "SMA" | "EMA" | "SMMA" | "LWMA";

/**
 * Simple Moving Average
 */
export function calcSMA(data: number[], period: number): number[] {
  const result = new Array<number>(data.length).fill(NaN);
  if (data.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result[i] = sum / period;
  }
  return result;
}

/**
 * Exponential Moving Average (SMA seed for first value, then EMA formula)
 */
export function calcEMA(data: number[], period: number): number[] {
  const result = new Array<number>(data.length).fill(NaN);
  if (data.length < period) return result;

  // SMA seed
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;

  const k = 2.0 / (period + 1);
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/**
 * Smoothed Moving Average (Wilder's smoothing) - matches MT5's MODE_SMMA.
 * Also known as Wilder's EMA with factor 1/period.
 */
export function calcSMMA(data: number[], period: number): number[] {
  const result = new Array<number>(data.length).fill(NaN);
  if (data.length < period) return result;

  // SMA seed
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    result[i] = (result[i - 1] * (period - 1) + data[i]) / period;
  }
  return result;
}

/**
 * Linear Weighted Moving Average
 */
export function calcLWMA(data: number[], period: number): number[] {
  const result = new Array<number>(data.length).fill(NaN);
  if (data.length < period) return result;

  const weightSum = (period * (period + 1)) / 2;

  for (let i = period - 1; i < data.length; i++) {
    let wSum = 0;
    for (let j = 0; j < period; j++) {
      wSum += data[i - period + 1 + j] * (j + 1);
    }
    result[i] = wSum / weightSum;
  }
  return result;
}

/**
 * Compute MA using the specified method.
 */
export function calcMA(data: number[], period: number, method: MAMethod): number[] {
  switch (method) {
    case "SMA":
      return calcSMA(data, period);
    case "EMA":
      return calcEMA(data, period);
    case "SMMA":
      return calcSMMA(data, period);
    case "LWMA":
      return calcLWMA(data, period);
    default:
      return calcSMA(data, period);
  }
}
