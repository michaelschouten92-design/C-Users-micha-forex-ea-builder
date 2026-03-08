/**
 * Deployment Governance — derived control-layer read-model.
 *
 * Composes existing monitoring, lifecycle, heartbeat authority, incident, and
 * lineage signals into a single coherent governance verdict per deployment.
 *
 * This is the "what the control layer concludes" layer:
 *   - Monitoring describes what is happening.
 *   - Governance describes what should happen in response.
 *
 * Rules:
 *   - Derived from canonical underlying records — no duplicate truth.
 *   - Pure function — no DB access, deterministic, composable.
 *   - Fail-closed: ambiguous or missing signals → conservative state.
 *   - Instance-scoped first — aggregate/portfolio rollups are optional.
 *   - Aligned with existing heartbeat authority (RUN/PAUSE/STOP).
 *
 * The governance verdict never replaces monitoring truth or heartbeat authority.
 * It wraps them into an explainable control-layer summary.
 */

// ── Governance State ─────────────────────────────────────

/**
 * The governance state of a deployment from a control-layer perspective.
 *
 *   CLEAR:            No governance concerns. Deployment is healthy, monitored,
 *                     and operating within baseline. Heartbeat authority: RUN.
 *
 *   OBSERVATION:      Minor signals present but no action required. Early
 *                     warnings, declining trends, or data collection in progress.
 *
 *   REVIEW_REQUIRED:  One or more signals require operator attention. The system
 *                     has detected conditions that need human assessment.
 *                     Heartbeat authority may be PAUSE.
 *
 *   RESTRICTED:       The control layer has restricted this deployment.
 *                     Active operator hold, monitoring suppression, or
 *                     edge-at-risk state. Heartbeat authority: PAUSE or STOP.
 *
 *   INVALIDATED:      Terminal governance state. The deployment has been
 *                     invalidated by monitoring or incident SLA enforcement.
 *                     Heartbeat authority: STOP. No recovery path.
 */
export type GovernanceState =
  | "CLEAR"
  | "OBSERVATION"
  | "REVIEW_REQUIRED"
  | "RESTRICTED"
  | "INVALIDATED";

// ── Governance Action ────────────────────────────────────

/**
 * The control-layer action recommendation for this deployment.
 * Aligned with existing heartbeat authority semantics.
 *
 *   NONE:     No action needed. Monitoring continues normally.
 *   OBSERVE:  Watch for developments. No intervention required yet.
 *   REVIEW:   Operator should review deployment status and signals.
 *   PAUSE:    Deployment should be paused. Aligned with heartbeat PAUSE.
 *   STOP:     Deployment should be stopped. Aligned with heartbeat STOP.
 *
 * Important: AlgoStudio does NOT directly place or halt trades.
 * These are control-layer recommendations/authority signals that the
 * connected EA respects via the heartbeat protocol.
 */
export type GovernanceAction = "NONE" | "OBSERVE" | "REVIEW" | "PAUSE" | "STOP";

// ── Governance Signal ────────────────────────────────────

/**
 * Individual signals that contribute to the governance verdict.
 * Each signal is a deterministic fact derived from underlying data.
 */
export type GovernanceSignal =
  | "LIFECYCLE_INVALIDATED"
  | "LIFECYCLE_EDGE_AT_RISK"
  | "OPERATOR_HALTED"
  | "OPERATOR_OVERRIDE_PENDING"
  | "MONITORING_SUPPRESSED"
  | "INCIDENT_OPEN"
  | "INCIDENT_ESCALATED"
  | "HEALTH_DEGRADED"
  | "HEALTH_WARNING"
  | "HEALTH_INSUFFICIENT_DATA"
  | "NO_HEALTH_DATA"
  | "DRIFT_DETECTED"
  | "NO_BASELINE"
  | "VERSION_OUTDATED"
  | "CONNECTION_OFFLINE"
  | "CONNECTION_ERROR"
  | "STALE_HEARTBEAT";

