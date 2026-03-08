/**
 * Strategy Aggregate Builder — Layer 2 read model.
 *
 * Derives a conservative aggregate from instance-level truths.
 * The aggregate never replaces or obscures individual instance verdicts.
 *
 * Rules:
 *   - Aggregate severity = max(instance severities)
 *   - Missing data → conservative (counts toward "awaiting data")
 *   - Zero instances → NO_INSTANCES
 */

import type {
  InstanceMonitoringStatus,
  StrategyAggregateHealth,
  StrategyAggregateSeverity,
} from "./types";

/** Minimal instance shape needed for aggregation. */
export interface InstanceForAggregation {
  monitoringStatus: InstanceMonitoringStatus;
  connectionStatus: "ONLINE" | "OFFLINE" | "ERROR";
  hasHealthData: boolean;
}

/**
 * Build a strategy aggregate from instances sharing the same strategy identity.
 *
 * Pure function — no DB access, deterministic, read-only.
 */
export function buildStrategyAggregate(
  strategyId: string,
  instances: InstanceForAggregation[]
): StrategyAggregateHealth {
  if (instances.length === 0) {
    return {
      _type: "strategy_aggregate",
      strategyId,
      instanceCount: 0,
      onlineCount: 0,
      offlineCount: 0,
      errorCount: 0,
      healthyCount: 0,
      atRiskCount: 0,
      invalidatedCount: 0,
      awaitingDataCount: 0,
      aggregateSeverity: "NO_INSTANCES",
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

  for (const inst of instances) {
    // Connection
    if (inst.connectionStatus === "ONLINE") onlineCount++;
    else if (inst.connectionStatus === "OFFLINE") offlineCount++;
    else errorCount++;

    // Monitoring
    if (!inst.hasHealthData) {
      awaitingDataCount++;
    } else if (inst.monitoringStatus === "INVALIDATED") {
      invalidatedCount++;
    } else if (inst.monitoringStatus === "AT_RISK") {
      atRiskCount++;
    } else {
      healthyCount++;
    }
  }

  // Conservative: worst instance wins
  let aggregateSeverity: StrategyAggregateSeverity;
  if (invalidatedCount > 0) aggregateSeverity = "INVALIDATED";
  else if (atRiskCount > 0) aggregateSeverity = "AT_RISK";
  else aggregateSeverity = "HEALTHY";

  const summaryLine = buildSummaryLine(
    instances.length,
    healthyCount,
    atRiskCount,
    invalidatedCount,
    awaitingDataCount
  );

  return {
    _type: "strategy_aggregate",
    strategyId,
    instanceCount: instances.length,
    onlineCount,
    offlineCount,
    errorCount,
    healthyCount,
    atRiskCount,
    invalidatedCount,
    awaitingDataCount,
    aggregateSeverity,
    summaryLine,
  };
}

function buildSummaryLine(
  total: number,
  healthy: number,
  atRisk: number,
  invalidated: number,
  awaiting: number
): string {
  if (total === 1) {
    if (invalidated > 0) return "1 deployment — invalidated";
    if (atRisk > 0) return "1 deployment — at risk";
    if (awaiting > 0) return "1 deployment — awaiting data";
    return "1 deployment — healthy";
  }

  const parts: string[] = [];
  if (healthy > 0) parts.push(`${healthy} healthy`);
  if (atRisk > 0) parts.push(`${atRisk} at risk`);
  if (invalidated > 0) parts.push(`${invalidated} invalidated`);
  if (awaiting > 0) parts.push(`${awaiting} awaiting data`);

  return `${total} deployments: ${parts.join(", ")}`;
}
