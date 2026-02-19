/**
 * Walk-forward validation for backtesting.
 * Splits data into overlapping in-sample / out-of-sample windows,
 * runs the backtest on each, and computes walk-forward efficiency.
 */

import type { OHLCVBar, BacktestConfig, BacktestEngineResult } from "./types";
import type { BuildJsonSchema } from "@/types/builder";
import { runBacktest } from "./engine";

export interface WalkForwardWindow {
  inSampleStart: number;
  inSampleEnd: number;
  outOfSampleStart: number;
  outOfSampleEnd: number;
  inSampleProfit: number;
  outOfSampleProfit: number;
  inSampleSharpe: number;
  outOfSampleSharpe: number;
}

export interface WalkForwardResult {
  windows: WalkForwardWindow[];
  overallOutOfSampleProfit: number;
  walkForwardEfficiency: number;
}

/**
 * Run walk-forward validation.
 *
 * Divides the bar data into `windowCount` rolling windows. For each window,
 * the first `inSampleRatio` portion is used as in-sample data and the
 * remaining portion is used as out-of-sample data.
 *
 * @param bars - Full OHLCV bar array
 * @param buildJson - Strategy definition
 * @param config - Backtest configuration
 * @param windowCount - Number of walk-forward windows (default 5)
 * @param inSampleRatio - Fraction of each window used for in-sample (default 0.7)
 */
export function runWalkForward(
  bars: OHLCVBar[],
  buildJson: BuildJsonSchema,
  config: BacktestConfig,
  windowCount: number = 5,
  inSampleRatio: number = 0.7
): WalkForwardResult {
  if (bars.length < 100 || windowCount < 2) {
    return {
      windows: [],
      overallOutOfSampleProfit: 0,
      walkForwardEfficiency: 0,
    };
  }

  // Calculate window size with overlap
  // Total data is divided so that each window steps forward by the OOS portion size
  const oosRatio = 1 - inSampleRatio;
  const stepSize = Math.floor(bars.length / (windowCount + inSampleRatio / oosRatio));
  const windowSize = Math.floor(stepSize / oosRatio);

  const windows: WalkForwardWindow[] = [];
  let totalISProfit = 0;
  let totalOOSProfit = 0;

  for (let w = 0; w < windowCount; w++) {
    const windowStart = w * stepSize;
    const windowEnd = Math.min(windowStart + windowSize, bars.length);

    if (windowEnd - windowStart < 50) break;

    const splitIndex = windowStart + Math.floor((windowEnd - windowStart) * inSampleRatio);

    const inSampleBars = bars.slice(windowStart, splitIndex);
    const outOfSampleBars = bars.slice(splitIndex, windowEnd);

    if (inSampleBars.length < 30 || outOfSampleBars.length < 10) continue;

    // Run backtest on in-sample data
    const isResult = runBacktest(inSampleBars, buildJson, config);

    // Run backtest on out-of-sample data
    const oosResult = runBacktest(outOfSampleBars, buildJson, config);

    const window: WalkForwardWindow = {
      inSampleStart: windowStart,
      inSampleEnd: splitIndex - 1,
      outOfSampleStart: splitIndex,
      outOfSampleEnd: windowEnd - 1,
      inSampleProfit: isResult.netProfit,
      outOfSampleProfit: oosResult.netProfit,
      inSampleSharpe: isResult.sharpeRatio,
      outOfSampleSharpe: oosResult.sharpeRatio,
    };

    windows.push(window);
    totalISProfit += isResult.netProfit;
    totalOOSProfit += oosResult.netProfit;
  }

  // Walk-forward efficiency: ratio of OOS performance to IS performance
  const walkForwardEfficiency = totalISProfit !== 0 ? totalOOSProfit / totalISProfit : 0;

  return {
    windows,
    overallOutOfSampleProfit: totalOOSProfit,
    walkForwardEfficiency,
  };
}
