import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const eaInstances = await prisma.liveEAInstance.findMany({
      where: { userId: session.user.id },
      orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } },
      include: {
        trades: {
          where: { closeTime: { not: null } },
          select: { profit: true, closeTime: true },
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