/** Human-readable label for each signal. */
const SIGNAL_LABELS: Record<GovernanceSignal, string> = {
  LIFECYCLE_INVALIDATED: "Deployment has been invalidated",
  LIFECYCLE_EDGE_AT_RISK: "Strategy edge is at risk",
  OPERATOR_HALTED: "Operator has halted this deployment",
  OPERATOR_OVERRIDE_PENDING: "Override approval pending",
  MONITORING_SUPPRESSED: "Monitoring temporarily suppressed",
  INCIDENT_OPEN: "Open incident awaiting acknowledgement",
  INCIDENT_ESCALATED: "Escalated incident — ACK deadline passed",
  HEALTH_DEGRADED: "Health status is degraded",
  HEALTH_WARNING: "Health status showing warning signs",
  HEALTH_INSUFFICIENT_DATA: "Insufficient data for health assessment",
  NO_HEALTH_DATA: "No health data available yet",
  DRIFT_DETECTED: "Edge drift detected from baseline",
  NO_BASELINE: "No baseline linked — limited monitoring",
  VERSION_OUTDATED: "Running an outdated strategy version",
  CONNECTION_OFFLINE: "Deployment is offline",
  CONNECTION_ERROR: "Deployment connection error",
  STALE_HEARTBEAT: "No recent heartbeat received",
};

// ── Governance Verdict ───────────────────────────────────

/**
 * Complete governance verdict for a single deployment.
 * Derived from all available monitoring, lifecycle, and operational signals.
 */
export interface DeploymentGovernance {
  /** Explicitly marks this as a governance read-model. */
  readonly _type: "deployment_governance";

  /** The governance state — what the control layer concludes about this deployment. */
  state: GovernanceState;

  /** The recommended/enforced action — aligned with heartbeat authority. */
  action: GovernanceAction;

  /**
   * The heartbeat authority action that the control plane would issue.
   * Directly aligned with decideHeartbeatAction() output.
   * Null if heartbeat input cannot be determined (e.g. missing lifecycle state).
   */
  heartbeatAuthority: "RUN" | "PAUSE" | "STOP" | null;

  /** All active governance signals, ordered by severity (most severe first). */
  signals: GovernanceSignal[];

  /** Human-readable summary line explaining the governance conclusion. */
  summaryLine: string;

  /**
   * Human-readable reason descriptions for each active signal.
   * Ordered to match `signals` array.
   */
  reasons: string[];

  /**
   * Confidence in the governance verdict.
   * LOW when data is missing or insufficient.
   * MEDIUM when monitoring is active but sample is small.
   * HIGH when monitoring is active with sufficient data.
   */
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

// ── Input ────────────────────────────────────────────────

/**
 * All inputs needed to resolve governance.
 * Every field comes from existing canonical records — no new data sources.
 */
export interface GovernanceInput {
  // Lifecycle (from LiveEAInstance)
  lifecycleState: string;
  lifecyclePhase: string;
  operatorHold: string; // "NONE" | "HALTED" | "OVERRIDE_PENDING"

  // Connection (from LiveEAInstance)
  connectionStatus: "ONLINE" | "OFFLINE" | "ERROR";
  lastHeartbeat: string | null; // ISO
  monitoringSuppressedUntil: string | null; // ISO

  // Health (from latest HealthSnapshot, may be null)
  hasHealthData: boolean;
  healthStatus: string | null; // HEALTHY | WARNING | DEGRADED | INSUFFICIENT_DATA
  driftDetected: boolean;

  // Baseline (from strategyVersionId chain)
  hasBaseline: boolean;

  // Incidents (from recent incidents)
  hasOpenIncident: boolean;
  hasEscalatedIncident: boolean;

  // Version lineage (from Phase 4)
  versionCurrency: string; // CURRENT | OUTDATED | UNLINKED | UNKNOWN

