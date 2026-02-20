/**
 * Deterministic Ledger Replay Engine
 *
 * Replays events from the append-only ledger to reconstruct the exact state
 * at any point in time. The replay is fully deterministic: same events → same
 * output on any machine.
 *
 * Used by:
 * - Report generator (to produce investor-proof reports)
 * - Verifier (to reproduce and validate reports)
 * - Audit tools (to inspect state at any seqNo)
 *
 * Equity model:
 *   equity = balance + unrealizedPnL
 *   unrealizedPnL comes from SNAPSHOT events (EA-reported, not computed)
 *
 * Drawdown model:
 *   peak = max(equity seen so far), adjusted for cashflows
 *   drawdownAbs = peak − equity
 *   drawdownPct = drawdownAbs / peak * 100
 *   maxDrawdown = max(drawdownAbs seen so far)
 *   duration = time since peak was last updated
 *
 * Cashflow handling:
 *   CASHFLOW events adjust highWaterMark but do NOT reset drawdown.
 *   Performance metrics exclude cashflows (time-weighted returns).
 */

import type {
  TrackRecordRunningState,
  OpenPosition,
  EquityPoint,
  BalancePoint,
  DrawdownPoint,
  DailyReturn,
} from "./types";
import { GENESIS_HASH } from "./types";
import { moneyAdd, moneySub, moneyStr, pctCalc, pctStr } from "./decimal";

// ============================================
// REPLAY STATE — extends RunningState with series data
// ============================================

export interface ReplayState extends TrackRecordRunningState {
  equityCurve: EquityPoint[];
  balanceCurve: BalancePoint[];
  drawdownSeries: DrawdownPoint[];
  closedTrades: ReplayClosedTrade[];
  /** Open trade tracking with open timestamp for duration calc */
  openTradeTimestamps: Map<string, number>;
  /** Daily equity tracking for TWR calculation */
  dailyEquity: Map<string, { startEquity: number; endEquity: number; cashflow: number }>;
  /** Snapshots and trade-fill events count */
  snapshotCount: number;
  cashflowCount: number;
  brokerEvidenceCount: number;
  brokerDigestCount: number;
}

export interface ReplayClosedTrade {
  ticket: string;
  symbol: string;
  direction: string;
  lots: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  swap: number;
  commission: number;
  netProfit: number;
  openTimestamp: number;
  closeTimestamp: number;
}

export interface ReplayEvent {
  seqNo: number;
  eventType: string;
  eventHash: string;
  prevHash: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

// ============================================
// REPLAY ENGINE
// ============================================

export function createReplayState(): ReplayState {
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
    // Series
    equityCurve: [],
    balanceCurve: [],
    drawdownSeries: [],
    closedTrades: [],
    openTradeTimestamps: new Map(),
    dailyEquity: new Map(),
    snapshotCount: 0,
    cashflowCount: 0,
    brokerEvidenceCount: 0,
    brokerDigestCount: 0,
  };
}

/**
 * Replay a single event into the state. Deterministic and side-effect free
 * (mutates state in place but produces identical results for identical inputs).
 */
