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
    let riskAmount = balance * (sizing.riskPercent / 100);
    const pointValue = backtestConfig.pointValue;
    if (slDistancePoints <= 0 || pointValue <= 0) return sizing.fixedLot ?? backtestConfig.minLot;

    // Estimate commission cost and subtract from risk budget (round-trip: x2)
    // Use a preliminary lot estimate to approximate commission, then adjust
    const prelimLots = riskAmount / (slDistancePoints * pointValue);
    const estimatedCommission = backtestConfig.commission * prelimLots * 2;
    riskAmount = Math.max(riskAmount - estimatedCommission, 0);
    if (riskAmount <= 0) return backtestConfig.minLot;

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
 * Check if this market order gets requoted (skipped).
 * Returns true if the order should be rejected due to requote.
 */
export function checkRequote(backtestConfig: BacktestConfig): boolean {
  if (backtestConfig.requoteRate <= 0) return false;
  return Math.random() < backtestConfig.requoteRate;
}

/**
 * Calculate slippage for market orders.
 * Uses a realistic model: random slippage between -0.5*spread to +1.5*spread.
 * Negative slippage = favorable fill, positive = unfavorable fill.
 * For limit orders, slippage = 0.
 */
export function calculateMarketOrderSlippage(
  backtestConfig: BacktestConfig,
  isLimitOrder: boolean
): number {
  if (isLimitOrder) return 0;

  const point = Math.pow(10, -backtestConfig.digits);
  const spreadPrice = backtestConfig.spread * point;

  // Random slippage between -0.5*spread to +1.5*spread
  // This means slippage can occasionally be favorable
  const minSlippage = -0.5 * spreadPrice;
  const maxSlippage = 1.5 * spreadPrice;
  return minSlippage + Math.random() * (maxSlippage - minSlippage);
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

  // Market order slippage: random between -0.5*spread to +1.5*spread
  const slippage = calculateMarketOrderSlippage(backtestConfig, false);

  // ASK = close + spread/2, BID = close - spread/2
  // For BUY: fill at ASK + slippage (positive slippage is unfavorable)
  // For SELL: fill at BID - slippage (positive slippage is unfavorable)
  const entryPrice =
    direction === "BUY"
      ? bar.close + spreadCost / 2 + slippage
      : bar.close - spreadCost / 2 - slippage;

  const sl = calculateStopLoss(direction, entryPrice, config, bar, atrValue, backtestConfig);
  const slDistPoints = sl > 0 ? Math.abs(entryPrice - sl) / point : 50;

  const lots = calculateLotSize(config, balance, slDistPoints, backtestConfig);
  const tp = calculateTakeProfit(direction, entryPrice, sl, config, atrValue, backtestConfig);

  // Determine the day this position opens (for swap tracking)
  const openDay = new Date(bar.time).getUTCDate();

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
    accumulatedSwap: 0,
    commissionCharged: 0,
    openBarIndex: barIndex,
    lastSwapDay: openDay,
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
 * Includes accumulated swap in the calculation.
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

  // Include accumulated swap
  return profit - commission + pos.accumulatedSwap;
}

/**
 * Calculate realized profit when position is closed at a specific price.
 * Uses proportional commission based on lots being closed vs original lots.
 * Includes accumulated swap in the result.
 */
export function calcRealizedProfit(
  pos: SimulatedPosition,
  closePrice: number,
  backtestConfig: BacktestConfig
): { profit: number; swap: number; commission: number } {
  const point = Math.pow(10, -backtestConfig.digits);
  const priceDiff =
    pos.direction === "BUY" ? closePrice - pos.openPrice : pos.openPrice - closePrice;

  const pointProfit = priceDiff / point;
  const rawProfit = pointProfit * backtestConfig.pointValue * pos.lots;

  // Proportional commission: charge based on the fraction of the original position being closed
  // Full round-trip commission for the original lot size = commission * originalLots * 2
  // This close covers: commission * originalLots * 2 * (closingLots / originalLots)
  // = commission * closingLots * 2 (but we subtract what was already charged on prior partials)
  const totalRoundTripCommission = backtestConfig.commission * pos.originalLots * 2;
  const fractionClosing = pos.lots / pos.originalLots;
  const proportionalCommission = totalRoundTripCommission * fractionClosing;
  // Subtract any commission already charged on previous partial closes for this fraction
  const remainingCommission = Math.max(0, proportionalCommission);

  // Proportional swap: allocate accumulated swap based on fraction being closed
  const swapForThisClose = pos.accumulatedSwap;

  const netProfit = rawProfit - remainingCommission + swapForThisClose;

  return {
    profit: netProfit,
    swap: swapForThisClose,
    commission: remainingCommission,
  };
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
 * Apply overnight swap/rollover fee when a new day is detected.
 * Should be called each bar; it checks if a new day has started.
 * Returns the swap cost applied (0 if no new day).
 */
export function applySwap(
  pos: SimulatedPosition,
  bar: OHLCVBar,
  backtestConfig: BacktestConfig
): number {
  if (backtestConfig.swapLong === 0 && backtestConfig.swapShort === 0) return 0;

  const barDay = new Date(bar.time).getUTCDate();
  if (barDay === pos.lastSwapDay) return 0;

  // New day detected - apply swap
  pos.lastSwapDay = barDay;
  const swapRate = pos.direction === "BUY" ? backtestConfig.swapLong : backtestConfig.swapShort;
  const swapCost = pos.lots * swapRate;
  pos.accumulatedSwap += swapCost;

  return swapCost;
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
    // Apply closePercent to ORIGINAL lot size, not remaining lots.
    // This prevents compounding errors when partial close is applied after
    // other lot-reducing operations (e.g., multi-level TP).
    const lotsToClose = (pos.originalLots * pc.closePercent) / 100;
    const actualClose = Math.min(lotsToClose, pos.lots);
    return pos.lots > 0 ? actualClose / pos.lots : 0;
  }

  return 0;
}
