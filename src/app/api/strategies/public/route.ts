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

/**
 * GET /api/strategies/public — curated list of public verified strategies
 * Filters: isPublic, totalTrades >= 200, profitFactor >= 1.2,
 *          monteCarloSurvival >= 70%, lifecycle !== STOP
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `strategies-public:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  const pages = await prisma.verifiedStrategyPage.findMany({
    where: { isPublic: true },
    include: {
      strategyIdentity: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              backtestUploads: {
                select: {
                  runs: {
                    orderBy: { createdAt: "desc" as const },
                    take: 1,
                    select: {
                      profitFactor: true,
                      maxDrawdownPct: true,
                      totalTrades: true,
                      winRate: true,
                      validationResult: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const items: Array<{
    strategyId: string;
    name: string;
    slug: string;
    lifecycle: string;
    ladderLevel: string;
    profitFactor: number;
    maxDrawdownPct: number;
    tradeCount: number;
    monteCarloSurvivalPct: number;
    winRate: number;
    updatedAt: string;
  }> = [];

  for (const page of pages) {
    const identity = page.strategyIdentity;
    const project = identity.project;

    // Find the latest backtest run across all uploads
    let latestRun: {
      profitFactor: number;
      maxDrawdownPct: number;
      totalTrades: number;
      winRate: number;
      validationResult: unknown;
    } | null = null;

    for (const upload of project.backtestUploads) {
      if (upload.runs[0]) {
        latestRun = upload.runs[0];
        break; // already ordered by createdAt desc
      }
    }

    if (!latestRun) continue;

    // Post-query filters
    if (latestRun.totalTrades < 200) continue;
    if (latestRun.profitFactor < 1.2) continue;

    // Monte Carlo survival
    let monteCarloSurvivalPct = 0;
    if (latestRun.validationResult) {
      const mc = latestRun.validationResult as Record<string, unknown>;
      monteCarloSurvivalPct = Math.round((Number(mc.survivalRate) || 0) * 100);
    }
    if (monteCarloSurvivalPct < 70) continue;

    // Lifecycle mapping from pinned instance
    let lifecycle = "RUN";
    if (page.pinnedInstanceId) {
      const instance = await prisma.liveEAInstance.findUnique({
        where: { id: page.pinnedInstanceId },
        select: { lifecyclePhase: true, operatorHold: true },
      });
      if (instance) {
        if (instance.lifecyclePhase === "RETIRED") lifecycle = "STOP";
        else if (instance.operatorHold === "HALTED") lifecycle = "PAUSE";
      }
    }

    if (lifecycle === "STOP") continue;

    items.push({
      strategyId: identity.strategyId,
      name: project.name,
      slug: page.slug,
      lifecycle,
      ladderLevel: page.ladderLevel,
      profitFactor: latestRun.profitFactor,
      maxDrawdownPct: latestRun.maxDrawdownPct,
      tradeCount: latestRun.totalTrades,
      monteCarloSurvivalPct,
      winRate: latestRun.winRate,
      updatedAt: page.updatedAt.toISOString(),
    });
  }

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
