import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { getCachedTier } from "@/lib/plan-limits";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/live/[instanceId]
 * Returns detailed instance info including recent heartbeats, trade count, and alert configs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      apiError(ErrorCode.PLAN_REQUIRED, "Live EA monitoring requires a Pro or Elite subscription"),
      { status: 403 }
    );
  }

  const { instanceId } = await params;

  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    include: {
      heartbeats: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          balance: true,
          equity: true,
          openTrades: true,
          totalTrades: true,
          totalProfit: true,
          drawdown: true,
          spread: true,
          createdAt: true,
        },
      },
      alertConfigs: {
        where: { state: "ACTIVE" },
        select: {
          id: true,
          alertType: true,
          threshold: true,
          channel: true,
          state: true,
          lastTriggered: true,
          createdAt: true,
        },
      },
    },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
      status: 404,
    });
  }

  // Get trade count separately for efficiency
  const tradeCount = await prisma.eATrade.count({
    where: { instanceId },
  });

  const data = {
    id: instance.id,
    exportJobId: instance.exportJobId,
    eaName: instance.eaName,
    symbol: instance.symbol,
    timeframe: instance.timeframe,
    broker: instance.broker,
    accountNumber: instance.accountNumber,
    status: instance.status,
    mode: instance.mode,
    paused: instance.tradingState === "PAUSED",
    lastHeartbeat: instance.lastHeartbeat?.toISOString() ?? null,
    lastError: instance.lastError,
    balance: instance.balance,
    equity: instance.equity,
    openTrades: instance.openTrades,
    totalTrades: instance.totalTrades,
    totalProfit: instance.totalProfit,
    createdAt: instance.createdAt.toISOString(),
    updatedAt: instance.updatedAt.toISOString(),
    tradeCount,
    heartbeats: instance.heartbeats.map((h) => ({
      id: h.id,
      balance: h.balance,
      equity: h.equity,
      openTrades: h.openTrades,
      totalTrades: h.totalTrades,
      totalProfit: h.totalProfit,
      drawdown: h.drawdown,
      spread: h.spread,
      createdAt: h.createdAt.toISOString(),
    })),
    alertConfigs: instance.alertConfigs.map((a) => ({
      id: a.id,
      alertType: a.alertType,
      threshold: a.threshold,
      channel: a.channel,
      enabled: a.state === "ACTIVE",
      lastTriggered: a.lastTriggered?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return NextResponse.json({ data });
}

/**
 * DELETE /api/live/[instanceId]
 * Soft-deletes the instance by setting deletedAt and status to TERMINATED (OFFLINE).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const tierCheck = await getCachedTier(session.user.id);
  if (tierCheck === "FREE") {
    return NextResponse.json(
      apiError(ErrorCode.PLAN_REQUIRED, "Live EA monitoring requires a Pro or Elite subscription"),
      { status: 403 }
    );
  }

  const { instanceId } = await params;

  // Atomic soft-delete: set deletedAt and mark as OFFLINE in one step to avoid race conditions
  const result = await prisma.liveEAInstance.updateMany({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    data: {
      deletedAt: new Date(),
      status: "OFFLINE",
    },
  });

  if (result.count === 0) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
      status: 404,
    });
  }

  return NextResponse.json({ success: true });
}
