/**
 * Generate verified track record JSON export with integrity proof.
 */

import { prisma } from "@/lib/prisma";
import { verifyChain, type StoredEvent } from "./chain-verifier";
import { stateFromDb } from "./state-manager";
import { computeMetrics } from "./metrics";
import type { VerifiedTrackRecord } from "./types";

export async function generateVerifiedExport(instanceId: string): Promise<VerifiedTrackRecord> {
  // Load instance info
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
      createdAt: true,
    },
  });

  // Load state
  const dbState = await prisma.trackRecordState.findUnique({
    where: { instanceId },
  });

  if (!dbState) {
    throw new Error("No track record state found for this instance");
  }

  const state = stateFromDb(dbState);

  // Load all events
  const events = await prisma.trackRecordEvent.findMany({
    where: { instanceId },
    orderBy: { seqNo: "asc" },
  });

  // Verify chain integrity
  const chainResult = verifyChain(
    events.map((e) => ({
      ...e,
      payload: e.payload as Record<string, unknown>,
    })) as StoredEvent[],
    instanceId
  );

  // Load checkpoints
  const checkpoints = await prisma.trackRecordCheckpoint.findMany({
    where: { instanceId },
    orderBy: { seqNo: "desc" },
    take: 1,
  });

  // Build equity curve from SNAPSHOT events
  const equityCurve = events
    .filter((e) => e.eventType === "SNAPSHOT")
    .map((e) => {
      const p = e.payload as Record<string, number>;
      return {
        t: e.timestamp.toISOString(),
        b: p.balance ?? 0,
        e: p.equity ?? 0,
        dd: p.drawdown ?? 0,
      };
    });

  // Build trades from TRADE_OPEN + TRADE_CLOSE pairs
  const openTrades = new Map<
    string,
    { symbol: string; dir: string; lots: number; open: number; openAt: string }
  >();
  const closedTrades: VerifiedTrackRecord["trades"] = [];

  for (const event of events) {
    const p = event.payload as Record<string, unknown>;
    if (event.eventType === "TRADE_OPEN") {
      openTrades.set(p.ticket as string, {
        symbol: p.symbol as string,
        dir: p.direction as string,
        lots: p.lots as number,
        open: p.openPrice as number,
        openAt: event.timestamp.toISOString(),
      });
    } else if (event.eventType === "TRADE_CLOSE") {
      const ticket = p.ticket as string;
      const openTrade = openTrades.get(ticket);
      if (openTrade) {
        closedTrades.push({
          ticket,
          symbol: openTrade.symbol,
          dir: openTrade.dir,
          lots: openTrade.lots,
          open: openTrade.open,
          close: p.closePrice as number,
          profit: p.profit as number,
          swap: p.swap as number,
          comm: p.commission as number,
          openAt: openTrade.openAt,
          closeAt: event.timestamp.toISOString(),
        });
        openTrades.delete(ticket);
      }
    }
  }

  // Compute metrics
  const tradeResults = closedTrades.map((t) => t.profit + t.swap + t.comm);
  const metrics = computeMetrics(tradeResults, equityCurve);

  // Find initial balance from first SESSION_START or first SNAPSHOT
  const firstSession = events.find((e) => e.eventType === "SESSION_START");
  const firstSnapshot = events.find((e) => e.eventType === "SNAPSHOT");
  const initialBalance =
    (firstSession?.payload as Record<string, number>)?.balance ??
    (firstSnapshot?.payload as Record<string, number>)?.balance ??
    0;

  const winRate = state.totalTrades > 0 ? (state.winCount / state.totalTrades) * 100 : 0;

  const grossProfit = tradeResults.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(tradeResults.filter((r) => r < 0).reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    label: "Self-Reported, Integrity-Verified",
    instance: {
      id: instance.id,
      eaName: instance.eaName,
      broker: instance.broker,
      account: instance.accountNumber,
      mode: instance.mode,
      symbol: instance.symbol,
      timeframe: instance.timeframe,
      startDate: instance.createdAt.toISOString(),
      endDate: new Date().toISOString(),
    },
    summary: {
      totalTrades: state.totalTrades,
      winRate: Math.round(winRate * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      netProfit: Math.round(state.totalProfit * 100) / 100,
      totalSwap: Math.round(state.totalSwap * 100) / 100,
      totalCommission: Math.round(state.totalCommission * 100) / 100,
      maxDrawdown: Math.round(state.maxDrawdown * 100) / 100,
      maxDrawdownPct: Math.round(state.maxDrawdownPct * 100) / 100,
      sharpeRatio: metrics.sharpeRatio,
      sortinoRatio: metrics.sortinoRatio,
      calmarRatio: metrics.calmarRatio,
      initialBalance,
      finalBalance: state.balance,
    },
    equityCurve,
    trades: closedTrades,
    integrity: {
      chainLength: chainResult.chainLength,
      firstEventHash: chainResult.firstEventHash ?? "",
      lastEventHash: chainResult.lastEventHash ?? "",
      checkpointCount:
        checkpoints.length > 0
          ? await prisma.trackRecordCheckpoint.count({ where: { instanceId } })
          : 0,
      lastCheckpointHmac: checkpoints[0]?.hmac ?? "",
      chainVerified: chainResult.valid,
    },
  };
}
