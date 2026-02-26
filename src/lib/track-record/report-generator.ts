/**
 * Deterministic Report Generator
 *
 * Generates an investor-proof report by replaying the event ledger.
 * The report is fully reproducible: given the same events, any verifier
 * will produce byte-identical output.
 *
 * Process:
 * 1. Load events from database (ordered by seqNo)
 * 2. Replay through the deterministic replay engine
 * 3. Compute statistics from replay state
 * 4. Serialize report body with canonical JSON
 * 5. Sign manifest with Ed25519
 * 6. Package as InvestorReport
 */

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type {
  InvestorReport,
  ReportBody,
  ReportStatistics,
  ReportAudit,
  ReportTrade,
} from "./types";
import { replayAll, buildDailyReturns, type ReplayEvent } from "./replay-engine";
import { buildManifest } from "./manifest";
import { verifyChain, type StoredEvent } from "./chain-verifier";
import {
  moneyStr,
  moneyAdd,
  moneySub,
  pctCalc,
  pctStr,
  ratioCalc,
  ratioStr,
  lotsStr,
  priceStr,
} from "./decimal";

/**
 * Generate a deterministic investor-proof report for an instance.
 * Optionally filter to a seqNo range.
 */
export async function generateInvestorReport(
  instanceId: string,
  fromSeqNo?: number,
  toSeqNo?: number,
  preloadedEvents?: Array<{
    seqNo: number;
    eventType: string;
    eventHash: string;
    prevHash: string;
    timestamp: Date;
    payload: unknown;
  }>
): Promise<InvestorReport> {
  // Load instance metadata
  const instance = await prisma.liveEAInstance.findUniqueOrThrow({
    where: { id: instanceId },
    select: {
      id: true,
      eaName: true,
      broker: true,
      accountNumber: true,
      mode: true,
      symbol: true,
      timeframe: true,
    },
  });

  // Load events (use preloaded if available to avoid double-loading in proof bundles)
  let dbEvents: typeof preloadedEvents & { length: number };
  if (preloadedEvents) {
    dbEvents = preloadedEvents;
  } else {
    const whereClause: Record<string, unknown> = { instanceId };
    if (fromSeqNo != null || toSeqNo != null) {
      whereClause.seqNo = {};
      if (fromSeqNo != null) (whereClause.seqNo as Record<string, unknown>).gte = fromSeqNo;
      if (toSeqNo != null) (whereClause.seqNo as Record<string, unknown>).lte = toSeqNo;
    }

    dbEvents = await prisma.trackRecordEvent.findMany({
      where: whereClause,
      orderBy: { seqNo: "asc" },
      take: 100_000,
    });
  }

  if (dbEvents.length === 0) {
    throw new Error("No events found for this instance in the specified range");
  }

  // Convert to replay events
  const events: ReplayEvent[] = dbEvents.map((e) => ({
    seqNo: e.seqNo,
    eventType: e.eventType,
    eventHash: e.eventHash,
    prevHash: e.prevHash,
    timestamp: Math.floor(e.timestamp.getTime() / 1000),
    payload: e.payload as Record<string, unknown>,
  }));

  // Verify chain integrity
  const chainResult = verifyChain(
    dbEvents.map((e) => ({
      ...e,
      payload: e.payload as Record<string, unknown>,
    })) as StoredEvent[],
    instanceId
  );

  // Replay all events deterministically
  const state = replayAll(events);

  // Build daily returns
  const dailyReturns = buildDailyReturns(state);

  // Build trade list
  const trades: ReportTrade[] = state.closedTrades.map((t) => ({
    ticket: t.ticket,
    symbol: t.symbol,
    direction: t.direction,
    lots: lotsStr(t.lots),
    openPrice: priceStr(t.openPrice),
    closePrice: priceStr(t.closePrice),
    profit: moneyStr(t.profit),
    swap: moneyStr(t.swap),
    commission: moneyStr(t.commission),
    netProfit: moneyStr(t.netProfit),
    openTimestamp: t.openTimestamp,
    closeTimestamp: t.closeTimestamp,
    durationSec: t.closeTimestamp - t.openTimestamp,
  }));

  // Compute statistics
  const statistics = computeStatistics(state, trades);

  // Count checkpoints
  const checkpointCount = await prisma.trackRecordCheckpoint.count({
    where: { instanceId },
  });
  const lastCheckpoint = await prisma.trackRecordCheckpoint.findFirst({
    where: { instanceId },
    orderBy: { seqNo: "desc" },
    select: { hmac: true },
  });

  // Determine verification level
  const verificationLevel =
    state.brokerDigestCount > 0
      ? ("L2_BROKER" as const)
      : chainResult.valid
        ? ("L1_LEDGER" as const)
        : ("L0_NONE" as const);

  // Build audit metadata
  const audit: ReportAudit = {
    eventCount: events.length,
    snapshotCount: state.snapshotCount,
    cashflowCount: state.cashflowCount,
    brokerEvidenceCount: state.brokerEvidenceCount,
    brokerDigestCount: state.brokerDigestCount,
    chainVerified: chainResult.valid,
    checkpointCount,
    lastCheckpointHmac: lastCheckpoint?.hmac ?? "",
    verificationLevel,
  };

  // Build report body
  const body: ReportBody = {
    instance: {
      id: instance.id,
      eaName: instance.eaName,
      broker: instance.broker,
      account: instance.accountNumber,
      mode: instance.mode,
      symbol: instance.symbol,
      timeframe: instance.timeframe,
    },
    equityCurve: state.equityCurve,
    balanceCurve: state.balanceCurve,
    drawdownSeries: state.drawdownSeries,
    trades,
    dailyReturns,
    statistics,
    audit,
  };

  // Build signed manifest
  const eventHashes = events.map((e) => e.eventHash);
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const reportId = randomBytes(16).toString("hex");

  const manifest = buildManifest(
    reportId,
    instanceId,
    firstEvent.seqNo,
    lastEvent.seqNo,
    new Date(firstEvent.timestamp * 1000).toISOString(),
    new Date(lastEvent.timestamp * 1000).toISOString(),
    firstEvent.eventHash,
    lastEvent.eventHash,
    eventHashes,
    body
  );

  return { manifest, body };
}

