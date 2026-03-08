/**
 * Server-side data loader for the Strategy Detail Page.
 *
 * Single Prisma query fetches the LiveEAInstance with full health snapshot,
 * health history, recent incidents, latest monitoring run, and governance
 * context — no client-side API fan-out.
 */

import { prisma } from "@/lib/prisma";

// ── Types ────────────────────────────────────────────────

export type MonitoringStatus = "HEALTHY" | "AT_RISK" | "INVALIDATED";

export type RecommendationLevel =
  | "NO_ACTION"
  | "AWAIT_DATA"
  | "MONITOR_CLOSELY"
  | "INVESTIGATE"
  | "STOP";

export interface HealthSnapshotDetail {
  status: "HEALTHY" | "WARNING" | "DEGRADED" | "INSUFFICIENT_DATA";
  overallScore: number; // 0–1
  returnScore: number;
  volatilityScore: number;
  drawdownScore: number;
  winRateScore: number;
  tradeFrequencyScore: number;
  liveReturnPct: number;
  liveVolatility: number;
  liveMaxDrawdownPct: number;
  liveWinRate: number;
  liveTradesPerDay: number;
  baselineReturnPct: number | null;
  baselineMaxDDPct: number | null;
  baselineWinRate: number | null;
  baselineTradesPerDay: number | null;
  tradesSampled: number;
  windowDays: number;
  confidenceLower: number;
  confidenceUpper: number;
  driftDetected: boolean;
  driftSeverity: number;
  driftCusumValue: number;
  primaryDriver: string | null;
  scoreTrend: string | null;
  expectancy: number | null;
  createdAt: string; // ISO
}

export interface HealthHistoryPoint {
  overallScore: number;
  status: string;
  createdAt: string;
}

export interface IncidentSummary {
  id: string;
  status: string; // OPEN | ACKNOWLEDGED | ESCALATED | CLOSED
  severity: string; // AT_RISK | INVALIDATED
  reasonCodes: string[];
  openedAt: string;
  closedAt: string | null;
  closeReason: string | null;
  ackDeadlineAt: string;
  escalationCount: number;
}

export interface MonitoringRunSummary {
  verdict: string | null;
  reasons: string[];
  completedAt: string | null;
  configVersion: string | null;
}

export interface StrategyDetailData {
  id: string;
  eaName: string;
  symbol: string | null;
  timeframe: string | null;
  broker: string | null;

  // Connection
  status: "ONLINE" | "OFFLINE" | "ERROR";
  lastHeartbeat: string | null;

  // Governance
  lifecycleState: string;
  lifecyclePhase: string;
  operatorHold: string;
  phaseEnteredAt: string;
  provenAt: string | null;
  retiredAt: string | null;
  retiredReason: string | null;
  peakScore: number;
  peakScoreAt: string | null;

  // Monitoring (derived)
  monitoringStatus: MonitoringStatus;
  hasHealthData: boolean;

  // Full health snapshot (null if no snapshot)
  health: HealthSnapshotDetail | null;

  // Health history (last 20 for sparkline)
  healthHistory: HealthHistoryPoint[];

  // Recent incidents (max 5)
  incidents: IncidentSummary[];

  // Latest monitoring run
  latestRun: MonitoringRunSummary | null;

  // System recommendation (derived)
  recommendation: RecommendationLevel;
  recommendationReason: string;
}

// ── Monitoring status resolution ─────────────────────────

function resolveMonitoringStatus(
  lifecycleState: string,
  healthStatus: string | null
): MonitoringStatus {
  if (lifecycleState === "INVALIDATED") return "INVALIDATED";
  if (lifecycleState === "EDGE_AT_RISK") return "AT_RISK";
  if (healthStatus === "DEGRADED" || healthStatus === "WARNING") return "AT_RISK";
  return "HEALTHY";
}

// ── Recommendation derivation ────────────────────────────

