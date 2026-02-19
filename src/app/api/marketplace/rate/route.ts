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

const rateSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  rating: z.number().int().min(1, "Rating must be 1-5").max(5, "Rating must be 1-5"),
  review: z
    .string()
    .max(500, "Review must be 500 characters or less")
    .optional()
    .nullable()
    .transform((v) => {
      if (!v) return null;
      const trimmed = v.trim();
      return trimmed || null;
    }),
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

    const validation = rateSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => i.message);
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Validation failed", errors), {
        status: 400,
      });
    }

    const { templateId, rating, review } = validation.data;

    // Verify template exists and is public
    const template = await prisma.userTemplate.findFirst({
      where: { id: templateId, isPublic: true },
      select: { id: true, userId: true },
    });

    if (!template) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Template not found"), {
        status: 404,
      });
    }

    // Prevent self-rating
    if (template.userId === session.user.id) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "You cannot rate your own template"),
        { status: 400 }
      );
    }

    // Upsert rating (one per user per template)
    const templateRating = await prisma.templateRating.upsert({
      where: {
        templateId_userId: {
          templateId,
          userId: session.user.id,
        },
      },
      update: { rating, review },
      create: {
        templateId,
        userId: session.user.id,
        rating,
        review,
      },
    });

    return NextResponse.json({ id: templateRating.id, rating, review }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Failed to rate template");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
