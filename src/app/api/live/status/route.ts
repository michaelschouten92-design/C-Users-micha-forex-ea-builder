import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { getCachedTier } from "@/lib/plan-limits";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const tier = await getCachedTier(session.user.id);
    if (tier === "FREE") {
      return NextResponse.json(
        apiError(
          ErrorCode.PLAN_REQUIRED,
          "Live EA monitoring requires a Pro or Elite subscription"
        ),
        { status: 403 }
      );
    }

    const modeFilter = request.nextUrl.searchParams.get("mode");

    const eaInstances = await prisma.liveEAInstance.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        ...(modeFilter === "LIVE" || modeFilter === "PAPER" ? { mode: modeFilter } : {}),
      },
      orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } },
      include: {
        trades: {
          where: { closeTime: { not: null } },
          select: { profit: true, closeTime: true },
          take: 500,
          orderBy: { closeTime: "desc" },
        },
        heartbeats: {
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { equity: true, createdAt: true },
        },
      },
    });

    // Serialize dates to ISO strings for client consumption
    const data = eaInstances.map((ea) => ({
      id: ea.id,
      eaName: ea.eaName,
      symbol: ea.symbol,
      timeframe: ea.timeframe,
      broker: ea.broker,
      accountNumber: ea.accountNumber,
      status: ea.status,
      mode: ea.mode,
      paused: ea.paused,
      lastHeartbeat: ea.lastHeartbeat?.toISOString() ?? null,
      lastError: ea.lastError,
      balance: ea.balance,
      equity: ea.equity,
      openTrades: ea.openTrades,
      totalTrades: ea.totalTrades,
      totalProfit: ea.totalProfit,
      trades: ea.trades.map((t) => ({
        profit: t.profit,
        closeTime: t.closeTime?.toISOString() ?? null,
      })),
      heartbeats: ea.heartbeats.map((h) => ({
        equity: h.equity,
        createdAt: h.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch live EA status");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
