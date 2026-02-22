import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  backtestUploadRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { parseMT5Report, computeHealthScore } from "@/lib/backtest-parser";
import { BACKTEST_MAX_FILE_SIZE, isLikelyMT5Report } from "@/lib/validations/backtest";
import { createHash } from "crypto";

// POST /api/backtest/upload — Upload and parse an MT5 backtest HTML report
export async function POST(request: Request) {
  try {
    // 1. Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }
    if (session.user.suspended) {
      return NextResponse.json(apiError(ErrorCode.ACCOUNT_SUSPENDED, "Account suspended"), {
        status: 403,
      });
    }

    // 2. Rate limit
    const rateLimitResult = await checkRateLimit(backtestUploadRateLimiter, session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rateLimitResult)),
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // 3. Read multipart form data
    const formData = await request.formData();
    const file = formData.get("file");
    const projectId = formData.get("projectId") as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "No file provided"), {
        status: 400,
      });
    }

    // 4. File size check
    if (file.size > BACKTEST_MAX_FILE_SIZE) {
      return NextResponse.json(
        apiError(
          ErrorCode.REQUEST_TOO_LARGE,
          `File too large. Maximum size is ${BACKTEST_MAX_FILE_SIZE / (1024 * 1024)}MB.`
        ),
        { status: 413 }
      );
    }

    // 5. Read file content
    const html = await file.text();

    // 6. Structural validation
    const structureCheck = isLikelyMT5Report(html);
    if (!structureCheck.valid) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, structureCheck.reason ?? "Invalid file"),
        { status: 400 }
      );
    }

    // 7. Content hash for deduplication
    const contentHash = createHash("sha256").update(html).digest("hex");

    const existingUpload = await prisma.backtestUpload.findUnique({
      where: { contentHash },
      select: { id: true, runs: { select: { id: true } } },
    });

    if (existingUpload) {
      return NextResponse.json(
        apiError(
          ErrorCode.DUPLICATE_UPLOAD,
          "This report has already been uploaded",
          existingUpload.runs[0]?.id ? `Existing analysis: ${existingUpload.runs[0].id}` : undefined
        ),
        { status: 409 }
      );
    }

    // 8. Parse the report
    let parsed;
    try {
      parsed = parseMT5Report(html);
    } catch (err) {
      logger.error({ error: err }, "Failed to parse MT5 report");
      return NextResponse.json(
        apiError(
          ErrorCode.PARSE_FAILED,
          "Failed to parse the backtest report. Ensure it is a valid MT5 Strategy Tester HTML export."
        ),
        { status: 422 }
      );
    }

    // 9. Compute health score
    const healthResult = computeHealthScore(parsed.metrics);

    // 10. Validate projectId ownership if provided
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id, deletedAt: null },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Project not found"), {
          status: 404,
        });
      }
    }

    // 11. Store in transaction
    const result = await prisma.$transaction(async (tx) => {
      const upload = await tx.backtestUpload.create({
        data: {
          userId: session.user.id,
          projectId: projectId || null,
          contentHash,
          originalHtml: html,
          fileName: file.name,
          fileSize: file.size,
        },
      });

      const run = await tx.backtestRun.create({
        data: {
          uploadId: upload.id,
          eaName: parsed.metadata.eaName,
          symbol: parsed.metadata.symbol,
          timeframe: parsed.metadata.timeframe,
          period: parsed.metadata.period,
          initialDeposit: parsed.metadata.initialDeposit,
          totalNetProfit: parsed.metrics.totalNetProfit,
          profitFactor: parsed.metrics.profitFactor,
          maxDrawdownPct: parsed.metrics.maxDrawdownPct,
          maxDrawdownAbs: parsed.metrics.maxDrawdownAbs,
          sharpeRatio: parsed.metrics.sharpeRatio,
          recoveryFactor: parsed.metrics.recoveryFactor,
          expectedPayoff: parsed.metrics.expectedPayoff,
          totalTrades: parsed.metrics.totalTrades,
          winRate: parsed.metrics.winRate,
          longWinRate: parsed.metrics.longWinRate,
          shortWinRate: parsed.metrics.shortWinRate,
          healthScore: healthResult.score,
          healthStatus: healthResult.status,
          trades: JSON.parse(JSON.stringify(parsed.deals)),
          scoreBreakdown: JSON.parse(JSON.stringify(healthResult.breakdown)),
          parseWarnings: parsed.parseWarnings,
          detectedLocale: parsed.detectedLocale,
        },
      });

      return { upload, run };
    });

    // 12. Return result
    return NextResponse.json(
      {
        uploadId: result.upload.id,
        runId: result.run.id,
        metadata: parsed.metadata,
        metrics: parsed.metrics,
        healthScore: healthResult.score,
        healthStatus: healthResult.status,
        scoreBreakdown: healthResult.breakdown,
        parseWarnings: parsed.parseWarnings,
        detectedLocale: parsed.detectedLocale,
        dealCount: parsed.deals.length,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, "Failed to upload backtest");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
