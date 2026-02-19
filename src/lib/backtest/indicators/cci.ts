/**
 * CCI (Commodity Channel Index) matching MT5's iCCI.
 * CCI = (Typical Price - SMA of TP) / (0.015 * Mean Deviation)
 */

export function calcCCI(data: number[], period: number): number[] {
  const len = data.length;
  const result = new Array<number>(len).fill(NaN);
  if (len < period) return result;

  for (let i = period - 1; i < len; i++) {
    // SMA of data over period
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    const sma = sum / period;

    // Mean Deviation
    let md = 0;
    for (let j = i - period + 1; j <= i; j++) md += Math.abs(data[j] - sma);
    md /= period;

    result[i] = md > 0 ? (data[i] - sma) / (0.015 * md) : 0;
  }

  return result;
}
