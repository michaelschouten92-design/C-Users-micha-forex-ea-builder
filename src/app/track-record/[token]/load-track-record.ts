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
        take: 500,
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
        take: 500,
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
    // Only fetch a handful of heartbeats for coverage timestamps + current equity baseline
    prisma.eAHeartbeat
      .findMany({
        where: { instanceId: base.id },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { equity: true, balance: true, createdAt: true },
      })
      .then((rows) => rows.reverse()),
    prisma.trackRecordEvent.findMany({
      where: { instanceId: { in: allInstanceIds } },
      orderBy: { timestamp: "desc" },
      take: 50,
      select: { eventType: true, timestamp: true, seqNo: true, payload: true },
    }),
  ]);

  // Single source of truth: TrackRecordState (chain-backed) for all public metrics.
  // Profit factor is NOT available from TrackRecordState (no grossProfit/grossLoss).
  // Rather than mixing sources, we show null when chain-backed state exists.
  const trackStates = await prisma.trackRecordState.findMany({
    where: { instanceId: { in: allInstanceIds } },
    select: {
      totalTrades: true,
      totalProfit: true,
      winCount: true,
      lossCount: true,
      maxDrawdownPct: true,
    },
  });

  const allTrades = [...(base.trades ?? []), ...children.flatMap((c) => c.trades)];

  let totalTrades: number;
  let totalProfit: number;
  let winRate: number;
  let profitFactor: number | null;

  if (trackStates.length > 0) {
    // Chain-backed: all metrics from TrackRecordState only
    totalTrades = trackStates.reduce((s, ts) => s + ts.totalTrades, 0);
    totalProfit = trackStates.reduce((s, ts) => s + ts.totalProfit, 0);
    const totalWins = trackStates.reduce((s, ts) => s + ts.winCount, 0);
    winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    profitFactor = null; // Not derivable from chain state without individual trade profits
  } else {
    // Fallback: no track record state yet — use EATrade aggregation (consistent within itself)
    totalTrades = allTrades.length;
    totalProfit = allTrades.reduce((sum, t) => sum + t.profit, 0);
    const wins = allTrades.filter((t) => t.profit > 0).length;
    winRate = allTrades.length > 0 ? (wins / allTrades.length) * 100 : 0;
    const grossProfit = allTrades.filter((t) => t.profit > 0).reduce((s, t) => s + t.profit, 0);
    const grossLoss = Math.abs(
      allTrades.filter((t) => t.profit < 0).reduce((s, t) => s + t.profit, 0)
    );
    profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  }

  const profitFactorDisplay =
    profitFactor === null
      ? "—"
      : profitFactor === Infinity
        ? "∞"
        : profitFactor > 0
          ? profitFactor.toFixed(2)
          : "—";

  // Use TrackRecordState for max drawdown if available, otherwise compute from trades
  const chainMaxDD =
    trackStates.length > 0 ? Math.max(...trackStates.map((ts) => ts.maxDrawdownPct ?? 0)) : 0;

  // Build equity curve from closed trades (running cumulative P&L after each trade)
  // This is more efficient than loading 1000 heartbeats and gives a trade-level view
  const tradesSortedAsc = [...allTrades]
    .filter((t) => t.closeTime != null)
    .sort((a, b) => {
      const ta =
        a.closeTime instanceof Date
          ? a.closeTime.getTime()
          : new Date(a.closeTime as string).getTime();
      const tb =
        b.closeTime instanceof Date
          ? b.closeTime.getTime()
          : new Date(b.closeTime as string).getTime();
      return ta - tb;
    });

  const startingBalance =
    base.balance != null ? base.balance - tradesSortedAsc.reduce((s, t) => s + t.profit, 0) : 0;
  let runningEquity = startingBalance;
  const tradeEquityCurve: Array<{ equity: number; balance: number; createdAt: string }> = [];

  // Add starting point
  if (tradesSortedAsc.length > 0) {
    const firstTradeTime =
      tradesSortedAsc[0].closeTime instanceof Date
        ? tradesSortedAsc[0].closeTime.toISOString()
        : String(tradesSortedAsc[0].closeTime);
    tradeEquityCurve.push({
      equity: startingBalance,
      balance: startingBalance,
      createdAt: firstTradeTime,
    });
  }

  // Build running equity after each trade
  let maxDrawdownPct = chainMaxDD;
  let maxDrawdownAbs = 0;
  let peak = startingBalance;

  for (const t of tradesSortedAsc) {
    runningEquity += t.profit;
    const closeTimeStr =
      t.closeTime instanceof Date ? t.closeTime.toISOString() : String(t.closeTime);
    tradeEquityCurve.push({
      equity: runningEquity,
      balance: runningEquity,
      createdAt: closeTimeStr,
    });

    // Track drawdown from trades (only if no chain state)
    if (chainMaxDD === 0) {
      if (runningEquity > peak) peak = runningEquity;
      if (peak > 0) {
        const ddPct = ((peak - runningEquity) / peak) * 100;
        const ddAbs = peak - runningEquity;
        if (ddPct > maxDrawdownPct) {
          maxDrawdownPct = ddPct;
          maxDrawdownAbs = ddAbs;
        }
      }
    }
  }

  // Duration from first trade (or heartbeat if available)
  let durationDays: number | null = null;
  const firstTimestamp =
    tradesSortedAsc.length > 0
      ? tradesSortedAsc[0].closeTime instanceof Date
        ? tradesSortedAsc[0].closeTime
        : new Date(tradesSortedAsc[0].closeTime as string)
      : heartbeats.length > 0
        ? heartbeats[0].createdAt
        : null;
  if (firstTimestamp) {
    durationDays = Math.floor(
      (Date.now() - new Date(firstTimestamp).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Monthly returns derived from trade-based equity curve
  const monthlyReturns: Array<{ month: string; returnPct: number }> = [];
  if (tradeEquityCurve.length > 1) {
    const byMonth = new Map<string, { first: number; last: number }>();
    for (const pt of tradeEquityCurve) {
      const d = new Date(pt.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = byMonth.get(key);
      if (!existing) {
        byMonth.set(key, { first: pt.equity, last: pt.equity });
      } else {
        existing.last = pt.equity;
      }
    }
    let prevEquity: number | null = null;
    for (const [month, { first, last }] of byMonth) {
      const baseEq = prevEquity ?? first;
      const returnPct = baseEq > 0 ? ((last - baseEq) / baseEq) * 100 : 0;
      monthlyReturns.push({ month, returnPct });
      prevEquity = last;
    }
  }

  // Closed trades (newest first, capped at 200 for public page)
  const closedTrades = allTrades
    .filter(
      (t): t is typeof t & { closeTime: Date; openTime: Date } =>
        t.closeTime != null && t.openTime != null
    )
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
      firstHeartbeatAt: firstTimestamp ? new Date(firstTimestamp).toISOString() : null,
      lastHeartbeatAt:
        heartbeats.length > 0
          ? heartbeats[heartbeats.length - 1].createdAt.toISOString()
          : tradeEquityCurve.length > 0
            ? tradeEquityCurve[tradeEquityCurve.length - 1].createdAt
            : null,
    },
    equityCurve: tradeEquityCurve,
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
