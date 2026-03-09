import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { logAuditEvent, getAuditContext } from "@/lib/audit";
import { linkExternalBaseline } from "@/lib/strategy-identity/external-baseline";
import { bindIdentityToVersion } from "@/lib/strategy-identity/identity";

const log = logger.child({ route: "link-baseline" });

/**
 * POST /api/live/[instanceId]/link-baseline
 *
 * Links an external LiveEAInstance to a BacktestRun through the canonical
 * strategy chain: StrategyIdentity → StrategyVersion → BacktestBaseline.
 *
 * After linking, the instance resolves baseline the same way as native/exported
 * strategies — via LiveEAInstance.strategyVersionId.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
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

    const { instanceId } = await params;

    // 2. Parse body
    let body: { backtestRunId: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
        status: 400,
      });
    }

    const { backtestRunId } = body;
    if (!backtestRunId || typeof backtestRunId !== "string") {
      return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "backtestRunId is required"), {
        status: 400,
      });
    }

    // 3. Find instance and verify ownership
    const instance = await prisma.liveEAInstance.findUnique({
      where: { id: instanceId },
      select: {
        id: true,
        userId: true,
        eaName: true,
        exportJobId: true,
        strategyVersionId: true,
        deletedAt: true,
      },
    });

    if (!instance || instance.deletedAt || instance.userId !== session.user.id) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), {
        status: 404,
      });
    }

    // 4. Eligibility: only external EAs (no export chain)
    if (instance.exportJobId) {
      return NextResponse.json(
        apiError(
          ErrorCode.INELIGIBLE_INSTANCE,
          "This instance was created through the export flow and already has a baseline. Manual linking is only available for externally registered EAs."
        ),
        { status: 409 }
      );
    }

    // 5. Check if already linked (has strategyVersionId from a previous manual link)
    if (instance.strategyVersionId) {
      return NextResponse.json(
        apiError(
          ErrorCode.BASELINE_ALREADY_LINKED,
          "A baseline is already linked to this instance. Relinking is not yet supported."
        ),
        { status: 409 }
      );
    }

    // 6. Validate the backtest run: exists, owned by same user, has required metrics
    const backtestRun = await prisma.backtestRun.findUnique({
      where: { id: backtestRunId },
      select: {
        id: true,
        eaName: true,
        symbol: true,
        totalTrades: true,
        winRate: true,
        profitFactor: true,
        maxDrawdownPct: true,
        sharpeRatio: true,
        initialDeposit: true,
        totalNetProfit: true,
        period: true,
        healthScore: true,
        upload: {
          select: { userId: true },
        },
      },
    });

    if (!backtestRun || backtestRun.upload.userId !== session.user.id) {
      return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Backtest not found"), {
        status: 404,
      });
    }

    // 7. Minimum quality check
    if (backtestRun.totalTrades < 30) {
      return NextResponse.json(
        apiError(
          ErrorCode.INELIGIBLE_BACKTEST,
          `Backtest must have at least 30 trades for a meaningful baseline (has ${backtestRun.totalTrades}).`
        ),
        { status: 422 }
      );
    }

    // 8. Create canonical chain in a transaction
    const result = await prisma.$transaction(async (tx) => {
      return linkExternalBaseline(tx, instanceId, {
        id: backtestRun.id,
        totalTrades: backtestRun.totalTrades,
        winRate: backtestRun.winRate,
        profitFactor: backtestRun.profitFactor,
        maxDrawdownPct: backtestRun.maxDrawdownPct,
        sharpeRatio: backtestRun.sharpeRatio,
        initialDeposit: backtestRun.initialDeposit,
        totalNetProfit: backtestRun.totalNetProfit,
        period: backtestRun.period,
      });
    });

    // 9a. Post-commit: mark TerminalDeployment as LINKED (if applicable)
    await prisma.terminalDeployment.updateMany({
      where: { instanceId },
      data: { baselineStatus: "LINKED" },
    });

    // 9. Post-commit: bind identity (deterministic hashes, same as export flow)
    const bindResult = await bindIdentityToVersion(result.strategyVersionId);
    if (!bindResult.ok) {
      log.warn(
        { strategyVersionId: result.strategyVersionId, code: bindResult.code },
        "Identity binding failed for external link (non-critical)"
      );
    }

    // 10. Audit
    const auditCtx = getAuditContext(request);
    await logAuditEvent({
      userId: session.user.id,
      eventType: "live.baseline_linked",
      resourceType: "live_instance",
      resourceId: instanceId,
      metadata: {
        backtestRunId,
        strategyId: result.strategyId,
        strategyVersionId: result.strategyVersionId,
        baselineId: result.baselineId,
        backtestEaName: backtestRun.eaName,
        backtestSymbol: backtestRun.symbol,
        backtestTrades: backtestRun.totalTrades,
        backtestWinRate: backtestRun.winRate,
        instanceEaName: instance.eaName,
        linkType: "canonical",
      },
      ...auditCtx,
    });

    log.info(
      {
        instanceId,
        backtestRunId,
        strategyId: result.strategyId,
        strategyVersionId: result.strategyVersionId,
        userId: session.user.id,
      },
      "External instance linked to canonical baseline chain"
    );

    return NextResponse.json(
      {
        linked: true,
        instanceId,
        backtestRunId,
        strategyId: result.strategyId,
        baseline: {
          winRate: backtestRun.winRate,
          profitFactor: backtestRun.profitFactor,
          totalTrades: backtestRun.totalTrades,
          healthScore: backtestRun.healthScore,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    log.error({ error }, "Failed to link baseline");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
