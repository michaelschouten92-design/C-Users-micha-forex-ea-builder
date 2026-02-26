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

    // Get aggregate trade stats and instances (without loading all trades)
    const [tradeAgg, instances] = await Promise.all([
      prisma.eATrade.aggregate({
        where: { closeTime: { not: null }, instance: { deletedAt: null } },
        _count: true,
        _sum: { profit: true },
        _avg: { profit: true },
      }),
      prisma.liveEAInstance.findMany({
        where: { totalTrades: { gt: 0 }, deletedAt: null },
        select: {
          id: true,
          eaName: true,
          symbol: true,
          totalTrades: true,
          totalProfit: true,
          user: { select: { email: true } },
        },
      }),
    ]);

    // Compute per-instance trade stats using aggregate queries (not loading all rows)
    const perInstanceStats = await Promise.all(
      instances.map(async (inst) => {
        const [agg, winCount] = await Promise.all([
          prisma.eATrade.aggregate({
            where: { instanceId: inst.id, closeTime: { not: null } },
            _count: true,
            _sum: { profit: true },
            _avg: { profit: true },
          }),
          prisma.eATrade.count({
            where: { instanceId: inst.id, closeTime: { not: null }, profit: { gt: 0 } },
          }),
        ]);
        const closedCount = agg._count;
        const winRate = closedCount > 0 ? (winCount / closedCount) * 100 : 0;
        return {
          id: inst.id,
          eaName: inst.eaName,
          symbol: inst.symbol,
          userEmail: inst.user.email,
          totalTrades: inst.totalTrades,
          totalProfit: inst.totalProfit,
          winRate: Math.round(winRate * 10) / 10,
          avgProfit: agg._avg.profit ? Math.round(agg._avg.profit * 100) / 100 : 0,
        };
      })
    );

    const eaStats = perInstanceStats;

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
      where: { closeTime: { not: null }, profit: { gt: 0 }, instance: { deletedAt: null } },
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
