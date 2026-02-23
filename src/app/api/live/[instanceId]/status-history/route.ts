import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { getCachedTier } from "@/lib/plan-limits";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/live/[instanceId]/status-history
 * Returns status changes over time by analyzing heartbeat records for status transitions.
 * Accepts optional query params: from, to (ISO date strings for date range filtering).
 */
export async function GET(
  request: NextRequest,
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

  // Verify the user owns this instance
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: { id: true, status: true, createdAt: true },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
      status: 404,
    });
  }

  // Parse date range query params
  const searchParams = request.nextUrl.searchParams;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const fromDate = fromParam ? new Date(fromParam) : undefined;
  const toDate = toParam ? new Date(toParam) : undefined;

  // Validate date params
  if (fromDate && isNaN(fromDate.getTime())) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "Invalid 'from' date parameter"),
      { status: 400 }
    );
  }
  if (toDate && isNaN(toDate.getTime())) {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid 'to' date parameter"), {
      status: 400,
    });
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (fromDate) dateFilter.gte = fromDate;
  if (toDate) dateFilter.lte = toDate;

  // Fetch heartbeats ordered by time to detect status transitions.
  // We detect "online" periods from heartbeat presence and gaps as "offline" periods.
  // A gap of more than 5 minutes between heartbeats indicates an offline period.
  const heartbeats = await prisma.eAHeartbeat.findMany({
    where: {
      instanceId,
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      balance: true,
      equity: true,
      drawdown: true,
    },
  });

  // Build status change timeline from heartbeat gaps
  const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without heartbeat = offline
  const statusChanges: Array<{
    status: string;
    timestamp: string;
    durationMs: number | null;
    details?: { balance?: number; equity?: number; drawdown?: number };
  }> = [];

  if (heartbeats.length === 0) {
    // No heartbeats in range, instance was offline for the entire period
    return NextResponse.json({
      data: {
        instanceId,
        currentStatus: instance.status,
        statusChanges: [],
        heartbeatCount: 0,
      },
    });
  }

  // First heartbeat marks start of an ONLINE period
  let currentStatus = "ONLINE";
  let periodStart = heartbeats[0].createdAt;

  statusChanges.push({
    status: "ONLINE",
    timestamp: heartbeats[0].createdAt.toISOString(),
    durationMs: null,
    details: {
      balance: heartbeats[0].balance,
      equity: heartbeats[0].equity,
      drawdown: heartbeats[0].drawdown,
    },
  });

  for (let i = 1; i < heartbeats.length; i++) {
    const gap = heartbeats[i].createdAt.getTime() - heartbeats[i - 1].createdAt.getTime();

    if (gap > OFFLINE_THRESHOLD_MS && currentStatus === "ONLINE") {
      // Transition: ONLINE -> OFFLINE (gap detected)
      const onlineDuration = heartbeats[i - 1].createdAt.getTime() - periodStart.getTime();
      statusChanges[statusChanges.length - 1].durationMs = onlineDuration;

      statusChanges.push({
        status: "OFFLINE",
        timestamp: heartbeats[i - 1].createdAt.toISOString(),
        durationMs: gap,
      });

      // Transition: OFFLINE -> ONLINE (new heartbeat after gap)
      statusChanges.push({
        status: "ONLINE",
        timestamp: heartbeats[i].createdAt.toISOString(),
        durationMs: null,
        details: {
          balance: heartbeats[i].balance,
          equity: heartbeats[i].equity,
          drawdown: heartbeats[i].drawdown,
        },
      });

      currentStatus = "ONLINE";
      periodStart = heartbeats[i].createdAt;
    }
  }

  // Close the last period
  const lastHeartbeat = heartbeats[heartbeats.length - 1];
  if (currentStatus === "ONLINE") {
    statusChanges[statusChanges.length - 1].durationMs =
      lastHeartbeat.createdAt.getTime() - periodStart.getTime();
  }

  return NextResponse.json({
    data: {
      instanceId,
      currentStatus: instance.status,
      statusChanges,
      heartbeatCount: heartbeats.length,
    },
  });
}
