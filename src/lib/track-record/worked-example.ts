/**
 * Worked Example — Step-by-step equity, peak, and drawdown calculation
 *
 * This file demonstrates the complete verification pipeline using ~10 events,
 * showing exactly how equity, high water mark, and drawdown are computed
 * at each step. This serves as:
 *
 * 1. A reference implementation for verifiers
 * 2. A test vector for cross-platform consistency
 * 3. Documentation of the cashflow-neutral drawdown model
 *
 * ═══════════════════════════════════════════════════════════════════
 * SCENARIO: Trader starts with $10,000, makes 4 trades, receives a
 *           $5,000 deposit mid-way, and the equity fluctuates.
 * ═══════════════════════════════════════════════════════════════════
 *
 * Event Sequence:
 *
 * ┌───────┬─────────────────┬──────────────────────────────────────────────────────────────────────────┐
 * │ seqNo │ Event           │ Key Data                                                                 │
 * ├───────┼─────────────────┼──────────────────────────────────────────────────────────────────────────┤
 * │   1   │ SESSION_START   │ balance=10000                                                            │
 * │   2   │ SNAPSHOT        │ balance=10000, equity=10000                                              │
 * │   3   │ TRADE_OPEN      │ BUY EURUSD 0.10 @ 1.08500000                                            │
 * │   4   │ SNAPSHOT        │ balance=10000, equity=9980 (unrealized -20)                              │
 * │   5   │ SNAPSHOT        │ balance=10000, equity=10050 (unrealized +50)                             │
 * │   6   │ TRADE_CLOSE     │ ticket T1: profit=+25.00, swap=-1.20, commission=-3.50 → net=+20.30     │
 * │   7   │ SNAPSHOT        │ balance=10020.30, equity=10020.30                                        │
 * │   8   │ CASHFLOW        │ DEPOSIT +5000, balance 10020.30 → 15020.30                               │
 * │   9   │ TRADE_OPEN      │ BUY GBPUSD 0.20 @ 1.26000000                                            │
 * │  10   │ SNAPSHOT        │ balance=15020.30, equity=14870.30 (unrealized -150)                      │
 * │  11   │ TRADE_CLOSE     │ ticket T2: profit=-200.00, swap=-2.50, commission=-7.00 → net=-209.50   │
 * │  12   │ SNAPSHOT        │ balance=14810.80, equity=14810.80                                        │
 * └───────┴─────────────────┴──────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════
 * STEP-BY-STEP CALCULATION
 * ═══════════════════════════════════════════════════════════════════
 *
 * After Event 1 (SESSION_START):
 *   balance  = 10000.00
 *   equity   = 10000.00
 *   peak     = 10000.00
 *   drawdown = 0.00 (0.0000%)
 *
 * After Event 2 (SNAPSHOT):
 *   balance  = 10000.00
 *   equity   = 10000.00    ← no change
 *   peak     = 10000.00
 *   drawdown = 0.00 (0.0000%)
 *
 * After Event 3 (TRADE_OPEN):
 *   No equity change (positions tracked, equity updated on next snapshot)
 *
 * After Event 4 (SNAPSHOT, equity=9980):
 *   balance  = 10000.00
 *   equity   = 9980.00     ← unrealized loss
 *   peak     = 10000.00    ← unchanged (equity < peak)
 *   drawdown = 20.00 (0.2000%)   ← (10000 - 9980) / 10000 * 100
 *   maxDD    = 20.00 (0.2000%)
 *
 * After Event 5 (SNAPSHOT, equity=10050):
 *   balance  = 10000.00
 *   equity   = 10050.00    ← new high
 *   peak     = 10050.00    ← peak advances!
 *   drawdown = 0.00 (0.0000%)
 *   maxDD    = 20.00 (0.2000%)   ← historical max preserved
 *
 * After Event 6 (TRADE_CLOSE, net profit = 25 + (-1.20) + (-3.50) = +20.30):
 *   balance  = 10020.30    ← 10000 + 20.30
 *   equity   = 10020.30    ← no open positions
 *   peak     = 10050.00    ← unchanged (equity < previous peak of 10050)
 *   drawdown = 29.70 (0.2955%)   ← (10050 - 10020.30) / 10050 * 100
 *   maxDD    = 29.70 (0.2955%)   ← new max drawdown
 *
 *   NOTE: Even though we had a winning trade, equity dropped from 10050
 *   (which included unrealized gains) to 10020.30 (realized). This is
 *   correct: drawdown is peak-to-trough on equity, including unrealized.
 *
 * After Event 7 (SNAPSHOT, equity=10020.30):
 *   balance  = 10020.30
 *   equity   = 10020.30    ← same as balance, no open positions
 *   peak     = 10050.00    ← unchanged
 *   drawdown = 29.70 (0.2955%)
 *   maxDD    = 29.70 (0.2955%)
 *
 * After Event 8 (CASHFLOW: DEPOSIT +5000):
 *   *** CRITICAL: Cashflow-neutral adjustment ***
 *   balance  = 15020.30    ← 10020.30 + 5000.00
 *   equity   = 15020.30    ← same (no open positions)
 *   peak     = 15050.00    ← 10050.00 + 5000.00  (HWM ADJUSTED FOR CASHFLOW)
 *   drawdown = 29.70 (0.1974%)   ← (15050 - 15020.30) / 15050 * 100
 *   maxDD    = 29.70 (0.2955%)   ← historical max preserved (absolute)
 *
 *   KEY INSIGHT: The deposit does NOT reset drawdown. The absolute drawdown
 *   ($29.70) stays the same. Only the percentage changes because the
 *   denominator (peak) changed. This prevents gaming by depositing during
 *   drawdown to reset percentages.
 *
 * After Event 9 (TRADE_OPEN):
 *   No equity change.
 *
 * After Event 10 (SNAPSHOT, equity=14870.30):
 *   balance  = 15020.30
 *   equity   = 14870.30    ← unrealized loss of -150
 *   peak     = 15050.00
 *   drawdown = 179.70 (1.1940%)  ← (15050 - 14870.30) / 15050 * 100
 *   maxDD    = 179.70 (1.1940%)  ← new max!
 *
 * After Event 11 (TRADE_CLOSE, net = -200 + (-2.50) + (-7.00) = -209.50):
 *   balance  = 14810.80    ← 15020.30 + (-209.50)
 *   equity   = 14810.80    ← no open positions
 *   peak     = 15050.00
 *   drawdown = 239.20 (1.5892%)  ← (15050 - 14810.80) / 15050 * 100
 *   maxDD    = 239.20 (1.5892%)  ← new max!
 *
 * After Event 12 (SNAPSHOT, equity=14810.80):
 *   balance  = 14810.80
 *   equity   = 14810.80
 *   peak     = 15050.00
 *   drawdown = 239.20 (1.5892%)
 *   maxDD    = 239.20 (1.5892%)
 *
 * ═══════════════════════════════════════════════════════════════════
 * FINAL STATISTICS
 * ═══════════════════════════════════════════════════════════════════
 *
 *   Total trades:       2
 *   Win count:          1 (net profit >= 0)
 *   Loss count:         1 (net profit < 0)
 *   Win rate:           50.0000%
 *   Gross profit:       25.00    (sum of winning trade profits)
 *   Gross loss:         200.00   (abs sum of losing trade profits)
 *   Total swap:         -3.70    (-1.20 + -2.50)
 *   Total commission:   -10.50   (-3.50 + -7.00)
 *   Net profit:         -175.00  (25.00 + -200.00)
 *   Final balance:      14810.80
 *   Cumulative cashflow: 5000.00
 *   Net P&L (excl CF):  -189.20  (14810.80 - 10000.00 - 5000.00)
 *   Max drawdown:       $239.20 (1.5892%)
 *   Profit factor:      0.1250   (25 / 200)
 *
 * ═══════════════════════════════════════════════════════════════════
 * VERIFICATION PROCEDURE
 * ═══════════════════════════════════════════════════════════════════
 *
 * A third-party verifier receives a ProofBundle containing these 12 events.
 * They verify by:
 *
 * 1. HASH CHAIN: Recompute each event's hash from canonical JSON.
 *    Verify event[i].prevHash === event[i-1].eventHash for all i > 0.
 *    Verify event[0].prevHash === GENESIS_HASH if seqNo === 1.
 *
 * 2. LEDGER ROOT: SHA-256(concat(all 12 eventHashes)) must match manifest.ledgerRootHash.
 *
 * 3. SIGNATURE: Ed25519.verify(manifest.reportBodyHash, manifest.signature, manifest.publicKey).
 *
 * 4. BODY HASH: SHA-256(canonicalize(reportBody)) must match manifest.reportBodyHash.
 *
 * 5. REPLAY: Feed all 12 events through replayAll(). Compare:
 *    - replay.balance === report.statistics.finalBalance  ("14810.80")
 *    - replay.maxDrawdown === report.statistics.maxDrawdownAbs  ("239.20")
 *    - replay.totalTrades === report.statistics.totalTrades  (2)
 *    - replay.dailyReturns.length === report.dailyReturns.length
 *    - replay.equityCurve.length === report.equityCurve.length
 *
 * 6. BROKER (L2, if present): Match broker evidence against trade events.
 *    Each broker ticket must link to a ledger event within 60s and 1 pip.
 *
 * If all pass → "Verified at L1_LEDGER" (or L2_BROKER if broker evidence matches).
 *
 * ═══════════════════════════════════════════════════════════════════
 * BACKTEST vs LIVE CONSISTENCY
 * ═══════════════════════════════════════════════════════════════════
 *
 * The backtest EquityTracker and the live replay engine use the same math:
 *
 *   equity = balance + unrealizedPnL
 *   peak = max(equity) adjusted for cashflows
 *   drawdownAbs = peak - equity
 *   drawdownPct = drawdownAbs / peak * 100
 *
 * Differences:
 * - Backtest: equity updates on every tick (continuous)
 * - Live: equity updates on SNAPSHOT events (every 5 min) and TRADE_CLOSE
 * - Backtest: no cashflows (deposit/withdrawal)
 * - Live: CASHFLOW events adjust HWM without resetting drawdown
 *
 * The granularity difference means live max drawdown may be slightly less
 * than the true intrabar drawdown (missed between snapshots). This is
 * inherent to sampling and is documented in the report as
 * equityPolicy: "BALANCE_PLUS_UNREALIZED" (snapshot-sampled).
 */

