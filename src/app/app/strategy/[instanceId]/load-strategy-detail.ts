/**
 * Server-side data loader for the Instance Detail Page.
 *
 * This page shows Layer 1 (instance truth) for a single deployment.
 * All data is scoped to one LiveEAInstance — not a strategy aggregate.
 *
 * Single Prisma query fetches the LiveEAInstance with full health snapshot,
 * health history, recent incidents, latest monitoring run, and governance
 * context — no client-side API fan-out.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { computeEdgeScore, type EdgeScoreResult } from "@/domain/monitoring/edge-score";
import { computeEdgeProjection, type EdgeProjection } from "@/domain/monitoring/edge-projection";
import {
  resolveInstanceMonitoringStatus,
  resolveDeploymentCurrency,
  resolveDeploymentGovernance,
  buildStrategyLineage,
  type InstanceMonitoringStatus,
  type StrategyAggregateHealth,
  type DeploymentVersionCurrency,
  type StrategyLineage,
  type DeploymentGovernance,
} from "@/lib/semantic-layers";
import { buildStrategyAggregate } from "@/lib/semantic-layers/strategy-aggregate";

// ── Types ────────────────────────────────────────────────

/**
 * Re-export for backward compatibility.
 * Consumers should prefer `InstanceMonitoringStatus` from semantic-layers.
 */
export type MonitoringStatus = InstanceMonitoringStatus;

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
  expectancy?: number | null;
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

/**
 * Instance-level detail data (Layer 1 — single deployment truth).
 *
 * Named "StrategyDetailData" for backward compat. Semantically, this
 * represents a single LiveEAInstance with its health, incidents, and governance.
 * It is NOT a strategy aggregate — it is one deployment's authoritative state.
 */
export interface StrategyDetailData {
  /** LiveEAInstance ID — this is an instance, not a strategy. */
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
  isAutoDiscovered: boolean;
  lifecyclePhase: string;
  operatorHold: string;
  phaseEnteredAt: string;
  provenAt: string | null;
  retiredAt: string | null;
  retiredReason: string | null;
  peakScore: number;
  peakScoreAt: string | null;

  // Instance monitoring status (Layer 1 — single deployment truth)
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

  // System recommendation (derived — legacy, retained for backward compat)
  recommendation: RecommendationLevel;
  recommendationReason: string;

  /**
   * Governance verdict — the control layer's conclusion about this deployment.
   * Derived from monitoring truth, lifecycle, incidents, heartbeat authority,
   * and lineage context. This is what the control layer concludes should happen,
   * not just what is happening.
   */
  governance: DeploymentGovernance;

  /**
   * Layer 2: Strategy aggregate across sibling deployments sharing the same
   * strategy identity. Null when the instance has no linked strategy version.
   * This is a secondary, derived read-model — NOT a replacement for the
   * instance-level monitoring verdict shown above.
   */
  strategyAggregate: StrategyAggregateHealth | null;

  // Version lineage (secondary — does not affect monitoring truth)

  /** This deployment's version number. Null if not linked to a strategy. */
  versionNo: number | null;

  /** Whether this deployment is on the current version of its strategy. */
  versionCurrency: DeploymentVersionCurrency;

  /**
   * Full lineage read-model for the strategy identity.
   * Null when the instance has no linked strategy version.
   * Includes all versions, deployment counts per version, and current/outdated splits.
   */
  strategyLineage: StrategyLineage | null;

  /** Edge Score — live performance vs backtest baseline. Null when no baseline or track record. */
  edgeScore: EdgeScoreResult | null;
  /** Edge decay projection — predicts future performance from health trends. Null when insufficient data. */
  edgeProjection: EdgeProjection | null;
}

