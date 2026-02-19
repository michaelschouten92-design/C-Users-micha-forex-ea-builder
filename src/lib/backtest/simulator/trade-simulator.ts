/**
 * Trade simulator - manages position lifecycle during backtesting.
 * Handles opening, closing, SL/TP hits, trailing stops, breakeven, and partial close.
 */

import type { OHLCVBar, SimulatedPosition, BacktestConfig, PositionDirection } from "../types";
import type { TradeConfig } from "../evaluator/strategy-evaluator";
import type { IndicatorBuffers } from "../indicators";

// ============================================
// POSITION OPENING
// ============================================

/**
 * Calculate lot size based on trade config.
 */
export function calculateLotSize(
  config: TradeConfig,
  balance: number,
  slDistancePoints: number,
  backtestConfig: BacktestConfig
): number {
  const sizing = config.sizing;
  if (!sizing) return backtestConfig.minLot;

  if (sizing.method === "RISK_PERCENT") {
    const riskAmount = balance * (sizing.riskPercent / 100);
    const pointValue = backtestConfig.pointValue;
    if (slDistancePoints <= 0 || pointValue <= 0) return sizing.fixedLot ?? backtestConfig.minLot;

    let lots = riskAmount / (slDistancePoints * pointValue);
    lots = Math.floor(lots / backtestConfig.lotStep) * backtestConfig.lotStep;
    return Math.max(
      sizing.minLot ?? backtestConfig.minLot,
      Math.min(lots, sizing.maxLot ?? backtestConfig.maxLot)
    );
  }

  return Math.max(backtestConfig.minLot, Math.min(sizing.fixedLot ?? 0.01, backtestConfig.maxLot));
}

/**
 * Calculate stop loss price.
 */
export function calculateStopLoss(
  direction: PositionDirection,
  entryPrice: number,
  config: TradeConfig,
  bar: OHLCVBar,
  atrValue: number | undefined,
  backtestConfig: BacktestConfig
): number {
  const sl = config.stopLoss;
  if (!sl) return 0; // No stop loss

  const point = Math.pow(10, -backtestConfig.digits);

  switch (sl.method) {
    case "FIXED_PIPS": {
      const dist = sl.fixedPips * point;
      return direction === "BUY" ? entryPrice - dist : entryPrice + dist;
    }
    case "ATR_BASED": {
      if (atrValue === undefined || isNaN(atrValue)) {
        // Fallback to fixed 50 pips
        const dist = 50 * point;
        return direction === "BUY" ? entryPrice - dist : entryPrice + dist;
      }
      const dist = atrValue * sl.atrMultiplier;
      return direction === "BUY" ? entryPrice - dist : entryPrice + dist;
    }
    case "PERCENT": {
      const dist = entryPrice * (sl.slPercent / 100);
      return direction === "BUY" ? entryPrice - dist : entryPrice + dist;
    }
    default: {
      // Default to 50 pips
      const dist = 50 * point;
      return direction === "BUY" ? entryPrice - dist : entryPrice + dist;
    }
  }
}

/**
 * Calculate take profit price.
 */
export function calculateTakeProfit(
  direction: PositionDirection,
  entryPrice: number,
  slPrice: number,
  config: TradeConfig,
  atrValue: number | undefined,
  backtestConfig: BacktestConfig
): number {
  const tp = config.takeProfit;
  if (!tp) return 0; // No take profit

  const point = Math.pow(10, -backtestConfig.digits);

  switch (tp.method) {
    case "FIXED_PIPS": {
      const dist = tp.fixedPips * point;
      return direction === "BUY" ? entryPrice + dist : entryPrice - dist;
    }
    case "RISK_REWARD": {
      const slDist = Math.abs(entryPrice - slPrice);
      const tpDist = slDist * tp.riskRewardRatio;
      return direction === "BUY" ? entryPrice + tpDist : entryPrice - tpDist;
    }
    case "ATR_BASED": {
      if (atrValue === undefined || isNaN(atrValue)) {
        const dist = 100 * point;
        return direction === "BUY" ? entryPrice + dist : entryPrice - dist;
      }
      const dist = atrValue * tp.atrMultiplier;
      return direction === "BUY" ? entryPrice + dist : entryPrice - dist;
    }
    default: {
      const dist = 100 * point;
      return direction === "BUY" ? entryPrice + dist : entryPrice - dist;
    }
  }
}

