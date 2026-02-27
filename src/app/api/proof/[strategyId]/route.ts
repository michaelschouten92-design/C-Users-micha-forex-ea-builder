import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { computeMetrics } from "@/lib/track-record/metrics";
import {
  computeLadderLevel,
  mergeThresholds,
  LADDER_META,
  type LadderInput,
} from "@/lib/proof/ladder";
import {
  checkRateLimit,
  publicApiRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

type Props = { params: Promise<{ strategyId: string }> };

/**
 * GET /api/proof/[strategyId] — public proof page data (no auth required)
 * Returns full proof data including ladder level, backtest health, Monte Carlo, live data.
 */
export async function GET(request: NextRequest, { params }: Props) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `proof:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const { strategyId } = await params;

  // Find strategy identity by strategyId (e.g., "AS-abc12345")
  const identity = await prisma.strategyIdentity.findUnique({
    where: { strategyId: strategyId.toUpperCase() },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      publicPage: true,
      versions: {
        orderBy: { versionNo: "desc" },
        take: 1,
        select: { id: true, versionNo: true, fingerprint: true, createdAt: true },
      },
    },
  });

  if (!identity || !identity.publicPage?.isPublic) {
    return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
  }

  const page = identity.publicPage;
  const project = identity.project;

  // Load user handle
  const owner = await prisma.user.findUnique({
    where: { id: project.userId },
    select: { handle: true },
  });

  // Load latest backtest run for this project (most recent evaluation)
  const backtestRun = await prisma.backtestRun.findFirst({
    where: {
      upload: { projectId: project.id },
    },
    orderBy: { createdAt: "desc" },
    select: {
      healthScore: true,
      healthStatus: true,
      totalTrades: true,
      profitFactor: true,
      maxDrawdownPct: true,
      sharpeRatio: true,
      recoveryFactor: true,
      expectedPayoff: true,
      winRate: true,
      scoreBreakdown: true,
      validationResult: true,
      createdAt: true,
    },
  });

  // Load thresholds from DB
  const dbThresholds = await prisma.proofThreshold.findMany();
  const thresholds = mergeThresholds(dbThresholds);

  // Extract Monte Carlo data
  let monteCarlo: { survivalRate: number; p5: number; p50: number; p95: number } | null = null;
  if (backtestRun?.validationResult) {
    const mc = backtestRun.validationResult as Record<string, unknown>;
    if (mc.survivalRate !== undefined) {
      monteCarlo = {
        survivalRate: Number(mc.survivalRate) || 0,
        p5: Number(mc.p5Return ?? mc.p5 ?? 0),
        p50: Number(mc.medianReturn ?? mc.p50 ?? 0),
        p95: Number(mc.p95Return ?? mc.p95 ?? 0),
      };
    }
  }

  // Load pinned instance data
  let instanceData = null;
  let trackRecord = null;
  let liveHealth = null;
  let chainInfo = null;
  let equityCurve: Array<{ equity: number; balance: number; createdAt: string }> = [];
  let liveMetrics = null;
  let monitoringStatus = null;

  if (page.pinnedInstanceId) {
    const instance = await prisma.liveEAInstance.findUnique({
      where: { id: page.pinnedInstanceId },
      select: {
        id: true,
        eaName: true,
        symbol: true,
        timeframe: true,
        status: true,
        mode: true,
        totalTrades: true,
        totalProfit: true,
        createdAt: true,
        lastHeartbeat: true,
        lifecyclePhase: true,
        strategyStatus: true,
      },
    });

    if (instance) {
      instanceData = instance;

      // Monitoring status
      const now = Date.now();
      const lastHb = instance.lastHeartbeat?.getTime() ?? 0;
      const hbAgeMs = now - lastHb;
      monitoringStatus = {
        status:
          instance.status === "ONLINE" && hbAgeMs < 5 * 60 * 1000
            ? "Connected"
            : hbAgeMs < 30 * 60 * 1000
              ? "Delayed"
              : "Disconnected",
        lastHeartbeat: instance.lastHeartbeat,
      };

      // Track record state
      const trackState = await prisma.trackRecordState.findUnique({
        where: { instanceId: instance.id },
        select: {
          totalTrades: true,
          winCount: true,
          lossCount: true,
          totalProfit: true,
          maxDrawdownPct: true,
          balance: true,
          equity: true,
          lastSeqNo: true,
          lastEventHash: true,
          updatedAt: true,
        },
      });
      trackRecord = trackState;

      // Latest health snapshot
      const healthSnapshot = await prisma.healthSnapshot.findFirst({
        where: { instanceId: instance.id },
        orderBy: { createdAt: "desc" },
      });
      if (healthSnapshot) {
        liveHealth = {
          status: healthSnapshot.status,
          overallScore: healthSnapshot.overallScore,
          returnScore: healthSnapshot.returnScore,
          volatilityScore: healthSnapshot.volatilityScore,
          drawdownScore: healthSnapshot.drawdownScore,
          winRateScore: healthSnapshot.winRateScore,
          tradeFrequencyScore: healthSnapshot.tradeFrequencyScore,
          driftDetected: healthSnapshot.driftDetected,
          primaryDriver: healthSnapshot.primaryDriver,
          scoreTrend: healthSnapshot.scoreTrend,
          lastUpdated: healthSnapshot.createdAt,
        };
      }

      // Chain info
      const [chainLength, lastCheckpoint] = await Promise.all([
        prisma.trackRecordEvent.count({ where: { instanceId: instance.id } }),
        prisma.trackRecordCheckpoint.findFirst({
          where: { instanceId: instance.id },
          orderBy: { createdAt: "desc" },
          select: { hmac: true, createdAt: true },
        }),
      ]);
      chainInfo = {
        length: chainLength,
        lastHash: trackState?.lastEventHash ?? null,
        lastVerification: lastCheckpoint?.createdAt ?? null,
      };

      // Equity curve
      if (page.showEquityCurve) {
        const heartbeats = await prisma.eAHeartbeat.findMany({
          where: { instanceId: instance.id },
          orderBy: { createdAt: "asc" },
          select: { equity: true, balance: true, createdAt: true },
          take: 500,
        });
        equityCurve = heartbeats.map((h) => ({
          equity: h.equity,
          balance: h.balance,
          createdAt: h.createdAt.toISOString(),
        }));
      }

      // Live risk metrics
      const tradeCloseEvents = await prisma.trackRecordEvent.findMany({
        where: { instanceId: instance.id, eventType: "TRADE_CLOSE" },
        orderBy: { seqNo: "asc" },
        select: { payload: true },
        take: 5000,
      });
      const snapshotEvents = await prisma.trackRecordEvent.findMany({
        where: { instanceId: instance.id, eventType: "SNAPSHOT" },
        orderBy: { seqNo: "asc" },
        select: { payload: true, timestamp: true },
        take: 5000,
      });
      const tradeResults = tradeCloseEvents.map((e) => {
        const p = e.payload as Record<string, unknown>;
        return (p.profit as number) ?? 0;
      });
      const equityCurveForMetrics = snapshotEvents.map((e) => {
        const p = e.payload as Record<string, unknown>;
        return {
          t: e.timestamp.toISOString(),
          b: (p.balance as number) ?? 0,
          e: (p.equity as number) ?? 0,
          dd: (p.drawdownPct as number) ?? 0,
        };
      });
      liveMetrics = computeMetrics(tradeResults, equityCurveForMetrics);
    }
  }

  // Compute ladder level
  const liveDaysRaw = instanceData?.createdAt
    ? (Date.now() - new Date(instanceData.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : null;

  // Chain integrity: verify event count matches lastSeqNo (no gaps)
  let chainIntegrity = false;
  if (trackRecord && (trackRecord.lastSeqNo ?? 0) > 0 && page.pinnedInstanceId) {
    const eventCount = await prisma.trackRecordEvent.count({
      where: { instanceId: page.pinnedInstanceId },
    });
    chainIntegrity = eventCount === trackRecord.lastSeqNo;
  }

  // Score collapse: check if health score ever dropped below stability threshold
  let scoreCollapsed = false;
  if (page.pinnedInstanceId) {
    const stabilityThreshold = thresholds.PROVEN_MIN_SCORE_STABILITY / 100; // overallScore is 0–1
    const collapsedSnapshot = await prisma.healthSnapshot.findFirst({
      where: {
        instanceId: page.pinnedInstanceId,
        overallScore: { lt: stabilityThreshold },
      },
      select: { id: true },
    });
    scoreCollapsed = collapsedSnapshot !== null;
  }

  const ladderInput: LadderInput = {
    hasBacktest: backtestRun !== null,
    backtestHealthScore: backtestRun?.healthScore ?? null,
    monteCarloSurvival: monteCarlo?.survivalRate ?? null,
    backtestTrades: backtestRun?.totalTrades ?? 0,
    hasLiveChain: trackRecord !== null && (trackRecord.lastSeqNo ?? 0) > 0,
    liveTrades: trackRecord?.totalTrades ?? 0,
    chainIntegrity,
    liveDays: liveDaysRaw !== null ? Math.floor(liveDaysRaw) : null,
    liveHealthScore: liveHealth?.overallScore ?? null,
    liveMaxDrawdownPct: trackRecord?.maxDrawdownPct ?? null,
    scoreCollapsed,
  };

  const ladderLevel = computeLadderLevel(ladderInput, thresholds);
  const ladderMeta = LADDER_META[ladderLevel];

  // Update stored level if changed
  if (page.ladderLevel !== ladderLevel) {
    await prisma.verifiedStrategyPage
      .update({
        where: { id: page.id },
        data: { ladderLevel, lastLevelComputedAt: new Date() },
      })
      .catch((err) => {
        logger.warn({ err, pageId: page.id }, "Failed to update ladder level (non-critical)");
      });
  }

  return NextResponse.json({
    strategy: {
      name: project.name,
      description: project.description,
      strategyId: identity.strategyId,
      slug: page.slug,
      ownerHandle: owner?.handle ?? null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      currentVersion: identity.versions[0] ?? null,
    },
    ladder: {
      level: ladderLevel,
      label: ladderMeta.label,
      color: ladderMeta.color,
      description: ladderMeta.description,
      criteria: {
        VALIDATED: {
          label: "Validated",
          requirements: [
            `Backtest health score >= ${thresholds.VALIDATED_MIN_SCORE}/100`,
            `Monte Carlo survival rate >= ${(thresholds.VALIDATED_MIN_SURVIVAL * 100).toFixed(0)}%`,
            `Minimum ${thresholds.MIN_TRADES_VALIDATION} backtest trades`,
          ],
        },
        VERIFIED: {
          label: "Verified",
          requirements: [
            "All Validated requirements met",
            `Minimum ${thresholds.MIN_LIVE_TRADES_VERIFIED} live trades recorded`,
            "Live trade hash chain active with no gaps",
          ],
        },
        PROVEN: {
          label: "Proven",
          requirements: [
            "All Verified requirements met",
            `Live trading for >= ${thresholds.MIN_LIVE_DAYS_PROVEN} days`,
            `Max drawdown <= ${thresholds.PROVEN_MAX_DRAWDOWN_PCT}%`,
            `Health score stability maintained above ${thresholds.PROVEN_MIN_SCORE_STABILITY}%`,
            "No score collapse events",
          ],
        },
      },
    },
    backtestHealth: backtestRun
      ? {
          score: backtestRun.healthScore,
          status: backtestRun.healthStatus,
          breakdown: backtestRun.scoreBreakdown,
          evaluatedAt: backtestRun.createdAt,
          stats: {
            profitFactor: backtestRun.profitFactor,
            maxDrawdownPct: backtestRun.maxDrawdownPct,
            sharpeRatio: backtestRun.sharpeRatio,
            winRate: backtestRun.winRate,
            totalTrades: backtestRun.totalTrades,
            expectedPayoff: backtestRun.expectedPayoff,
            recoveryFactor: backtestRun.recoveryFactor,
          },
        }
      : null,
    monteCarlo,
    instance: instanceData,
    trackRecord: trackRecord
      ? {
          totalTrades: trackRecord.totalTrades,
          winCount: trackRecord.winCount,
          lossCount: trackRecord.lossCount,
          totalProfit: trackRecord.totalProfit,
          maxDrawdownPct: trackRecord.maxDrawdownPct,
          balance: trackRecord.balance,
          equity: trackRecord.equity,
        }
      : null,
    liveHealth: page.showHealthStatus ? liveHealth : null,
    chain: chainInfo,
    equityCurve,
    liveMetrics,
    monitoring: monitoringStatus,
    settings: {
      showEquityCurve: page.showEquityCurve,
      showTradeLog: page.showTradeLog,
      showHealthStatus: page.showHealthStatus,
    },
    freshness: buildFreshnessWarnings(
      liveHealth?.lastUpdated ?? null,
      instanceData?.lastHeartbeat ?? null,
      instanceData?.status ?? null,
      backtestRun?.createdAt ?? null
    ),
  });
}

const HEALTH_STALE_MS = 48 * 60 * 60 * 1000; // 48 hours
const EA_OFFLINE_MS = 24 * 60 * 60 * 1000; // 24 hours
const BACKTEST_STALE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function buildFreshnessWarnings(
  healthLastUpdated: Date | null,
  lastHeartbeat: Date | null,
  eaStatus: string | null,
  backtestDate: Date | null
): {
  warnings: Array<{ type: string; message: string }>;
  healthSnapshotAge: number | null;
  backtestAge: number | null;
} {
  const now = Date.now();
  const warnings: Array<{ type: string; message: string }> = [];

  const healthSnapshotAge = healthLastUpdated ? now - new Date(healthLastUpdated).getTime() : null;

  const backtestAge = backtestDate ? now - new Date(backtestDate).getTime() : null;

  // Health data staleness
  if (healthSnapshotAge !== null && healthSnapshotAge > HEALTH_STALE_MS) {
    const days = Math.floor(healthSnapshotAge / (24 * 60 * 60 * 1000));
    warnings.push({
      type: "health_stale",
      message: `Health data has not been updated for ${days} day${days !== 1 ? "s" : ""}`,
    });
  }

  // EA connectivity
  if (lastHeartbeat) {
    const hbAge = now - new Date(lastHeartbeat).getTime();
    if (hbAge > EA_OFFLINE_MS) {
      const days = Math.floor(hbAge / (24 * 60 * 60 * 1000));
      warnings.push({
        type: "ea_disconnected",
        message: `Strategy has been disconnected for ${days} day${days !== 1 ? "s" : ""}`,
      });
    }
  } else if (eaStatus !== null) {
    // Has an instance but no heartbeat ever
    warnings.push({
      type: "ea_disconnected",
      message: "Strategy has never sent live data",
    });
  }

  // Backtest staleness
  if (backtestAge !== null && backtestAge > BACKTEST_STALE_MS) {
    const days = Math.floor(backtestAge / (24 * 60 * 60 * 1000));
    warnings.push({
      type: "backtest_stale",
      message: `Backtest evaluation is ${days} days old`,
    });
  }

  return {
    warnings,
    healthSnapshotAge: healthSnapshotAge !== null ? Math.floor(healthSnapshotAge / 1000) : null,
    backtestAge: backtestAge !== null ? Math.floor(backtestAge / 1000) : null,
  };
}
