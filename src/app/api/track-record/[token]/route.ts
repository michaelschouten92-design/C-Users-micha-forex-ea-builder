/**
 * GET /api/track-record/[token]
 *
 * Public endpoint — returns account-level track record data.
 * No auth required. Rate-limited by IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  publicApiRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `track-record:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const { token } = await params;

  const share = await prisma.accountTrackRecordShare.findUnique({
    where: { token },
    select: { baseInstanceId: true, isPublic: true },
  });

  if (!share || !share.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Load base instance
  const base = await prisma.liveEAInstance.findUnique({
    where: { id: share.baseInstanceId },
    select: {
      id: true,
      eaName: true,
      broker: true,
      accountNumber: true,
      balance: true,
      equity: true,
      status: true,
      lastHeartbeat: true,
    },
  });

  if (!base) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Load child instances
  const children = await prisma.liveEAInstance.findMany({
    where: { parentInstanceId: base.id, deletedAt: null },
    select: {
      id: true,
      symbol: true,
      eaName: true,
      totalTrades: true,
      totalProfit: true,
      lifecycleState: true,
      strategyStatus: true,
      trades: {
        where: { closeTime: { not: null } },
        orderBy: { closeTime: "desc" },
        select: { profit: true },
      },
      healthSnapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { driftDetected: true, driftSeverity: true, status: true },
      },
      terminalDeployments: {
        where: { ignoredAt: null },
        take: 1,
        select: { magicNumber: true },
      },
    },
  });

  // Equity curve from base instance heartbeats
  const heartbeats = await prisma.eAHeartbeat.findMany({
    where: { instanceId: base.id },
    orderBy: { createdAt: "asc" },
    select: { equity: true, balance: true, createdAt: true },
  });

  // Compute account-level aggregates
  const allTrades = children.flatMap((c) => c.trades);
  const totalTrades = children.reduce((sum, c) => sum + c.totalTrades, 0);
  const totalProfit = children.reduce((sum, c) => sum + c.totalProfit, 0);

  const wins = allTrades.filter((t) => t.profit > 0).length;
  const losses = allTrades.filter((t) => t.profit < 0).length;
  const winRate = allTrades.length > 0 ? (wins / allTrades.length) * 100 : 0;

  const grossProfit = allTrades.filter((t) => t.profit > 0).reduce((s, t) => s + t.profit, 0);
  const grossLoss = Math.abs(
    allTrades.filter((t) => t.profit < 0).reduce((s, t) => s + t.profit, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Max drawdown from equity curve (peak-to-trough)
  let maxDrawdownPct = 0;
  if (heartbeats.length > 0) {
    let peak = heartbeats[0].equity;
    for (const hb of heartbeats) {
      if (hb.equity > peak) peak = hb.equity;
      if (peak > 0) {
        const dd = ((peak - hb.equity) / peak) * 100;
        if (dd > maxDrawdownPct) maxDrawdownPct = dd;
      }
    }
  }

  // Strategy breakdown
  const strategies = children.map((c) => ({
    symbol: c.symbol,
    magicNumber: c.terminalDeployments[0]?.magicNumber ?? null,
    totalTrades: c.totalTrades,
    totalProfit: c.totalProfit,
    healthSnapshot: c.healthSnapshots[0] ?? null,
    lifecycleState: c.lifecycleState,
    strategyStatus: c.strategyStatus,
  }));

  return NextResponse.json({
    account: {
      eaName: base.eaName,
      broker: base.broker,
      accountNumber: base.accountNumber,
      balance: base.balance,
      equity: base.equity,
      status: base.status,
      lastHeartbeat: base.lastHeartbeat,
    },
    performance: {
      totalTrades,
      totalProfit,
      winRate,
      profitFactor: profitFactor === Infinity ? null : profitFactor,
      maxDrawdownPct,
      strategyCount: children.length,
    },
    equityCurve: heartbeats.map((hb) => ({
      equity: hb.equity,
      balance: hb.balance,
      createdAt: hb.createdAt.toISOString(),
    })),
    strategies,
  });
}
