import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalOverrideRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson, validate, formatZodErrors } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { appendProofEventInTx } from "@/lib/proof/events";
import { performLifecycleTransitionInTx } from "@/lib/strategy-lifecycle/transition-service";
import { loadActiveConfigWithFallback } from "@/domain/verification/config-loader";

const log = logger.child({ route: "/api/internal/monitoring/override/apply" });

const applySchema = z.object({
  strategyId: z.string().min(1),
  recordId: z.string().min(1),
  overrideRequestId: z.string().min(1),
  operatorId: z.string().min(2),
  note: z.string().max(500).optional(),
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
  const rl = await checkRateLimit(internalOverrideRateLimiter, `internal-override:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const ctError = checkContentType(request);
  if (ctError) return ctError;

  const bodyResult = await safeReadJson(request);
  if ("error" in bodyResult) return bodyResult.error;

  const validation = validate(applySchema, bodyResult.data);
  if (!validation.success) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid request body",
        formatZodErrors(validation.error)
      ),
      { status: 400 }
    );
  }

  const { strategyId, recordId, overrideRequestId, operatorId, note } = validation.data;

  const overrideRequest = await prisma.overrideRequest.findFirst({
    where: { id: overrideRequestId, strategyId },
  });

  if (!overrideRequest) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Override request not found"), {
      status: 404,
    });
  }

  if (overrideRequest.status !== "APPROVED") {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `Override request is ${overrideRequest.status}, expected APPROVED`
      ),
      { status: 400 }
    );
  }

  const instance = await prisma.liveEAInstance.findFirst({
    where: {
      deletedAt: null,
      strategyVersion: {
        strategyIdentity: { strategyId },
      },
    },
    select: { id: true, lifecycleState: true, operatorHold: true },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Strategy instance not found"), {
      status: 404,
    });
  }

  if (instance.operatorHold !== "OVERRIDE_PENDING") {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `Apply requires operatorHold=OVERRIDE_PENDING, currently ${instance.operatorHold}`
      ),
      { status: 400 }
    );
  }

  if (instance.lifecycleState !== "EDGE_AT_RISK") {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `Apply requires lifecycleState=EDGE_AT_RISK, currently ${instance.lifecycleState}`
      ),
      { status: 400 }
    );
  }

  const now = new Date();
  const isExpired = now > overrideRequest.expiresAt;

  const { config } = await loadActiveConfigWithFallback();
  const suppressionMinutes = config.monitoringThresholds?.overrideSuppressionMinutes ?? 10;
  const suppressedUntil = new Date(now.getTime() + suppressionMinutes * 60_000);

  try {
    await prisma.$transaction(
      async (tx) => {
        // 0a. Handle expiry atomically — proof event + status write in same tx
        if (isExpired) {
          await appendProofEventInTx(tx, strategyId, "OVERRIDE_EXPIRED", {
            eventType: "OVERRIDE_EXPIRED",
            recordId: overrideRequestId,
            strategyId,
            overrideRequestId,
            expiredAt: now.toISOString(),
            timestamp: now.toISOString(),
          });
          await tx.overrideRequest.update({
            where: { id: overrideRequestId },
            data: { status: "EXPIRED", expiredAt: now },
          });
          throw Object.assign(new Error("OVERRIDE_EXPIRED"), { code: "OVERRIDE_EXPIRED" as const });
        }

        // 0. Read incident first (need incidentId for proof payload)
        const openIncident = await tx.incident.findFirst({
          where: { strategyId, status: { not: "CLOSED" } },
        });

        const incidentId = openIncident?.id ?? null;

        // 1. Proof event FIRST
        await appendProofEventInTx(tx, strategyId, "OVERRIDE_APPLIED", {
          eventType: "OVERRIDE_APPLIED",
          recordId,
          strategyId,
          overrideRequestId,
          appliedBy: operatorId,
          from: "EDGE_AT_RISK",
          to: "LIVE_MONITORING",
          note: note ?? null,
          timestamp: now.toISOString(),
          incidentId,
          suppressedUntil: suppressedUntil.toISOString(),
          overrideSuppressionMinutes: suppressionMinutes,
        });

        // 2. Lifecycle transition
        await performLifecycleTransitionInTx(
          tx,
          instance.id,
          "EDGE_AT_RISK",
          "LIVE_MONITORING",
          "operator_override",
          "operator"
        );

        // 3. Close open incidents
        if (openIncident) {
          await appendProofEventInTx(tx, strategyId, "INCIDENT_CLOSED", {
            eventType: "INCIDENT_CLOSED",
            recordId: openIncident.id,
            strategyId,
            incidentId: openIncident.id,
            closeReason: "OVERRIDE_APPLIED",
            closedBy: operatorId,
            timestamp: now.toISOString(),
          });

          await tx.incident.update({
            where: { id: openIncident.id },
            data: {
              status: "CLOSED",
              closedAt: now,
              closeReason: "OVERRIDE_APPLIED",
              closedBy: operatorId,
            },
          });
        }

        // 4. Mark override as APPLIED
        await tx.overrideRequest.update({
          where: { id: overrideRequestId },
          data: {
            status: "APPLIED",
            appliedAt: now,
            applyRecordId: recordId,
          },
        });

        // 5. Clear operatorHold + set suppression window
        await tx.liveEAInstance.update({
          where: { id: instance.id },
          data: { operatorHold: "NONE", monitoringSuppressedUntil: suppressedUntil },
        });

        // 6. Alert outbox
        await tx.alertOutbox.create({
          data: {
            eventType: "override_applied",
            dedupeKey: `override_applied:${overrideRequestId}`,
            payload: {
              type: "override_applied",
              strategyId,
              overrideRequestId,
              from: "EDGE_AT_RISK",
              to: "LIVE_MONITORING",
              recordId,
              operatorId,
              incidentId,
              suppressedUntil: suppressedUntil.toISOString(),
            },
          },
        });
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({
      ok: true,
      status: "APPLIED",
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
    });
  } catch (err) {
    if ((err as { code?: string }).code === "OVERRIDE_EXPIRED") {
      return NextResponse.json(apiError(ErrorCode.OVERRIDE_EXPIRED, "Override request has expired"), {
        status: 400,
      });
    }
    log.error({ err, strategyId, overrideRequestId }, "Failed to apply override");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
