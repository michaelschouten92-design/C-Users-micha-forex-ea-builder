import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

// GET /api/backtest/list — List backtest uploads for current user (paginated)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20)
    );
    const skip = (page - 1) * limit;

    const [uploads, total] = await Promise.all([
      prisma.backtestUpload.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
          runs: {
            select: {
              id: true,
              eaName: true,
              symbol: true,
              timeframe: true,
              period: true,
              totalNetProfit: true,
              profitFactor: true,
              maxDrawdownPct: true,
              totalTrades: true,
              winRate: true,
              healthScore: true,
              healthStatus: true,
              createdAt: true,
            },
          },
          project: {
            select: { id: true, name: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.backtestUpload.count({
        where: { userId: session.user.id },
      }),
    ]);

    const data = uploads.map((upload) => {
      const run = upload.runs[0];
      return {
        uploadId: upload.id,
        runId: run?.id ?? null,
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        project: upload.project,
        createdAt: upload.createdAt,
        ...(run
          ? {
              eaName: run.eaName,
              symbol: run.symbol,
              timeframe: run.timeframe,
              period: run.period,
              totalNetProfit: run.totalNetProfit,
              profitFactor: run.profitFactor,
              maxDrawdownPct: run.maxDrawdownPct,
              totalTrades: run.totalTrades,
              winRate: run.winRate,
              healthScore: run.healthScore,
              healthStatus: run.healthStatus,
            }
          : {}),
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to list backtests");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
