import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProjectSchema, formatZodErrors, checkBodySize, checkContentType } from "@/lib/validations";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { audit } from "@/lib/audit";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id] - Get a single project
export async function GET(request: Request, { params }: Params) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { versionNo: "desc" },
          take: 10,
          select: {
            id: true,
            versionNo: true,
            createdAt: true,
          },
        },
        _count: {
          select: { versions: true, exports: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    logger.error({ error }, "Failed to get project");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update a project
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    const { id } = await params;

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
    const validation = updateProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Validation failed", formatZodErrors(validation.error)),
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    const { name, description } = validation.data;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    logger.error({ error }, "Failed to update project");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await audit.projectDelete(session.user.id, id, existing.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete project");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), { status: 500 });
  }
}
