import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedTier } from "@/lib/plan-limits";
import { ErrorCode, apiError } from "@/lib/error-codes";
import { extractBaselineMetrics, estimateBacktestDuration } from "@/lib/strategy-health";

type Props = {
  params: Promise<{ id: string }>;
};

const baselineSchema = z.object({
  backtestResultId: z.string(),
  strategyVersionId: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
});

// POST /api/projects/[id]/strategy-identity/baseline — set backtest baseline
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      apiError(
        ErrorCode.PLAN_REQUIRED,
        "Backtest baseline requires Pro or Elite",
        "Upgrade to Pro to set backtest baselines and unlock strategy health monitoring."
      ),
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = baselineSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const { backtestResultId, strategyVersionId: requestedVersionId, durationDays } = validation.data;

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Load backtest result
  const backtestResult = await prisma.backtestResult.findFirst({
    where: { id: backtestResultId, projectId: id, userId: session.user.id },
  });

  if (!backtestResult) {
    return NextResponse.json({ error: "Backtest result not found" }, { status: 404 });
  }

  // Find strategy version (use requested or find latest for this project)
  let strategyVersionId = requestedVersionId;
  if (!strategyVersionId) {
    const identity = await prisma.strategyIdentity.findUnique({
      where: { projectId: id },
      select: { currentVersionId: true },
    });
    strategyVersionId = identity?.currentVersionId ?? undefined;
  }

  if (!strategyVersionId) {
    return NextResponse.json(
      { error: "No strategy version found. Export the project first." },
      { status: 400 }
    );
  }

  // Extract metrics from backtest result JSON
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = backtestResult.results as any;
  const estimatedDuration = durationDays ?? estimateBacktestDuration(results);
  const { metrics, raw } = extractBaselineMetrics(results, estimatedDuration);

  // Upsert baseline (one per strategy version)
  const baseline = await prisma.backtestBaseline.upsert({
    where: { strategyVersionId },
    create: {
      strategyVersionId,
      backtestResultId,
      totalTrades: raw.totalTrades,
      winRate: raw.winRate,
      profitFactor: raw.profitFactor,
      maxDrawdownPct: raw.maxDrawdownPct,
      avgTradesPerDay: raw.avgTradesPerDay,
      netReturnPct: raw.netReturnPct,
      sharpeRatio: raw.sharpeRatio,
      initialDeposit: raw.initialDeposit,
      backtestDurationDays: raw.backtestDurationDays,
      rawMetrics: results as object,
    },
    update: {
      backtestResultId,
      totalTrades: raw.totalTrades,
      winRate: raw.winRate,
      profitFactor: raw.profitFactor,
      maxDrawdownPct: raw.maxDrawdownPct,
      avgTradesPerDay: raw.avgTradesPerDay,
      netReturnPct: raw.netReturnPct,
      sharpeRatio: raw.sharpeRatio,
      initialDeposit: raw.initialDeposit,
      backtestDurationDays: raw.backtestDurationDays,
      rawMetrics: results as object,
    },
  });

  return NextResponse.json({ baseline, normalizedMetrics: metrics });
}

// GET /api/projects/[id]/strategy-identity/baseline — get current baseline metrics
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getCachedTier(session.user.id);
  if (tier === "FREE") {
    return NextResponse.json(
      apiError(
        ErrorCode.PLAN_REQUIRED,
        "Backtest baseline requires Pro or Elite",
        "Upgrade to Pro to access backtest baselines."
      ),
      { status: 403 }
    );
  }

  const identity = await prisma.strategyIdentity.findUnique({
    where: { projectId: id },
    select: { currentVersionId: true },
  });

  if (!identity?.currentVersionId) {
    return NextResponse.json({ baseline: null });
  }

  const baseline = await prisma.backtestBaseline.findUnique({
    where: { strategyVersionId: identity.currentVersionId },
  });

  return NextResponse.json({ baseline });
}
