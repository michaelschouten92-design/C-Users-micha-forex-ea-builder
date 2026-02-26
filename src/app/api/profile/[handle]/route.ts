import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeTrustScore, computeBadges, type TrustScoreInput } from "@/lib/proof/trust-score";
import {
  LADDER_META,
  LADDER_RANK,
  type LadderInput,
  computeLadderLevel,
  mergeThresholds,
} from "@/lib/proof/ladder";
import {
  checkRateLimit,
  publicApiRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import type { LadderLevel } from "@prisma/client";

type Props = { params: Promise<{ handle: string }> };

/**
 * GET /api/profile/[handle] — public trader profile data (no auth required)
 */
export async function GET(request: NextRequest, { params }: Props) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `profile:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const { handle } = await params;

  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true, handle: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Load all public strategy pages for this user
  const pages = await prisma.verifiedStrategyPage.findMany({
    where: {
      isPublic: true,
      strategyIdentity: {
        project: { userId: user.id, deletedAt: null },
      },
    },
    include: {
      strategyIdentity: {
        include: {
          project: { select: { id: true, name: true, description: true } },
        },
      },
    },
  });

  // Load thresholds
  const dbThresholds = await prisma.proofThreshold.findMany();
  const thresholds = mergeThresholds(dbThresholds);

  // Gather strategy data for trust score
  const strategyData: TrustScoreInput["strategies"] = [];
  const proofCards: Array<{
    strategyId: string;
    slug: string;
    name: string;
    description: string | null;
    ladderLevel: LadderLevel;
    ladderMeta: (typeof LADDER_META)[LadderLevel];
    healthScore: number | null;
    liveTrades: number;
    symbol: string | null;
    timeframe: string | null;
  }> = [];

  for (const page of pages) {
    const projectId = page.strategyIdentity.project.id;

    // Best backtest
    const backtest = await prisma.backtestRun.findFirst({
      where: { upload: { projectId } },
      orderBy: { healthScore: "desc" },
      select: { healthScore: true, totalTrades: true, validationResult: true },
    });

    // Live instance data
    const instance = page.pinnedInstanceId
      ? await prisma.liveEAInstance.findUnique({
          where: { id: page.pinnedInstanceId },
          select: {
            id: true,
            symbol: true,
            timeframe: true,
            createdAt: true,
            trackRecordState: {
              select: { totalTrades: true, maxDrawdownPct: true, lastSeqNo: true },
            },
          },
        })
      : null;

    const latestHealth = instance
      ? await prisma.healthSnapshot.findFirst({
          where: { instanceId: instance.id },
          orderBy: { createdAt: "desc" },
          select: { overallScore: true },
        })
      : null;

    const liveTrades = instance?.trackRecordState?.totalTrades ?? 0;
    const liveDays = instance
      ? Math.floor((Date.now() - instance.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const liveMaxDd = instance?.trackRecordState?.maxDrawdownPct ?? null;
    const liveHealthScore = latestHealth?.overallScore ?? null;

    // Monte Carlo
    let mcSurvival: number | null = null;
    if (backtest?.validationResult) {
      const mc = backtest.validationResult as Record<string, unknown>;
      if (mc.survivalRate !== undefined) {
        mcSurvival = Number(mc.survivalRate);
      }
    }

    // Compute ladder level
    const ladderInput: LadderInput = {
      hasBacktest: backtest !== null,
      backtestHealthScore: backtest?.healthScore ?? null,
      monteCarloSurvival: mcSurvival,
      backtestTrades: backtest?.totalTrades ?? 0,
      hasLiveChain: (instance?.trackRecordState?.lastSeqNo ?? 0) > 0,
      liveTrades,
      chainIntegrity: true,
      liveDays,
      liveHealthScore,
      liveMaxDrawdownPct: liveMaxDd,
      scoreCollapsed: false,
    };
    const level = computeLadderLevel(ladderInput, thresholds);

    strategyData.push({
      ladderLevel: level,
      backtestHealthScore: backtest?.healthScore ?? null,
      liveTrades,
      liveDays,
      liveMaxDrawdownPct: liveMaxDd,
      liveHealthScore,
    });

    proofCards.push({
      strategyId: page.strategyIdentity.strategyId,
      slug: page.slug,
      name: page.strategyIdentity.project.name,
      description: page.strategyIdentity.project.description,
      ladderLevel: level,
      ladderMeta: LADDER_META[level],
      healthScore: backtest?.healthScore ?? null,
      liveTrades,
      symbol: instance?.symbol ?? null,
      timeframe: instance?.timeframe ?? null,
    });
  }

  // Sort proofs: PROVEN first, then by ladder rank desc, then health score desc
  proofCards.sort((a, b) => {
    const rankDiff = LADDER_RANK[b.ladderLevel] - LADDER_RANK[a.ladderLevel];
    if (rankDiff !== 0) return rankDiff;
    return (b.healthScore ?? 0) - (a.healthScore ?? 0);
  });

  // Compute trust score
  const trustScore = computeTrustScore({ strategies: strategyData });
  const badges = computeBadges(strategyData);

  // Aggregate stats
  const totalLiveTrades = strategyData.reduce((sum, s) => sum + s.liveTrades, 0);
  const maxLiveDays = Math.max(0, ...strategyData.map((s) => s.liveDays));
  const verifiedMonths = Math.floor(maxLiveDays / 30);

  return NextResponse.json({
    profile: {
      handle: user.handle,
      memberSince: user.createdAt,
    },
    trustScore: trustScore.score,
    trustBreakdown: trustScore.breakdown,
    level: trustScore.level,
    levelMeta: LADDER_META[trustScore.level],
    badges: badges.filter((b) => b.earned),
    stats: {
      totalStrategies: proofCards.length,
      verifiedMonths,
      totalLiveTrades,
    },
    proofs: proofCards,
  });
}