/**
 * Open a new position.
 */
export function openPosition(
  id: number,
  direction: PositionDirection,
  bar: OHLCVBar,
  barIndex: number,
  config: TradeConfig,
  balance: number,
  atrValue: number | undefined,
  backtestConfig: BacktestConfig
): SimulatedPosition {
  const point = Math.pow(10, -backtestConfig.digits);
  const spreadCost = backtestConfig.spread * point;

  // Entry price with spread
  const entryPrice =
    direction === "BUY"
      ? bar.close + spreadCost / 2 // Buy at ask (close + half spread)
      : bar.close - spreadCost / 2; // Sell at bid (close - half spread)

  const sl = calculateStopLoss(direction, entryPrice, config, bar, atrValue, backtestConfig);
  const slDistPoints = sl > 0 ? Math.abs(entryPrice - sl) / point : 50;

  const lots = calculateLotSize(config, balance, slDistPoints, backtestConfig);
  const tp = calculateTakeProfit(direction, entryPrice, sl, config, atrValue, backtestConfig);

  return {
    id,
    direction,
    openTime: bar.time,
    openPrice: entryPrice,
    lots,
    stopLoss: sl,
    takeProfit: tp,
    currentSL: sl,
    originalLots: lots,
    partialCloseExecuted: false,
    openBarIndex: barIndex,
  };
}

// ============================================
// POSITION MANAGEMENT (per bar)
// ============================================

/**
 * Check if a position's SL or TP was hit during a bar.
 * Returns the close price and reason, or null if still open.
 */
export function checkSLTP(
  pos: SimulatedPosition,
  bar: OHLCVBar,
  backtestConfig: BacktestConfig
): { closePrice: number; reason: "SL" | "TP" } | null {
  const point = Math.pow(10, -backtestConfig.digits);
  const spreadCost = backtestConfig.spread * point;

  if (pos.direction === "BUY") {
    // Check SL (bid price = close - half spread)
    if (pos.currentSL > 0 && bar.low - spreadCost / 2 <= pos.currentSL) {
      return { closePrice: pos.currentSL, reason: "SL" };
    }
    // Check TP
    if (pos.takeProfit > 0 && bar.high - spreadCost / 2 >= pos.takeProfit) {
      return { closePrice: pos.takeProfit, reason: "TP" };
    }
  } else {
    // SELL
    // Check SL (ask price = close + half spread)
    if (pos.currentSL > 0 && bar.high + spreadCost / 2 >= pos.currentSL) {
      return { closePrice: pos.currentSL, reason: "SL" };
    }
    // Check TP
    if (pos.takeProfit > 0 && bar.low + spreadCost / 2 <= pos.takeProfit) {
      return { closePrice: pos.takeProfit, reason: "TP" };
    }
  }

  return null;
}

/**
 * Calculate unrealized profit for a position at a given bar.
 */
export function calcPositionProfit(
  pos: SimulatedPosition,
  bar: OHLCVBar,
  backtestConfig: BacktestConfig
): number {
  const point = Math.pow(10, -backtestConfig.digits);
  const spreadCost = backtestConfig.spread * point;

  let closePrice: number;
  if (pos.direction === "BUY") {
    closePrice = bar.close - spreadCost / 2; // Bid
  } else {
    closePrice = bar.close + spreadCost / 2; // Ask
  }

  const priceDiff =
    pos.direction === "BUY" ? closePrice - pos.openPrice : pos.openPrice - closePrice;

  const pointProfit = priceDiff / point;
  const profit = pointProfit * backtestConfig.pointValue * pos.lots;

  // Subtract commission (per side, so x2 for round trip)
  const commission = backtestConfig.commission * pos.lots * 2;

  return profit - commission;
}

/**
 * Calculate realized profit when position is closed at a specific price.
 */
export function calcRealizedProfit(
  pos: SimulatedPosition,
  closePrice: number,
  backtestConfig: BacktestConfig
): number {
  const point = Math.pow(10, -backtestConfig.digits);
  const priceDiff =
    pos.direction === "BUY" ? closePrice - pos.openPrice : pos.openPrice - closePrice;

  const pointProfit = priceDiff / point;
  const profit = pointProfit * backtestConfig.pointValue * pos.lots;
  const commission = backtestConfig.commission * pos.lots * 2;

  return profit - commission;
}

