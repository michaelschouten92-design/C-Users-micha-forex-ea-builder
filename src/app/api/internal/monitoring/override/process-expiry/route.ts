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
import { prisma } from "@/lib/prisma";
import { appendProofEventInTx } from "@/lib/proof/events";

const log = logger.child({ route: "/api/internal/monitoring/override/process-expiry" });

const processSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
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

  let limit = 20;
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
      limit = validation.data.limit ?? 20;
    }
  } catch {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Invalid JSON"), {
      status: 400,
    });
  }

  const now = new Date();

  const expired = await prisma.overrideRequest.findMany({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
      expiresAt: { lte: now },
    },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });

  let expiredCount = 0;
  const errors: string[] = [];

  for (const override of expired) {
    try {
      await prisma.$transaction(
        async (tx) => {
          await appendProofEventInTx(tx, override.strategyId, "OVERRIDE_EXPIRED", {
            eventType: "OVERRIDE_EXPIRED",
            recordId: override.id,
            strategyId: override.strategyId,
            overrideRequestId: override.id,
            previousStatus: override.status,
            expiresAt: override.expiresAt.toISOString(),
            timestamp: now.toISOString(),
          });

          await tx.overrideRequest.update({
            where: { id: override.id },
            data: { status: "EXPIRED", expiredAt: now },
          });

          // If operatorHold was OVERRIDE_PENDING, revert to HALTED
          if (override.status === "PENDING" || override.status === "APPROVED") {
            await tx.liveEAInstance.updateMany({
              where: {
                deletedAt: null,
                strategyVersion: {
                  strategyIdentity: { strategyId: override.strategyId },
                },
                operatorHold: "OVERRIDE_PENDING",
              },
              data: { operatorHold: "HALTED" },
            });
          }
        },
        { isolationLevel: "Serializable" }
      );

      expiredCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err, overrideId: override.id }, "Failed to expire override");
      errors.push(`expire:${override.id}: ${msg}`);
    }
  }

  return NextResponse.json({ expired: expiredCount, errors });
}