// ── Monitoring status resolution (delegates to shared semantic layer) ──

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
      reason: "Deployment has been invalidated. Remove from live trading.",
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
        "Deployment edge is at risk. Control layer has flagged degraded performance. Review baseline deviation.",
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
      reason: `Edge drift detected in ${driver}. Deployment expectancy has persistently declined from baseline.`,
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
    reason: `Deployment is healthy and performing within baseline.${score !== null ? ` Score ${trend} at ${score}%.` : ""} No drift detected.`,
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
      monitoringSuppressedUntil: true,
      strategyVersionId: true,
      strategyVersion: {
        select: { strategyIdentity: { select: { strategyId: true } } },
      },
      balance: true,
      terminalDeployments: {
        where: { ignoredAt: null },
        select: { symbol: true, magicNumber: true, materialFingerprint: true },
      },
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
  const strategyId =
    (instance as Record<string, unknown>).strategyVersion != null
      ? ((
          (instance as Record<string, unknown>).strategyVersion as {
            strategyIdentity?: { strategyId?: string };
          }
        )?.strategyIdentity?.strategyId ?? null)
      : null;

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
    expectancy: s.expectancy ?? null,
  }));

  const monitoringStatus = resolveInstanceMonitoringStatus(
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

  // ── Layer 2 + Lineage: Strategy aggregate and version lineage ──
  // Only available when this instance is linked to a strategy version.
  let strategyAggregate: StrategyAggregateHealth | null = null;
  let versionNo: number | null = null;
  let versionCurrency: DeploymentVersionCurrency = "UNLINKED";
  let strategyLineage: StrategyLineage | null = null;

  if (strategyId) {
    // Fetch strategy identity, all versions, and all sibling deployments in parallel
    const [identityData, siblingInstances] = await Promise.all([
      prisma.strategyIdentity.findUnique({
        where: { strategyId },
        select: {
          currentVersionId: true,
          origin: true,
          versions: {
            orderBy: { versionNo: "desc" as const },
            select: {
              id: true,
              versionNo: true,
              status: true,
              fingerprint: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.liveEAInstance.findMany({
        where: {
          deletedAt: null,
          userId,
          strategyVersion: { strategyIdentity: { strategyId } },
        },
        select: {
          id: true,
          eaName: true,
          strategyVersionId: true,
          status: true,
          lifecycleState: true,
          healthSnapshots: {
            take: 1,
            orderBy: { createdAt: "desc" as const },
            select: { status: true },
          },
        },
      }),
    ]);

    // Strategy aggregate (Layer 2)
    const instancesForAgg = siblingInstances.map((sib) => ({
      monitoringStatus: resolveInstanceMonitoringStatus(
        sib.lifecycleState,
        sib.healthSnapshots[0]?.status ?? null
      ),
      connectionStatus: sib.status as "ONLINE" | "OFFLINE" | "ERROR",
      hasHealthData: sib.healthSnapshots.length > 0,
    }));
    strategyAggregate = buildStrategyAggregate(strategyId, instancesForAgg);

    // Version lineage
    if (identityData) {
      const currentVersionId = identityData.currentVersionId;

      // This deployment's version info
      const thisVersion = identityData.versions.find((v) => v.id === instance.strategyVersionId);
      versionNo = thisVersion?.versionNo ?? null;
      versionCurrency = resolveDeploymentCurrency(instance.strategyVersionId, currentVersionId);

      // Full lineage read-model
      strategyLineage = buildStrategyLineage(
        strategyId,
        identityData.origin as "PROJECT" | "EXTERNAL",
        currentVersionId,
        identityData.versions.map((v) => ({
          id: v.id,
          versionNo: v.versionNo,
          status: v.status,
          fingerprint: v.fingerprint,
          createdAt: v.createdAt.toISOString(),
        })),
        siblingInstances.map((sib) => ({
          id: sib.id,
          eaName: sib.eaName,
          strategyVersionId: sib.strategyVersionId,
          status: sib.status,
        }))
      );
    }
  }

  // ── Governance verdict ──────────────────────────────────
  // Derived from all canonical signals — monitoring, lifecycle, incidents,
  // heartbeat authority, and lineage context.
  const hasBaseline = health?.baselineReturnPct !== null && health?.baselineReturnPct !== undefined;
  const governance = resolveDeploymentGovernance({
    lifecycleState: instance.lifecycleState,
    lifecyclePhase: instance.lifecyclePhase,
    operatorHold: instance.operatorHold,
    connectionStatus: instance.status as "ONLINE" | "OFFLINE" | "ERROR",
    lastHeartbeat: instance.lastHeartbeat?.toISOString() ?? null,
    monitoringSuppressedUntil: instance.monitoringSuppressedUntil?.toISOString() ?? null,
    hasHealthData,
    healthStatus: latestSnap?.status ?? null,
    driftDetected: latestSnap?.driftDetected ?? false,
    hasBaseline,
    hasOpenIncident: mappedIncidents.some((i) => i.status === "OPEN"),
    hasEscalatedIncident: mappedIncidents.some((i) => i.status === "ESCALATED"),
    versionCurrency,
    now: new Date(),
  });

  // ── Edge Score ─────────────────────────────────────────
  let edgeScore: EdgeScoreResult | null = null;
  if (instance.strategyVersionId) {
    try {
      const [bl, tradeStats] = await Promise.all([
        prisma.backtestBaseline.findUnique({
          where: { strategyVersionId: instance.strategyVersionId },
          select: {
            winRate: true,
            profitFactor: true,
            maxDrawdownPct: true,
            netReturnPct: true,
            initialDeposit: true,
          },
        }),
        prisma.$queryRaw<
          { tradeCount: bigint; winCount: bigint; grossProfit: number; grossLoss: number }[]
        >`
          SELECT COUNT(*)::bigint AS "tradeCount",
            COUNT(*) FILTER (WHERE profit > 0)::bigint AS "winCount",
            COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0) AS "grossProfit",
            COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0) AS "grossLoss"
          FROM "EATrade"
          WHERE "instanceId" = ${instance.id} AND "closeTime" IS NOT NULL
        `,
      ]);
      const stats = tradeStats[0];
      if (bl && stats && Number(stats.tradeCount) > 0) {
        edgeScore = computeEdgeScore(
          {
            totalTrades: Number(stats.tradeCount),
            winCount: Number(stats.winCount),
            lossCount: Number(stats.tradeCount) - Number(stats.winCount),
            grossProfit: Number(stats.grossProfit),
            grossLoss: Number(stats.grossLoss),
            maxDrawdownPct: 0,
            totalProfit: instance.balance != null ? instance.balance - bl.initialDeposit : 0,
            balance: instance.balance ?? 0,
          },
          {
            winRate: bl.winRate,
            profitFactor: bl.profitFactor,
            maxDrawdownPct: bl.maxDrawdownPct,
            netReturnPct: bl.netReturnPct,
            initialDeposit: bl.initialDeposit,
          }
        );
      }
    } catch {
      // Non-critical — edge score won't be shown
    }
  }

  // ── Edge Projection ───────────────────────────────────
  let edgeProjection: EdgeProjection | null = null;
  if (healthHistory.length >= 5) {
    const projectionInput = healthHistory.map((h) => ({
      overallScore: h.overallScore,
      expectancy: h.expectancy ?? null,
      createdAt: h.createdAt,
    }));
    const latestExpectancy = healthHistory[0]?.expectancy ?? null;
    edgeProjection = computeEdgeProjection(
      projectionInput,
      instance.balance ?? 0,
      latestExpectancy
    );
    // Only include if actually declining — don't show stable/improving projections
    if (edgeProjection.trend !== "declining") {
      edgeProjection = null;
    }
  }

  return {
    id: instance.id,
    eaName: instance.eaName,
    symbol: instance.symbol,
    timeframe: instance.timeframe,
    broker: instance.broker,
    status: instance.status as "ONLINE" | "OFFLINE" | "ERROR",
    lastHeartbeat: instance.lastHeartbeat?.toISOString() ?? null,
    lifecycleState: instance.lifecycleState,
    isAutoDiscovered:
      instance.lifecycleState === "DRAFT" &&
      instance.terminalDeployments.some((d) => {
        const expected = createHash("sha256")
          .update(`ctx:v2:${d.symbol}:${d.magicNumber}`)
          .digest("hex");
        return d.materialFingerprint === expected;
      }),
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
    governance,
    strategyAggregate,
    versionNo,
    versionCurrency,
    strategyLineage,
    edgeScore,
    edgeProjection,
  };
}
