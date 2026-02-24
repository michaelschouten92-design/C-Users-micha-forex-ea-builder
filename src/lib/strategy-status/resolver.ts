/**
 * Strategy Status Resolver — pure function that fuses health, lifecycle, connection,
 * drift, and chain verification into a single authoritative status.
 *
 * No database dependency — microsecond execution.
 */

export type StrategyStatus =
  | "VERIFIED"
  | "MONITORING"
  | "TESTING"
  | "UNSTABLE"
  | "EDGE_DEGRADED"
  | "INACTIVE";

export interface StatusInput {
  eaStatus: "ONLINE" | "OFFLINE" | "ERROR";
  lastHeartbeat: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  lifecyclePhase: "NEW" | "PROVING" | "PROVEN" | "RETIRED";
  healthStatus: "HEALTHY" | "WARNING" | "DEGRADED" | "INSUFFICIENT_DATA" | null;
  driftDetected: boolean;
  hasBaseline: boolean;
  chainVerified: boolean; // no broken links in track record
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Resolve strategy status from all available signals.
 * Priority order (first match wins):
 *
 * 1. INACTIVE   — offline 24h+, retired, deleted, or never connected after 48h
 * 2. EDGE_DEGRADED — health DEGRADED or drift detected
 * 3. UNSTABLE   — health WARNING
 * 4. TESTING    — lifecycle NEW or health INSUFFICIENT_DATA
 * 5. VERIFIED   — PROVEN + HEALTHY + verified chain + has baseline
 * 6. MONITORING — everything else
 */
export function resolveStrategyStatus(input: StatusInput): StrategyStatus {
  const now = Date.now();

  // 1. INACTIVE
  if (input.deletedAt !== null) return "INACTIVE";
  if (input.lifecyclePhase === "RETIRED") return "INACTIVE";
  if (
    input.eaStatus === "OFFLINE" &&
    input.lastHeartbeat !== null &&
    now - input.lastHeartbeat.getTime() > TWENTY_FOUR_HOURS_MS
  ) {
    return "INACTIVE";
  }
  if (input.lastHeartbeat === null && now - input.createdAt.getTime() > FORTY_EIGHT_HOURS_MS) {
    return "INACTIVE";
  }

  // 2. EDGE_DEGRADED
  if (input.healthStatus === "DEGRADED") return "EDGE_DEGRADED";
  if (input.driftDetected) return "EDGE_DEGRADED";

  // 3. UNSTABLE
  if (input.healthStatus === "WARNING") return "UNSTABLE";

  // 4. TESTING
  if (input.lifecyclePhase === "NEW") return "TESTING";
  if (input.healthStatus === "INSUFFICIENT_DATA") return "TESTING";

  // 5. VERIFIED
  if (
    input.lifecyclePhase === "PROVEN" &&
    input.healthStatus === "HEALTHY" &&
    input.chainVerified &&
    input.hasBaseline
  ) {
    return "VERIFIED";
  }

  // 6. MONITORING — everything else
  return "MONITORING";
}

// ============================================
// Status Confidence
// ============================================

export type StatusConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface ConfidenceInput {
  tradeCount: number;
  windowDays: number;
  confidenceInterval: { lower: number; upper: number };
}

/**
 * Determine how confident the status assessment is based on sample size.
 *
 * HIGH:   100+ trades, 30+ days, CI width < 0.2
 * MEDIUM: 30+ trades, 14+ days, CI width < 0.4
 * LOW:    everything else
 */
export function resolveStatusConfidence(input: ConfidenceInput): StatusConfidence {
  const ciWidth = input.confidenceInterval.upper - input.confidenceInterval.lower;

  if (input.tradeCount >= 100 && input.windowDays >= 30 && ciWidth < 0.2) {
    return "HIGH";
  }
  if (input.tradeCount >= 30 && input.windowDays >= 14 && ciWidth < 0.4) {
    return "MEDIUM";
  }
  return "LOW";
}

/** Human-readable explanation for a strategy status */
export function getStatusExplanation(status: StrategyStatus, input: Partial<StatusInput>): string {
  switch (status) {
    case "VERIFIED":
      return "Proven strategy with healthy metrics and verified chain";
    case "MONITORING":
      return "Strategy is performing within expected parameters";
    case "TESTING":
      return input.lifecyclePhase === "NEW"
        ? "New strategy collecting initial data"
        : "Gathering more data for a reliable assessment";
    case "UNSTABLE":
      return "Performance metrics showing warning signs — monitor closely";
    case "EDGE_DEGRADED":
      return input.driftDetected
        ? "Edge drift detected — strategy expectancy has persistently declined"
        : "Health has degraded significantly — review performance";
    case "INACTIVE":
      if (input.lifecyclePhase === "RETIRED") return "Strategy has been retired due to edge expiry";
      if (input.deletedAt) return "Strategy has been removed";
      return "Strategy is offline or disconnected";
  }
}
