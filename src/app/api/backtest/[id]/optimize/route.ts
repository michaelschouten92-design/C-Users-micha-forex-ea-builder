import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optimizeStrategy } from "@/lib/ai-strategy-doctor";
import {
  checkRateLimit,
  aiOptimizationEliteRateLimiter,
  createRateLimitHeaders,
} from "@/lib/rate-limit";
import type { ParsedDeal } from "@/lib/backtest-parser/types";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check subscription tier — Elite only
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const tier = subscription?.tier ?? "FREE";
  if (tier !== "ELITE") {
    return NextResponse.json(
      { error: "AI Strategy Optimizer requires an Elite subscription" },
      { status: 403 }
    );
  }

  // Rate limit
  const rateLimitResult = await checkRateLimit(
    aiOptimizationEliteRateLimiter,
    `ai-optimize:${session.user.id}`
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Daily optimization limit reached (20/day)" },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  // Fetch backtest run with AI analysis
  const backtestRun = await prisma.backtestRun.findUnique({
    where: { id },
    include: {
      upload: { select: { userId: true } },
      aiAnalysis: true,
    },
  });

  if (!backtestRun || backtestRun.upload.userId !== session.user.id) {
    return NextResponse.json({ error: "Backtest not found" }, { status: 404 });
  }

  // Check if already optimized
  if (backtestRun.aiAnalysis?.optimizations) {
    return NextResponse.json(backtestRun.aiAnalysis.optimizations);
  }

  try {
    const deals = backtestRun.trades as unknown as ParsedDeal[];
    const weaknesses =
      (backtestRun.aiAnalysis?.weaknesses as unknown as Array<{
        category: string;
        severity: string;
        description: string;
        recommendation: string;
      }>) ?? [];

    const optimizations = await optimizeStrategy({
      eaName: backtestRun.eaName,
      symbol: backtestRun.symbol,
      timeframe: backtestRun.timeframe,
      initialDeposit: backtestRun.initialDeposit,
      metrics: {
        totalNetProfit: backtestRun.totalNetProfit,
        profitFactor: backtestRun.profitFactor,
        maxDrawdownPct: backtestRun.maxDrawdownPct,
        maxDrawdownAbs: backtestRun.maxDrawdownAbs,
        sharpeRatio: backtestRun.sharpeRatio,
        recoveryFactor: backtestRun.recoveryFactor,
        expectedPayoff: backtestRun.expectedPayoff,
        totalTrades: backtestRun.totalTrades,
        winRate: backtestRun.winRate,
        longWinRate: backtestRun.longWinRate,
        shortWinRate: backtestRun.shortWinRate,
      },
      deals: deals.slice(0, 100),
      weaknesses,
    });

    // Store optimizations
    if (backtestRun.aiAnalysis) {
      await prisma.aIAnalysis.update({
        where: { id: backtestRun.aiAnalysis.id },
        data: { optimizations: JSON.parse(JSON.stringify(optimizations)) },
      });
    }

    return NextResponse.json(optimizations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Optimization failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
