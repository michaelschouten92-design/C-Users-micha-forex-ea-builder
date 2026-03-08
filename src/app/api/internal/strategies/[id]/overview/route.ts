import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/csrf";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalStrategyOverviewRateLimiter,
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
    internalStrategyOverviewRateLimiter,
    `internal-strategy-overview:${ip}`
  );
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const { id: strategyId } = await params;

  try {
    const [instance, monitoringRuns, incidents, overrides] = await Promise.all([
      prisma.liveEAInstance.findFirst({
        where: {
          strategyVersion: {
            strategyIdentity: { strategyId },
          },
        },
        select: {
          id: true,
          lifecycleState: true,
          operatorHold: true,
          monitoringSuppressedUntil: true,
        },
      }),
      prisma.monitoringRun.findMany({
        where: { strategyId },
        orderBy: { completedAt: "desc" },
        take: 20,
        select: {
          id: true,
          instanceId: true,
          completedAt: true,
          status: true,
          verdict: true,
          reasons: true,
          tradeSnapshotHash: true,
          configVersion: true,
          thresholdsHash: true,
        },
      }),
      prisma.incident.findMany({
        where: { strategyId },
        orderBy: { openedAt: "desc" },
        take: 20,
        select: {
          id: true,
          instanceId: true,
          status: true,
          openedAt: true,
          closedAt: true,
          closeReason: true,
          ackDeadlineAt: true,
          escalationCount: true,
          triggerRecordId: true,
        },
      }),
      prisma.overrideRequest.findMany({
        where: { strategyId },
        orderBy: { requestedAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          requestedAt: true,
          requestedBy: true,
          approvedAt: true,
          approvedBy: true,
          appliedAt: true,
          expiresAt: true,
          requestRecordId: true,
        },
      }),
    ]);

    return NextResponse.json({
      strategyId,
      instance: instance
        ? {
            instanceId: instance.id,
            lifecycleState: instance.lifecycleState,
            operatorHold: instance.operatorHold,
            monitoringSuppressedUntil: instance.monitoringSuppressedUntil,
          }
        : null,
      latestMonitoringRuns: monitoringRuns.map((r) => ({
        id: r.id,
        completedAt: r.completedAt,
        status: r.status,
        verdict: r.verdict,
        reasonCodes: r.reasons,
        snapshotHash: r.tradeSnapshotHash,
        configVersion: r.configVersion,
        thresholdsHash: r.thresholdsHash,
      })),
      incidents: incidents.map((i) => ({
        id: i.id,
        status: i.status,
        openedAt: i.openedAt,
        closedAt: i.closedAt,
        closeReason: i.closeReason,
        ackDeadlineAt: i.ackDeadlineAt,
        escalationCount: i.escalationCount,
        recordId: i.triggerRecordId,
      })),
      overrides: overrides.map((o) => ({
        id: o.id,
        status: o.status,
        requestedAt: o.requestedAt,
        requestedBy: o.requestedBy,
        approvedAt: o.approvedAt,
        approvedBy: o.approvedBy,
        appliedAt: o.appliedAt,
        expiresAt: o.expiresAt,
        recordId: o.requestRecordId,
      })),
    });
  } catch {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
