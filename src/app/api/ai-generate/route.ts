import { auth } from "@/lib/auth";
import { getCachedTier } from "@/lib/plan-limits";
import { generateStrategy, describeStrategy } from "@/lib/ai-strategy-generator";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { checkContentType, checkBodySize } from "@/lib/validations";
import { z } from "zod";

// In-memory generation counter for free-tier daily limit.
// In production this would use Redis via Upstash, but for MVP
// an in-memory map with day-key is sufficient for single-instance.
const dailyCounts = new Map<string, { count: number; date: string }>();

const FREE_DAILY_LIMIT = 5;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkDailyLimit(userId: string, isFree: boolean): { allowed: boolean; remaining: number } {
  if (!isFree) {
    return { allowed: true, remaining: Infinity };
  }

  const today = getTodayKey();
  const entry = dailyCounts.get(userId);

  if (!entry || entry.date !== today) {
    return { allowed: true, remaining: FREE_DAILY_LIMIT };
  }

  const remaining = FREE_DAILY_LIMIT - entry.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

function incrementDailyCount(userId: string): void {
  const today = getTodayKey();
  const entry = dailyCounts.get(userId);

  if (!entry || entry.date !== today) {
    dailyCounts.set(userId, { count: 1, date: today });
  } else {
    entry.count++;
  }
}

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
    const dailyCheck = checkDailyLimit(session.user.id, isFree);

    if (!dailyCheck.allowed) {
      return NextResponse.json(
        apiError(
          ErrorCode.PLAN_REQUIRED,
          "Daily AI generation limit reached",
          `Free plan allows ${FREE_DAILY_LIMIT} generations per day. Upgrade to Pro or Elite for unlimited generations.`
        ),
        { status: 403 }
      );
    }

    // Generate strategy
    const buildJson = generateStrategy(description);
    const summary = describeStrategy(description);

    // Increment count after successful generation
    incrementDailyCount(session.user.id);

    return NextResponse.json({
      buildJson,
      summary,
      remaining: isFree ? dailyCheck.remaining - 1 : null,
    });
  } catch (error) {
    logger.error({ error }, "Failed to generate AI strategy");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
