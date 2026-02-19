/**
 * GET /api/projects/[id]/backtest - Fetch project's latest buildJson for backtesting.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ErrorCode, apiError } from "@/lib/error-codes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    const latestVersion = await prisma.buildVersion.findFirst({
      where: { projectId: id },
      orderBy: { versionNo: "desc" },
      select: { buildJson: true },
    });

    if (!latestVersion) {
      return NextResponse.json(
        apiError(ErrorCode.NOT_FOUND, "No saved version found for this project"),
        { status: 404 }
      );
    }

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      buildJson: latestVersion.buildJson,
    });
  } catch {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