/**
 * Apply trailing stop logic.
 */
export function applyTrailingStop(
  pos: SimulatedPosition,
  bar: OHLCVBar,
  config: TradeConfig,
  atrValue: number | undefined,
  backtestConfig: BacktestConfig
): void {
  const ts = config.trailingStop;
  if (!ts) return;

  const point = Math.pow(10, -backtestConfig.digits);

  // Check if we should start trailing
  const profitPips =
    pos.direction === "BUY"
      ? (bar.close - pos.openPrice) / point
      : (pos.openPrice - bar.close) / point;

  if (profitPips < ts.startAfterPips) return;

  // Calculate trail distance
  let trailDist: number;
  switch (ts.method) {
    case "FIXED_PIPS":
      trailDist = ts.trailPips * point;
      break;
    case "ATR_BASED":
      if (atrValue === undefined || isNaN(atrValue)) return;
      trailDist = atrValue * ts.trailAtrMultiplier;
      break;
    case "PERCENTAGE":
      trailDist = bar.close * (ts.trailPercent / 100);
      break;
    default:
      return;
  }

  // Calculate new SL
  let newSL: number;
  if (pos.direction === "BUY") {
    newSL = bar.close - trailDist;
    if (newSL > pos.currentSL && newSL > pos.openPrice) {
      pos.currentSL = newSL;
    }
  } else {
    newSL = bar.close + trailDist;
    if ((pos.currentSL === 0 || newSL < pos.currentSL) && newSL < pos.openPrice) {
      pos.currentSL = newSL;
    }
  }
}

/**
 * Apply breakeven stop logic.
 */
export function applyBreakevenStop(
  pos: SimulatedPosition,
  bar: OHLCVBar,
  config: TradeConfig,
  atrValue: number | undefined,
  backtestConfig: BacktestConfig
): void {
  const be = config.breakevenStop;
  if (!be) return;

  const point = Math.pow(10, -backtestConfig.digits);

  // Calculate trigger distance in price
  let triggerDist: number;
  switch (be.trigger) {
    case "PIPS":
      triggerDist = be.triggerPips * point;
      break;
    case "ATR":
      if (atrValue === undefined || isNaN(atrValue)) return;
      triggerDist = atrValue * be.triggerAtrMultiplier;
      break;
    case "PERCENTAGE":
      triggerDist = pos.openPrice * (be.triggerPercent / 100);
      break;
    default:
      return;
  }

  const lockExtra = be.lockPips * point;

  if (pos.direction === "BUY") {
    if (bar.close >= pos.openPrice + triggerDist) {
      const newSL = pos.openPrice + lockExtra;
      if (newSL > pos.currentSL) {
        pos.currentSL = newSL;
      }
    }
  } else {
    if (bar.close <= pos.openPrice - triggerDist) {
      const newSL = pos.openPrice - lockExtra;
      if (pos.currentSL === 0 || newSL < pos.currentSL) {
        pos.currentSL = newSL;
      }
    }
  }
}

/**
 * Check partial close trigger. Returns the percentage to close, or 0.
 */
export function checkPartialClose(
  pos: SimulatedPosition,
  bar: OHLCVBar,
  config: TradeConfig,
  backtestConfig: BacktestConfig
): number {
  const pc = config.partialClose;
  if (!pc || pos.partialCloseExecuted) return 0;

  const point = Math.pow(10, -backtestConfig.digits);
  const profitPips =
    pos.direction === "BUY"
      ? (bar.close - pos.openPrice) / point
      : (pos.openPrice - bar.close) / point;

  let triggered = false;
  if (pc.triggerMethod === "PIPS") {
    triggered = profitPips >= pc.triggerPips;
  } else {
    const profitPercent =
      ((profitPips * point * backtestConfig.pointValue * pos.lots) / (pos.openPrice * pos.lots)) *
      100;
    triggered = profitPercent >= pc.triggerPercent;
  }

  if (triggered) {
    pos.partialCloseExecuted = true;
    if (pc.moveSLToBreakeven) {
      pos.currentSL = pos.openPrice;
    }
    return pc.closePercent / 100;
  }

  return 0;
}
