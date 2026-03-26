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
import { loadActiveConfigWithFallback } from "@/domain/verification/config-loader";
import { Prisma } from "@prisma/client";

const log = logger.child({ route: "/api/internal/monitoring/override/request" });

const requestSchema = z.object({
  strategyId: z.string().min(1),
  recordId: z.string().min(1),
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

  const validation = validate(requestSchema, bodyResult.data);
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

  const { strategyId, recordId, operatorId, note } = validation.data;

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

  if (instance.operatorHold !== "HALTED") {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `Override request requires operatorHold=HALTED, currently ${instance.operatorHold}`
      ),
      { status: 400 }
    );
  }

  const { config } = await loadActiveConfigWithFallback();
  const { configVersion, thresholdsHash, monitoringThresholds } = config;
  const overrideExpiryMinutes = monitoringThresholds?.overrideExpiryMinutes ?? 60;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + overrideExpiryMinutes * 60_000);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await appendProofEventInTx(tx, strategyId, "OVERRIDE_REQUESTED", {
          eventType: "OVERRIDE_REQUESTED",
          recordId,
          strategyId,
          note: note ?? null,
          requestedBy: operatorId,
          expiresAt: expiresAt.toISOString(),
          configVersion,
          thresholdsHash,
          overrideExpiryMinutes,
          timestamp: now.toISOString(),
        });

        const overrideRequest = await tx.overrideRequest.create({
          data: {
            strategyId,
            requestRecordId: recordId,
            requestNote: note ?? null,
            requestedBy: operatorId,
            expiresAt,
            configVersion,
            thresholdsHash,
          },
        });

        await tx.liveEAInstance.update({
          where: { id: instance.id },
          data: { operatorHold: "OVERRIDE_PENDING" },
        });

        return overrideRequest;
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({
      ok: true,
      overrideRequestId: result.id,
      expiresAt: expiresAt.toISOString(),
      operatorHold: "OVERRIDE_PENDING",
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        apiError(
          ErrorCode.OVERRIDE_CONFLICT,
          "An active override already exists for this strategy"
        ),
        { status: 409 }
      );
    }

    log.error({ err, strategyId }, "Failed to create override request");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
