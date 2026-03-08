/**
 * Server-side data loader for the Command Center dashboard.
 *
 * Single Prisma query fetches all LiveEAInstances with their latest
 * HealthSnapshot, avoiding N+1 client-side health API calls.
 *
 * Semantic layers:
 *   - Each row in `instances` is Layer 1 (instance truth).
 *   - `portfolioSummary` is Layer 3 (portfolio operational summary).
 *   - Layer 2 (strategy aggregate) is not produced here — it requires
 *     grouping by strategy identity, which the dashboard doesn't need yet.
 */

import { prisma } from "@/lib/prisma";
import {
  resolveInstanceMonitoringStatus,
  resolveDeploymentGovernance,
  buildPortfolioSummary,
  type InstanceMonitoringStatus,
  type PortfolioOperationalSummary,
  type GovernanceState,
  type GovernanceAction,
} from "@/lib/semantic-layers";

// ── Types ────────────────────────────────────────────────

/**
 * Instance-level truth for the command center grid.
 * Each item represents ONE live deployment — not a strategy aggregate.
 */
export interface CommandCenterInstance {
  id: string;
  eaName: string;
  symbol: string | null;

  // Connection
  status: "ONLINE" | "OFFLINE" | "ERROR";
  lastHeartbeat: string | null; // ISO string

  // Account (for insights compatibility)
  totalProfit: number;
  totalTrades: number;

  // Governance
  lifecycleState: string;
  lifecyclePhase: string;

  // Instance monitoring status (Layer 1 — single deployment truth)
  monitoringStatus: InstanceMonitoringStatus;

  // Data sufficiency
  hasHealthData: boolean; // true if at least one HealthSnapshot exists

  // Health (from latest HealthSnapshot, nullable if no snapshot yet)
  healthScore: number | null; // 0–100
  healthStatus: string | null; // HEALTHY | WARNING | DEGRADED | INSUFFICIENT_DATA
  driftDetected: boolean;
  primaryDriver: string | null;
  scoreTrend: string | null; // improving | stable | declining

  // Key metrics (from HealthSnapshot)
  liveWinRate: number | null;
  liveMaxDrawdownPct: number | null;
  expectancy: number | null;

  // Governance (derived — control-layer verdict)
  governanceState: GovernanceState;
  governanceAction: GovernanceAction;
  governanceSummary: string;
  governancePrimaryReason: string | null;
}

export interface CommandCenterData {
  /** Instance-level rows (Layer 1 — each is one deployment's truth). */
  instances: CommandCenterInstance[];

  /** Portfolio operational summary (Layer 3 — operational, not validation). */
  portfolioSummary: PortfolioOperationalSummary;
}

// ── Loader ───────────────────────────────────────────────

export async function loadCommandCenterData(userId: string): Promise<CommandCenterData> {
  const dbInstances = await prisma.liveEAInstance.findMany({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      eaName: true,
      symbol: true,
      status: true,
      lastHeartbeat: true,
      totalProfit: true,
      totalTrades: true,
      lifecycleState: true,
      lifecyclePhase: true,
      operatorHold: true,
      monitoringSuppressedUntil: true,
      healthSnapshots: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          overallScore: true,
          driftDetected: true,
          primaryDriver: true,
          scoreTrend: true,
          liveWinRate: true,
          liveMaxDrawdownPct: true,
          expectancy: true,
          baselineReturnPct: true,
        },
      },
    },
  });

  const instances: CommandCenterInstance[] = dbInstances.map((inst) => {
    const snap = inst.healthSnapshots[0] ?? null;
    const healthStatus = snap?.status ?? null;
    const monitoringStatus = resolveInstanceMonitoringStatus(inst.lifecycleState, healthStatus);
    const hasHealthData = snap !== null;
    const hasBaseline = snap?.baselineReturnPct != null;

    // Derive governance verdict for card display
    const governance = resolveDeploymentGovernance({
      lifecycleState: inst.lifecycleState,
      lifecyclePhase: inst.lifecyclePhase,
      operatorHold: inst.operatorHold,
      connectionStatus: inst.status as "ONLINE" | "OFFLINE" | "ERROR",
      lastHeartbeat: inst.lastHeartbeat?.toISOString() ?? null,
      monitoringSuppressedUntil: inst.monitoringSuppressedUntil?.toISOString() ?? null,
      hasHealthData,
      healthStatus,
      driftDetected: snap?.driftDetected ?? false,
      hasBaseline,
      hasOpenIncident: false, // Not fetched at dashboard level — governance still useful without it
      hasEscalatedIncident: false,
      versionCurrency: "UNKNOWN",
      now: new Date(),
    });

    return {
      id: inst.id,
      eaName: inst.eaName,
      symbol: inst.symbol,
      status: inst.status as "ONLINE" | "OFFLINE" | "ERROR",
      lastHeartbeat: inst.lastHeartbeat?.toISOString() ?? null,
      totalProfit: inst.totalProfit,
      totalTrades: inst.totalTrades,
      lifecycleState: inst.lifecycleState,
      lifecyclePhase: inst.lifecyclePhase,
      monitoringStatus,
      hasHealthData,
      healthScore: snap ? Math.round(snap.overallScore * 100) : null,
      healthStatus,
      driftDetected: snap?.driftDetected ?? false,
      primaryDriver: snap?.primaryDriver ?? null,
      scoreTrend: snap?.scoreTrend ?? null,
      liveWinRate: snap?.liveWinRate ?? null,
      liveMaxDrawdownPct: snap?.liveMaxDrawdownPct ?? null,
      expectancy: snap?.expectancy ?? null,
      governanceState: governance.state,
      governanceAction: governance.action,
      governanceSummary: governance.summaryLine,
      governancePrimaryReason: governance.reasons[0] ?? null,
    };
  });

  // Build portfolio operational summary (Layer 3)
  const portfolioSummary = buildPortfolioSummary(
    instances.map((s) => ({
      monitoringStatus: s.monitoringStatus,
      connectionStatus: s.status,
      hasHealthData: s.hasHealthData,
      driftDetected: s.driftDetected,
      healthScore: s.healthScore,
    }))
  );

  return {
    instances,
    portfolioSummary,
  };
}
