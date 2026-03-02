import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/csrf";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalOpsOverviewRateLimiter,
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

export async function GET(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(internalOpsOverviewRateLimiter, `internal-ops-overview:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const now = new Date();

  try {
    const [
      incidentCounts,
      incidentRows,
      overrideRows,
      holdRows,
      outboxPending,
      outboxFailed,
      outboxSending,
      outboxNextAttempt,
    ] = await Promise.all([
      // Incident counts
      Promise.all([
        prisma.incident.count({ where: { status: "OPEN" } }),
        prisma.incident.count({ where: { status: "ACKNOWLEDGED" } }),
        prisma.incident.count({ where: { status: "ESCALATED" } }),
        prisma.incident.count({ where: { status: "OPEN", ackDeadlineAt: { lte: now } } }),
      ]),
      // Top 20 OPEN/ESCALATED incidents ordered by ackDeadlineAt asc (most urgent first)
      prisma.incident.findMany({
        where: { status: { in: ["OPEN", "ESCALATED"] } },
        orderBy: { ackDeadlineAt: "asc" },
        take: 20,
        select: {
          id: true,
          strategyId: true,
          status: true,
          severity: true,
          openedAt: true,
          ackDeadlineAt: true,
          escalationCount: true,
          triggerRecordId: true,
          reasonCodes: true,
        },
      }),
      // Top 20 PENDING/APPROVED overrides ordered by expiresAt asc (most urgent first)
      prisma.overrideRequest.findMany({
        where: { status: { in: ["PENDING", "APPROVED"] } },
        orderBy: { expiresAt: "asc" },
        take: 20,
        select: {
          id: true,
          strategyId: true,
          status: true,
          requestedBy: true,
          requestedAt: true,
          approvedBy: true,
          expiresAt: true,
          requestRecordId: true,
        },
      }),
      // Top 20 HALTED instances ordered by updatedAt desc
      prisma.liveEAInstance.findMany({
        where: { operatorHold: "HALTED" },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          operatorHold: true,
          updatedAt: true,
          monitoringSuppressedUntil: true,
          strategyVersion: {
            select: {
              strategyIdentity: {
                select: { strategyId: true },
              },
            },
          },
        },
      }),
      // Outbox counts
      prisma.alertOutbox.count({ where: { status: "PENDING" } }),
      prisma.alertOutbox.count({ where: { status: "FAILED" } }),
      prisma.alertOutbox.count({ where: { status: "SENDING" } }),
      prisma.alertOutbox.findFirst({
        where: { status: { in: ["PENDING", "FAILED"] } },
        orderBy: { nextAttemptAt: "asc" },
        select: { nextAttemptAt: true },
      }),
    ]);

    const [open, acknowledged, escalated, overdueAck] = incidentCounts;

    return NextResponse.json({
      incidents: {
        counts: { open, acknowledged, escalated, overdueAck },
        rows: incidentRows,
      },
      overrides: {
        rows: overrideRows.map((r) => ({
          id: r.id,
          strategyId: r.strategyId,
          status: r.status,
          requestedBy: r.requestedBy,
          requestedAt: r.requestedAt,
          approvedBy: r.approvedBy,
          expiresAt: r.expiresAt,
          recordId: r.requestRecordId,
        })),
      },
      holds: {
        rows: holdRows.map((h) => ({
          instanceId: h.id,
          strategyId: h.strategyVersion?.strategyIdentity?.strategyId ?? null,
          operatorHold: h.operatorHold,
          updatedAt: h.updatedAt,
          monitoringSuppressedUntil: h.monitoringSuppressedUntil,
        })),
      },
      outbox: {
        counts: {
          pending: outboxPending,
          failed: outboxFailed,
          sending: outboxSending,
        },
        nextAttemptAt: outboxNextAttempt?.nextAttemptAt ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