  // Timestamp for staleness checks
  now: Date;
}

// ── Signal severity ordering ─────────────────────────────

/** Signal severity priority (lower = more severe). */
const SIGNAL_SEVERITY: Record<GovernanceSignal, number> = {
  LIFECYCLE_INVALIDATED: 0,
  OPERATOR_HALTED: 1,
  INCIDENT_ESCALATED: 2,
  LIFECYCLE_EDGE_AT_RISK: 3,
  INCIDENT_OPEN: 4,
  HEALTH_DEGRADED: 5,
  OPERATOR_OVERRIDE_PENDING: 6,
  MONITORING_SUPPRESSED: 7,
  DRIFT_DETECTED: 8,
  HEALTH_WARNING: 9,
  CONNECTION_ERROR: 10,
  CONNECTION_OFFLINE: 11,
  STALE_HEARTBEAT: 12,
  NO_BASELINE: 13,
  VERSION_OUTDATED: 14,
  NO_HEALTH_DATA: 15,
  HEALTH_INSUFFICIENT_DATA: 16,
};

// ── Resolver ─────────────────────────────────────────────

/**
 * Resolve the complete governance verdict for a deployment.
 *
 * Pure function — no DB access, deterministic, composable.
 * Priority-based: the most severe signal determines state and action.
 */
export function resolveDeploymentGovernance(input: GovernanceInput): DeploymentGovernance {
  // Step 1: Collect all active signals
  const signals = collectSignals(input);

  // Step 2: Sort by severity
  signals.sort((a, b) => SIGNAL_SEVERITY[a] - SIGNAL_SEVERITY[b]);

  // Step 3: Determine governance state from signals
  const state = deriveGovernanceState(signals, input);

  // Step 4: Determine governance action
  const action = deriveGovernanceAction(state, signals, input);

  // Step 5: Determine heartbeat authority alignment
  const heartbeatAuthority = deriveHeartbeatAuthority(input);

  // Step 6: Build reasons
  const reasons = signals.map((s) => SIGNAL_LABELS[s]);

  // Step 7: Build summary line
  const summaryLine = buildSummaryLine(state, action, signals);

  // Step 8: Determine confidence
  const confidence = deriveConfidence(input);

  return {
    _type: "deployment_governance",
    state,
    action,
    heartbeatAuthority,
    signals,
    summaryLine,
    reasons,
    confidence,
  };
}

// ── Signal collection ────────────────────────────────────

function collectSignals(input: GovernanceInput): GovernanceSignal[] {
  const signals: GovernanceSignal[] = [];

  // Lifecycle
  if (input.lifecycleState === "INVALIDATED") signals.push("LIFECYCLE_INVALIDATED");
  if (input.lifecycleState === "EDGE_AT_RISK") signals.push("LIFECYCLE_EDGE_AT_RISK");

  // Operator
  if (input.operatorHold === "HALTED") signals.push("OPERATOR_HALTED");
  if (input.operatorHold === "OVERRIDE_PENDING") signals.push("OPERATOR_OVERRIDE_PENDING");

  // Monitoring suppression
  if (input.monitoringSuppressedUntil && input.now < new Date(input.monitoringSuppressedUntil)) {
    signals.push("MONITORING_SUPPRESSED");
  }

  // Incidents
  if (input.hasEscalatedIncident) signals.push("INCIDENT_ESCALATED");
  else if (input.hasOpenIncident) signals.push("INCIDENT_OPEN");

  // Health
  if (!input.hasHealthData) {
    signals.push("NO_HEALTH_DATA");
  } else {
    if (input.healthStatus === "DEGRADED") signals.push("HEALTH_DEGRADED");
    if (input.healthStatus === "WARNING") signals.push("HEALTH_WARNING");
    if (input.healthStatus === "INSUFFICIENT_DATA") signals.push("HEALTH_INSUFFICIENT_DATA");
    if (input.driftDetected) signals.push("DRIFT_DETECTED");
  }

  // Baseline
  if (!input.hasBaseline) signals.push("NO_BASELINE");

  // Version
  if (input.versionCurrency === "OUTDATED") signals.push("VERSION_OUTDATED");

  // Connection
  if (input.connectionStatus === "ERROR") signals.push("CONNECTION_ERROR");
  else if (input.connectionStatus === "OFFLINE") signals.push("CONNECTION_OFFLINE");

  // Stale heartbeat (>1h without heartbeat while supposedly online)
  if (input.lastHeartbeat && input.connectionStatus !== "OFFLINE") {
    const lastHb = new Date(input.lastHeartbeat).getTime();
    const staleThresholdMs = 60 * 60 * 1000; // 1 hour
    if (input.now.getTime() - lastHb > staleThresholdMs) {
      signals.push("STALE_HEARTBEAT");
    }
  }

  return signals;
}

// ── State derivation ─────────────────────────────────────

function deriveGovernanceState(
  signals: GovernanceSignal[],
  input: GovernanceInput
): GovernanceState {
  if (signals.length === 0) return "CLEAR";

  // Terminal
  if (signals.includes("LIFECYCLE_INVALIDATED")) return "INVALIDATED";

  // Restricted: operator halt, edge at risk, or monitoring suppression
  if (
    signals.includes("OPERATOR_HALTED") ||
    signals.includes("LIFECYCLE_EDGE_AT_RISK") ||
    signals.includes("MONITORING_SUPPRESSED") ||
    signals.includes("OPERATOR_OVERRIDE_PENDING")
  ) {
    return "RESTRICTED";
  }

  // Review required: escalated incident, degraded health, or open incident
  if (
    signals.includes("INCIDENT_ESCALATED") ||
    signals.includes("HEALTH_DEGRADED") ||
    signals.includes("INCIDENT_OPEN") ||
    signals.includes("CONNECTION_ERROR")
  ) {
    return "REVIEW_REQUIRED";
  }

  // Observation: warnings, drift, insufficient data, stale, outdated
  if (
    signals.includes("HEALTH_WARNING") ||
    signals.includes("DRIFT_DETECTED") ||
    signals.includes("NO_HEALTH_DATA") ||
    signals.includes("HEALTH_INSUFFICIENT_DATA") ||
    signals.includes("NO_BASELINE") ||
    signals.includes("VERSION_OUTDATED") ||
    signals.includes("STALE_HEARTBEAT") ||
    signals.includes("CONNECTION_OFFLINE")
  ) {
    return "OBSERVATION";
  }

  // Fallback: if we have signals we don't recognize, be conservative
  return "OBSERVATION";
}

// ── Action derivation ────────────────────────────────────

function deriveGovernanceAction(
  state: GovernanceState,
  signals: GovernanceSignal[],
  input: GovernanceInput
): GovernanceAction {
  switch (state) {
    case "INVALIDATED":
      return "STOP";
    case "RESTRICTED":
      if (signals.includes("OPERATOR_HALTED")) return "STOP";
      return "PAUSE";
    case "REVIEW_REQUIRED":
      return "REVIEW";
    case "OBSERVATION":
      return "OBSERVE";
    case "CLEAR":
      return "NONE";
  }
}

// ── Heartbeat authority alignment ────────────────────────

/**
 * Derive the heartbeat authority action that aligns with this governance state.
 * Uses the same logic as decideHeartbeatAction() but from the governance input shape.
 */
function deriveHeartbeatAuthority(input: GovernanceInput): "RUN" | "PAUSE" | "STOP" | null {
  if (input.operatorHold === "HALTED") return "STOP";
  if (input.lifecycleState === "INVALIDATED") return "STOP";

  const liveStates = new Set(["LIVE_MONITORING", "EDGE_AT_RISK"]);
  if (!liveStates.has(input.lifecycleState)) return "PAUSE";

  if (input.lifecycleState === "EDGE_AT_RISK") return "PAUSE";

  if (input.monitoringSuppressedUntil && input.now < new Date(input.monitoringSuppressedUntil)) {
    return "PAUSE";
  }

  return "RUN";
}

// ── Summary line builder ─────────────────────────────────

function buildSummaryLine(
  state: GovernanceState,
  action: GovernanceAction,
  signals: GovernanceSignal[]
): string {
  switch (state) {
    case "CLEAR":
      return "All governance checks passed. Deployment operating normally.";
    case "INVALIDATED":
      return "Deployment invalidated. Control layer recommends removal from live trading.";
    case "RESTRICTED": {
      if (signals.includes("OPERATOR_HALTED")) {
        return "Deployment halted by operator. Trading authority revoked.";
      }
      if (signals.includes("LIFECYCLE_EDGE_AT_RISK")) {
        return "Strategy edge at risk. Trading paused pending recovery or operator action.";
      }
      if (signals.includes("OPERATOR_OVERRIDE_PENDING")) {
        return "Override pending approval. Trading paused until resolved.";
      }
      return "Monitoring temporarily suppressed. Trading paused.";
    }
    case "REVIEW_REQUIRED": {
      const count = signals.length;
      if (signals.includes("INCIDENT_ESCALATED")) {
        return `Escalated incident requires immediate attention. ${count} signal${count > 1 ? "s" : ""} active.`;
      }
      return `${count} signal${count > 1 ? "s" : ""} require operator review.`;
    }
    case "OBSERVATION": {
      const count = signals.length;
      return `${count} minor signal${count > 1 ? "s" : ""} under observation. No action required yet.`;
    }
  }
}

// ── Confidence derivation ────────────────────────────────

function deriveConfidence(input: GovernanceInput): "HIGH" | "MEDIUM" | "LOW" {
  // No health data → LOW confidence
  if (!input.hasHealthData) return "LOW";

  // Insufficient data → LOW
  if (input.healthStatus === "INSUFFICIENT_DATA") return "LOW";

  // No baseline → MEDIUM at best
  if (!input.hasBaseline) return "MEDIUM";

  // Offline/error → MEDIUM (we have data but can't verify current state)
  if (input.connectionStatus === "OFFLINE" || input.connectionStatus === "ERROR") {
    return "MEDIUM";
  }

  return "HIGH";
}

// ── Signal label accessor ────────────────────────────────

/** Get the human-readable label for a governance signal. */
export function getSignalLabel(signal: GovernanceSignal): string {
  return SIGNAL_LABELS[signal];
}
