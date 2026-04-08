import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const modeFilter = request.nextUrl.searchParams.get("mode");

    // Polling endpoint: only fetch live-changing fields, not static baseline data.
    // Baseline, trades, heartbeats are already loaded on initial page render.
    const eaInstances = await prisma.liveEAInstance.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        ...(modeFilter === "LIVE" || modeFilter === "PAPER" ? { mode: modeFilter } : {}),
      },
      orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } },
      select: {
        id: true,
        createdAt: true,
        eaName: true,
        symbol: true,
        timeframe: true,
        broker: true,
        accountNumber: true,
        status: true,
        mode: true,
        tradingState: true,
        lastHeartbeat: true,
        lastError: true,
        balance: true,
        equity: true,
        openTrades: true,
        totalTrades: true,
        totalProfit: true,
        parentInstanceId: true,
        lifecycleState: true,
        strategyStatus: true,
        operatorHold: true,
        apiKeySuffix: true,
        exportJobId: true,
        incidents: {
          where: { status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] } },
          orderBy: { openedAt: "desc" as const },
          select: { reasonCodes: true },
          take: 1,
        },
        healthSnapshots: {
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: { driftDetected: true, driftSeverity: true, status: true },
        },
        terminalDeployments: {
          where: { ignoredAt: null },
          select: { baselineStatus: true },
        },
      },
    });

    const data = eaInstances.map((ea) => ({
      id: ea.id,
      createdAt: ea.createdAt.toISOString(),
      eaName: ea.eaName,
      symbol: ea.symbol,
      timeframe: ea.timeframe,
      broker: ea.broker,
      accountNumber: ea.accountNumber,
      status: ea.status,
      mode: ea.mode,
      tradingState: ea.tradingState,
      lastHeartbeat: ea.lastHeartbeat?.toISOString() ?? null,
      lastError: ea.lastError,
      balance: ea.balance,
      equity: ea.equity,
      openTrades: ea.openTrades,
      totalTrades: ea.totalTrades,
      totalProfit: ea.totalProfit,
      parentInstanceId: ea.parentInstanceId,
      lifecycleState: ea.lifecycleState,
      strategyStatus: ea.strategyStatus,
      operatorHold: ea.operatorHold,
      apiKeySuffix: ea.apiKeySuffix,
      healthStatus: ea.healthSnapshots?.[0]?.status ?? null,
      isExternal: ea.exportJobId === null,
      relinkRequired: ea.terminalDeployments.some(
        (d: { baselineStatus: string }) => d.baselineStatus === "RELINK_REQUIRED"
      ),
      monitoringReasons: ea.incidents[0] ? (ea.incidents[0].reasonCodes as string[]) : [],
      trades: [],
      heartbeats: [],
      healthSnapshots: (ea.healthSnapshots ?? []).map((hs) => ({
        driftDetected: hs.driftDetected,
        driftSeverity: hs.driftSeverity,
        status: hs.status,
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
