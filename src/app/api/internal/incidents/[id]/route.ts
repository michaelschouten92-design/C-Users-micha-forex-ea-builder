import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/csrf";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalIncidentDrilldownRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(
    internalIncidentDrilldownRateLimiter,
    `internal-incident-drilldown:${ip}`
  );
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const { id } = await params;

  try {
    const incident = await prisma.incident.findUnique({
      where: { id },
      select: {
        id: true,
        strategyId: true,
        status: true,
        severity: true,
        triggerRecordId: true,
        reasonCodes: true,
        snapshotHash: true,
        configVersion: true,
        thresholdsHash: true,
        ackDeadlineAt: true,
        invalidateDeadlineAt: true,
        lastEscalatedAt: true,
        escalationCount: true,
        closedAt: true,
        closeReason: true,
        closedBy: true,
        openedAt: true,
        updatedAt: true,
      },
    });

    if (!incident) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Incident not found"), {
        status: 404,
      });
    }

    // Fetch current lifecycle context for the strategy
    const instance = await prisma.liveEAInstance.findFirst({
      where: {
        strategyVersion: {
          strategyIdentity: { strategyId: incident.strategyId },
        },
      },
      select: {
        id: true,
        lifecycleState: true,
        operatorHold: true,
        monitoringSuppressedUntil: true,
      },
    });

    return NextResponse.json({
      incident,
      context: instance
        ? {
            instanceId: instance.id,
            lifecycleState: instance.lifecycleState,
            operatorHold: instance.operatorHold,
            monitoringSuppressedUntil: instance.monitoringSuppressedUntil,
          }
        : null,
    });
  } catch {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
