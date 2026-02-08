import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectLimit } from "@/lib/plan-limits";
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
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/duplicate - Duplicate a project
export async function POST(request: Request, { params }: Params) {
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

    // Verify ownership, check limit, and create — all in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check project limit inside transaction to prevent race condition
      const projectLimit = await checkProjectLimit(session!.user!.id!);
      if (!projectLimit.allowed) {
        return { error: true as const, status: 403, max: projectLimit.max };
      }

      const sourceProject = await tx.project.findFirst({
        where: { id, userId: session!.user!.id!, deletedAt: null },
        include: {
          versions: {
            orderBy: { versionNo: "desc" as const },
            take: 1,
            select: { buildJson: true },
          },
        },
      });

      if (!sourceProject) {
        return { error: true as const, status: 404, max: 0 };
      }

      const newProject = await tx.project.create({
        data: {
          name: `${sourceProject.name} (copy)`,
          description: sourceProject.description,
          userId: session!.user!.id!,
          ...(sourceProject.versions.length > 0
            ? {
                versions: {
                  create: {
                    versionNo: 1,
                    buildJson: sourceProject.versions[0].buildJson as Prisma.InputJsonValue,
                  },
                },
              }
            : {}),
        },
        include: {
          _count: { select: { versions: true } },
        },
      });

      return { error: false as const, project: newProject };
    });

    if (result.error) {
      if (result.status === 404) {
        return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), {
          status: 404,
        });
      }
      return NextResponse.json(
        apiError(
          ErrorCode.PROJECT_LIMIT,
          "Project limit reached",
          `You've reached the maximum of ${result.max} projects on your current plan. Upgrade to Pro for unlimited projects.`
        ),
        { status: 403 }
      );
    }

    const newProject = result.project;

    await audit.projectCreate(session.user.id, newProject.id, newProject.name);

    return NextResponse.json(
      {
        ...newProject,
        ...(newProject._count.versions === 0
          ? { warning: "Source project had no saved versions. The duplicate is empty." }
          : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, "Failed to duplicate project");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
