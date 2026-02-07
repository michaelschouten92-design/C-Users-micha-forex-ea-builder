import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectLimit } from "@/lib/plan-limits";
import { createProjectSchema, formatZodErrors, checkBodySize } from "@/lib/validations";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(apiRateLimiter, session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: formatRateLimitError(rateLimitResult) },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Check body size
    const sizeError = checkBodySize(request);
    if (sizeError) return sizeError;

    // Check project limit
    const projectLimit = await checkProjectLimit(session.user.id);
    if (!projectLimit.allowed) {
      return NextResponse.json(
        apiError(ErrorCode.PROJECT_LIMIT, "Project limit reached", `You've reached the maximum of ${projectLimit.max} projects on your current plan. Upgrade to Pro for unlimited projects.`),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: session.user.id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create project");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
