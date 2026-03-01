import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runVerification } from "@/domain/verification/verification-service";
import { timingSafeEqual } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalVerifyRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson, validate, formatZodErrors } from "@/lib/validations";

const log = logger.child({ route: "/api/internal/verify" });

const LIFECYCLE_STATES = [
  "DRAFT",
  "BACKTESTED",
  "VERIFIED",
  "LIVE_MONITORING",
  "EDGE_AT_RISK",
  "INVALIDATED",
] as const;

const verifyRequestSchema = z.object({
  strategyId: z.string().min(1),
  strategyVersion: z.number().int().positive(),
  currentLifecycleState: z.enum(LIFECYCLE_STATES),
  tradeHistory: z.array(z.record(z.unknown())),
  backtestParameters: z.record(z.unknown()),
  intermediateResults: z
    .object({
      robustnessScores: z.object({ composite: z.number() }).optional(),
    })
    .optional(),
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
  const rl = await checkRateLimit(internalVerifyRateLimiter, `internal-verify:${ip}`);
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

  const validation = validate(verifyRequestSchema, bodyResult.data);
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

  const {
    strategyId,
    strategyVersion,
    currentLifecycleState,
    tradeHistory,
    backtestParameters,
    intermediateResults,
  } = validation.data;

  try {
    const result = await runVerification({
      strategyId,
      strategyVersion,
      currentLifecycleState,
      tradeHistory,
      backtestParameters,
      intermediateResults,
    });

    return NextResponse.json(result);
  } catch (err) {
    log.error({ err, strategyId, strategyVersion }, "Verification failed");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
