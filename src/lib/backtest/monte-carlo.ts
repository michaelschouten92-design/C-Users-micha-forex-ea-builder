/**
 * Monte Carlo simulation for backtest results.
 * Shuffles trade order randomly N times to estimate confidence intervals
 * for max drawdown, final balance, and probability of ruin.
 */

export interface MonteCarloResult {
  simulations: number;
  confidence95: {
    maxDrawdown: number;
    finalBalance: number;
    worstReturn: number;
  };
  confidence99: {
    maxDrawdown: number;
    finalBalance: number;
    worstReturn: number;
  };
  medianFinalBalance: number;
  probabilityOfRuin: number;
  equityCurves: number[][];
}

/**
 * Fisher-Yates shuffle of an array (in place).
 */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Get a percentile value from a sorted array.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Run Monte Carlo simulation by shuffling trade order.
 *
 * @param trades - Array of trade results with profit values
 * @param initialBalance - Starting account balance
 * @param simulations - Number of simulations to run (default 1000)
 * @param ruinThreshold - Drawdown fraction that constitutes "ruin" (default 0.5 = 50%)
 */
export function runMonteCarloSimulation(
  trades: { profit: number }[],
  initialBalance: number,
  simulations: number = 1000,
  ruinThreshold: number = 0.5
): MonteCarloResult {
  if (trades.length === 0) {
    return {
      simulations: 0,
      confidence95: { maxDrawdown: 0, finalBalance: initialBalance, worstReturn: 0 },
      confidence99: { maxDrawdown: 0, finalBalance: initialBalance, worstReturn: 0 },
      medianFinalBalance: initialBalance,
      probabilityOfRuin: 0,
      equityCurves: [],
    };
  }

  const profits = trades.map((t) => t.profit);
  const finalBalances: number[] = [];
  const maxDrawdowns: number[] = [];
  let ruinCount = 0;

  // Number of equity curves to keep for visualization (evenly sampled)
  const maxCurvesToKeep = 20;
  const curveInterval = Math.max(1, Math.floor(simulations / maxCurvesToKeep));
  const equityCurves: number[][] = [];

  for (let sim = 0; sim < simulations; sim++) {
    // Shuffle trade order
    const shuffled = [...profits];
    shuffleArray(shuffled);

    // Simulate equity curve
    let balance = initialBalance;
    let peak = initialBalance;
    let maxDD = 0;
    const keepCurve = sim % curveInterval === 0 && equityCurves.length < maxCurvesToKeep;
    const curve: number[] = keepCurve ? [initialBalance] : [];

    for (const profit of shuffled) {
      balance += profit;

      if (balance > peak) {
        peak = balance;
      }

      const drawdown = peak - balance;
      if (drawdown > maxDD) {
        maxDD = drawdown;
      }

      if (keepCurve) {
        curve.push(balance);
      }
    }

    finalBalances.push(balance);
    maxDrawdowns.push(maxDD);

    // Check if drawdown exceeded ruin threshold
    const maxDDPercent = peak > 0 ? maxDD / peak : 0;
    if (maxDDPercent >= ruinThreshold) {
      ruinCount++;
    }

    if (keepCurve) {
      equityCurves.push(curve);
    }
  }

  // Sort for percentile calculations
  finalBalances.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => a - b);

  const worstReturns = finalBalances.map((b) => b - initialBalance);

  return {
    simulations,
    confidence95: {
      maxDrawdown: percentile(maxDrawdowns, 95),
      finalBalance: percentile(finalBalances, 5),
      worstReturn: percentile(worstReturns, 5),
    },
    confidence99: {
      maxDrawdown: percentile(maxDrawdowns, 99),
      finalBalance: percentile(finalBalances, 1),
      worstReturn: percentile(worstReturns, 1),
    },
    medianFinalBalance: percentile(finalBalances, 50),
    probabilityOfRuin: (ruinCount / simulations) * 100,
    equityCurves,
  };
}
