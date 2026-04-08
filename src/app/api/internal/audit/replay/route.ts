import { NextRequest, NextResponse } from "next/server";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalAuditReplayRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { authenticateInternal, computeReplay, logAuditAccess } from "../_shared";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "/api/internal/audit/replay" });

export async function GET(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(internalAuditReplayRateLimiter, `internal-audit-replay:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const recordId = request.nextUrl.searchParams.get("recordId");
  if (!recordId) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "Missing required parameter: recordId"),
      { status: 400 }
    );
  }

  try {
    const result = await computeReplay(recordId);

    // Best-effort access logging
    logAuditAccess(result.strategyId, recordId, "replay").catch((err) => {
      log.error({ err, recordId }, "Failed to log audit access for replay");
    });

    const { strategyId: _sid, ...response } = result;
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
