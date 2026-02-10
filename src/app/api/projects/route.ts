import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectLimit, getCachedTier } from "@/lib/plan-limits";
import { PLANS } from "@/lib/plans";
import {
  createProjectSchema,
  formatZodErrors,
  checkBodySize,
  checkContentType,
} from "@/lib/validations";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

// GET /api/projects - List all projects for current user (paginated)
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20)
    );
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId: session.user.id, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { versions: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.project.count({
        where: { userId: session.user.id, deletedAt: null },
      }),
    ]);

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to list projects");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
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
    if (contentTypeError) return contentTypeError;
    const sizeError = checkBodySize(request);
    if (sizeError) return sizeError;

    const body = await request.json();
    const validation = createProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        apiError(
          ErrorCode.VALIDATION_FAILED,
          "Validation failed",
          formatZodErrors(validation.error)
        ),
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    // Use transaction to atomically check limit and create project
    const result = await prisma.$transaction(async (tx) => {
      // Count inside transaction to prevent race conditions
      const [tier, projectCount] = await Promise.all([
        getCachedTier(session.user.id),
        tx.project.count({ where: { userId: session.user.id, deletedAt: null } }),
      ]);
      const max = PLANS[tier].limits.maxProjects;

      if (projectCount >= max) {
        return { error: true as const, max: max === Infinity ? -1 : max };
      }

      const project = await tx.project.create({
        data: {
          name,
          description,
          userId: session.user.id,
        },
      });

      return { error: false as const, project };
    });

    if (result.error) {
      return NextResponse.json(
        apiError(
          ErrorCode.PROJECT_LIMIT,
          "Project limit reached",
          `You've reached the maximum of ${result.max} projects on your current plan. Upgrade to Pro for unlimited projects.`
        ),
        { status: 403 }
      );
    }

    return NextResponse.json(result.project, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create project");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
