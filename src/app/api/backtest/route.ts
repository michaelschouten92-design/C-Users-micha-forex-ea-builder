import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    const where: { userId: string; projectId?: string } = {
      userId: session.user.id,
    };
    if (projectId) {
      where.projectId = projectId;
    }

    const results = await prisma.backtestResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        projectId: true,
        results: true,
        fileName: true,
        createdAt: true,
        project: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    logger.error({ error }, "Failed to fetch backtest results");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
