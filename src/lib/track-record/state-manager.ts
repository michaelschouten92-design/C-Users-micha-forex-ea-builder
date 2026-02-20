/**
 * State manager — processes track record events and updates running state.
 *
 * Each event type triggers specific state mutations via the equity calculator.
 * This module is the single source of truth for state transitions.
 */

import type { TrackRecordRunningState, TrackRecordEventType, OpenPosition } from "./types";
import { GENESIS_HASH } from "./types";
import {
  updateEquityFromSnapshot,
  updateStateOnTradeOpen,
  updateStateOnTradeClose,
  updateStateOnPartialClose,
  updateStateOnTradeModify,
  updateStateOnSessionStart,
} from "./equity-calculator";

/**
 * Create an empty initial state for a new instance.
 */
export function createInitialState(): TrackRecordRunningState {
  return {
    lastSeqNo: 0,
    lastEventHash: GENESIS_HASH,
    balance: 0,
    equity: 0,
    highWaterMark: 0,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    totalTrades: 0,
    totalProfit: 0,
    totalSwap: 0,
    totalCommission: 0,
    winCount: 0,
    lossCount: 0,
    openPositions: [],
    cumulativeCashflow: 0,
    maxDrawdownDurationSec: 0,
    drawdownStartTimestamp: 0,
    peakEquityTimestamp: 0,
  };
}

/**
 * Process an event and update running state.
 * Mutates state in place and returns it.
 */
export function processEvent(
  state: TrackRecordRunningState,
  eventType: TrackRecordEventType,
  eventHash: string,
  seqNo: number,
  payload: Record<string, unknown>
): TrackRecordRunningState {
  // Update chain tracking
  state.lastSeqNo = seqNo;
  state.lastEventHash = eventHash;

  switch (eventType) {
    case "SESSION_START": {
      const balance = (payload.balance as number) ?? 0;
      updateStateOnSessionStart(state, balance);
      break;
    }

    case "SNAPSHOT": {
      const balance = payload.balance as number;
      const equity = payload.equity as number;
      updateEquityFromSnapshot(state, balance, equity);
      break;
    }

    case "TRADE_OPEN": {
      const position: OpenPosition = {
        ticket: payload.ticket as string,
        symbol: payload.symbol as string,
        direction: payload.direction as "BUY" | "SELL",
        lots: payload.lots as number,
        openPrice: payload.openPrice as number,
        sl: (payload.sl as number) ?? 0,
        tp: (payload.tp as number) ?? 0,
      };
      updateStateOnTradeOpen(state, position);
      break;
    }

    case "TRADE_CLOSE": {
      updateStateOnTradeClose(
        state,
        payload.ticket as string,
        payload.profit as number,
        payload.swap as number,
        payload.commission as number
      );
      break;
    }

    case "TRADE_MODIFY": {
      updateStateOnTradeModify(
        state,
        payload.ticket as string,
        payload.newSL as number,
        payload.newTP as number
      );
      break;
    }

    case "PARTIAL_CLOSE": {
      updateStateOnPartialClose(
        state,
        payload.ticket as string,
        payload.remainingLots as number,
        payload.profit as number
      );
      break;
    }

    case "SESSION_END": {
      const finalBalance = payload.finalBalance as number;
      const finalEquity = payload.finalEquity as number;
      if (finalBalance != null && finalEquity != null) {
        state.balance = finalBalance;
        state.equity = finalEquity;
      }
      break;
    }

    case "CHAIN_RECOVERY": {
      // No state change — this is an audit marker
      break;
    }

    case "CASHFLOW": {
      const amount = payload.amount as number;
      const cfType = payload.type as string;
      const signedAmount = cfType === "WITHDRAWAL" ? -Math.abs(amount) : Math.abs(amount);
      state.cumulativeCashflow += signedAmount;
      state.balance += signedAmount;
      state.equity += signedAmount;
      // Adjust HWM for cashflow — do NOT reset drawdown
      state.highWaterMark += signedAmount;
      break;
    }

    case "BROKER_EVIDENCE": {
      // Metadata only — no state mutation needed
      break;
    }

    case "BROKER_HISTORY_DIGEST": {
      // Metadata only — no state mutation needed
      break;
    }
  }

  return state;
}

/**
 * Convert running state to Prisma-compatible update data.
 */
export function stateToDbUpdate(state: TrackRecordRunningState) {
  return {
    lastSeqNo: state.lastSeqNo,
    lastEventHash: state.lastEventHash,
    balance: state.balance,
    equity: state.equity,
    highWaterMark: state.highWaterMark,
    maxDrawdown: state.maxDrawdown,
    maxDrawdownPct: state.maxDrawdownPct,
    totalTrades: state.totalTrades,
    totalProfit: state.totalProfit,
    totalSwap: state.totalSwap,
    totalCommission: state.totalCommission,
    winCount: state.winCount,
    lossCount: state.lossCount,
    openPositions: JSON.parse(JSON.stringify(state.openPositions)),
    cumulativeCashflow: state.cumulativeCashflow,
    maxDrawdownDurationSec: state.maxDrawdownDurationSec,
    drawdownStartTimestamp: state.drawdownStartTimestamp,
    peakEquityTimestamp: state.peakEquityTimestamp,
  };
}

/**
 * Hydrate running state from database record.
 */
export function stateFromDb(dbState: {
  lastSeqNo: number;
  lastEventHash: string;
  balance: number;
  equity: number;
  highWaterMark: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  totalTrades: number;
  totalProfit: number;
  totalSwap: number;
  totalCommission: number;
  winCount: number;
  lossCount: number;
  openPositions: unknown;
  cumulativeCashflow: number;
  maxDrawdownDurationSec: number;
  drawdownStartTimestamp: number;
  peakEquityTimestamp: number;
}): TrackRecordRunningState {
  return {
    lastSeqNo: dbState.lastSeqNo,
    lastEventHash: dbState.lastEventHash,
    balance: dbState.balance,
    equity: dbState.equity,
    highWaterMark: dbState.highWaterMark,
    maxDrawdown: dbState.maxDrawdown,
    maxDrawdownPct: dbState.maxDrawdownPct,
    totalTrades: dbState.totalTrades,
    totalProfit: dbState.totalProfit,
    totalSwap: dbState.totalSwap,
    totalCommission: dbState.totalCommission,
    winCount: dbState.winCount,
    lossCount: dbState.lossCount,
    openPositions: (dbState.openPositions as OpenPosition[]) ?? [],
    cumulativeCashflow: dbState.cumulativeCashflow,
    maxDrawdownDurationSec: dbState.maxDrawdownDurationSec,
    drawdownStartTimestamp: dbState.drawdownStartTimestamp,
    peakEquityTimestamp: dbState.peakEquityTimestamp,
  };
}
