import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { getCachedTier } from "@/lib/plan-limits";
import {
  aiAnalysisFreeRateLimiter,
  aiAnalysisProRateLimiter,
  aiAnalysisEliteRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { analyzeStrategy, type StrategyAnalysisInput } from "@/lib/ai-strategy-doctor";
import type { ParsedDeal } from "@/lib/backtest-parser/types";

// Select the right rate limiter based on plan tier
function getRateLimiterForTier(tier: string) {
  switch (tier) {
    case "ELITE":
      return aiAnalysisEliteRateLimiter;
    case "PRO":
      return aiAnalysisProRateLimiter;
    default:
      return aiAnalysisFreeRateLimiter;
  }
}

// POST /api/backtest/[id]/analyze — Trigger AI analysis for a backtest run
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 1. Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }
    if (session.user.suspended) {
      return NextResponse.json(apiError(ErrorCode.ACCOUNT_SUSPENDED, "Account suspended"), {
        status: 403,
      });
    }

    const { id } = await params;

    // 2. Tier-based rate limiting
    const tier = await getCachedTier(session.user.id);
    const rateLimiter = getRateLimiterForTier(tier);
    const rateLimitResult = await checkRateLimit(rateLimiter, `ai-analysis:${session.user.id}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rateLimitResult)),
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // 3. Find the backtest run and verify ownership
    const run = await prisma.backtestRun.findUnique({
      where: { id },
      include: {
        upload: { select: { userId: true } },
        aiAnalysis: { select: { id: true } },
      },
    });

    if (!run || run.upload.userId !== session.user.id) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Backtest not found"), {
        status: 404,
      });
    }

    // 4. Check if analysis already exists
    if (run.aiAnalysis) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Analysis already exists for this backtest"),
        { status: 409 }
      );
    }

    // 5. Build analysis input
    const input: StrategyAnalysisInput = {
      eaName: run.eaName,
      symbol: run.symbol,
      timeframe: run.timeframe,
      period: run.period,
      initialDeposit: run.initialDeposit,
      metrics: {
        totalNetProfit: run.totalNetProfit,
        profitFactor: run.profitFactor,
        maxDrawdownPct: run.maxDrawdownPct,
        maxDrawdownAbs: run.maxDrawdownAbs,
        sharpeRatio: run.sharpeRatio,
        recoveryFactor: run.recoveryFactor,
        expectedPayoff: run.expectedPayoff,
        totalTrades: run.totalTrades,
        winRate: run.winRate,
        longWinRate: run.longWinRate,
        shortWinRate: run.shortWinRate,
      },
      healthScore: run.healthScore,
      healthStatus: run.healthStatus,
      deals: (run.trades as unknown as ParsedDeal[]) || [],
    };

    // 6. Run AI analysis
    let result;
    try {
      result = await analyzeStrategy(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI analysis failed";
      logger.error({ error: err }, "AI analysis failed");

      if (message.includes("ANTHROPIC_API_KEY")) {
        return NextResponse.json(
          apiError(ErrorCode.INTERNAL_ERROR, "AI analysis is currently unavailable"),
          { status: 503 }
        );
      }

      return NextResponse.json(
        apiError(ErrorCode.INTERNAL_ERROR, "AI analysis failed. Please try again later."),
        { status: 500 }
      );
    }

    // 7. Store result
    const aiAnalysis = await prisma.aIAnalysis.create({
      data: {
        backtestRunId: id,
        analysis: result.analysis,
        weaknesses: JSON.parse(JSON.stringify(result.weaknesses)),
        model: result.model,
      },
    });

    // 8. Return
    return NextResponse.json(
      {
        id: aiAnalysis.id,
        analysis: aiAnalysis.analysis,
        weaknesses: result.weaknesses,
        model: result.model,
        createdAt: aiAnalysis.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, "Failed to analyze backtest");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