export function replayEvent(state: ReplayState, event: ReplayEvent): void {
  state.lastSeqNo = event.seqNo;
  state.lastEventHash = event.eventHash;

  const p = event.payload;
  const ts = event.timestamp;

  switch (event.eventType) {
    case "SESSION_START": {
      const balance = (p.balance as number) ?? 0;
      if (state.lastSeqNo <= 1 || state.balance === 0) {
        state.balance = balance;
        state.equity = balance;
        state.highWaterMark = balance;
        state.peakEquityTimestamp = ts;
      }
      recordEquityPoint(state, ts, "SESSION_START");
      recordBalancePoint(state, ts, "SESSION_START");
      break;
    }

    case "SNAPSHOT": {
      state.snapshotCount++;
      const balance = p.balance as number;
      const equity = p.equity as number;

      state.balance = balance;
      state.equity = equity;

      updatePeakAndDrawdown(state, ts);
      recordEquityPoint(state, ts, "SNAPSHOT");
      recordDrawdownPoint(state, ts);
      updateDailyEquity(state, ts);
      break;
    }

    case "TRADE_OPEN": {
      const pos: OpenPosition = {
        ticket: p.ticket as string,
        symbol: p.symbol as string,
        direction: p.direction as "BUY" | "SELL",
        lots: p.lots as number,
        openPrice: p.openPrice as number,
        sl: (p.sl as number) ?? 0,
        tp: (p.tp as number) ?? 0,
      };
      state.openPositions.push(pos);
      state.openTradeTimestamps.set(pos.ticket, ts);
      break;
    }

    case "TRADE_CLOSE": {
      const ticket = p.ticket as string;
      const profit = p.profit as number;
      const swap = p.swap as number;
      const commission = p.commission as number;
      const closePrice = p.closePrice as number;
      const netProfit = moneyAdd(moneyAdd(profit, swap), commission);

      // Find and remove open position
      const posIdx = state.openPositions.findIndex((op) => op.ticket === ticket);
      const openPos = posIdx >= 0 ? state.openPositions[posIdx] : null;
      if (posIdx >= 0) state.openPositions.splice(posIdx, 1);

      // Record closed trade
      const openTs = state.openTradeTimestamps.get(ticket) ?? ts;
      state.openTradeTimestamps.delete(ticket);

      state.closedTrades.push({
        ticket,
        symbol: openPos?.symbol ?? (p.symbol as string) ?? "",
        direction: openPos?.direction ?? "",
        lots: openPos?.lots ?? 0,
        openPrice: openPos?.openPrice ?? 0,
        closePrice,
        profit,
        swap,
        commission,
        netProfit,
        openTimestamp: openTs,
        closeTimestamp: ts,
      });

      // Update running totals
      state.totalTrades++;
      state.totalProfit = moneyAdd(state.totalProfit, profit);
      state.totalSwap = moneyAdd(state.totalSwap, swap);
      state.totalCommission = moneyAdd(state.totalCommission, commission);
      state.balance = moneyAdd(state.balance, netProfit);

      if (netProfit >= 0) state.winCount++;
      else state.lossCount++;

      // Update equity (approximate: balance + remaining unrealized)
      state.equity = state.balance;

      updatePeakAndDrawdown(state, ts);
      recordEquityPoint(state, ts, "TRADE_CLOSE");
      recordBalancePoint(state, ts, "TRADE_CLOSE");
      recordDrawdownPoint(state, ts);
      updateDailyEquity(state, ts);
      break;
    }

    case "TRADE_MODIFY": {
      const ticket = p.ticket as string;
      const pos = state.openPositions.find((op) => op.ticket === ticket);
      if (pos) {
        pos.sl = p.newSL as number;
        pos.tp = p.newTP as number;
      }
      break;
    }

    case "PARTIAL_CLOSE": {
      const ticket = p.ticket as string;
      const profit = p.profit as number;
      const remainingLots = p.remainingLots as number;
      const pos = state.openPositions.find((op) => op.ticket === ticket);
      if (pos) pos.lots = remainingLots;

      state.totalProfit = moneyAdd(state.totalProfit, profit);
      state.balance = moneyAdd(state.balance, profit);
      state.equity = state.balance;

      updatePeakAndDrawdown(state, ts);
      recordEquityPoint(state, ts, "PARTIAL_CLOSE");
      recordBalancePoint(state, ts, "PARTIAL_CLOSE");
      recordDrawdownPoint(state, ts);
      break;
    }

    case "CASHFLOW": {
      state.cashflowCount++;
      const amount = p.amount as number;
      const cfType = p.type as string;
      const signedAmount = cfType === "WITHDRAWAL" ? -Math.abs(amount) : Math.abs(amount);

      state.cumulativeCashflow = moneyAdd(state.cumulativeCashflow, signedAmount);
      state.balance = moneyAdd(state.balance, signedAmount);
      state.equity = moneyAdd(state.equity, signedAmount);
      // Adjust HWM for cashflow — do NOT reset drawdown
      state.highWaterMark = moneyAdd(state.highWaterMark, signedAmount);

      recordEquityPoint(state, ts, "CASHFLOW");
      recordBalancePoint(state, ts, "CASHFLOW");
      // Record cashflow in daily tracking
      const day = timestampToDateStr(ts);
      const daily = state.dailyEquity.get(day);
      if (daily) daily.cashflow = moneyAdd(daily.cashflow, signedAmount);
      break;
    }

    case "SESSION_END": {
      const finalBalance = p.finalBalance as number;
      const finalEquity = p.finalEquity as number;
      if (finalBalance != null) state.balance = finalBalance;
      if (finalEquity != null) {
        state.equity = finalEquity;
        updatePeakAndDrawdown(state, ts);
        recordEquityPoint(state, ts, "SESSION_END");
        recordDrawdownPoint(state, ts);
        updateDailyEquity(state, ts);
      }
      break;
    }

    case "BROKER_EVIDENCE":
      state.brokerEvidenceCount++;
      break;

    case "BROKER_HISTORY_DIGEST":
      state.brokerDigestCount++;
      break;

    case "CHAIN_RECOVERY":
      // Audit marker only
      break;
  }
}