function deriveRecommendation(
  lifecycleState: string,
  hasHealthData: boolean,
  health: HealthSnapshotDetail | null,
  incidents: IncidentSummary[]
): { level: RecommendationLevel; reason: string } {
  // 1. INVALIDATED lifecycle → Stop
  if (lifecycleState === "INVALIDATED") {
    return {
      level: "STOP",
      reason: "Strategy has been invalidated. Remove from live trading.",
    };
  }

  // 2. No health data / insufficient data → Await
  if (!hasHealthData) {
    return {
      level: "AWAIT_DATA",
      reason:
        "Health assessment has not started yet. Waiting for trade activity and initial evaluation.",
    };
  }
  if (health?.status === "INSUFFICIENT_DATA") {
    const tradesNeeded = Math.max(0, 10 - (health.tradesSampled ?? 0));
    const daysNeeded = Math.max(0, 7 - (health.windowDays ?? 0));
    const parts: string[] = [];
    if (tradesNeeded > 0) parts.push(`${tradesNeeded} more trades`);
    if (daysNeeded > 0) parts.push(`${daysNeeded} more days`);
    return {
      level: "AWAIT_DATA",
      reason: `Health assessment requires ${parts.join(" and ") || "more data"}. Collecting samples.`,
    };
  }

  // 3. EDGE_AT_RISK lifecycle → Investigate
  if (lifecycleState === "EDGE_AT_RISK") {
    return {
      level: "INVESTIGATE",
      reason:
        "Strategy edge is at risk. Governance system has flagged degraded performance. Review baseline deviation.",
    };
  }

  // 4. Drift detected with meaningful driver → Investigate
  if (health?.driftDetected) {
    const driver = health.primaryDriver
      ? health.primaryDriver
          .replace(/([A-Z])/g, " $1")
          .trim()
          .toLowerCase()
      : "performance";
    return {
      level: "INVESTIGATE",
      reason: `Edge drift detected in ${driver}. Strategy expectancy has persistently declined from baseline.`,
    };
  }

  // 5. Open/escalated incident → Investigate
  const openIncident = incidents.find((i) => i.status === "OPEN" || i.status === "ESCALATED");
  if (openIncident) {
    const severity = openIncident.severity === "INVALIDATED" ? "critical" : "monitoring";
    return {
      level: "INVESTIGATE",
      reason: `Active ${severity} incident requires attention. ${openIncident.status === "ESCALATED" ? "Escalated — ACK deadline passed." : "Awaiting acknowledgement."}`,
    };
  }

  // 6. Warning / declining trend → Monitor Closely
  if (health?.status === "WARNING") {
    const driver = health.primaryDriver ?? "overall performance";
    return {
      level: "MONITOR_CLOSELY",
      reason: `Health score in warning range. Primary driver: ${driver}. Monitor for continued degradation.`,
    };
  }
  if (health?.scoreTrend === "declining") {
    return {
      level: "MONITOR_CLOSELY",
      reason:
        "Health score is trending downward. No immediate action required but continued decline may trigger intervention.",
    };
  }

  // 7. Otherwise → No action
  const score = health ? Math.round(health.overallScore * 100) : null;
  const trend = health?.scoreTrend ?? "stable";
  return {
    level: "NO_ACTION",
    reason: `Strategy is healthy and performing within baseline.${score !== null ? ` Score ${trend} at ${score}%.` : ""} No drift detected.`,
  };
}

// ── Loader ───────────────────────────────────────────────

