/**
 * RSI (Relative Strength Index) matching MT5's iRSI.
 * Uses Wilder's smoothing (SMMA) for average gain/loss.
 */

export function calcRSI(data: number[], period: number): number[] {
  const result = new Array<number>(data.length).fill(NaN);
  if (data.length < period + 1) return result;

  // Calculate price changes
  const changes = new Array<number>(data.length).fill(0);
  for (let i = 1; i < data.length; i++) {
    changes[i] = data[i] - data[i - 1];
  }

  // Initial average gain/loss (SMA seed over first `period` changes)
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // First RSI value
  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  // Subsequent values using Wilder's smoothing
  for (let i = period + 1; i < data.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}
