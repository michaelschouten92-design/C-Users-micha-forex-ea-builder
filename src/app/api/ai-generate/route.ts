import { auth } from "@/lib/auth";
import { getCachedTier } from "@/lib/plan-limits";
import { generateStrategy, describeStrategy } from "@/lib/ai-strategy-generator";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  apiRateLimiter,
  aiDailyGenerationLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { checkContentType, checkBodySize } from "@/lib/validations";
import { z } from "zod";

const FREE_DAILY_LIMIT = 5;

const generateRequestSchema = z.object({
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .max(1000, "Description must be 1000 characters or less"),
});

// POST /api/ai-generate - Generate strategy from description
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rateLimitResult)),
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate request
    const contentTypeError = checkContentType(request);
    if (contentTypeError)
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Content-Type must be application/json"),
        { status: 415 }
      );
    const sizeError = checkBodySize(request);
    if (sizeError)
      return NextResponse.json(apiError(ErrorCode.REQUEST_TOO_LARGE, "Request too large"), {
        status: 413,
      });

    const body = await request.json();
    const validation = generateRequestSchema.safeParse(body);

    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message);
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Validation failed", messages),
        { status: 400 }
      );
    }

    const { description } = validation.data;

    // Check daily generation limit for free users
    const tier = await getCachedTier(session.user.id);
    const isFree = tier === "FREE";

    if (isFree) {
      const dailyResult = await checkRateLimit(
        aiDailyGenerationLimiter,
        `ai-daily:${session.user.id}`
      );
      if (!dailyResult.success) {
        return NextResponse.json(
          apiError(
            ErrorCode.PLAN_REQUIRED,
            "Daily AI generation limit reached",
            `Free plan allows ${FREE_DAILY_LIMIT} generations per day. Upgrade to Pro or Elite for unlimited generations.`
          ),
          { status: 403, headers: createRateLimitHeaders(dailyResult) }
        );
      }
    }

    // Generate strategy
    const buildJson = generateStrategy(description);
    const summary = describeStrategy(description);

    return NextResponse.json({
      buildJson,
      summary,
      remaining: isFree ? null : null,
    });
  } catch (error) {
    logger.error({ error }, "Failed to generate AI strategy");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
