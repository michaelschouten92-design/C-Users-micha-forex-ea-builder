/**
 * Semantic Layer Types — explicit separation of instance, strategy aggregate,
 * and portfolio operational concepts.
 *
 * Layer 1: Instance Truth — single deployment, single baseline, single verdict.
 * Layer 2: Strategy Aggregate — read-only rollup across instances sharing a strategy.
 * Layer 3: Portfolio Summary — operational overview across all user instances.
 *
 * Rules:
 *   - Instance truth is primary and never overwritten by aggregates.
 *   - Aggregates are derived, labeled, and conservative.
 *   - Portfolio summary is operational, not a proof of strategy validity.
 */

// ── Layer 1: Instance Truth ──────────────────────────────

/**
 * Monitoring status for a single live deployment.
 * Derived from governance lifecycle state + health snapshot status.
 * This is the authoritative monitoring signal for one instance.
 */
export type InstanceMonitoringStatus = "HEALTHY" | "AT_RISK" | "INVALIDATED";

/**
 * Resolve the monitoring status for a single instance.
 * Governance lifecycle state takes precedence over health status.
 */
export function resolveInstanceMonitoringStatus(
  lifecycleState: string,
  healthStatus: string | null
): InstanceMonitoringStatus {
  if (lifecycleState === "INVALIDATED") return "INVALIDATED";
  if (lifecycleState === "EDGE_AT_RISK") return "AT_RISK";
  if (healthStatus === "DEGRADED" || healthStatus === "WARNING") return "AT_RISK";
  return "HEALTHY";
}

// ── Layer 2: Strategy Aggregate ──────────────────────────

/**
 * Aggregate severity across multiple deployments of the same strategy.
 * Conservative: the worst instance determines the aggregate.
 */
export type StrategyAggregateSeverity = "HEALTHY" | "AT_RISK" | "INVALIDATED" | "NO_INSTANCES";

/**
 * Read-only aggregate health summary for a strategy across its deployments.
 * Clearly labeled as aggregate — never a substitute for per-instance truth.
 */
export interface StrategyAggregateHealth {
  /** Explicitly marks this as an aggregate, not a single-instance verdict. */
  readonly _type: "strategy_aggregate";

  strategyId: string;

  /** Total number of live instances for this strategy. */
  instanceCount: number;

  /** Connection status counts. */
  onlineCount: number;
  offlineCount: number;
  errorCount: number;

  /** Monitoring status counts (instance-level verdicts). */
  healthyCount: number;
  atRiskCount: number;
  invalidatedCount: number;
  awaitingDataCount: number;

  /**
   * Conservative aggregate severity = max(instance monitoring statuses).
   * If any instance is INVALIDATED → INVALIDATED.
   * If any instance is AT_RISK → AT_RISK.
   * If all healthy → HEALTHY.
   * If no instances → NO_INSTANCES.
   */
  aggregateSeverity: StrategyAggregateSeverity;

  /** Human-readable summary line. */
  summaryLine: string;
}

// ── Layer 3: Portfolio Operational Summary ────────────────

/**
 * Portfolio-level operational status.
 * This is NOT a strategy validation signal.
 * It summarizes the operational state across all user instances.
 */
export type PortfolioOperationalStatus = "ALL_CLEAR" | "NEEDS_ATTENTION" | "CRITICAL" | "NO_DATA";

/**
 * Read-only operational summary across all user instances.
 * Explicitly labeled as portfolio operational — not strategy validation.
 */
export interface PortfolioOperationalSummary {
  /** Explicitly marks this as a portfolio operational summary. */
  readonly _type: "portfolio_operational";

  /** Total active (non-deleted) instances. */
  totalInstances: number;

  /** Connection status counts. */
  onlineCount: number;
  offlineCount: number;
  errorCount: number;

  /** Instance monitoring status counts. */
  healthyCount: number;
  atRiskCount: number;
  invalidatedCount: number;
  awaitingDataCount: number;

  /** Instances with detected drift. */
  driftCount: number;

  /** Average health score across instances that have scores (0–100). Null if none. */
  avgHealthScore: number | null;

  /**
   * Conservative overall status:
   *   CRITICAL — any instance invalidated
   *   NEEDS_ATTENTION — any instance at risk or drifting
   *   ALL_CLEAR — all monitored instances healthy
   *   NO_DATA — no instances
   */
  operationalStatus: PortfolioOperationalStatus;

  /** Human-readable one-line summary. */
  summaryLine: string;
}
