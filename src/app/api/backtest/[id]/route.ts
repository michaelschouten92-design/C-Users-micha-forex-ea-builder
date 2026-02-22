import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";

// GET /api/backtest/[id] — Get a single backtest result
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const { id } = await params;

    const run = await prisma.backtestRun.findUnique({
      where: { id },
      include: {
        upload: {
          select: {
            id: true,
            userId: true,
            projectId: true,
            fileName: true,
            fileSize: true,
            createdAt: true,
          },
        },
        aiAnalysis: true,
      },
    });

    if (!run || run.upload.userId !== session.user.id) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Backtest not found"), {
        status: 404,
      });
    }

    // Fetch user subscription tier
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    const tier = subscription?.tier ?? "FREE";

    return NextResponse.json({
      id: run.id,
      uploadId: run.upload.id,
      fileName: run.upload.fileName,
      fileSize: run.upload.fileSize,
      projectId: run.upload.projectId,
      createdAt: run.createdAt,
      metadata: {
        eaName: run.eaName,
        symbol: run.symbol,
        timeframe: run.timeframe,
        period: run.period,
        initialDeposit: run.initialDeposit,
      },
      metrics: {
        totalNetProfit: run.totalNetProfit,
        profitFactor: run.profitFactor,
        maxDrawdownPct: run.maxDrawdownPct,
        maxDrawdownAbs: run.maxDrawdownAbs,
        sharpeRatio: run.sharpeRatio,
        recoveryFactor: run.recoveryFactor,
        expectedPayoff: run.expectedPayoff,
        totalTrades: run.totalTrades,
        winRate: run.winRate,
        longWinRate: run.longWinRate,
        shortWinRate: run.shortWinRate,
      },
      healthScore: run.healthScore,
      healthStatus: run.healthStatus,
      scoreBreakdown: run.scoreBreakdown,
      parseWarnings: run.parseWarnings,
      detectedLocale: run.detectedLocale,
      dealCount: Array.isArray(run.trades) ? (run.trades as unknown[]).length : 0,
      aiAnalysis: run.aiAnalysis
        ? {
            id: run.aiAnalysis.id,
            analysis: run.aiAnalysis.analysis,
            weaknesses: run.aiAnalysis.weaknesses,
            model: run.aiAnalysis.model,
            createdAt: run.aiAnalysis.createdAt,
            optimizations: run.aiAnalysis.optimizations ?? null,
          }
        : null,
      walkForwardResult: run.walkForwardResult ?? null,
      tier,
      optimizations: run.aiAnalysis?.optimizations ?? null,
    });
  } catch (error) {
    logger.error({ error }, "Failed to get backtest");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}

// DELETE /api/backtest/[id] — Delete a backtest upload
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
    }

    const { id } = await params;

    // Find the run and verify ownership
    const run = await prisma.backtestRun.findUnique({
      where: { id },
      include: {
        upload: { select: { id: true, userId: true } },
      },
    });

    if (!run || run.upload.userId !== session.user.id) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Backtest not found"), {
        status: 404,
      });
    }

    // Delete the upload (cascades to run and analysis)
    await prisma.backtestUpload.delete({
      where: { id: run.upload.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete backtest");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
