import { NextRequest, NextResponse } from "next/server";
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
import { prisma } from "@/lib/prisma";

const log = logger.child({ route: "/api/internal/heartbeat/latest" });

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

/**
 * GET /api/internal/heartbeat/latest?strategyId=...
 *
 * Read-model: returns the latest heartbeat decision for a strategy,
 * sourced from the HEARTBEAT_DECISION_MADE proof event log.
 *
 * Always returns 200 for valid auth. Fail-closed to PAUSE on errors.
 */
export async function GET(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(internalHeartbeatRateLimiter, `internal-heartbeat-latest:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const strategyId = request.nextUrl.searchParams.get("strategyId");
  if (!strategyId || strategyId.trim().length === 0) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "strategyId query parameter is required"),
      { status: 400 }
    );
  }

  const now = new Date();

  try {
    const event = await prisma.proofEventLog.findFirst({
      where: {
        strategyId,
        type: "HEARTBEAT_DECISION_MADE",
      },
      orderBy: { createdAt: "desc" },
      select: {
        meta: true,
        createdAt: true,
      },
    });

    if (!event) {
      return NextResponse.json({
        strategyId,
        action: "PAUSE",
        reasonCode: "NO_HEARTBEAT_PROOF",
        serverTime: now.toISOString(),
        decidedAt: null,
      });
    }

    // Extract whitelisted fields from meta — never expose raw payload
    const meta = event.meta as Record<string, unknown> | null;
    const action = typeof meta?.action === "string" ? meta.action : "PAUSE";
    const reasonCode =
      typeof meta?.reasonCode === "string" ? meta.reasonCode : "COMPUTATION_FAILED";

    return NextResponse.json({
      strategyId,
      action,
      reasonCode,
      serverTime: now.toISOString(),
      decidedAt: event.createdAt.toISOString(),
    });
  } catch (err) {
    log.error({ err, strategyId }, "heartbeat latest read failed");

    return NextResponse.json({
      strategyId,
      action: "PAUSE",
      reasonCode: "COMPUTATION_FAILED",
      serverTime: now.toISOString(),
      decidedAt: null,
    });
  }
}