/**
 * Replay all events and return the final state.
 */
export function replayAll(events: ReplayEvent[]): ReplayState {
  const state = createReplayState();
  for (const event of events) {
    replayEvent(state, event);
  }
  return state;
}

/**
 * Build daily returns from the replay state.
 * Uses time-weighted return (TWR) to exclude cashflow effects.
 */
export function buildDailyReturns(state: ReplayState): DailyReturn[] {
  const days = Array.from(state.dailyEquity.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return days.map(([date, data]) => {
    const cashflowNeutralChange = moneySub(
      moneySub(data.endEquity, data.startEquity),
      data.cashflow
    );
    const twr = data.startEquity > 0 ? pctCalc(cashflowNeutralChange, data.startEquity) : 0;

    return {
      date,
      startEquity: moneyStr(data.startEquity),
      endEquity: moneyStr(data.endEquity),
      cashflow: moneyStr(data.cashflow),
      twr: pctStr(twr),
    };
  });
}

// ============================================
// INTERNAL HELPERS
// ============================================

function updatePeakAndDrawdown(state: ReplayState, ts: number): void {
  if (state.equity > state.highWaterMark) {
    state.highWaterMark = state.equity;
    state.peakEquityTimestamp = ts;
    // Exiting drawdown
    if (state.drawdownStartTimestamp > 0) {
      const duration = ts - state.drawdownStartTimestamp;
      if (duration > state.maxDrawdownDurationSec) {
        state.maxDrawdownDurationSec = duration;
      }
      state.drawdownStartTimestamp = 0;
    }
  } else if (state.highWaterMark > 0) {
    // In drawdown
    if (state.drawdownStartTimestamp === 0) {
      state.drawdownStartTimestamp = state.peakEquityTimestamp;
    }
    const ddAbs = moneySub(state.highWaterMark, state.equity);
    const ddPct = pctCalc(ddAbs, state.highWaterMark);
    if (ddAbs > state.maxDrawdown) state.maxDrawdown = ddAbs;
    if (ddPct > state.maxDrawdownPct) state.maxDrawdownPct = ddPct;

    // Track duration
    const currentDuration = ts - state.drawdownStartTimestamp;
    if (currentDuration > state.maxDrawdownDurationSec) {
      state.maxDrawdownDurationSec = currentDuration;
    }
  }
}

function recordEquityPoint(state: ReplayState, ts: number, _cause: string): void {
  state.equityCurve.push({
    t: ts,
    b: moneyStr(state.balance),
    e: moneyStr(state.equity),
    p: moneyStr(state.highWaterMark),
  });
}

function recordBalancePoint(state: ReplayState, ts: number, cause: string): void {
  state.balanceCurve.push({
    t: ts,
    b: moneyStr(state.balance),
    cause,
  });
}

function recordDrawdownPoint(state: ReplayState, ts: number): void {
  const ddAbs = moneySub(state.highWaterMark, state.equity);
  const ddPct = state.highWaterMark > 0 ? pctCalc(ddAbs, state.highWaterMark) : 0;
  state.drawdownSeries.push({
    t: ts,
    abs: moneyStr(Math.max(0, ddAbs)),
    pct: pctStr(Math.max(0, ddPct)),
  });
}

function updateDailyEquity(state: ReplayState, ts: number): void {
  const day = timestampToDateStr(ts);
  const existing = state.dailyEquity.get(day);
  if (existing) {
    existing.endEquity = state.equity;
  } else {
    state.dailyEquity.set(day, {
      startEquity: state.equity,
      endEquity: state.equity,
      cashflow: 0,
    });
  }
}

function timestampToDateStr(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}
