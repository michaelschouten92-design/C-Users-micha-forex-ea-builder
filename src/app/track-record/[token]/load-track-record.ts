import { prisma } from "@/lib/prisma";

export interface TrackRecordData {
  account: {
    eaName: string;
    broker: string | null;
    accountNumber: string | null;
    accountNumberMasked: string | null;
    balance: number | null;
    equity: number | null;
    status: string;
    lastHeartbeat: string | null;
  };
  performance: {
    totalTrades: number;
    totalProfit: number;
    winRate: number;
    profitFactor: number | null;
    profitFactorDisplay: string;
    maxDrawdownPct: number;
    maxDrawdownAbs: number;
    strategyCount: number;
    durationDays: number | null;
  };
  equityCurve: Array<{ equity: number; balance: number; createdAt: string }>;
  monthlyReturns: Array<{ month: string; returnPct: number }>;
  recentTrades: Array<{ closeTime: string; symbol: string; profit: number }>;
  strategies: Array<{
    symbol: string | null;
    magicNumber: number | null;
    totalTrades: number;
    totalProfit: number;
    healthSnapshot: { driftDetected: boolean; driftSeverity: number; status: string } | null;
    lifecycleState: string | null;
    strategyStatus: string | null;
  }>;
}

/**
 * Load account-level track record data by share token.
 * Returns null if the token is invalid, unpublished, or the base instance is missing.
 */
export async function loadTrackRecord(token: string): Promise<TrackRecordData | null> {
  const share = await prisma.accountTrackRecordShare.findUnique({
    where: { token },
    select: { baseInstanceId: true, isPublic: true },
  });

  if (!share || !share.isPublic) return null;

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

  if (!base) return null;

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
        select: { profit: true, closeTime: true, symbol: true },
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

  const heartbeats = await prisma.eAHeartbeat.findMany({
    where: { instanceId: base.id },
    orderBy: { createdAt: "asc" },
    select: { equity: true, balance: true, createdAt: true },
  });

  // Compute aggregates
  const allTrades = children.flatMap((c) => c.trades);
  const totalTrades = children.reduce((sum, c) => sum + c.totalTrades, 0);
  const totalProfit = children.reduce((sum, c) => sum + c.totalProfit, 0);

  const wins = allTrades.filter((t) => t.profit > 0).length;
  const winRate = allTrades.length > 0 ? (wins / allTrades.length) * 100 : 0;

  const grossProfit = allTrades.filter((t) => t.profit > 0).reduce((s, t) => s + t.profit, 0);
  const grossLoss = Math.abs(
    allTrades.filter((t) => t.profit < 0).reduce((s, t) => s + t.profit, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const profitFactorDisplay =
    profitFactor === Infinity ? "∞" : profitFactor > 0 ? profitFactor.toFixed(2) : "—";

  // Max drawdown from equity curve (peak-to-trough, both % and absolute)
  let maxDrawdownPct = 0;
  let maxDrawdownAbs = 0;
  if (heartbeats.length > 0) {
    let peak = heartbeats[0].equity;
    for (const hb of heartbeats) {
      if (hb.equity > peak) peak = hb.equity;
      if (peak > 0) {
        const ddPct = ((peak - hb.equity) / peak) * 100;
        const ddAbs = peak - hb.equity;
        if (ddPct > maxDrawdownPct) {
          maxDrawdownPct = ddPct;
          maxDrawdownAbs = ddAbs;
        }
      }
    }
  }

  // Duration from first heartbeat
  let durationDays: number | null = null;
  if (heartbeats.length > 0) {
    const firstHb = new Date(heartbeats[0].createdAt);
    durationDays = Math.floor((Date.now() - firstHb.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Monthly returns derived from equity curve
  const monthlyReturns: Array<{ month: string; returnPct: number }> = [];
  if (heartbeats.length > 0) {
    const byMonth = new Map<string, { first: number; last: number }>();
    for (const hb of heartbeats) {
      const d = new Date(hb.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = byMonth.get(key);
      if (!existing) {
        byMonth.set(key, { first: hb.equity, last: hb.equity });
      } else {
        existing.last = hb.equity;
      }
    }
    // Compute return for each month using previous month's last equity as base
    let prevEquity: number | null = null;
    for (const [month, { first, last }] of byMonth) {
      const base = prevEquity ?? first;
      const returnPct = base > 0 ? ((last - base) / base) * 100 : 0;
      monthlyReturns.push({ month, returnPct });
      prevEquity = last;
    }
  }

  // Recent trades (20 most recent closed trades across all children)
  const recentTrades = allTrades
    .filter(
      (t): t is { profit: number; closeTime: Date; symbol: string | null } => t.closeTime != null
    )
    .slice(0, 20)
    .map((t) => ({
      closeTime: t.closeTime instanceof Date ? t.closeTime.toISOString() : String(t.closeTime),
      symbol: t.symbol ?? "—",
      profit: t.profit,
    }));

  // Mask account number: show only last 5 chars
  const accountNumberMasked = base.accountNumber ? `•••${base.accountNumber.slice(-5)}` : null;

  const strategies = children.map((c) => ({
    symbol: c.symbol,
    magicNumber: c.terminalDeployments[0]?.magicNumber ?? null,
    totalTrades: c.totalTrades,
    totalProfit: c.totalProfit,
    healthSnapshot: c.healthSnapshots[0] ?? null,
    lifecycleState: c.lifecycleState,
    strategyStatus: c.strategyStatus,
  }));

  return {
    account: {
      eaName: base.eaName,
      broker: base.broker,
      accountNumber: base.accountNumber,
      accountNumberMasked,
      balance: base.balance,
      equity: base.equity,
      status: base.status,
      lastHeartbeat: base.lastHeartbeat?.toISOString() ?? null,
    },
    performance: {
      totalTrades,
      totalProfit,
      winRate,
      profitFactor: profitFactor === Infinity ? null : profitFactor,
      profitFactorDisplay,
      maxDrawdownPct,
      maxDrawdownAbs,
      strategyCount: children.length,
      durationDays,
    },
    equityCurve: heartbeats.map((hb) => ({
      equity: hb.equity,
      balance: hb.balance,
      createdAt: hb.createdAt.toISOString(),
    })),
    monthlyReturns,
    recentTrades,
    strategies,
  };
}