// ============================================
// STATISTICS COMPUTATION
// ============================================

function computeStatistics(
  state: ReturnType<typeof replayAll>,
  _trades: ReportTrade[]
): ReportStatistics {
  const netProfits = state.closedTrades.map((t) => t.netProfit);
  const n = netProfits.length;

  // Win/loss analysis
  const wins = netProfits.filter((p) => p >= 0);
  const losses = netProfits.filter((p) => p < 0);
  const grossProfit = wins.reduce((a, b) => moneyAdd(a, b), 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => moneyAdd(a, b), 0));

  const winRate = n > 0 ? pctCalc(state.winCount, n) : 0;
  const profitFactor = grossLoss > 0 ? ratioCalc(grossProfit, grossLoss) : 0;

  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const largestWin = wins.length > 0 ? Math.max(...wins) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses) : 0;

  // Consecutive wins/losses
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let curWins = 0;
  let curLosses = 0;
  for (const p of netProfits) {
    if (p >= 0) {
      curWins++;
      curLosses = 0;
    } else {
      curLosses++;
      curWins = 0;
    }
    if (curWins > maxConsecWins) maxConsecWins = curWins;
    if (curLosses > maxConsecLosses) maxConsecLosses = curLosses;
  }

  // Average trade duration
  const durations = state.closedTrades.map((t) => t.closeTimestamp - t.openTimestamp);
  const avgDuration =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Sharpe ratio (per-trade, risk-free = 0)
  let sharpe = 0;
  if (n >= 2) {
    const mean = netProfits.reduce((a, b) => a + b, 0) / n;
    const variance = netProfits.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    sharpe = stdDev > 0 ? ratioCalc(mean, stdDev) : 0;
  }

  // Sortino ratio (downside deviation, target = 0)
  let sortino = 0;
  if (n >= 2) {
    const mean = netProfits.reduce((a, b) => a + b, 0) / n;
    const downsideVar = netProfits.reduce((s, r) => s + Math.min(0, r) ** 2, 0) / (n - 1);
    const downsideDev = Math.sqrt(downsideVar);
    sortino = downsideDev > 0 ? ratioCalc(mean, downsideDev) : 0;
  }

  // Calmar ratio (total return / max drawdown %)
  const totalNetProfit = moneySub(state.balance, state.cumulativeCashflow);
  const calmar = state.maxDrawdownPct > 0 ? ratioCalc(totalNetProfit, state.maxDrawdown) : 0;

  // Find initial balance from first equity point
  const initialBalance = state.equityCurve.length > 0 ? parseFloat(state.equityCurve[0].b) : 0;

  return {
    totalTrades: state.totalTrades,
    winCount: state.winCount,
    lossCount: state.lossCount,
    winRate: pctStr(winRate),
    profitFactor: ratioStr(profitFactor),
    netProfit: moneyStr(state.totalProfit),
    grossProfit: moneyStr(grossProfit),
    grossLoss: moneyStr(grossLoss),
    totalSwap: moneyStr(state.totalSwap),
    totalCommission: moneyStr(state.totalCommission),
    averageWin: moneyStr(avgWin),
    averageLoss: moneyStr(avgLoss),
    largestWin: moneyStr(largestWin),
    largestLoss: moneyStr(largestLoss),
    maxConsecutiveWins: maxConsecWins,
    maxConsecutiveLosses: maxConsecLosses,
    maxDrawdownAbs: moneyStr(state.maxDrawdown),
    maxDrawdownPct: pctStr(state.maxDrawdownPct),
    maxDrawdownDurationSec: state.maxDrawdownDurationSec,
    avgTradeDurationSec: avgDuration,
    sharpeRatio: ratioStr(sharpe),
    sortinoRatio: ratioStr(sortino),
    calmarRatio: ratioStr(calmar),
    initialBalance: moneyStr(initialBalance),
    finalBalance: moneyStr(state.balance),
    finalEquity: moneyStr(state.equity),
    cumulativeCashflow: moneyStr(state.cumulativeCashflow),
  };
}
