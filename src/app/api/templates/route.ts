import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { buildJsonSchema } from "@/lib/validations";

const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name must be 100 characters or less")
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed || null;
    }),
  buildJson: buildJsonSchema,
});

// GET /api/templates - List user's own templates
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const templates = await prisma.userTemplate.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    logger.error({ error }, "Failed to list templates");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// POST /api/templates - Create a new user template
export async function POST(request: Request) {
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

    const validation = createTemplateSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => i.message);
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Validation failed", errors), {
        status: 400,
      });
    }

    const { name, description, buildJson } = validation.data;

    const template = await prisma.userTemplate.create({
      data: {
        name,
        description,
        buildJson: buildJson as Prisma.InputJsonValue,
        userId: session.user.id,
        isPublic: false,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create template");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
