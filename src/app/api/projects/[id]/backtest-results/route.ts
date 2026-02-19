/**
 * GET/POST /api/projects/[id]/backtest-results
 * Save and retrieve backtest results for a project.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ErrorCode, apiError } from "@/lib/error-codes";

type Params = { params: Promise<{ id: string }> };

/**
 * GET - Retrieve all backtest results for a project.
 */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    const results = await prisma.backtestResult.findMany({
      where: { projectId: id, userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        results: true,
        fileName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

/**
 * POST - Save a new backtest result for a project.
 */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), { status: 404 });
    }

    const body = await request.json();
    const { results, fileName } = body;

    if (!results || typeof fileName !== "string") {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Missing results or fileName"),
        { status: 400 }
      );
    }

    // Limit stored results per project to prevent unbounded growth
    const existingCount = await prisma.backtestResult.count({
      where: { projectId: id, userId: session.user.id },
    });

    if (existingCount >= 50) {
      // Delete oldest result
      const oldest = await prisma.backtestResult.findFirst({
        where: { projectId: id, userId: session.user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (oldest) {
        await prisma.backtestResult.delete({ where: { id: oldest.id } });
      }
    }

    const backtestResult = await prisma.backtestResult.create({
      data: {
        projectId: id,
        userId: session.user.id,
        results,
        fileName,
      },
      select: {
        id: true,
        results: true,
        fileName: true,
        createdAt: true,
      },
    });

    return NextResponse.json(backtestResult, { status: 201 });
  } catch {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
