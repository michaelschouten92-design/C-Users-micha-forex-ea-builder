/**
 * Equity and balance tracker for backtesting.
 * Tracks running balance, equity, drawdown, and generates equity curve points.
 */

import type { BacktestConfig, EquityCurvePoint, SimulatedPosition, OHLCVBar } from "../types";
import { calcPositionProfit } from "./trade-simulator";

export class EquityTracker {
  private balance: number;
  private highWaterMark: number;
  private maxDrawdown = 0;
  private maxDrawdownPercent = 0;
  private equityCurve: EquityCurvePoint[] = [];
  private config: BacktestConfig;
  // Track total swap applied across all positions for accurate equity reporting
  private accumulatedSwapTotal = 0;

  constructor(config: BacktestConfig) {
    this.balance = config.initialBalance;
    this.highWaterMark = config.initialBalance;
    this.config = config;
  }

  getBalance(): number {
    return this.balance;
  }
  getMaxDrawdown(): number {
    return this.maxDrawdown;
  }
  getMaxDrawdownPercent(): number {
    return this.maxDrawdownPercent;
  }
  getEquityCurve(): EquityCurvePoint[] {
    return this.equityCurve;
  }
  getAccumulatedSwapTotal(): number {
    return this.accumulatedSwapTotal;
  }

  /**
   * Record a closed trade's profit/loss (profit should already include swap & commission).
   */
  recordTrade(profit: number): void {
    this.balance += profit;
    if (this.balance > this.highWaterMark) {
      this.highWaterMark = this.balance;
    }
  }

  /**
   * Record swap applied to open positions (for running total tracking).
   */
  recordSwap(swapAmount: number): void {
    this.accumulatedSwapTotal += swapAmount;
  }

  /**
   * Update equity snapshot at each bar (includes unrealized P&L + accumulated swap).
   * calcPositionProfit already includes pos.accumulatedSwap in its calculation,
   * so equity = balance + unrealizedPnL (which contains swap).
   */
  updateEquity(barIndex: number, bar: OHLCVBar, openPositions: SimulatedPosition[]): void {
    // Calculate unrealized P&L (includes accumulated swap per position)
    let unrealizedPnL = 0;
    for (const pos of openPositions) {
      unrealizedPnL += calcPositionProfit(pos, bar, this.config);
    }

    const equity = this.balance + unrealizedPnL;

    // Update high water mark and drawdown
    if (equity > this.highWaterMark) {
      this.highWaterMark = equity;
    }

    const drawdown = this.highWaterMark - equity;
    const drawdownPercent = this.highWaterMark > 0 ? (drawdown / this.highWaterMark) * 100 : 0;

    if (drawdown > this.maxDrawdown) {
      this.maxDrawdown = drawdown;
    }
    if (drawdownPercent > this.maxDrawdownPercent) {
      this.maxDrawdownPercent = drawdownPercent;
    }

    // Record equity curve point (every 10 bars to keep array manageable)
    if (barIndex % 10 === 0 || openPositions.length > 0) {
      this.equityCurve.push({
        barIndex,
        time: bar.time,
        balance: this.balance,
        equity,
        drawdown: drawdownPercent,
      });
    }
  }
}
