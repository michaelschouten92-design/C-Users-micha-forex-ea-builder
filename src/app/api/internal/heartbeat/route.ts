import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalHeartbeatRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson, validate, formatZodErrors } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { decideHeartbeatAction } from "@/domain/heartbeat/decide-heartbeat-action";

const log = logger.child({ route: "/api/internal/heartbeat" });

/** Control-plane responses must never be cached. */
const HEARTBEAT_HEADERS = {
  "Cache-Control": "no-store",
};

const heartbeatSchema = z.object({
  strategyId: z.string().min(1),
  instanceTag: z.string().optional(),
  accountId: z.string().optional(),
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
  const rl = await checkRateLimit(internalHeartbeatRateLimiter, `internal-heartbeat:${ip}`);
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

  const validation = validate(heartbeatSchema, bodyResult.data);
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

  const { strategyId } = validation.data;

  try {
    const instance = await prisma.liveEAInstance.findFirst({
      where: {
        strategyVersion: {
          strategyIdentity: { strategyId },
        },
      },
      select: {
        lifecycleState: true,
        operatorHold: true,
        monitoringSuppressedUntil: true,
      },
    });

    const now = new Date();

    const decision = decideHeartbeatAction(
      instance
        ? {
            lifecycleState: instance.lifecycleState,
            operatorHold: instance.operatorHold as "NONE" | "HALTED" | "OVERRIDE_PENDING" | null,
            monitoringSuppressedUntil: instance.monitoringSuppressedUntil,
            now,
          }
        : null
    );

    // Structured log — safe fields only (no accountId/instanceTag)
    log.info({ strategyId, action: decision.action, reasonCode: decision.reasonCode }, "heartbeat");

    // Best-effort proof event
    logHeartbeatProofEvent(strategyId, decision.action, decision.reasonCode).catch(() => {});

    return NextResponse.json(
      {
        strategyId,
        action: decision.action,
        reasonCode: decision.reasonCode,
        serverTime: now.toISOString(),
      },
      { headers: HEARTBEAT_HEADERS }
    );
  } catch (err) {
    log.error({ err, strategyId }, "heartbeat computation failed");

    // Fail-closed: PAUSE on any error
    return NextResponse.json(
      {
        strategyId,
        action: "PAUSE",
        reasonCode: "COMPUTATION_FAILED",
        serverTime: new Date().toISOString(),
      },
      { headers: HEARTBEAT_HEADERS }
    );
  }
}

async function logHeartbeatProofEvent(
  strategyId: string,
  action: string,
  reasonCode: string
): Promise<void> {
  try {
    const { appendProofEvent } = await import("@/lib/proof/events");
    await appendProofEvent(strategyId, "HEARTBEAT_DECISION_MADE", {
      eventType: "HEARTBEAT_DECISION_MADE",
      recordId: crypto.randomUUID(),
      strategyId,
      action,
      reasonCode,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Best-effort — do not break heartbeat response
  }
}
