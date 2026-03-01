import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalProofEventsRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { verifyProofChain, type StoredProofEvent } from "@/lib/proof/chain";

const log = logger.child({ route: "/api/internal/proof-events" });

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
  const rl = await checkRateLimit(internalProofEventsRateLimiter, `internal-proof-events:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const strategyId = request.nextUrl.searchParams.get("strategyId");
  if (!strategyId) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "Missing required parameter: strategyId"),
      { status: 400 }
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  let limit = 50;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed)) {
      limit = Math.max(1, Math.min(200, parsed));
    }
  }

  const verify = request.nextUrl.searchParams.get("verify") === "true";
  const recordId = request.nextUrl.searchParams.get("recordId");

  try {
    const events = await prisma.proofEventLog.findMany({
      where: { strategyId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        createdAt: true,
        type: true,
        sessionId: true,
        meta: true,
        sequence: true,
        eventHash: true,
        prevEventHash: true,
      },
    });

    const data = events.map(({ meta, ...rest }) => ({ ...rest, payload: meta }));

    if (!verify) {
      return NextResponse.json({ data });
    }

    if (!recordId) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "verify=true requires recordId parameter"),
        { status: 400 }
      );
    }

    // Fetch all chained events for this recordId in sequence order.
    // Chain scope is per verification-run recordId (stored in sessionId).
    const chainedEvents = await prisma.proofEventLog.findMany({
      where: { sessionId: recordId, sequence: { not: null } },
      orderBy: { sequence: "asc" },
      select: {
        sequence: true,
        strategyId: true,
        type: true,
        sessionId: true,
        eventHash: true,
        prevEventHash: true,
        meta: true,
        createdAt: true,
      },
    });

    const chainVerification = verifyProofChain(
      chainedEvents as unknown as StoredProofEvent[],
      recordId
    );

    return NextResponse.json({ data, chainVerification });
  } catch (err) {
    log.error({ err, strategyId }, "Failed to fetch proof events");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
