/**
 * Diagnose why edge-score counter shows 0/10 despite closed trades existing.
 *
 * Usage:
 *   npx tsx scripts/diagnose-edge-counter.ts <user-email>
 *
 * Hypotheses checked:
 *   H1: parentInstanceId / child-instance split — baseline on parent, trades on child (or vice versa)
 *   H2: Trades ingested with closeTime = NULL despite being closed in MT5
 *   H3: instanceId mismatch — trades tied to a different LiveEAInstance than the linked one
 *   H4: Multiple LiveEAInstance rows for same (symbol, magicNumber) — stale vs active split
 */
import { prisma } from "../src/lib/prisma";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/diagnose-edge-counter.ts <user-email>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }
  console.log(`User: ${user.id} (${email})\n`);

  const instances = await prisma.liveEAInstance.findMany({
    where: { userId: user.id, deletedAt: null },
    select: {
      id: true,
      eaName: true,
      symbol: true,
      timeframe: true,
      accountNumber: true,
      broker: true,
      status: true,
      mode: true,
      parentInstanceId: true,
      strategyVersionId: true,
      totalTrades: true,
      openTrades: true,
      createdAt: true,
      lastHeartbeat: true,
      strategyVersion: {
        select: {
          id: true,
          backtestBaseline: {
            select: { id: true, totalTrades: true, winRate: true, profitFactor: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${instances.length} LiveEAInstance rows:\n`);
  for (const ea of instances) {
    const hasBaseline = !!ea.strategyVersion?.backtestBaseline;
    console.log(
      `  [${ea.id}] ${ea.eaName} / ${ea.symbol} / ${ea.timeframe ?? "—"} / acct=${ea.accountNumber ?? "—"}`
    );
    console.log(
      `     status=${ea.status}  mode=${ea.mode}  parent=${ea.parentInstanceId ?? "—"}  baseline=${hasBaseline ? "YES" : "NO"}  counters(heartbeat): total=${ea.totalTrades} open=${ea.openTrades}`
    );
  }
  console.log();

  const instanceIds = instances.map((i) => i.id);
  const tradeStats: Array<{
    instanceId: string;
    total: bigint;
    closed: bigint;
    open: bigint;
    first_close: Date | null;
    last_close: Date | null;
  }> = await prisma.$queryRaw`
    SELECT "instanceId",
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE "closeTime" IS NOT NULL)::bigint AS closed,
      COUNT(*) FILTER (WHERE "closeTime" IS NULL)::bigint AS open,
      MIN("closeTime") AS first_close,
      MAX("closeTime") AS last_close
    FROM "EATrade"
    WHERE "instanceId" = ANY(${instanceIds})
    GROUP BY "instanceId"
  `;

  console.log(`EATrade aggregates:\n`);
  if (tradeStats.length === 0) {
    console.log(`  ⚠️  No EATrade rows at all for any of this user's instances!`);
  } else {
    for (const row of tradeStats) {
      const ea = instances.find((i) => i.id === row.instanceId);
      console.log(
        `  [${row.instanceId}] ${ea?.eaName ?? "?"}/${ea?.symbol ?? "?"}: total=${row.total} closed=${row.closed} open=${row.open}`
      );
      if (row.last_close) console.log(`     last close: ${row.last_close.toISOString()}`);
    }
  }
  console.log();

  // Recent sample
  const recent = await prisma.eATrade.findMany({
    where: { instanceId: { in: instanceIds } },
    orderBy: { openTime: "desc" },
    take: 10,
    select: {
      instanceId: true,
      ticket: true,
      symbol: true,
      openTime: true,
      closeTime: true,
      profit: true,
      magicNumber: true,
    },
  });

  console.log(`Last 10 EATrade rows across all instances:\n`);
  for (const t of recent) {
    const ea = instances.find((i) => i.id === t.instanceId);
    console.log(
      `  ${t.openTime.toISOString().slice(0, 19)} → ${t.closeTime ? t.closeTime.toISOString().slice(0, 19) : "OPEN"} | ${ea?.eaName ?? "?"}/${t.symbol} ticket=${t.ticket} magic=${t.magicNumber ?? "—"} profit=${t.profit}`
    );
  }
  console.log();

  // TerminalDeployment check — the history-backfill endpoint resolves trades
  // via (symbol, magicNumber) → TerminalDeployment → instanceId. Missing rows
  // here = backfilled trades get "no owned deployment" skipped.
  const deployments = await prisma.terminalDeployment.findMany({
    where: { instanceId: { in: instanceIds } },
    select: {
      instanceId: true,
      symbol: true,
      magicNumber: true,
      eaName: true,
      baselineStatus: true,
    },
  });

  console.log(`TerminalDeployment rows (used for backfill attribution):\n`);
  if (deployments.length === 0) {
    console.log(`  ⚠️  None — backfill endpoint will skip all trades!`);
  } else {
    for (const d of deployments) {
      const ea = instances.find((i) => i.id === d.instanceId);
      console.log(
        `  ${d.symbol} / magic=${d.magicNumber} / ${d.eaName} → ${ea?.eaName ?? "?"} [status=${d.baselineStatus}]`
      );
    }
  }
  console.log();

  // TrackRecordEvent check — Monitor EA writes TRADE_CLOSE events here
  const trackRecordStats: Array<{
    instanceId: string;
    eventType: string;
    count: bigint;
  }> = await prisma.$queryRaw`
    SELECT "instanceId", "eventType", COUNT(*)::bigint AS count
    FROM "TrackRecordEvent"
    WHERE "instanceId" = ANY(${instanceIds})
    GROUP BY "instanceId", "eventType"
    ORDER BY "instanceId", "eventType"
  `;

  console.log(`TrackRecordEvent aggregates (the table Monitor EA writes to):\n`);
  if (trackRecordStats.length === 0) {
    console.log(`  (no track-record events at all)`);
  } else {
    for (const row of trackRecordStats) {
      const ea = instances.find((i) => i.id === row.instanceId);
      console.log(
        `  [${row.instanceId}] ${ea?.eaName ?? "?"}/${ea?.symbol ?? "?"}: ${row.eventType} × ${row.count}`
      );
    }
  }
  console.log();

  // Hypothesis analysis
  console.log(`=== Diagnosis ===\n`);

  const withBaseline = instances.filter((i) => i.strategyVersion?.backtestBaseline);
  const withoutBaseline = instances.filter((i) => !i.strategyVersion?.backtestBaseline);

  console.log(`Instances WITH baseline: ${withBaseline.length}`);
  for (const ea of withBaseline) {
    const stats = tradeStats.find((s) => s.instanceId === ea.id);
    const closed = stats ? Number(stats.closed) : 0;
    const open = stats ? Number(stats.open) : 0;
    console.log(
      `  ${ea.eaName}/${ea.symbol}: closed=${closed} open=${open} → edge counter shows ${closed}/10`
    );
  }
  console.log();

  console.log(`Instances WITHOUT baseline: ${withoutBaseline.length}`);
  for (const ea of withoutBaseline) {
    const stats = tradeStats.find((s) => s.instanceId === ea.id);
    if (stats && Number(stats.total) > 0) {
      console.log(
        `  🎯 ${ea.eaName}/${ea.symbol} [${ea.id}]: has ${stats.total} trades but NO baseline. parent=${ea.parentInstanceId ?? "—"}`
      );
      console.log(`     → these trades are "orphaned" from edge-score perspective!`);
    }
  }
  console.log();

  // Parent/child analysis
  const parentChildPairs: Array<{
    parent: (typeof instances)[number];
    child: (typeof instances)[number];
  }> = [];
  for (const ea of instances) {
    if (ea.parentInstanceId) {
      const parent = instances.find((i) => i.id === ea.parentInstanceId);
      if (parent) parentChildPairs.push({ parent, child: ea });
    }
  }
  if (parentChildPairs.length > 0) {
    console.log(`Parent/child relationships:\n`);
    for (const { parent, child } of parentChildPairs) {
      const parentStats = tradeStats.find((s) => s.instanceId === parent.id);
      const childStats = tradeStats.find((s) => s.instanceId === child.id);
      const parentHasBaseline = !!parent.strategyVersion?.backtestBaseline;
      const childHasBaseline = !!child.strategyVersion?.backtestBaseline;
      console.log(
        `  parent=${parent.eaName}/${parent.symbol} [baseline=${parentHasBaseline ? "Y" : "N"}, trades=${parentStats?.total ?? 0}]`
      );
      console.log(
        `   └ child=${child.eaName}/${child.symbol} [baseline=${childHasBaseline ? "Y" : "N"}, trades=${childStats?.total ?? 0}]`
      );
      if (parentHasBaseline && !childHasBaseline && Number(childStats?.total ?? 0) > 0) {
        console.log(
          `     ⚠️  BUG: baseline on parent but trades on child — edge counter reads parent.trades (= ${parentStats?.total ?? 0}) not child.trades (= ${childStats?.total ?? 0})`
        );
      }
    }
    console.log();
  }

  // Duplicate detection
  const bySymbolMagic = new Map<string, typeof instances>();
  for (const ea of instances) {
    const key = `${ea.symbol ?? ""}::${ea.accountNumber ?? ""}`;
    const arr = bySymbolMagic.get(key) ?? [];
    arr.push(ea);
    bySymbolMagic.set(key, arr);
  }
  const dupes = Array.from(bySymbolMagic.entries()).filter(([, arr]) => arr.length > 1);
  if (dupes.length > 0) {
    console.log(`Duplicate (symbol + account) groups:\n`);
    for (const [key, arr] of dupes) {
      console.log(`  ${key}: ${arr.length} instances`);
      for (const ea of arr) {
        const stats = tradeStats.find((s) => s.instanceId === ea.id);
        console.log(
          `    [${ea.id}] created=${ea.createdAt.toISOString().slice(0, 10)} status=${ea.status} trades=${stats?.total ?? 0} baseline=${ea.strategyVersion?.backtestBaseline ? "Y" : "N"}`
        );
      }
    }
    console.log();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
