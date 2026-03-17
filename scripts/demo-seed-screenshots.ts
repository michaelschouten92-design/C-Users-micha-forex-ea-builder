/**
 * Demo seed — creates 3 realistic monitoring strategies for screenshot generation.
 *
 * Creates an isolated demo user with three strategies in distinct health states:
 *   1. EURUSD Momentum   — Healthy, no drift
 *   2. Gold Mean Reversion — Warning, drift detected
 *   3. BTC Breakout       — Edge at Risk, persistent drift
 *
 * Idempotent: safe to re-run. Uses fixed IDs to enable upsert.
 * Reversible: `npx tsx scripts/demo-seed-screenshots.ts --teardown`
 *
 * Usage:
 *   npx tsx scripts/demo-seed-screenshots.ts              # seed
 *   npx tsx scripts/demo-seed-screenshots.ts --teardown   # remove
 *
 * After seeding, log in as the demo user or access:
 *   /app/live                           — Command Center (all 3 strategies)
 *   /app/strategy/<instanceId>          — Strategy detail / investigation
 *
 * Requires DATABASE_URL in env (or .env loaded by dotenv).
 */

import { PrismaClient, HealthStatus } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Fixed IDs (deterministic, idempotent) ─────────────────

const DEMO_USER_ID = "demo_screenshots_user_0001";
const DEMO_AUTH_PROVIDER = "demo-screenshots-seed";
const DEMO_EMAIL = "demo-screenshots@algo-studio.internal";
const DEMO_PASSWORD = "Demo1234";

const DEMO_TERMINAL_ID = "demo_screenshots_terminal";

// Instance IDs — stable so we can print routes after seeding
const INSTANCE_HEALTHY = "demo_inst_healthy_eurusd_001";
const INSTANCE_WARNING = "demo_inst_warning_xauusd_001";
const INSTANCE_EDGE_RISK = "demo_inst_edgerisk_btcusd_01";

function apiKeyHash(label: string): string {
  return createHash("sha256").update(`demo-screenshot-key:${label}`).digest("hex");
}

function cuid(): string {
  return randomBytes(12).toString("hex");
}

const NOW = new Date();
function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 3600_000);
}
function daysAgo(d: number): Date {
  return new Date(NOW.getTime() - d * 86400_000);
}

// ── Strategy definitions ──────────────────────────────────

interface StrategyDef {
  instanceId: string;
  eaName: string;
  symbol: string;
  timeframe: string;
  broker: string;
  accountNumber: string;
  // Instance state
  status: "ONLINE" | "OFFLINE";
  lifecycleState: string;
  strategyStatus: string;
  balance: number;
  equity: number;
  totalTrades: number;
  totalProfit: number;
  lastHeartbeatHoursAgo: number;
  // Health snapshot
  healthStatus: "HEALTHY" | "WARNING" | "DEGRADED";
  overallScore: number;
  returnScore: number;
  volatilityScore: number;
  drawdownScore: number;
  winRateScore: number;
  tradeFrequencyScore: number;
  // Live metrics
  liveReturnPct: number;
  liveVolatility: number;
  liveMaxDrawdownPct: number;
  liveWinRate: number;
  liveTradesPerDay: number;
  // Baseline metrics
  baselineReturnPct: number;
  baselineMaxDDPct: number;
  baselineWinRate: number;
  baselineTradesPerDay: number;
  // Drift
  driftDetected: boolean;
  driftSeverity: number;
  driftCusumValue: number;
  primaryDriver: string | null;
  scoreTrend: "improving" | "stable" | "declining";
  expectancy: number;
  tradesSampled: number;
  windowDays: number;
  // Health history (scores over time for sparkline, newest first)
  healthHistory: { score: number; status: string; daysAgo: number }[];
  // Trades (for equity curve / journal)
  trades: { profit: number; hoursAgo: number; magicNumber: number }[];
  // Heartbeats (for equity chart)
  heartbeats: { equity: number; hoursAgo: number }[];
}

