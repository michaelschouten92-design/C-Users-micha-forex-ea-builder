import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { NextResponse } from "next/server";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/share - Generate a share link
export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    const { id } = await params;

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

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!project) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    // Check for existing active share
    const existingShare = await prisma.projectShare.findFirst({
      where: {
        projectId: id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (existingShare) {
      return NextResponse.json({
        shareToken: existingShare.shareToken,
        shareUrl: `/shared/${existingShare.shareToken}`,
        createdAt: existingShare.createdAt.toISOString(),
        expiresAt: existingShare.expiresAt?.toISOString() ?? null,
      });
    }

    // Create new share
    const share = await prisma.projectShare.create({
      data: { projectId: id },
    });

    return NextResponse.json({
      shareToken: share.shareToken,
      shareUrl: `/shared/${share.shareToken}`,
      createdAt: share.createdAt.toISOString(),
      expiresAt: share.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error({ error }, "Failed to create project share");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// DELETE /api/projects/[id]/share - Revoke share link
export async function DELETE(request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!project) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    // Delete all shares for this project
    await prisma.projectShare.deleteMany({
      where: { projectId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to revoke project share");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
