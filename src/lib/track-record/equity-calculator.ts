/**
 * Live equity and drawdown calculator for the track record system.
 * Mirrors the backtest EquityTracker logic for parity.
 *
 * Key rules:
 * - Drawdown is peak-to-trough on equity (balance + unrealized PnL), not balance alone
 * - High water mark only advances upward, never resets
 * - Cashflow-adjusted: balance jumps without trades → deposit/withdrawal → HWM adjusted
 */

import type { TrackRecordRunningState, OpenPosition } from "./types";

/**
 * Update equity and drawdown after a snapshot event.
 * Mutates the state in place.
 */
export function updateEquityFromSnapshot(
  state: TrackRecordRunningState,
  balance: number,
  equity: number
): void {
  // Detect cashflow (deposit/withdrawal): balance changed without a trade event
  const balanceDelta = balance - state.balance;
  if (Math.abs(balanceDelta) > 0.01 && state.balance > 0) {
    // Adjust high water mark proportionally for cashflow
    state.highWaterMark += balanceDelta;
  }

  state.balance = balance;
  state.equity = equity;

  // Update high water mark
  if (equity > state.highWaterMark) {
    state.highWaterMark = equity;
  }

  // Update drawdown
  updateDrawdown(state);
}

/**
 * Update state after a trade open event.
 */
export function updateStateOnTradeOpen(
  state: TrackRecordRunningState,
  position: OpenPosition
): void {
  state.openPositions.push(position);
}

/**
 * Update state after a trade close event.
 */
export function updateStateOnTradeClose(
  state: TrackRecordRunningState,
  ticket: string,
  profit: number,
  swap: number,
  commission: number
): void {
  // Remove from open positions
  state.openPositions = state.openPositions.filter((p) => p.ticket !== ticket);

  // Update running totals
  state.totalTrades++;
  const netProfit = profit + swap + commission;
  state.totalProfit += profit;
  state.totalSwap += swap;
  state.totalCommission += commission;
  state.balance += netProfit;

  // Win/loss counting
  if (netProfit >= 0) {
    state.winCount++;
  } else {
    state.lossCount++;
  }

  // Update equity (assuming unrealized PnL unchanged for remaining positions)
  state.equity = state.balance + computeUnrealizedPnL(state.openPositions);

  // Update high water mark
  if (state.equity > state.highWaterMark) {
    state.highWaterMark = state.equity;
  }

  updateDrawdown(state);
}

/**
 * Update state after a partial close event.
 */
export function updateStateOnPartialClose(
  state: TrackRecordRunningState,
  ticket: string,
  remainingLots: number,
  profit: number
): void {
  const position = state.openPositions.find((p) => p.ticket === ticket);
  if (position) {
    position.lots = remainingLots;
  }

  state.totalProfit += profit;
  state.balance += profit;

  state.equity = state.balance + computeUnrealizedPnL(state.openPositions);

  if (state.equity > state.highWaterMark) {
    state.highWaterMark = state.equity;
  }

  updateDrawdown(state);
}

/**
 * Update state after a trade modify event (SL/TP changed).
 */
export function updateStateOnTradeModify(
  state: TrackRecordRunningState,
  ticket: string,
  newSL: number,
  newTP: number
): void {
  const position = state.openPositions.find((p) => p.ticket === ticket);
  if (position) {
    position.sl = newSL;
    position.tp = newTP;
  }
}

/**
 * Update state from a SESSION_START event.
 */
export function updateStateOnSessionStart(state: TrackRecordRunningState, balance: number): void {
  if (state.lastSeqNo <= 1) {
    // First session — initialize
    state.balance = balance;
    state.equity = balance;
    state.highWaterMark = balance;
  }
}

/**
 * Compute unrealized PnL from open positions.
 * Note: This is a simplified placeholder — the EA reports actual unrealized PnL in snapshots.
 * We store positions for tracking but use snapshot-reported equity for accuracy.
 */
function computeUnrealizedPnL(_positions: OpenPosition[]): number {
  // In practice, unrealized PnL comes from the EA's snapshot events
  // which report actual equity. This is only used between snapshots.
  return 0;
}

/**
 * Update max drawdown tracking.
 */
function updateDrawdown(state: TrackRecordRunningState): void {
  if (state.highWaterMark <= 0) return;

  const drawdownAbs = state.highWaterMark - state.equity;
  const drawdownPct = (drawdownAbs / state.highWaterMark) * 100;

  if (drawdownAbs > state.maxDrawdown) {
    state.maxDrawdown = drawdownAbs;
  }
  if (drawdownPct > state.maxDrawdownPct) {
    state.maxDrawdownPct = drawdownPct;
  }
}