const strategies: StrategyDef[] = [
  // ── 1. EURUSD Momentum — Healthy ───────────────────────
  {
    instanceId: INSTANCE_HEALTHY,
    eaName: "EURUSD Momentum",
    symbol: "EURUSD",
    timeframe: "H1",
    broker: "IC Markets",
    accountNumber: "50012345",
    status: "ONLINE",
    lifecycleState: "LIVE_MONITORING",
    strategyStatus: "MONITORING",
    balance: 10842.5,
    equity: 10890.2,
    totalTrades: 187,
    totalProfit: 842.5,
    lastHeartbeatHoursAgo: 0.1,
    healthStatus: "HEALTHY",
    overallScore: 0.82,
    returnScore: 0.85,
    volatilityScore: 0.78,
    drawdownScore: 0.84,
    winRateScore: 0.8,
    tradeFrequencyScore: 0.83,
    liveReturnPct: 8.4,
    liveVolatility: 0.012,
    liveMaxDrawdownPct: 4.2,
    liveWinRate: 0.62,
    liveTradesPerDay: 2.8,
    baselineReturnPct: 9.1,
    baselineMaxDDPct: 5.0,
    baselineWinRate: 0.64,
    baselineTradesPerDay: 3.0,
    driftDetected: false,
    driftSeverity: 0.08,
    driftCusumValue: 0.12,
    primaryDriver: null,
    scoreTrend: "stable",
    expectancy: 4.5,
    tradesSampled: 187,
    windowDays: 62,
    healthHistory: [
      { score: 0.82, status: "HEALTHY", daysAgo: 0 },
      { score: 0.81, status: "HEALTHY", daysAgo: 3 },
      { score: 0.83, status: "HEALTHY", daysAgo: 6 },
      { score: 0.8, status: "HEALTHY", daysAgo: 9 },
      { score: 0.79, status: "HEALTHY", daysAgo: 12 },
      { score: 0.82, status: "HEALTHY", daysAgo: 15 },
      { score: 0.84, status: "HEALTHY", daysAgo: 18 },
      { score: 0.81, status: "HEALTHY", daysAgo: 21 },
      { score: 0.78, status: "HEALTHY", daysAgo: 24 },
      { score: 0.8, status: "HEALTHY", daysAgo: 27 },
    ],
    trades: [
      { profit: 23.4, hoursAgo: 2, magicNumber: 1001 },
      { profit: -12.1, hoursAgo: 8, magicNumber: 1001 },
      { profit: 18.7, hoursAgo: 14, magicNumber: 1001 },
      { profit: 31.2, hoursAgo: 26, magicNumber: 1001 },
      { profit: -8.5, hoursAgo: 32, magicNumber: 1001 },
      { profit: 15.9, hoursAgo: 44, magicNumber: 1001 },
      { profit: 22.1, hoursAgo: 56, magicNumber: 1001 },
      { profit: -14.3, hoursAgo: 68, magicNumber: 1001 },
      { profit: 27.8, hoursAgo: 80, magicNumber: 1001 },
      { profit: 19.6, hoursAgo: 92, magicNumber: 1001 },
    ],
    heartbeats: [
      { equity: 10890, hoursAgo: 0.1 },
      { equity: 10870, hoursAgo: 1 },
      { equity: 10855, hoursAgo: 2 },
      { equity: 10830, hoursAgo: 4 },
      { equity: 10810, hoursAgo: 8 },
      { equity: 10790, hoursAgo: 12 },
      { equity: 10820, hoursAgo: 24 },
      { equity: 10780, hoursAgo: 36 },
      { equity: 10750, hoursAgo: 48 },
    ],
  },

  // ── 2. Gold Mean Reversion — Warning ───────────────────
  {
    instanceId: INSTANCE_WARNING,
    eaName: "Gold Mean Reversion",
    symbol: "XAUUSD",
    timeframe: "M15",
    broker: "IC Markets",
    accountNumber: "50012345",
    status: "ONLINE",
    lifecycleState: "LIVE_MONITORING",
    strategyStatus: "UNSTABLE",
    balance: 9210.8,
    equity: 9085.3,
    totalTrades: 312,
    totalProfit: -789.2,
    lastHeartbeatHoursAgo: 0.3,
    healthStatus: "WARNING",
    overallScore: 0.48,
    returnScore: 0.42,
    volatilityScore: 0.55,
    drawdownScore: 0.38,
    winRateScore: 0.51,
    tradeFrequencyScore: 0.62,
    liveReturnPct: -7.9,
    liveVolatility: 0.028,
    liveMaxDrawdownPct: 12.8,
    liveWinRate: 0.49,
    liveTradesPerDay: 4.1,
    baselineReturnPct: 6.2,
    baselineMaxDDPct: 7.5,
    baselineWinRate: 0.58,
    baselineTradesPerDay: 5.2,
    driftDetected: true,
    driftSeverity: 0.45,
    driftCusumValue: 2.8,
    primaryDriver: "returnScore",
    scoreTrend: "declining",
    expectancy: -2.5,
    tradesSampled: 312,
    windowDays: 45,
    healthHistory: [
      { score: 0.48, status: "WARNING", daysAgo: 0 },
      { score: 0.52, status: "WARNING", daysAgo: 3 },
      { score: 0.55, status: "WARNING", daysAgo: 6 },
      { score: 0.61, status: "HEALTHY", daysAgo: 9 },
      { score: 0.65, status: "HEALTHY", daysAgo: 12 },
      { score: 0.68, status: "HEALTHY", daysAgo: 15 },
      { score: 0.72, status: "HEALTHY", daysAgo: 18 },
      { score: 0.74, status: "HEALTHY", daysAgo: 21 },
      { score: 0.73, status: "HEALTHY", daysAgo: 24 },
      { score: 0.75, status: "HEALTHY", daysAgo: 27 },
    ],
    trades: [
      { profit: -18.5, hoursAgo: 1, magicNumber: 2001 },
      { profit: -22.3, hoursAgo: 4, magicNumber: 2001 },
      { profit: 8.1, hoursAgo: 7, magicNumber: 2001 },
      { profit: -31.7, hoursAgo: 12, magicNumber: 2001 },
      { profit: 12.4, hoursAgo: 16, magicNumber: 2001 },
      { profit: -25.9, hoursAgo: 22, magicNumber: 2001 },
      { profit: -14.2, hoursAgo: 28, magicNumber: 2001 },
      { profit: 6.8, hoursAgo: 36, magicNumber: 2001 },
      { profit: -19.6, hoursAgo: 44, magicNumber: 2001 },
      { profit: -28.1, hoursAgo: 52, magicNumber: 2001 },
    ],
    heartbeats: [
      { equity: 9085, hoursAgo: 0.3 },
      { equity: 9120, hoursAgo: 1 },
      { equity: 9150, hoursAgo: 4 },
      { equity: 9200, hoursAgo: 8 },
      { equity: 9280, hoursAgo: 12 },
      { equity: 9350, hoursAgo: 24 },
      { equity: 9420, hoursAgo: 36 },
      { equity: 9510, hoursAgo: 48 },
      { equity: 9600, hoursAgo: 72 },
    ],
  },

  // ── 3. BTC Breakout — Edge at Risk ─────────────────────
  {
    instanceId: INSTANCE_EDGE_RISK,
    eaName: "BTC Breakout",
    symbol: "BTCUSD",
    timeframe: "H4",
    broker: "IC Markets",
    accountNumber: "50012345",
    status: "ONLINE",
    lifecycleState: "EDGE_AT_RISK",
    strategyStatus: "EDGE_DEGRADED",
    balance: 7450.2,
    equity: 7320.8,
    totalTrades: 89,
    totalProfit: -2549.8,
    lastHeartbeatHoursAgo: 0.5,
    healthStatus: "DEGRADED",
    overallScore: 0.24,
    returnScore: 0.18,
    volatilityScore: 0.32,
    drawdownScore: 0.15,
    winRateScore: 0.28,
    tradeFrequencyScore: 0.35,
    liveReturnPct: -25.5,
    liveVolatility: 0.065,
    liveMaxDrawdownPct: 28.4,
    liveWinRate: 0.34,
    liveTradesPerDay: 0.8,
    baselineReturnPct: 14.8,
    baselineMaxDDPct: 11.2,
    baselineWinRate: 0.56,
    baselineTradesPerDay: 1.5,
    driftDetected: true,
    driftSeverity: 0.88,
    driftCusumValue: 7.2,
    primaryDriver: "drawdownScore",
    scoreTrend: "declining",
    expectancy: -28.6,
    tradesSampled: 89,
    windowDays: 58,
    healthHistory: [
      { score: 0.24, status: "DEGRADED", daysAgo: 0 },
      { score: 0.28, status: "DEGRADED", daysAgo: 3 },
      { score: 0.32, status: "DEGRADED", daysAgo: 6 },
      { score: 0.38, status: "WARNING", daysAgo: 9 },
      { score: 0.42, status: "WARNING", daysAgo: 12 },
      { score: 0.5, status: "WARNING", daysAgo: 15 },
      { score: 0.58, status: "HEALTHY", daysAgo: 18 },
      { score: 0.65, status: "HEALTHY", daysAgo: 21 },
      { score: 0.7, status: "HEALTHY", daysAgo: 24 },
      { score: 0.74, status: "HEALTHY", daysAgo: 27 },
    ],
    trades: [
      { profit: -85.2, hoursAgo: 6, magicNumber: 3001 },
      { profit: -62.4, hoursAgo: 18, magicNumber: 3001 },
      { profit: 28.1, hoursAgo: 30, magicNumber: 3001 },
      { profit: -94.7, hoursAgo: 48, magicNumber: 3001 },
      { profit: -45.3, hoursAgo: 72, magicNumber: 3001 },
      { profit: -78.9, hoursAgo: 96, magicNumber: 3001 },
      { profit: 15.6, hoursAgo: 120, magicNumber: 3001 },
      { profit: -110.2, hoursAgo: 144, magicNumber: 3001 },
      { profit: -52.8, hoursAgo: 168, magicNumber: 3001 },
      { profit: 22.4, hoursAgo: 192, magicNumber: 3001 },
    ],
    heartbeats: [
      { equity: 7320, hoursAgo: 0.5 },
      { equity: 7410, hoursAgo: 4 },
      { equity: 7550, hoursAgo: 12 },
      { equity: 7680, hoursAgo: 24 },
      { equity: 7820, hoursAgo: 48 },
      { equity: 8100, hoursAgo: 72 },
      { equity: 8450, hoursAgo: 120 },
      { equity: 8900, hoursAgo: 168 },
      { equity: 9200, hoursAgo: 240 },
    ],
  },
];

