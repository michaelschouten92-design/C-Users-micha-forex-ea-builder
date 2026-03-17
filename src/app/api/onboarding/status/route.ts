import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, ErrorCode } from "@/lib/error-codes";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const userId = session.user.id;

  const [backtestCount, recentBacktests, instances, terminalConnections] = await Promise.all([
    prisma.backtestUpload.count({ where: { userId } }),
    prisma.backtestUpload.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        fileName: true,
        createdAt: true,
        runs: {
          take: 1,
          select: {
            id: true,
            eaName: true,
            symbol: true,
            totalTrades: true,
            winRate: true,
            profitFactor: true,
            healthScore: true,
          },
        },
      },
    }),
    prisma.liveEAInstance.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        eaName: true,
        symbol: true,
        exportJobId: true,
        strategyVersionId: true,
        lastHeartbeat: true,
        totalTrades: true,
        lifecycleState: true,
        healthSnapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, driftDetected: true },
        },
        terminalDeployments: {
          select: {
            baselineStatus: true,
            source: true,
            symbol: true,
            magicNumber: true,
            eaName: true,
          },
        },
      },
    }),
    prisma.terminalConnection.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        status: true,
        lastHeartbeat: true,
        broker: true,
        accountNumber: true,
      },
    }),
  ]);

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const monitorConnected = instances.some(
    (i) => i.lastHeartbeat && i.lastHeartbeat > fiveMinutesAgo
  );
  const baselineLinked = instances.some((i) => i.strategyVersionId !== null);
  const hasTrades = instances.some((i) => i.totalTrades > 0);

  // Find first instance eligible for baseline linking:
  // external (no exportJobId), no baseline yet, not in relink state
  const linkable = instances.find(
    (i) =>
      i.exportJobId === null &&
      i.strategyVersionId === null &&
      !i.terminalDeployments.some((d) => d.baselineStatus === "RELINK_REQUIRED")
  );

  // ── Guided onboarding (5-step) ──────────────────────────
  // Step 1: Terminal connected (any heartbeat received)
  const hasTerminal =
    terminalConnections.length > 0 || instances.some((i) => i.lastHeartbeat !== null);

  // Step 2: Strategy discovered (any instance exists with trades)
  const discoveredInstance = instances.find((i) => i.totalTrades > 0);
  const hasDiscoveredStrategy = !!discoveredInstance;

  // Step 3→4: Baseline linked (any instance has strategyVersionId)
  const hasBaselineLinked = instances.some((i) => i.strategyVersionId !== null);

  // Step 4→5: Monitoring activated (any instance in LIVE_MONITORING or beyond)
  const MONITORING_STATES = new Set(["LIVE_MONITORING", "EDGE_AT_RISK", "INVALIDATED"]);
  const monitoringInstance = instances.find((i) => MONITORING_STATES.has(i.lifecycleState));
  const hasMonitoringActive = !!monitoringInstance;

  // Build discovered strategies list for step 3 card
  const discoveredStrategies = instances
    .filter((i) => i.totalTrades > 0)
    .map((i) => ({
      instanceId: i.id,
      eaName: i.eaName,
      symbol: i.symbol,
      lifecycleState: i.lifecycleState,
      healthStatus: i.healthSnapshots[0]?.status ?? null,
      driftDetected: i.healthSnapshots[0]?.driftDetected ?? false,
    }));

  // Terminal info for step 1 feedback
  const activeTerminal = terminalConnections.find(
    (t) => t.status === "ONLINE" && t.lastHeartbeat && t.lastHeartbeat > fiveMinutesAgo
  );

  return NextResponse.json({
    // Legacy fields (ActivationPanel compatibility)
    hasBacktest: backtestCount > 0,
    monitorConnected,
    hasTrades,
    baselineLinked,
    firstLinkable: linkable
      ? {
          instanceId: linkable.id,
          label: [linkable.eaName, linkable.symbol].filter(Boolean).join(" · ") || "Deployment",
        }
      : null,

    // Guided onboarding fields
    guided: {
      currentStep: !hasTerminal
        ? 1
        : !hasDiscoveredStrategy
          ? 2
          : !hasBaselineLinked
            ? 3
            : !hasMonitoringActive
              ? 4
              : 5,
      hasTerminal,
      hasDiscoveredStrategy,
      hasBaselineLinked,
      hasMonitoringActive,
      terminal: activeTerminal
        ? {
            broker: activeTerminal.broker,
            accountNumber: activeTerminal.accountNumber,
          }
        : null,
      discoveredStrategies,
      hasBacktest: backtestCount > 0,
      availableBaselines: recentBacktests
        .filter((b) => b.runs.length > 0 && (b.runs[0].totalTrades ?? 0) >= 30)
        .map((b) => {
          const run = b.runs[0];
          return {
            fileName: b.fileName,
            eaName: run.eaName,
            symbol: run.symbol,
            totalTrades: run.totalTrades,
            winRate: run.winRate,
            profitFactor: run.profitFactor,
            healthScore: run.healthScore,
            createdAt: b.createdAt.toISOString(),
          };
        }),
      monitoringInstance: monitoringInstance
        ? {
            instanceId: monitoringInstance.id,
            eaName: monitoringInstance.eaName,
            symbol: monitoringInstance.symbol,
            healthStatus: monitoringInstance.healthSnapshots[0]?.status ?? null,
            driftDetected: monitoringInstance.healthSnapshots[0]?.driftDetected ?? false,
          }
        : null,
    },
  });
}
