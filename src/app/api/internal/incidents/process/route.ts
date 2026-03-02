import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalIncidentProcessRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { appendProofEventInTx } from "@/lib/proof/events";
import { performLifecycleTransitionInTx } from "@/lib/strategy-lifecycle/transition-service";
import { MONITORING } from "@/domain/monitoring/constants";

const log = logger.child({ route: "/api/internal/incidents/process" });

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const processSchema = z.object({
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
});

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

export async function POST(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(
    internalIncidentProcessRateLimiter,
    `internal-incident-process:${ip}`
  );
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  // Parse optional body (limit param)
  let limit = DEFAULT_LIMIT;
  try {
    const text = await request.text();
    if (text.trim()) {
      const body = JSON.parse(text);
      const validation = processSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid request body"), {
          status: 400,
        });
      }
      limit = validation.data.limit ?? DEFAULT_LIMIT;
    }
  } catch {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid JSON"), {
      status: 400,
    });
  }

  let escalated = 0;
  let autoInvalidated = 0;
  const errors: string[] = [];
  const now = new Date();

  // ── Escalation pass ──────────────────────────────────────────────
  // Fetch OPEN incidents past their ACK deadline
  const overdueOpen = await prisma.incident.findMany({
    where: {
      status: "OPEN",
      ackDeadlineAt: { lte: now },
    },
    orderBy: { ackDeadlineAt: "asc" },
    take: limit,
  });

  for (const incident of overdueOpen) {
    try {
      // Optimistic lock on escalationCount — prevents double-escalation
      const lockResult = await prisma.incident.updateMany({
        where: { id: incident.id, escalationCount: incident.escalationCount },
        data: { status: "ESCALATING" },
      });
      if (lockResult.count === 0) continue;

      const newEscalationCount = incident.escalationCount + 1;
      const newAckDeadlineAt = new Date(
        now.getTime() + MONITORING.ESCALATION_INTERVAL_MINUTES * 60_000
      );

      await prisma.$transaction(
        async (tx) => {
          await appendProofEventInTx(tx, incident.strategyId, "INCIDENT_ESCALATED", {
            eventType: "INCIDENT_ESCALATED",
            recordId: incident.id,
            strategyId: incident.strategyId,
            incidentId: incident.id,
            escalationCount: newEscalationCount,
            previousAckDeadlineAt: incident.ackDeadlineAt.toISOString(),
            newAckDeadlineAt: newAckDeadlineAt.toISOString(),
            timestamp: now.toISOString(),
          });

          await tx.incident.update({
            where: { id: incident.id },
            data: {
              status: "ESCALATED",
              escalationCount: newEscalationCount,
              lastEscalatedAt: now,
              ackDeadlineAt: newAckDeadlineAt,
            },
          });

          await tx.alertOutbox.create({
            data: {
              eventType: "incident_escalated",
              dedupeKey: `incident_escalated:${incident.id}:${newEscalationCount}`,
              payload: {
                type: "incident_escalated",
                strategyId: incident.strategyId,
                incidentId: incident.id,
                escalationCount: newEscalationCount,
                severity: incident.severity,
              },
            },
          });
        },
        { isolationLevel: "Serializable" }
      );

      escalated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err, incidentId: incident.id }, "Failed to escalate incident");
      errors.push(`escalate:${incident.id}: ${msg}`);

      // Rollback optimistic lock on failure
      await prisma.incident
        .updateMany({
          where: { id: incident.id, status: "ESCALATING" },
          data: { status: "OPEN" },
        })
        .catch(() => {});
    }
  }

  // ── Auto-invalidation pass ───────────────────────────────────────
  // Fetch OPEN or ESCALATED incidents past their invalidate deadline
  const overdueInvalidate = await prisma.incident.findMany({
    where: {
      status: { in: ["OPEN", "ESCALATED"] },
      invalidateDeadlineAt: { not: null, lte: now },
    },
    orderBy: { invalidateDeadlineAt: "asc" },
    take: limit,
  });

  for (const incident of overdueInvalidate) {
    try {
      const didInvalidate = await prisma.$transaction(
        async (tx) => {
          // Resolve LiveEAInstance for the strategy
          const instance = await tx.liveEAInstance.findFirst({
            where: {
              strategyVersion: {
                strategyIdentity: { strategyId: incident.strategyId },
              },
            },
            select: { id: true, lifecycleState: true },
          });

          if (!instance) {
            throw new Error(`No LiveEAInstance found for strategy ${incident.strategyId}`);
          }

          // Only auto-invalidate if instance is still EDGE_AT_RISK
          if (instance.lifecycleState !== "EDGE_AT_RISK") {
            log.warn(
              { incidentId: incident.id, lifecycleState: instance.lifecycleState },
              "Skipping auto-invalidation — instance not in EDGE_AT_RISK"
            );
            return false;
          }

          // Write proof events FIRST — fail-closed before any state mutation
          await appendProofEventInTx(tx, incident.strategyId, "INCIDENT_AUTO_INVALIDATED", {
            eventType: "INCIDENT_AUTO_INVALIDATED",
            recordId: incident.id,
            strategyId: incident.strategyId,
            incidentId: incident.id,
            invalidateDeadlineAt: incident.invalidateDeadlineAt!.toISOString(),
            timestamp: now.toISOString(),
          });

          await appendProofEventInTx(tx, incident.strategyId, "STRATEGY_INVALIDATED", {
            eventType: "STRATEGY_INVALIDATED",
            recordId: incident.id,
            strategyId: incident.strategyId,
            reason: "auto_invalidated: deadline exceeded",
            source: "system",
            timestamp: now.toISOString(),
          });

          // Perform lifecycle transition EDGE_AT_RISK → INVALIDATED (after proof)
          await performLifecycleTransitionInTx(
            tx,
            instance.id,
            "EDGE_AT_RISK",
            "INVALIDATED",
            "auto_invalidated: deadline exceeded",
            "system"
          );

          // Close the incident
          await tx.incident.update({
            where: { id: incident.id },
            data: {
              status: "CLOSED",
              closedAt: now,
              closeReason: "AUTO_INVALIDATED",
            },
          });

          // Enqueue alert
          await tx.alertOutbox.create({
            data: {
              eventType: "incident_auto_invalidated",
              dedupeKey: `incident_auto_invalidated:${incident.id}`,
              payload: {
                type: "incident_auto_invalidated",
                strategyId: incident.strategyId,
                incidentId: incident.id,
                severity: incident.severity,
              },
            },
          });

          return true;
        },
        { isolationLevel: "Serializable" }
      );

      if (didInvalidate) autoInvalidated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err, incidentId: incident.id }, "Failed to auto-invalidate incident");
      errors.push(`auto_invalidate:${incident.id}: ${msg}`);
    }
  }

  return NextResponse.json({ escalated, autoInvalidated, errors });
}

export async function GET(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const now = new Date();

  const [open, acknowledged, escalatedCount, overdueAck] = await Promise.all([
    prisma.incident.count({ where: { status: "OPEN" } }),
    prisma.incident.count({ where: { status: "ACKNOWLEDGED" } }),
    prisma.incident.count({ where: { status: "ESCALATED" } }),
    prisma.incident.count({ where: { status: "OPEN", ackDeadlineAt: { lte: now } } }),
  ]);

  return NextResponse.json({ open, acknowledged, escalated: escalatedCount, overdueAck });
}
