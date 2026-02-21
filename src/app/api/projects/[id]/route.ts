import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  updateProjectSchema,
  formatZodErrors,
  checkBodySize,
  checkContentType,
} from "@/lib/validations";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { audit } from "@/lib/audit";
import {
  apiRateLimiter,
  projectDeleteRateLimiter,
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
          take: 1,
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
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
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
        apiError(
          ErrorCode.VALIDATION_FAILED,
          "Validation failed",
          formatZodErrors(validation.error)
        ),
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

    const { name, description, notes } = validation.data;
    const rawTags = body.tags;

    // Sync tags if provided — wrap in transaction for atomicity
    if (Array.isArray(rawTags)) {
      const tagRegex = /^[a-z0-9\-_ ]+$/;
      const tags = rawTags
        .filter((t: unknown): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase().slice(0, 20))
        .filter((t) => t.length > 0 && tagRegex.test(t))
        .slice(0, 5);

      const project = await prisma.$transaction(async (tx) => {
        const updated = await tx.project.update({
          where: { id, userId: session.user.id },
          data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(notes !== undefined && { notes }),
          },
        });

        await tx.projectTag.deleteMany({ where: { projectId: id } });
        if (tags.length > 0) {
          await tx.projectTag.createMany({
            data: tags.map((tag) => ({ projectId: id, tag })),
            skipDuplicates: true,
          });
        }

        return updated;
      });

      return NextResponse.json(project);
    }

    const project = await prisma.project.update({
      where: { id, userId: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    logger.error({ error }, "Failed to update project");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
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

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      projectDeleteRateLimiter,
      `proj-del:${session.user.id}`
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rateLimitResult)),
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    await prisma.project.update({
      where: { id, userId: session.user.id },
      data: { deletedAt: new Date() },
    });

    await audit.projectDelete(session.user.id, id, existing.name);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete project");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
