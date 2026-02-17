import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { checkAdmin } from "@/lib/admin";

// GET /api/admin/live-eas/performance - Aggregate EA trade performance analytics
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    // Get all closed trades for performance calculation
    const [tradeAgg, instances] = await Promise.all([
      // Aggregate trade stats across all EAs
      prisma.eATrade.aggregate({
        where: { closeTime: { not: null } },
        _count: true,
        _sum: { profit: true },
        _avg: { profit: true },
      }),
      // Get instances with trade stats for top/bottom ranking
      prisma.liveEAInstance.findMany({
        where: { totalTrades: { gt: 0 } },
        select: {
          id: true,
          eaName: true,
          symbol: true,
          totalTrades: true,
          totalProfit: true,
          user: { select: { email: true } },
          trades: {
            where: { closeTime: { not: null } },
            select: { profit: true },
          },
        },
      }),
    ]);

    // Calculate per-EA stats
    const eaStats = instances.map((inst) => {
      const closedTrades = inst.trades;
      const wins = closedTrades.filter((t) => t.profit > 0).length;
      const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
      const profits = closedTrades.map((t) => t.profit);
      let maxDrawdown = 0;
      let peak = 0;
      let runningPnl = 0;
      for (const p of profits) {
        runningPnl += p;
        if (runningPnl > peak) peak = runningPnl;
        const dd = peak - runningPnl;
        if (dd > maxDrawdown) maxDrawdown = dd;
      }

      return {
        id: inst.id,
        eaName: inst.eaName,
        symbol: inst.symbol,
        userEmail: inst.user.email,
        totalTrades: inst.totalTrades,
        totalProfit: inst.totalProfit,
        winRate: Math.round(winRate * 10) / 10,
        avgProfit:
          closedTrades.length > 0
            ? Math.round(
                (closedTrades.reduce((s, t) => s + t.profit, 0) / closedTrades.length) * 100
              ) / 100
            : 0,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      };
    });

    // Sort for top/bottom
    const byProfit = [...eaStats].sort((a, b) => b.totalProfit - a.totalProfit);
    const top5 = byProfit.slice(0, 5);
    const bottom5 = byProfit.slice(-5).reverse();

    // Overall stats
    const totalClosedTrades = tradeAgg._count;
    const totalProfit = tradeAgg._sum.profit || 0;
    const avgProfit = tradeAgg._avg.profit || 0;

    // Overall win rate
    const allWins = await prisma.eATrade.count({
      where: { closeTime: { not: null }, profit: { gt: 0 } },
    });
    const overallWinRate = totalClosedTrades > 0 ? (allWins / totalClosedTrades) * 100 : 0;

    return NextResponse.json({
      totalClosedTrades,
      totalProfit: Math.round(totalProfit * 100) / 100,
      avgProfit: Math.round(avgProfit * 100) / 100,
      winRate: Math.round(overallWinRate * 10) / 10,
      top5,
      bottom5,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch EA performance analytics");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
