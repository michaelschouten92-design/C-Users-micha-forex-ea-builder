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

    // Check project limit
    const projectLimit = await checkProjectLimit(session.user.id);
    if (!projectLimit.allowed) {
      return NextResponse.json(
        apiError(ErrorCode.PROJECT_LIMIT, "Project limit reached", `You've reached the maximum of ${projectLimit.max} projects on your current plan. Upgrade to Pro for unlimited projects.`),
        { status: 403 }
      );
    }

    // Verify ownership and fetch the source project
    const sourceProject = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
      include: {
        versions: {
          orderBy: { versionNo: "desc" },
          take: 1,
          select: {
            buildJson: true,
          },
        },
      },
    });

    if (!sourceProject) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    // Create the duplicated project with its first version (if source had versions)
    const newProject = await prisma.project.create({
      data: {
        name: `${sourceProject.name} (copy)`,
        description: sourceProject.description,
        userId: session.user.id,
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
        _count: {
          select: { versions: true },
        },
      },
    });

    await audit.projectCreate(session.user.id, newProject.id, newProject.name);

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to duplicate project");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), { status: 500 });
  }
}
