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
  state.openPositions = state.openPositions.filter((p) => p.ticket !== ticket);

  state.totalTrades++;
  const netProfit = profit + swap + commission;
  state.totalProfit += profit;
  state.totalSwap += swap;
  state.totalCommission += commission;
  state.balance += netProfit;

  if (netProfit >= 0) {
    state.winCount++;
  } else {
    state.lossCount++;
  }

  // Equity correction: the closed trade's unrealized PnL was approximately equal to profit.
  // After closing: equity adjusts by swap + commission (profit was already reflected in equity).
  // Falls back to balance if equity was never set (first trade scenario).
  if (state.equity > 0) {
    state.equity += swap + commission;
  } else {
    state.equity = state.balance;
  }

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

  // Partial close realized profit adjusts balance; equity follows
  if (state.equity > 0) {
    state.equity += profit;
  } else {
    state.equity = state.balance;
  }

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
  } else if (state.balance > 0) {
    // Subsequent session — check for drift
    const drift = Math.abs(balance - state.balance) / state.balance;
    if (drift > 0.5) {
      // >50% drift is suspicious but could be a large deposit/withdrawal
      // Log warning but don't reject — the CASHFLOW event should follow
      console.warn(
        `TrackRecord: SESSION_START balance drift ${(drift * 100).toFixed(1)}%: ` +
          `expected ~${state.balance.toFixed(2)}, got ${balance.toFixed(2)}`
      );
    }
  }
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

  // Track peak equity timestamp
  if (state.equity >= state.highWaterMark) {
    state.peakEquityTimestamp = Math.floor(Date.now() / 1000);
    state.drawdownStartTimestamp = 0; // Not in drawdown
  } else if (state.drawdownStartTimestamp === 0 && drawdownAbs > 0.01) {
    state.drawdownStartTimestamp = Math.floor(Date.now() / 1000);
  }

  // Update max drawdown duration
  if (state.drawdownStartTimestamp > 0) {
    const now = Math.floor(Date.now() / 1000);
    const duration = now - state.drawdownStartTimestamp;
    if (duration > state.maxDrawdownDurationSec) {
      state.maxDrawdownDurationSec = duration;
    }
  }
}
