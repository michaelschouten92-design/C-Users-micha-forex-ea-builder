/**
 * Condition evaluator - evaluates indicator conditions for buy/sell signals.
 * Mirrors the MQL5 generator's condition logic in JavaScript.
 */

import type { ConditionOperator } from "@/types/builder";

const EPSILON = 1e-8;

function DoubleGT(a: number, b: number): boolean {
  return a - b > EPSILON;
}
function DoubleLT(a: number, b: number): boolean {
  return b - a > EPSILON;
}
function DoubleGE(a: number, b: number): boolean {
  return a - b > -EPSILON;
}
function DoubleLE(a: number, b: number): boolean {
  return b - a > -EPSILON;
}
function DoubleEQ(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

/**
 * Evaluate a single condition operator against current and previous bar values.
 * For cross conditions, both current and previous values are required.
 */
export function evaluateCondition(
  operator: ConditionOperator,
  currentValue: number,
  threshold: number,
  previousValue?: number
): boolean {
  if (isNaN(currentValue) || isNaN(threshold)) return false;

  switch (operator) {
    case "GREATER_THAN":
      return DoubleGT(currentValue, threshold);
    case "LESS_THAN":
      return DoubleLT(currentValue, threshold);
    case "GREATER_EQUAL":
      return DoubleGE(currentValue, threshold);
    case "LESS_EQUAL":
      return DoubleLE(currentValue, threshold);
    case "EQUAL":
      return DoubleEQ(currentValue, threshold);
    case "CROSSES_ABOVE":
      if (previousValue === undefined || isNaN(previousValue)) return false;
      return DoubleLE(previousValue, threshold) && DoubleGT(currentValue, threshold);
    case "CROSSES_BELOW":
      if (previousValue === undefined || isNaN(previousValue)) return false;
      return DoubleGE(previousValue, threshold) && DoubleLT(currentValue, threshold);
    default:
      return false;
  }
}

/**
 * Evaluate a cross between two indicator lines (e.g., EMA fast crosses above EMA slow).
 */
export function evaluateCrossover(
  currentA: number,
  previousA: number,
  currentB: number,
  previousB: number
): { crossAbove: boolean; crossBelow: boolean } {
  if ([currentA, previousA, currentB, previousB].some(isNaN)) {
    return { crossAbove: false, crossBelow: false };
  }

  return {
    crossAbove: DoubleLE(previousA, previousB) && DoubleGT(currentA, currentB),
    crossBelow: DoubleGE(previousA, previousB) && DoubleLT(currentA, currentB),
  };
}

/**
 * Evaluate RSI-specific conditions for entry signals.
 */
export function evaluateRSISignal(
  current: number,
  previous: number,
  overbought: number,
  oversold: number
): { buySignal: boolean; sellSignal: boolean } {
  if (isNaN(current) || isNaN(previous)) return { buySignal: false, sellSignal: false };

  return {
    // Buy when RSI crosses above oversold level (reversal from oversold)
    buySignal: DoubleLE(previous, oversold) && DoubleGT(current, oversold),
    // Sell when RSI crosses below overbought level (reversal from overbought)
    sellSignal: DoubleGE(previous, overbought) && DoubleLT(current, overbought),
  };
}

/**
 * Evaluate MACD-specific conditions.
 */
export function evaluateMACDSignal(
  mainCurr: number,
  mainPrev: number,
  signalCurr: number,
  signalPrev: number,
  signalType: string = "SIGNAL_CROSS"
): { buySignal: boolean; sellSignal: boolean } {
  if ([mainCurr, mainPrev, signalCurr, signalPrev].some(isNaN)) {
    return { buySignal: false, sellSignal: false };
  }

  switch (signalType) {
    case "SIGNAL_CROSS": {
      const cross = evaluateCrossover(mainCurr, mainPrev, signalCurr, signalPrev);
      return { buySignal: cross.crossAbove, sellSignal: cross.crossBelow };
    }
    case "ZERO_CROSS":
      return {
        buySignal: DoubleLE(mainPrev, 0) && DoubleGT(mainCurr, 0),
        sellSignal: DoubleGE(mainPrev, 0) && DoubleLT(mainCurr, 0),
      };
    case "HISTOGRAM_SIGN": {
      const histCurr = mainCurr - signalCurr;
      const histPrev = mainPrev - signalPrev;
      return {
        buySignal: DoubleLT(histPrev, 0) && DoubleGT(histCurr, 0),
        sellSignal: DoubleGT(histPrev, 0) && DoubleLT(histCurr, 0),
      };
    }
    default:
      return { buySignal: false, sellSignal: false };
  }
}
