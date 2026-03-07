/**
 * Server-side data loader for the Command Center dashboard.
 *
 * Single Prisma query fetches all LiveEAInstances with their latest
 * HealthSnapshot, avoiding N+1 client-side health API calls.
 */

import { prisma } from "@/lib/prisma";

// ── Types ────────────────────────────────────────────────

export type MonitoringStatus = "HEALTHY" | "AT_RISK" | "INVALIDATED";

export interface CommandCenterStrategy {
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

  // Monitoring (derived)
  monitoringStatus: MonitoringStatus;

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
}

export interface CommandCenterData {
  strategies: CommandCenterStrategy[];
  summary: {
    total: number;
    healthy: number;
    atRisk: number;
    invalidated: number;
    online: number;
    driftCount: number;
    avgHealthScore: number | null;
  };
}

// ── Monitoring status resolution ─────────────────────────

/**
 * Derive the primary monitoring status from governance lifecycle state
 * and health snapshot status. Governance state takes precedence.
 */
function resolveMonitoringStatus(
  lifecycleState: string,
  healthStatus: string | null
): MonitoringStatus {
  if (lifecycleState === "INVALIDATED") return "INVALIDATED";
  if (lifecycleState === "EDGE_AT_RISK") return "AT_RISK";
  if (healthStatus === "DEGRADED" || healthStatus === "WARNING") return "AT_RISK";
  return "HEALTHY";
}

// ── Loader ───────────────────────────────────────────────

export async function loadCommandCenterData(userId: string): Promise<CommandCenterData> {
  const instances = await prisma.liveEAInstance.findMany({
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
        },
      },
    },
  });

  const strategies: CommandCenterStrategy[] = instances.map((inst) => {
    const snap = inst.healthSnapshots[0] ?? null;
    const healthStatus = snap?.status ?? null;
    const monitoringStatus = resolveMonitoringStatus(inst.lifecycleState, healthStatus);

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
      hasHealthData: snap !== null,
      healthScore: snap ? Math.round(snap.overallScore * 100) : null,
      healthStatus,
      driftDetected: snap?.driftDetected ?? false,
      primaryDriver: snap?.primaryDriver ?? null,
      scoreTrend: snap?.scoreTrend ?? null,
      liveWinRate: snap?.liveWinRate ?? null,
      liveMaxDrawdownPct: snap?.liveMaxDrawdownPct ?? null,
      expectancy: snap?.expectancy ?? null,
    };
  });

  // Compute summary
  let healthScoreSum = 0;
  let healthScoreCount = 0;
  let healthy = 0;
  let atRisk = 0;
  let invalidated = 0;
  let online = 0;
  let driftCount = 0;

  for (const s of strategies) {
    if (s.monitoringStatus === "HEALTHY" && s.hasHealthData) healthy++;
    else if (s.monitoringStatus === "AT_RISK") atRisk++;
    else if (s.monitoringStatus === "INVALIDATED") invalidated++;

    if (s.status === "ONLINE") online++;
    if (s.driftDetected) driftCount++;

    if (s.healthScore !== null) {
      healthScoreSum += s.healthScore;
      healthScoreCount++;
    }
  }

  return {
    strategies,
    summary: {
      total: strategies.length,
      healthy,
      atRisk,
      invalidated,
      online,
      driftCount,
      avgHealthScore: healthScoreCount > 0 ? Math.round(healthScoreSum / healthScoreCount) : null,
    },
  };
}