export async function loadStrategyDetail(
  instanceId: string,
  userId: string
): Promise<StrategyDetailData | null> {
  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId, deletedAt: null },
    select: {
      id: true,
      eaName: true,
      symbol: true,
      timeframe: true,
      broker: true,
      status: true,
      lastHeartbeat: true,
      lifecycleState: true,
      lifecyclePhase: true,
      operatorHold: true,
      phaseEnteredAt: true,
      provenAt: true,
      retiredAt: true,
      retiredReason: true,
      peakScore: true,
      peakScoreAt: true,
      strategyVersionId: true,
      healthSnapshots: {
        take: 20,
        orderBy: { createdAt: "desc" as const },
        select: {
          status: true,
          overallScore: true,
          returnScore: true,
          volatilityScore: true,
          drawdownScore: true,
          winRateScore: true,
          tradeFrequencyScore: true,
          liveReturnPct: true,
          liveVolatility: true,
          liveMaxDrawdownPct: true,
          liveWinRate: true,
          liveTradesPerDay: true,
          baselineReturnPct: true,
          baselineMaxDDPct: true,
          baselineWinRate: true,
          baselineTradesPerDay: true,
          tradesSampled: true,
          windowDays: true,
          confidenceLower: true,
          confidenceUpper: true,
          driftDetected: true,
          driftSeverity: true,
          driftCusumValue: true,
          primaryDriver: true,
          scoreTrend: true,
          expectancy: true,
          createdAt: true,
        },
      },
    },
  });

  if (!instance) return null;

  // Instance-first: query incidents and monitoring runs scoped to this instance.
  // Falls back to strategyId for pre-migration data that lacks instanceId.
  let strategyId: string | null = null;
  if (instance.strategyVersionId) {
    const sv = await prisma.strategyVersion.findUnique({
      where: { id: instance.strategyVersionId },
      select: {
        strategyIdentity: { select: { strategyId: true } },
      },
    });
    strategyId = sv?.strategyIdentity?.strategyId ?? null;
  }

  // Fetch incidents and latest monitoring run scoped to this instance
  const [incidents, latestRun] = await Promise.all([
    prisma.incident.findMany({
      where: {
        OR: [
          { instanceId },
          // Fallback: pre-migration incidents have instanceId=null but strategyId set
          ...(strategyId ? [{ strategyId, instanceId: null }] : []),
        ],
      },
      orderBy: { openedAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        severity: true,
        reasonCodes: true,
        openedAt: true,
        closedAt: true,
        closeReason: true,
        ackDeadlineAt: true,
        escalationCount: true,
      },
    }),
    prisma.monitoringRun.findFirst({
      where: {
        OR: [
          { instanceId, status: "COMPLETED" },
          // Fallback: pre-migration runs have instanceId=null
          ...(strategyId ? [{ strategyId, instanceId: null, status: "COMPLETED" }] : []),
        ],
      },
      orderBy: { completedAt: "desc" },
      select: {
        verdict: true,
        reasons: true,
        completedAt: true,
        configVersion: true,
      },
    }),
  ]);

  const latestSnap = instance.healthSnapshots[0] ?? null;
  const hasHealthData = latestSnap !== null;

  const health: HealthSnapshotDetail | null = latestSnap
    ? {
        status: latestSnap.status as HealthSnapshotDetail["status"],
        overallScore: latestSnap.overallScore,
        returnScore: latestSnap.returnScore,
        volatilityScore: latestSnap.volatilityScore,
        drawdownScore: latestSnap.drawdownScore,
        winRateScore: latestSnap.winRateScore,
        tradeFrequencyScore: latestSnap.tradeFrequencyScore,
        liveReturnPct: latestSnap.liveReturnPct,
        liveVolatility: latestSnap.liveVolatility,
        liveMaxDrawdownPct: latestSnap.liveMaxDrawdownPct,
        liveWinRate: latestSnap.liveWinRate,
        liveTradesPerDay: latestSnap.liveTradesPerDay,
        baselineReturnPct: latestSnap.baselineReturnPct,
        baselineMaxDDPct: latestSnap.baselineMaxDDPct,
        baselineWinRate: latestSnap.baselineWinRate,
        baselineTradesPerDay: latestSnap.baselineTradesPerDay,
        tradesSampled: latestSnap.tradesSampled,
        windowDays: latestSnap.windowDays,
        confidenceLower: latestSnap.confidenceLower,
        confidenceUpper: latestSnap.confidenceUpper,
        driftDetected: latestSnap.driftDetected,
        driftSeverity: latestSnap.driftSeverity,
        driftCusumValue: latestSnap.driftCusumValue,
        primaryDriver: latestSnap.primaryDriver,
        scoreTrend: latestSnap.scoreTrend,
        expectancy: latestSnap.expectancy,
        createdAt: latestSnap.createdAt.toISOString(),
      }
    : null;

  const healthHistory: HealthHistoryPoint[] = instance.healthSnapshots.map((s) => ({
    overallScore: s.overallScore,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
  }));

  const monitoringStatus = resolveMonitoringStatus(
    instance.lifecycleState,
    latestSnap?.status ?? null
  );

  const mappedIncidents: IncidentSummary[] = incidents.map((i) => ({
    id: i.id,
    status: i.status,
    severity: i.severity,
    reasonCodes: (i.reasonCodes as string[]) ?? [],
    openedAt: i.openedAt.toISOString(),
    closedAt: i.closedAt?.toISOString() ?? null,
    closeReason: i.closeReason,
    ackDeadlineAt: i.ackDeadlineAt.toISOString(),
    escalationCount: i.escalationCount,
  }));

  const mappedRun: MonitoringRunSummary | null = latestRun
    ? {
        verdict: latestRun.verdict,
        reasons: (latestRun.reasons as string[]) ?? [],
        completedAt: latestRun.completedAt?.toISOString() ?? null,
        configVersion: latestRun.configVersion,
      }
    : null;

  const { level, reason } = deriveRecommendation(
    instance.lifecycleState,
    hasHealthData,
    health,
    mappedIncidents
  );

  return {
    id: instance.id,
    eaName: instance.eaName,
    symbol: instance.symbol,
    timeframe: instance.timeframe,
    broker: instance.broker,
    status: instance.status as "ONLINE" | "OFFLINE" | "ERROR",
    lastHeartbeat: instance.lastHeartbeat?.toISOString() ?? null,
    lifecycleState: instance.lifecycleState,
    lifecyclePhase: instance.lifecyclePhase,
    operatorHold: instance.operatorHold,
    phaseEnteredAt: instance.phaseEnteredAt.toISOString(),
    provenAt: instance.provenAt?.toISOString() ?? null,
    retiredAt: instance.retiredAt?.toISOString() ?? null,
    retiredReason: instance.retiredReason,
    peakScore: instance.peakScore,
    peakScoreAt: instance.peakScoreAt?.toISOString() ?? null,
    monitoringStatus,
    hasHealthData,
    health,
    healthHistory,
    incidents: mappedIncidents,
    latestRun: mappedRun,
    recommendation: level,
    recommendationReason: reason,
  };
}
