import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LADDER_META, mergeThresholds, DEFAULT_THRESHOLDS } from "@/lib/proof/ladder";
import {
  checkRateLimit,
  publicApiRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import type { LadderLevel, Prisma } from "@prisma/client";

type HubType = "verified" | "top-robust" | "rising" | "low-drawdown";

/**
 * GET /api/hub?type=verified&level=VALIDATED&minTrades=50&symbol=EURUSD&page=1
 * Public recognition hub data
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `hub:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const url = request.nextUrl;
  const type = (url.searchParams.get("type") ?? "verified") as HubType;
  const levelFilter = url.searchParams.get("level") as LadderLevel | null;
  const minTrades = parseInt(url.searchParams.get("minTrades") ?? "0", 10);
  const symbol = url.searchParams.get("symbol");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = 20;

  // Load thresholds
  const dbThresholds = await prisma.proofThreshold.findMany();
  const thresholds = mergeThresholds(dbThresholds);

  const hubMinTrades = Math.max(minTrades, thresholds.HUB_MIN_TRADES);

  // Base query: public strategies with VALIDATED+
  const baseWhere: Prisma.VerifiedStrategyPageWhereInput = {
    isPublic: true,
    ladderLevel: levelFilter ? levelFilter : { in: ["VALIDATED", "VERIFIED", "PROVEN"] },
  };

  // Build the query based on hub type
  let orderBy: Prisma.VerifiedStrategyPageOrderByWithRelationInput[] = [{ createdAt: "desc" }];

  if (type === "top-robust") {
    // Order by ladder level desc, then we'll sort by health score in JS
    orderBy = [{ ladderLevel: "desc" }, { createdAt: "desc" }];
  } else if (type === "rising") {
    orderBy = [{ lastLevelComputedAt: "desc" }, { updatedAt: "desc" }];
  }

  const pages = await prisma.verifiedStrategyPage.findMany({
    where: baseWhere,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize * 2, // Over-fetch for post-filtering
    include: {
      strategyIdentity: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              userId: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.verifiedStrategyPage.count({ where: baseWhere });

  // Enrich with backtest data and filter
  const results: Array<{
    strategyId: string;
    slug: string;
    name: string;
    description: string | null;
    ownerHandle: string | null;
    ladderLevel: LadderLevel;
    ladderMeta: (typeof LADDER_META)[LadderLevel];
    healthScore: number | null;
    maxDrawdownPct: number | null;
    totalTrades: number;
    symbol: string | null;
    timeframe: string | null;
    winRate: number | null;
    profitFactor: number | null;
    createdAt: Date;
  }> = [];

  // Batch load user handles
  const userIds = [...new Set(pages.map((p) => p.strategyIdentity.project.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, handle: true },
  });
  const handleMap = new Map(users.map((u) => [u.id, u.handle]));

  for (const p of pages) {
    const projectId = p.strategyIdentity.project.id;

    const backtest = await prisma.backtestRun.findFirst({
      where: { upload: { projectId } },
      orderBy: { healthScore: "desc" },
      select: {
        healthScore: true,
        totalTrades: true,
        maxDrawdownPct: true,
        winRate: true,
        profitFactor: true,
        symbol: true,
        timeframe: true,
      },
    });

    if (!backtest) continue;

    // Apply min trades filter
    if (backtest.totalTrades < hubMinTrades) continue;

    // Apply symbol filter
    if (symbol && backtest.symbol?.toUpperCase() !== symbol.toUpperCase()) continue;

    results.push({
      strategyId: p.strategyIdentity.strategyId,
      slug: p.slug,
      name: p.strategyIdentity.project.name,
      description: p.strategyIdentity.project.description,
      ownerHandle: handleMap.get(p.strategyIdentity.project.userId) ?? null,
      ladderLevel: p.ladderLevel,
      ladderMeta: LADDER_META[p.ladderLevel],
      healthScore: backtest.healthScore,
      maxDrawdownPct: backtest.maxDrawdownPct,
      totalTrades: backtest.totalTrades,
      symbol: backtest.symbol,
      timeframe: backtest.timeframe,
      winRate: backtest.winRate,
      profitFactor: backtest.profitFactor,
      createdAt: p.createdAt,
    });

    if (results.length >= pageSize) break;
  }

  // Type-specific sorting
  if (type === "top-robust") {
    results.sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0));
  } else if (type === "low-drawdown") {
    results.sort((a, b) => (a.maxDrawdownPct ?? 100) - (b.maxDrawdownPct ?? 100));
  }

  return NextResponse.json({
    type,
    results,
    pagination: { page, pageSize, total },
    filters: {
      level: levelFilter,
      minTrades: hubMinTrades,
      symbol,
    },
  });
}
