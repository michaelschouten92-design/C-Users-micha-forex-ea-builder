import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import {
  publicApiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
  getClientIp,
} from "@/lib/rate-limit";

// In-memory cache for leaderboard results
let cachedData: { data: LeaderboardEntry[]; updatedAt: string } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface LeaderboardEntry {
  rank: number;
  eaName: string;
  strategyType: string;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  runningSince: string;
  totalTrades: number;
}

const VALID_TIMEFRAMES = ["7d", "30d", "90d", "all"] as const;
type Timeframe = (typeof VALID_TIMEFRAMES)[number];

function getTimeframeDate(timeframe: Timeframe): Date | null {
  if (timeframe === "all") return null;

  const now = new Date();
  const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rl = await checkRateLimit(publicApiRateLimiter, `leaderboard:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rl) },
      { status: 429, headers: createRateLimitHeaders(rl) }
    );
  }

  try {
    const url = new URL(request.url);
    const timeframeParam = url.searchParams.get("timeframe") ?? "30d";
    const strategyType = url.searchParams.get("strategy") ?? "";

    const timeframe: Timeframe = VALID_TIMEFRAMES.includes(timeframeParam as Timeframe)
      ? (timeframeParam as Timeframe)
      : "30d";

    // Check cache (only for default params)
    const cacheKey = `${timeframe}-${strategyType}`;
    if (
      cachedData &&
      Date.now() - cacheTimestamp < CACHE_TTL_MS &&
      cacheKey === `${timeframe}-${strategyType}`
    ) {
      return NextResponse.json(cachedData, {
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }

    const timeframeDate = getTimeframeDate(timeframe);

    // Fetch all opted-in EA instances with their trades
    const instances = await prisma.liveEAInstance.findMany({
      where: {
        user: { leaderboardOptIn: true },
        status: { not: "OFFLINE" },
        deletedAt: null,
      },
      include: {
        trades: {
          where: {
            closeTime: { not: null },
            ...(timeframeDate ? { closeTime: { gte: timeframeDate } } : {}),
          },
          select: {
            profit: true,
            closeTime: true,
          },
        },
        heartbeats: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { drawdown: true },
        },
      },
    });

    // Calculate metrics for each instance with 50+ trades
    const entries: LeaderboardEntry[] = [];

    for (const instance of instances) {
      const closedTrades = instance.trades;
      if (closedTrades.length < 50) continue;

      // Filter by strategy type if provided
      if (
        strategyType &&
        instance.eaName.toLowerCase().indexOf(strategyType.toLowerCase()) === -1
      ) {
        continue;
      }

      const wins = closedTrades.filter((t) => t.profit > 0);
      const losses = closedTrades.filter((t) => t.profit < 0);
      const winRate = (wins.length / closedTrades.length) * 100;

      const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);
      const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

      const maxDrawdown = instance.heartbeats[0]?.drawdown ?? 0;

      // Mask EA name for privacy
      const maskedName = maskEaName(instance.eaName);

      // Determine strategy type from EA name
      const detectedStrategy = detectStrategyType(instance.eaName);

      entries.push({
        rank: 0,
        eaName: maskedName,
        strategyType: detectedStrategy,
        winRate: Math.round(winRate * 10) / 10,
        profitFactor: Math.round(profitFactor * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        runningSince: instance.createdAt.toISOString(),
        totalTrades: closedTrades.length,
      });
    }

    // Sort by profit factor descending
    entries.sort((a, b) => b.profitFactor - a.profitFactor);

    // Assign ranks
    for (let i = 0; i < entries.length; i++) {
      entries[i].rank = i + 1;
    }

    // Limit to top 100
    const topEntries = entries.slice(0, 100);

    const result = {
      data: topEntries,
      updatedAt: new Date().toISOString(),
    };

    // Update cache
    cachedData = result;
    cacheTimestamp = Date.now();

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch leaderboard data");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

function maskEaName(name: string): string {
  if (name.length <= 4) return name[0] + "***";
  return name.substring(0, 4) + "***";
}

function detectStrategyType(eaName: string): string {
  const lower = eaName.toLowerCase();
  if (lower.includes("ema") || lower.includes("crossover")) return "EMA Crossover";
  if (lower.includes("rsi")) return "RSI";
  if (lower.includes("breakout")) return "Breakout";
  if (lower.includes("macd")) return "MACD";
  if (lower.includes("scalp")) return "Scalping";
  if (lower.includes("trend")) return "Trend Following";
  if (lower.includes("grid")) return "Grid";
  return "Custom";
}
