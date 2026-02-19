import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseMT5Report } from "@/lib/backtest-parser";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import type { Prisma } from "@prisma/client";
import {
  apiRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

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

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid form data"), {
        status: 400,
      });
    }

    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "No file provided"), {
        status: 400,
      });
    }

    if (!projectId) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Project ID is required"), {
        status: 400,
      });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".htm") && !fileName.endsWith(".html")) {
      return NextResponse.json(
        apiError(
          ErrorCode.VALIDATION_FAILED,
          "Invalid file type. Please upload an MT5 Strategy Tester report (.htm or .html)."
        ),
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        apiError(ErrorCode.REQUEST_TOO_LARGE, "File size exceeds 5MB limit"),
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), {
        status: 404,
      });
    }

    // Read and parse the HTML report
    const html = await file.text();
    const results = parseMT5Report(html);

    // Save to database
    const backtestResult = await prisma.backtestResult.create({
      data: {
        projectId,
        userId: session.user.id,
        results: results as unknown as Prisma.InputJsonValue,
        fileName: file.name,
      },
    });

    return NextResponse.json(
      { id: backtestResult.id, results, fileName: file.name },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, "Failed to upload backtest report");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
