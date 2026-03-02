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

const log = logger.child({ route: "/api/internal/monitoring/override/reject" });

const rejectSchema = z.object({
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

  const validation = validate(rejectSchema, bodyResult.data);
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

  if (overrideRequest.status !== "PENDING" && overrideRequest.status !== "APPROVED") {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `Cannot reject override in ${overrideRequest.status} state, must be PENDING or APPROVED`
      ),
      { status: 400 }
    );
  }

  const now = new Date();

  try {
    await prisma.$transaction(
      async (tx) => {
        await appendProofEventInTx(tx, strategyId, "OVERRIDE_REJECTED", {
          eventType: "OVERRIDE_REJECTED",
          recordId,
          strategyId,
          overrideRequestId,
          rejectedBy: operatorId,
          previousStatus: overrideRequest.status,
          note: note ?? null,
          timestamp: now.toISOString(),
        });

        await tx.overrideRequest.update({
          where: { id: overrideRequestId },
          data: {
            status: "REJECTED",
            rejectNote: note ?? null,
            rejectRecordId: recordId,
            rejectedAt: now,
          },
        });

        await tx.liveEAInstance.updateMany({
          where: {
            strategyVersion: {
              strategyIdentity: { strategyId },
            },
          },
          data: { operatorHold: "HALTED" },
        });
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({ ok: true, status: "REJECTED", operatorHold: "HALTED" });
  } catch (err) {
    log.error({ err, strategyId, overrideRequestId }, "Failed to reject override");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
