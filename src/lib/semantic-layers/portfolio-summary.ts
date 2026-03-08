/**
 * Portfolio Operational Summary Builder — Layer 3 read model.
 *
 * Derives a portfolio-level operational overview from instance-level truths.
 * This is explicitly operational — NOT a proof of strategy validity.
 *
 * Rules:
 *   - Any invalidated instance → CRITICAL
 *   - Any at-risk or drifting instance → NEEDS_ATTENTION
 *   - All healthy → ALL_CLEAR
 *   - No instances → NO_DATA
 */

import type {
  InstanceMonitoringStatus,
  PortfolioOperationalSummary,
  PortfolioOperationalStatus,
} from "./types";

/** Minimal instance shape needed for portfolio aggregation. */
export interface InstanceForPortfolio {
  monitoringStatus: InstanceMonitoringStatus;
  connectionStatus: "ONLINE" | "OFFLINE" | "ERROR";
  hasHealthData: boolean;
  driftDetected: boolean;
  healthScore: number | null; // 0–100
}

/**
 * Build a portfolio operational summary from all user instances.
 *
 * Pure function — no DB access, deterministic, read-only.
 */
export function buildPortfolioSummary(
  instances: InstanceForPortfolio[]
): PortfolioOperationalSummary {
  if (instances.length === 0) {
    return {
      _type: "portfolio_operational",
      totalInstances: 0,
      onlineCount: 0,
      offlineCount: 0,
      errorCount: 0,
      healthyCount: 0,
      atRiskCount: 0,
      invalidatedCount: 0,
      awaitingDataCount: 0,
      driftCount: 0,
      avgHealthScore: null,
      operationalStatus: "NO_DATA",
      summaryLine: "No active deployments",
    };
  }

  let onlineCount = 0;
  let offlineCount = 0;
  let errorCount = 0;
  let healthyCount = 0;
  let atRiskCount = 0;
  let invalidatedCount = 0;
  let awaitingDataCount = 0;
  let driftCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const inst of instances) {
    if (inst.connectionStatus === "ONLINE") onlineCount++;
    else if (inst.connectionStatus === "OFFLINE") offlineCount++;
    else errorCount++;

    if (!inst.hasHealthData) {
      awaitingDataCount++;
    } else if (inst.monitoringStatus === "INVALIDATED") {
      invalidatedCount++;
    } else if (inst.monitoringStatus === "AT_RISK") {
      atRiskCount++;
    } else {
      healthyCount++;
    }

    if (inst.driftDetected) driftCount++;

    if (inst.healthScore !== null) {
      scoreSum += inst.healthScore;
      scoreCount++;
    }
  }

  let operationalStatus: PortfolioOperationalStatus;
  if (invalidatedCount > 0) operationalStatus = "CRITICAL";
  else if (atRiskCount > 0 || driftCount > 0) operationalStatus = "NEEDS_ATTENTION";
  else operationalStatus = "ALL_CLEAR";

  const avgHealthScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;

  const summaryLine = buildSummaryLine(
    instances.length,
    onlineCount,
    invalidatedCount,
    atRiskCount,
    operationalStatus
  );

  return {
    _type: "portfolio_operational",
    totalInstances: instances.length,
    onlineCount,
    offlineCount,
    errorCount,
    healthyCount,
    atRiskCount,
    invalidatedCount,
    awaitingDataCount,
    driftCount,
    avgHealthScore,
    operationalStatus,
    summaryLine,
  };
}

function buildSummaryLine(
  total: number,
  online: number,
  invalidated: number,
  atRisk: number,
  status: PortfolioOperationalStatus
): string {
  switch (status) {
    case "CRITICAL":
      return invalidated === 1
        ? `1 of ${total} deployments invalidated — immediate review recommended`
        : `${invalidated} of ${total} deployments invalidated — immediate review recommended`;
    case "NEEDS_ATTENTION":
      return atRisk === 1
        ? `1 of ${total} deployments requires attention`
        : `${atRisk} of ${total} deployments require attention`;
    case "ALL_CLEAR":
      return `${online}/${total} deployments online — all operating within expected range`;
    case "NO_DATA":
      return "No active deployments";
  }
}
