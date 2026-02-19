import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const publishSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .optional()
    .nullable()
    .transform((v) => {
      if (!v) return null;
      const trimmed = v.trim();
      return trimmed || null;
    }),
  buildJson: z.record(z.unknown()),
  tags: z.array(z.string().max(30)).max(5, "Maximum 5 tags allowed").default([]),
  category: z
    .enum([
      "scalping",
      "trend-following",
      "breakout",
      "mean-reversion",
      "grid",
      "martingale",
      "hedging",
      "news-trading",
      "other",
    ])
    .optional()
    .nullable(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rateLimitResult)),
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
    }

    const validation = publishSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => i.message);
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Validation failed", errors), {
        status: 400,
      });
    }

    const { name, description, buildJson, tags, category } = validation.data;

    const template = await prisma.userTemplate.create({
      data: {
        name,
        description,
        buildJson: buildJson as Prisma.InputJsonValue,
        tags,
        category: category ?? null,
        isPublic: true,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ id: template.id, name: template.name }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to publish template to marketplace");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
