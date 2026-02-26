import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeLadderLevel,
  mergeThresholds,
  LADDER_META,
  type Thresholds,
} from "@/lib/proof/ladder";

/**
 * GET /api/live/:instanceId/proof-status
 * Returns proof/ladder status for the strategy identity linked to this live instance.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { instanceId } = await params;

  // Find the instance and navigate: LiveEAInstance → StrategyVersion → StrategyIdentity → VerifiedStrategyPage
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id },
    select: {
      id: true,
      createdAt: true,
      totalTrades: true,
      strategyVersion: {
        select: {
          strategyIdentity: {
            select: {
              strategyId: true,
              projectId: true,
              publicPage: {
                select: {
                  slug: true,
                  isPublic: true,
                  ladderLevel: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const identity = instance?.strategyVersion?.strategyIdentity;
  if (!identity?.publicPage) {
    return NextResponse.json(null);
  }

  const page = identity.publicPage;

  // Gather ladder computation inputs
  // BacktestRun connects via BacktestUpload.projectId → StrategyIdentity.projectId
  const [latestBacktest, trackRecordState, healthSnapshot, thresholdOverrides] = await Promise.all([
    prisma.backtestRun.findFirst({
      where: {
        upload: { projectId: identity.projectId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        healthScore: true,
        validationResult: true,
        totalTrades: true,
      },
    }),
    prisma.trackRecordState.findUnique({
      where: { instanceId },
      select: { lastSeqNo: true, lastEventHash: true, totalTrades: true, maxDrawdownPct: true },
    }),
    prisma.healthSnapshot.findFirst({
      where: { instanceId },
      orderBy: { createdAt: "desc" },
      select: { overallScore: true },
    }),
    prisma.proofThreshold.findMany({ select: { key: true, value: true } }),
  ]);

  const thresholds = mergeThresholds(thresholdOverrides);

  // Parse Monte Carlo survival
  let monteCarloSurvival: number | null = null;
  if (latestBacktest?.validationResult && typeof latestBacktest.validationResult === "object") {
    const vr = latestBacktest.validationResult as Record<string, unknown>;
    if (typeof vr.survivalRate === "number") {
      monteCarloSurvival = vr.survivalRate;
    }
  }

  // Chain integrity check: verify no event has a broken prevHash link
  let chainIntegrity = false;
  if (trackRecordState && trackRecordState.lastSeqNo > 0) {
    // Check if first non-genesis event has prevHash = genesis hash (valid start)
    // and if we have no gaps — simplified: check count matches lastSeqNo
    const eventCount = await prisma.trackRecordEvent.count({
      where: { instanceId },
    });
    chainIntegrity = eventCount === trackRecordState.lastSeqNo;
  }

  const liveTrades = trackRecordState?.totalTrades ?? 0;
  const liveDays = Math.floor((Date.now() - instance!.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Score collapse: check if health score ever dropped below stability threshold
  let scoreCollapsed = false;
  const stabilityThreshold = thresholds.PROVEN_MIN_SCORE_STABILITY / 100; // overallScore is 0–1
  const collapsedSnapshot = await prisma.healthSnapshot.findFirst({
    where: {
      instanceId,
      overallScore: { lt: stabilityThreshold },
    },
    select: { id: true },
  });
  scoreCollapsed = collapsedSnapshot !== null;

  const ladderInput = {
    hasBacktest: latestBacktest !== null,
    backtestHealthScore: latestBacktest?.healthScore ?? null,
    monteCarloSurvival,
    backtestTrades: latestBacktest?.totalTrades ?? 0,
    hasLiveChain: trackRecordState !== null,
    liveTrades,
    chainIntegrity,
    liveDays,
    liveHealthScore: healthSnapshot?.overallScore ?? null,
    liveMaxDrawdownPct: trackRecordState?.maxDrawdownPct ?? null,
    scoreCollapsed,
  };

  const level = computeLadderLevel(ladderInput, thresholds);
  const meta = LADDER_META[level];

  // Build requirements for next level
  const requirements = buildRequirements(ladderInput, thresholds);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://algo-studio.com";

  return NextResponse.json({
    strategyId: identity.strategyId,
    slug: page.slug,
    isPublic: page.isPublic,
    ladderLevel: level,
    ladderMeta: { label: meta.label, color: meta.color, description: meta.description },
    healthScore: latestBacktest?.healthScore ?? null,
    liveTrades,
    liveDays,
    chainIntegrity,
    requirements,
    proofUrl: `${appUrl}/proof/${identity.strategyId}`,
  });
}

function buildRequirements(
  input: {
    backtestHealthScore: number | null;
    monteCarloSurvival: number | null;
    backtestTrades: number;
    hasLiveChain: boolean;
    liveTrades: number;
    chainIntegrity: boolean;
    liveDays: number | null;
    liveMaxDrawdownPct: number | null;
  },
  t: Thresholds
) {
  return [
    {
      level: "VALIDATED",
      label: "Health Score",
      met: (input.backtestHealthScore ?? 0) >= t.VALIDATED_MIN_SCORE,
      description: `Backtest health score >= ${t.VALIDATED_MIN_SCORE} (current: ${input.backtestHealthScore ?? "N/A"})`,
    },
    {
      level: "VALIDATED",
      label: "Monte Carlo",
      met: (input.monteCarloSurvival ?? 0) >= t.VALIDATED_MIN_SURVIVAL,
      description: `Monte Carlo survival >= ${(t.VALIDATED_MIN_SURVIVAL * 100).toFixed(0)}% (current: ${input.monteCarloSurvival !== null ? (input.monteCarloSurvival * 100).toFixed(0) + "%" : "N/A"})`,
    },
    {
      level: "VALIDATED",
      label: "Backtest Trades",
      met: input.backtestTrades >= t.MIN_TRADES_VALIDATION,
      description: `Backtest trades >= ${t.MIN_TRADES_VALIDATION} (current: ${input.backtestTrades})`,
    },
    {
      level: "VERIFIED",
      label: "Live Chain",
      met: input.hasLiveChain && input.chainIntegrity,
      description: `Live trade chain active & valid (${input.hasLiveChain ? (input.chainIntegrity ? "valid" : "broken") : "inactive"})`,
    },
    {
      level: "VERIFIED",
      label: "Live Trades",
      met: input.liveTrades >= t.MIN_LIVE_TRADES_VERIFIED,
      description: `Live trades >= ${t.MIN_LIVE_TRADES_VERIFIED} (current: ${input.liveTrades})`,
    },
    {
      level: "PROVEN",
      label: "Live Duration",
      met: (input.liveDays ?? 0) >= t.MIN_LIVE_DAYS_PROVEN,
      description: `Live for >= ${t.MIN_LIVE_DAYS_PROVEN} days (current: ${input.liveDays ?? 0})`,
    },
    {
      level: "PROVEN",
      label: "Max Drawdown",
      met:
        input.liveMaxDrawdownPct === null || input.liveMaxDrawdownPct <= t.PROVEN_MAX_DRAWDOWN_PCT,
      description: `Max drawdown <= ${t.PROVEN_MAX_DRAWDOWN_PCT}% (current: ${input.liveMaxDrawdownPct?.toFixed(1) ?? "N/A"})`,
    },
  ];
}
