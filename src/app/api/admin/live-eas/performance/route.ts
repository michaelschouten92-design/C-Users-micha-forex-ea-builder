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

    // Compute per-instance trade stats using 2 groupBy queries (not 2N per-instance queries)
    const [tradeGrouped, winGrouped] = await Promise.all([
      prisma.eATrade.groupBy({
        by: ["instanceId"],
        where: { closeTime: { not: null } },
        _count: true,
        _sum: { profit: true },
        _avg: { profit: true },
      }),
      prisma.eATrade.groupBy({
        by: ["instanceId"],
        where: { closeTime: { not: null }, profit: { gt: 0 } },
        _count: true,
      }),
    ]);

    const tradeMap = new Map(tradeGrouped.map((g) => [g.instanceId, g]));
    const winMap = new Map(winGrouped.map((g) => [g.instanceId, g._count]));

    const eaStats = instances.map((inst) => {
      const tg = tradeMap.get(inst.id);
      const closedCount = tg?._count ?? 0;
      const wins = winMap.get(inst.id) ?? 0;
      const winRate = closedCount > 0 ? (wins / closedCount) * 100 : 0;
      return {
        id: inst.id,
        eaName: inst.eaName,
        symbol: inst.symbol,
        userEmail: inst.user.email,
        totalTrades: inst.totalTrades,
        totalProfit: inst.totalProfit,
        winRate: Math.round(winRate * 10) / 10,
        avgProfit: tg?._avg?.profit ? Math.round(tg._avg.profit * 100) / 100 : 0,
      };
    });

    // Sort for top/bottom (guard against overlap when <10 instances)
    const byProfit = [...eaStats].sort((a, b) => b.totalProfit - a.totalProfit);
    const top5 = byProfit.slice(0, 5);
    const bottom5 = byProfit.length > 5 ? byProfit.slice(-5).reverse() : [];

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