import { replayAll, buildDailyReturns, type ReplayEvent } from "./replay-engine";
import { moneyStr, pctStr } from "./decimal";

/**
 * Generate the worked example events for testing and demonstration.
 * Returns 12 events that exercise all key scenarios.
 */
export function generateWorkedExampleEvents(): ReplayEvent[] {
  const _instanceId = "example-instance-001";
  const baseTs = 1708000000; // 2024-02-15T12:26:40Z

  return [
    // Event 1: SESSION_START
    {
      seqNo: 1,
      eventType: "SESSION_START",
      eventHash: "e1_hash_placeholder",
      prevHash: "0000000000000000000000000000000000000000000000000000000000000000",
      timestamp: baseTs,
      payload: {
        broker: "IC Markets",
        account: "12345",
        symbol: "EURUSD",
        timeframe: "H1",
        eaVersion: "2.0.0",
        mode: "LIVE",
        balance: 10000,
      },
    },

    // Event 2: SNAPSHOT — initial state
    {
      seqNo: 2,
      eventType: "SNAPSHOT",
      eventHash: "e2_hash_placeholder",
      prevHash: "e1_hash_placeholder",
      timestamp: baseTs + 300,
      payload: { balance: 10000, equity: 10000, openTrades: 0, unrealizedPnL: 0, drawdown: 0 },
    },

    // Event 3: TRADE_OPEN — BUY EURUSD 0.10 @ 1.08500000
    {
      seqNo: 3,
      eventType: "TRADE_OPEN",
      eventHash: "e3_hash_placeholder",
      prevHash: "e2_hash_placeholder",
      timestamp: baseTs + 600,
      payload: {
        ticket: "T1",
        symbol: "EURUSD",
        direction: "BUY",
        lots: 0.1,
        openPrice: 1.085,
        sl: 1.08,
        tp: 1.09,
      },
    },

    // Event 4: SNAPSHOT — equity drops to 9980 (unrealized -20)
    {
      seqNo: 4,
      eventType: "SNAPSHOT",
      eventHash: "e4_hash_placeholder",
      prevHash: "e3_hash_placeholder",
      timestamp: baseTs + 900,
      payload: { balance: 10000, equity: 9980, openTrades: 1, unrealizedPnL: -20, drawdown: 20 },
    },

    // Event 5: SNAPSHOT — equity rises to 10050 (unrealized +50)
    {
      seqNo: 5,
      eventType: "SNAPSHOT",
      eventHash: "e5_hash_placeholder",
      prevHash: "e4_hash_placeholder",
      timestamp: baseTs + 1200,
      payload: { balance: 10000, equity: 10050, openTrades: 1, unrealizedPnL: 50, drawdown: 0 },
    },

    // Event 6: TRADE_CLOSE — profit=+25, swap=-1.20, commission=-3.50, net=+20.30
    {
      seqNo: 6,
      eventType: "TRADE_CLOSE",
      eventHash: "e6_hash_placeholder",
      prevHash: "e5_hash_placeholder",
      timestamp: baseTs + 1500,
      payload: {
        ticket: "T1",
        closePrice: 1.0875,
        profit: 25.0,
        swap: -1.2,
        commission: -3.5,
        closeReason: "TP",
      },
    },

    // Event 7: SNAPSHOT — balance=10020.30, equity=10020.30
    {
      seqNo: 7,
      eventType: "SNAPSHOT",
      eventHash: "e7_hash_placeholder",
      prevHash: "e6_hash_placeholder",
      timestamp: baseTs + 1800,
      payload: {
        balance: 10020.3,
        equity: 10020.3,
        openTrades: 0,
        unrealizedPnL: 0,
        drawdown: 29.7,
      },
    },

    // Event 8: CASHFLOW — DEPOSIT +5000
    {
      seqNo: 8,
      eventType: "CASHFLOW",
      eventHash: "e8_hash_placeholder",
      prevHash: "e7_hash_placeholder",
      timestamp: baseTs + 3600,
      payload: {
        type: "DEPOSIT",
        amount: 5000,
        balanceBefore: 10020.3,
        balanceAfter: 15020.3,
        note: "Deposit via bank transfer",
      },
    },

    // Event 9: TRADE_OPEN — BUY GBPUSD 0.20 @ 1.26000000
    {
      seqNo: 9,
      eventType: "TRADE_OPEN",
      eventHash: "e9_hash_placeholder",
      prevHash: "e8_hash_placeholder",
      timestamp: baseTs + 7200,
      payload: {
        ticket: "T2",
        symbol: "GBPUSD",
        direction: "BUY",
        lots: 0.2,
        openPrice: 1.26,
        sl: 1.25,
        tp: 1.28,
      },
    },

    // Event 10: SNAPSHOT — equity=14870.30 (unrealized -150)
    {
      seqNo: 10,
      eventType: "SNAPSHOT",
      eventHash: "e10_hash_placeholder",
      prevHash: "e9_hash_placeholder",
      timestamp: baseTs + 7500,
      payload: {
        balance: 15020.3,
        equity: 14870.3,
        openTrades: 1,
        unrealizedPnL: -150,
        drawdown: 179.7,
      },
    },

    // Event 11: TRADE_CLOSE — loss: profit=-200, swap=-2.50, commission=-7.00, net=-209.50
    {
      seqNo: 11,
      eventType: "TRADE_CLOSE",
      eventHash: "e11_hash_placeholder",
      prevHash: "e10_hash_placeholder",
      timestamp: baseTs + 10800,
      payload: {
        ticket: "T2",
        closePrice: 1.25,
        profit: -200.0,
        swap: -2.5,
        commission: -7.0,
        closeReason: "SL",
      },
    },

    // Event 12: SNAPSHOT — final state
    {
      seqNo: 12,
      eventType: "SNAPSHOT",
      eventHash: "e12_hash_placeholder",
      prevHash: "e11_hash_placeholder",
      timestamp: baseTs + 11100,
      payload: {
        balance: 14810.8,
        equity: 14810.8,
        openTrades: 0,
        unrealizedPnL: 0,
        drawdown: 239.2,
      },
    },
  ];
}

/**
 * Run the worked example and return step-by-step results.
 * Useful for testing and demonstrating the replay engine.
 */
export function runWorkedExample(): {
  finalBalance: string;
  finalEquity: string;
  highWaterMark: string;
  maxDrawdownAbs: string;
  maxDrawdownPct: string;
  cumulativeCashflow: string;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  equityCurveLength: number;
  dailyReturnsLength: number;
} {
  const events = generateWorkedExampleEvents();
  const state = replayAll(events);
  const dailyReturns = buildDailyReturns(state);

  return {
    finalBalance: moneyStr(state.balance),
    finalEquity: moneyStr(state.equity),
    highWaterMark: moneyStr(state.highWaterMark),
    maxDrawdownAbs: moneyStr(state.maxDrawdown),
    maxDrawdownPct: pctStr(state.maxDrawdownPct),
    cumulativeCashflow: moneyStr(state.cumulativeCashflow),
    totalTrades: state.totalTrades,
    winCount: state.winCount,
    lossCount: state.lossCount,
    equityCurveLength: state.equityCurve.length,
    dailyReturnsLength: dailyReturns.length,
  };
}
