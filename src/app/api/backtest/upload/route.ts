import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { getCachedTier } from "@/lib/plan-limits";
import {
  backtestUploadFreeRateLimiter,
  backtestUploadProRateLimiter,
  backtestUploadEliteRateLimiter,
  checkRateLimit,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { parseMT5Report, computeHealthScore } from "@/lib/backtest-parser";
import { BACKTEST_MAX_FILE_SIZE, isLikelyMT5Report } from "@/lib/validations/backtest";
import { createHash } from "crypto";

// Select the right rate limiter based on plan tier
function getUploadRateLimiterForTier(tier: string) {
  switch (tier) {
    case "ELITE":
      return backtestUploadEliteRateLimiter;
    case "PRO":
      return backtestUploadProRateLimiter;
    default:
      return backtestUploadFreeRateLimiter;
  }
}

/** Strip script tags, event handlers, and other XSS vectors from HTML before storage */
function sanitizeHtmlForStorage(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "removed:");
}

/** Sanitize a client-provided filename */
function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-\s()]/g, "_").slice(0, 255);
}

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

    // 2. Tier-based rate limit
    const tier = await getCachedTier(session.user.id);
    const rateLimiter = getUploadRateLimiterForTier(tier);
    const rateLimitResult = await checkRateLimit(rateLimiter, `backtest-upload:${session.user.id}`);
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

    // 4. MIME type validation (before reading file content)
    const mimeType = file.type;
    if (mimeType && !mimeType.startsWith("text/") && mimeType !== "application/octet-stream") {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, "Invalid file type. Please upload an HTML file."),
        { status: 400 }
      );
    }

    // 5. File size check
    if (file.size > BACKTEST_MAX_FILE_SIZE) {
      return NextResponse.json(
        apiError(
          ErrorCode.REQUEST_TOO_LARGE,
          `File too large. Maximum size is ${BACKTEST_MAX_FILE_SIZE / (1024 * 1024)}MB.`
        ),
        { status: 413 }
      );
    }

    // 6. Validate projectId ownership if provided (before expensive parse)
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

    // 7. Read file content
    const html = await file.text();

    // 8. Structural validation
    const structureCheck = isLikelyMT5Report(html);
    if (!structureCheck.valid) {
      return NextResponse.json(
        apiError(ErrorCode.VALIDATION_FAILED, structureCheck.reason ?? "Invalid file"),
        { status: 400 }
      );
    }

    // 9. Content hash for deduplication (scoped per user)
    const contentHash = createHash("sha256").update(html).digest("hex");

    const existingUpload = await prisma.backtestUpload.findUnique({
      where: { userId_contentHash: { userId: session.user.id, contentHash } },
      select: { id: true, runs: { select: { id: true } } },
    });

    if (existingUpload) {
      return NextResponse.json(
        apiError(ErrorCode.DUPLICATE_UPLOAD, "This report has already been uploaded"),
        { status: 409 }
      );
    }

    // 10. Parse the report
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

    // 11. Compute health score
    const healthResult = computeHealthScore(parsed.metrics);

    // 12. Sanitize HTML before storage and sanitize filename
    const sanitizedHtml = sanitizeHtmlForStorage(html);
    const safeName = sanitizeFileName(file.name);

    // 13. Store in transaction
    const result = await prisma.$transaction(async (tx) => {
      const upload = await tx.backtestUpload.create({
        data: {
          userId: session.user.id,
          projectId: projectId || null,
          contentHash,
          originalHtml: sanitizedHtml,
          fileName: safeName,
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

    // 14. Return result
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
    // Handle race condition: concurrent upload of same file by same user
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        apiError(ErrorCode.DUPLICATE_UPLOAD, "This report has already been uploaded"),
        { status: 409 }
      );
    }
    logger.error({ error }, "Failed to upload backtest");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