// ── Seed ──────────────────────────────────────────────────

async function seed() {
  console.log("Seeding demo screenshot data...\n");

  // 1. Demo user (with password for login)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: { passwordHash },
    create: {
      id: DEMO_USER_ID,
      authProviderId: DEMO_AUTH_PROVIDER,
      email: DEMO_EMAIL,
      emailVerified: true,
      handle: "demo-screenshots",
      passwordHash,
    },
  });
  console.log(`  User: ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);

  // 2. Terminal connection
  await prisma.terminalConnection.upsert({
    where: { id: DEMO_TERMINAL_ID },
    update: { lastHeartbeat: NOW },
    create: {
      id: DEMO_TERMINAL_ID,
      userId: DEMO_USER_ID,
      label: "Demo VPS - IC Markets",
      apiKeyHash: apiKeyHash("terminal"),
      status: "ONLINE",
      lastHeartbeat: NOW,
      broker: "IC Markets",
      accountNumber: "50012345",
    },
  });

  // 3. Seed each strategy
  for (const s of strategies) {
    console.log(`\n  Strategy: ${s.eaName} (${s.healthStatus})`);

    // LiveEAInstance
    await prisma.liveEAInstance.upsert({
      where: { id: s.instanceId },
      update: {
        status: s.status,
        lastHeartbeat: hoursAgo(s.lastHeartbeatHoursAgo),
        balance: s.balance,
        equity: s.equity,
        totalTrades: s.totalTrades,
        totalProfit: s.totalProfit,
        lifecycleState: s.lifecycleState,
        strategyStatus: s.strategyStatus,
        strategyStatusUpdatedAt: hoursAgo(1),
      },
      create: {
        id: s.instanceId,
        userId: DEMO_USER_ID,
        terminalConnectionId: DEMO_TERMINAL_ID,
        apiKeyHash: apiKeyHash(s.instanceId),
        eaName: s.eaName,
        symbol: s.symbol,
        timeframe: s.timeframe,
        broker: s.broker,
        accountNumber: s.accountNumber,
        status: s.status,
        lastHeartbeat: hoursAgo(s.lastHeartbeatHoursAgo),
        balance: s.balance,
        equity: s.equity,
        totalTrades: s.totalTrades,
        totalProfit: s.totalProfit,
        lifecycleState: s.lifecycleState,
        lifecyclePhase: s.lifecycleState === "EDGE_AT_RISK" ? "PROVING" : "PROVING",
        strategyStatus: s.strategyStatus,
        strategyStatusUpdatedAt: hoursAgo(1),
        peakScore: Math.max(s.overallScore, ...s.healthHistory.map((h) => h.score)),
        peakScoreAt: daysAgo(s.healthHistory[s.healthHistory.length - 1].daysAgo),
      },
    });
    console.log(`    Instance: ${s.instanceId}`);

    // Health snapshots (history for sparkline)
    for (const h of s.healthHistory) {
      const snapId = `${s.instanceId}_snap_${h.daysAgo}`;
      await prisma.healthSnapshot.upsert({
        where: { id: snapId },
        update: {
          overallScore: h.score,
          status: h.status as HealthStatus,
        },
        create: {
          id: snapId,
          instanceId: s.instanceId,
          status: h.status as HealthStatus,
          overallScore: h.score,
          returnScore: s.returnScore * (h.score / s.overallScore),
          volatilityScore: s.volatilityScore * (h.score / s.overallScore),
          drawdownScore: s.drawdownScore * (h.score / s.overallScore),
          winRateScore: s.winRateScore * (h.score / s.overallScore),
          tradeFrequencyScore: s.tradeFrequencyScore * (h.score / s.overallScore),
          liveReturnPct: s.liveReturnPct * (h.score / s.overallScore),
          liveVolatility: s.liveVolatility,
          liveMaxDrawdownPct: s.liveMaxDrawdownPct * (s.overallScore / Math.max(h.score, 0.1)),
          liveWinRate: s.liveWinRate + (h.score - s.overallScore) * 0.1,
          liveTradesPerDay: s.liveTradesPerDay,
          baselineReturnPct: s.baselineReturnPct,
          baselineMaxDDPct: s.baselineMaxDDPct,
          baselineWinRate: s.baselineWinRate,
          baselineTradesPerDay: s.baselineTradesPerDay,
          tradesSampled: Math.round(s.tradesSampled * (1 - h.daysAgo / 100)),
          windowDays: Math.max(7, s.windowDays - h.daysAgo),
          confidenceLower: Math.max(0, h.score - 0.15),
          confidenceUpper: Math.min(1, h.score + 0.15),
          driftDetected: h.status === "DEGRADED" || (h.status === "WARNING" && s.driftDetected),
          driftSeverity:
            h.status === "DEGRADED"
              ? s.driftSeverity
              : h.status === "WARNING"
                ? s.driftSeverity * 0.5
                : 0,
          driftCusumValue:
            h.status === "DEGRADED"
              ? s.driftCusumValue
              : h.status === "WARNING"
                ? s.driftCusumValue * 0.4
                : 0,
          primaryDriver: h.status !== "HEALTHY" ? s.primaryDriver : null,
          scoreTrend: h.daysAgo === 0 ? s.scoreTrend : "stable",
          expectancy: s.expectancy * (h.score / s.overallScore),
          createdAt: daysAgo(h.daysAgo),
        },
      });
    }
    console.log(`    Health snapshots: ${s.healthHistory.length}`);

    // Trades
    for (let i = 0; i < s.trades.length; i++) {
      const t = s.trades[i];
      const tradeId = `${s.instanceId}_trade_${i}`;
      await prisma.eATrade.upsert({
        where: { id: tradeId },
        update: {},
        create: {
          id: tradeId,
          instanceId: s.instanceId,
          ticket: String(100000 + i),
          symbol: s.symbol,
          type: t.profit >= 0 ? "BUY" : "SELL",
          openPrice: 1.0,
          closePrice: 1.0 + t.profit / 10000,
          lots: 0.1,
          profit: t.profit,
          openTime: hoursAgo(t.hoursAgo + 1),
          closeTime: hoursAgo(t.hoursAgo),
          magicNumber: t.magicNumber,
        },
      });
    }
    console.log(`    Trades: ${s.trades.length}`);

    // Heartbeats
    for (let i = 0; i < s.heartbeats.length; i++) {
      const hb = s.heartbeats[i];
      const hbId = `${s.instanceId}_hb_${i}`;
      await prisma.eAHeartbeat.upsert({
        where: { id: hbId },
        update: {},
        create: {
          id: hbId,
          instanceId: s.instanceId,
          balance: s.balance,
          equity: hb.equity,
          openTrades: 0,
          totalTrades: s.totalTrades,
          totalProfit: s.totalProfit,
          drawdown: ((s.balance - hb.equity) / s.balance) * 100,
          spread: 1.2,
          createdAt: hoursAgo(hb.hoursAgo),
        },
      });
    }
    console.log(`    Heartbeats: ${s.heartbeats.length}`);

    // MonitoringRun (latest completed)
    const runId = `${s.instanceId}_run_latest`;
    const verdict = s.healthStatus === "DEGRADED" ? "AT_RISK" : "HEALTHY";
    const reasons: string[] = [];
    if (s.driftDetected) reasons.push("MONITORING_CUSUM_DRIFT");
    if (s.healthStatus === "DEGRADED") {
      reasons.push("MONITORING_DRAWDOWN_BREACH", "MONITORING_WIN_RATE_DEGRADED");
    }
    await prisma.monitoringRun.upsert({
      where: { id: runId },
      update: { verdict, reasons },
      create: {
        id: runId,
        strategyId: s.instanceId, // use instanceId as strategyId placeholder for demo
        instance: { connect: { id: s.instanceId } },
        recordId: cuid(),
        source: "live_ingest",
        status: "COMPLETED",
        verdict,
        reasons,
        completedAt: hoursAgo(1),
        configVersion: "v1.0",
      },
    });
    console.log(`    Monitoring run: ${verdict}`);

    // Incident (only for Edge at Risk)
    if (s.healthStatus === "DEGRADED") {
      const incidentId = `${s.instanceId}_incident_001`;
      await prisma.incident.upsert({
        where: { id: incidentId },
        update: {},
        create: {
          id: incidentId,
          strategyId: s.instanceId, // use instanceId as strategyId placeholder for demo
          instance: { connect: { id: s.instanceId } },
          status: "OPEN",
          severity: "AT_RISK",
          reasonCodes: ["MONITORING_CUSUM_DRIFT", "MONITORING_DRAWDOWN_BREACH"],
          triggerRecordId: runId,
          ackDeadlineAt: hoursAgo(-1), // 1 hour from now
          openedAt: hoursAgo(6),
          configVersion: "v1.0",
          thresholdsHash: "demo",
        },
      });
      console.log(`    Incident: OPEN (AT_RISK)`);
    }
  }

  console.log("\n========================================");
  console.log("Demo screenshot data seeded successfully!");
  console.log("========================================\n");
  console.log("Screenshot routes:\n");
  console.log("  Command Center (all 3 strategies):");
  console.log("    /app/live\n");
  console.log("  Strategy detail — Healthy (EURUSD Momentum):");
  console.log(`    /app/strategy/${INSTANCE_HEALTHY}\n`);
  console.log("  Strategy detail — Warning + Drift (Gold Mean Reversion):");
  console.log(`    /app/strategy/${INSTANCE_WARNING}\n`);
  console.log("  Strategy detail — Edge at Risk (BTC Breakout):");
  console.log(`    /app/strategy/${INSTANCE_EDGE_RISK}\n`);
  console.log("Note: You must be logged in as the demo user to see this data.");
  console.log(`Demo user email: ${DEMO_EMAIL}`);
}

// ── Teardown ──────────────────────────────────────────────

async function teardown() {
  console.log("Removing demo screenshot data...\n");

  const instanceIds = [INSTANCE_HEALTHY, INSTANCE_WARNING, INSTANCE_EDGE_RISK];

  // Delete in reverse dependency order
  for (const id of instanceIds) {
    await prisma.incident.deleteMany({ where: { instanceId: id } });
    await prisma.monitoringRun.deleteMany({ where: { instanceId: id } });
    await prisma.eAHeartbeat.deleteMany({ where: { instanceId: id } });
    await prisma.eATrade.deleteMany({ where: { instanceId: id } });
    await prisma.healthSnapshot.deleteMany({ where: { instanceId: id } });
  }
  await prisma.liveEAInstance.deleteMany({ where: { id: { in: instanceIds } } });
  await prisma.terminalConnection.deleteMany({ where: { id: DEMO_TERMINAL_ID } });
  await prisma.user.deleteMany({ where: { id: DEMO_USER_ID } });

  console.log("Done. All demo screenshot data removed.");
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  if (process.argv.includes("--teardown")) {
    await teardown();
  } else {
    await seed();
  }
}

main()
  .catch((err) => {
    console.error("Demo screenshot seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
