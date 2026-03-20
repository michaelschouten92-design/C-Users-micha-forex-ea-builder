import { prisma } from "@/lib/prisma";

export interface TrackRecordData {
  account: {
    eaName: string;
    broker: string | null;
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
  coverage: {
    firstHeartbeatAt: string | null;
    lastHeartbeatAt: string | null;
  };
  equityCurve: Array<{ equity: number; balance: number; createdAt: string }>;
  monthlyReturns: Array<{ month: string; returnPct: number }>;
  closedTrades: Array<{
    closeTime: string;
    openTime: string;
    symbol: string;
    type: string;
    lots: number;
    openPrice: number;
    closePrice: number | null;
    profit: number;
  }>;
  ledgerEvents: Array<{
    timestamp: string;
    eventType: string;
    seqNo: number;
    payload: Record<string, unknown>;
  }>;
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
      trades: {
        where: { closeTime: { not: null } },
        orderBy: { closeTime: "desc" },
        select: {
          profit: true,
          closeTime: true,
          openTime: true,
          symbol: true,
          type: true,
          lots: true,
          openPrice: true,
          closePrice: true,
        },
      },
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
        select: {
          profit: true,
          closeTime: true,
          openTime: true,
          symbol: true,
          type: true,
          lots: true,
          openPrice: true,
          closePrice: true,
        },
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

  const allInstanceIds = [base.id, ...children.map((c) => c.id)];

  const [heartbeats, ledgerEventsRaw] = await Promise.all([
    prisma.eAHeartbeat.findMany({
      where: { instanceId: base.id },
      orderBy: { createdAt: "asc" },
      select: { equity: true, balance: true, createdAt: true },
    }),
    prisma.trackRecordEvent.findMany({
      where: { instanceId: { in: allInstanceIds } },
      orderBy: { timestamp: "desc" },
      take: 50,
      select: { eventType: true, timestamp: true, seqNo: true, payload: true },
    }),
  ]);

  // Compute aggregates from closed trades (base instance + all child instances)
  const allTrades = [...(base.trades ?? []), ...children.flatMap((c) => c.trades)];
  const totalTrades = allTrades.length;
  const totalProfit = allTrades.reduce((sum, t) => sum + t.profit, 0);

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

  // Closed trades (newest first, capped at 200 for public page)
  const closedTrades = allTrades
    .filter((t): t is typeof t & { closeTime: Date; openTime: Date } => t.closeTime != null)
    .sort((a, b) => {
      const ta =
        a.closeTime instanceof Date ? a.closeTime.getTime() : new Date(a.closeTime).getTime();
      const tb =
        b.closeTime instanceof Date ? b.closeTime.getTime() : new Date(b.closeTime).getTime();
      return tb - ta;
    })
    .slice(0, 200)
    .map((t) => ({
      closeTime: t.closeTime instanceof Date ? t.closeTime.toISOString() : String(t.closeTime),
      openTime: t.openTime instanceof Date ? t.openTime.toISOString() : String(t.openTime),
      symbol: t.symbol ?? "—",
      type: t.type ?? "—",
      lots: t.lots ?? 0,
      openPrice: t.openPrice ?? 0,
      closePrice: t.closePrice ?? null,
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
    coverage: {
      firstHeartbeatAt: heartbeats.length > 0 ? heartbeats[0].createdAt.toISOString() : null,
      lastHeartbeatAt:
        heartbeats.length > 0 ? heartbeats[heartbeats.length - 1].createdAt.toISOString() : null,
    },
    equityCurve: heartbeats.map((hb) => ({
      equity: hb.equity,
      balance: hb.balance,
      createdAt: hb.createdAt.toISOString(),
    })),
    monthlyReturns,
    closedTrades,
    ledgerEvents: ledgerEventsRaw.map((e) => ({
      timestamp: e.timestamp.toISOString(),
      eventType: e.eventType,
      seqNo: e.seqNo,
      payload: (e.payload ?? {}) as Record<string, unknown>,
    })),
    strategies,
  };
}
