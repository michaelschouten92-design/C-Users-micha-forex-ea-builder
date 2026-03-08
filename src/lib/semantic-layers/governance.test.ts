import { describe, it, expect } from "vitest";
import { resolveDeploymentGovernance, getSignalLabel, type GovernanceInput } from "./governance";

// ── Test helpers ─────────────────────────────────────────

const BASE_INPUT: GovernanceInput = {
  lifecycleState: "LIVE_MONITORING",
  lifecyclePhase: "PROVING",
  operatorHold: "NONE",
  connectionStatus: "ONLINE",
  lastHeartbeat: new Date().toISOString(),
  monitoringSuppressedUntil: null,
  hasHealthData: true,
  healthStatus: "HEALTHY",
  driftDetected: false,
  hasBaseline: true,
  hasOpenIncident: false,
  hasEscalatedIncident: false,
  versionCurrency: "CURRENT",
  now: new Date(),
};

function resolve(overrides: Partial<GovernanceInput> = {}) {
  return resolveDeploymentGovernance({ ...BASE_INPUT, ...overrides });
}

// ── Governance State ─────────────────────────────────────

describe("resolveDeploymentGovernance — state", () => {
  it("returns CLEAR for a healthy deployment", () => {
    const g = resolve();
    expect(g.state).toBe("CLEAR");
    expect(g.action).toBe("NONE");
    expect(g.signals).toHaveLength(0);
    expect(g.confidence).toBe("HIGH");
  });

  it("returns INVALIDATED for invalidated lifecycle", () => {
    const g = resolve({ lifecycleState: "INVALIDATED" });
    expect(g.state).toBe("INVALIDATED");
    expect(g.action).toBe("STOP");
    expect(g.heartbeatAuthority).toBe("STOP");
    expect(g.signals).toContain("LIFECYCLE_INVALIDATED");
  });

  it("returns RESTRICTED for operator halt", () => {
    const g = resolve({ operatorHold: "HALTED" });
    expect(g.state).toBe("RESTRICTED");
    expect(g.action).toBe("STOP");
    expect(g.heartbeatAuthority).toBe("STOP");
    expect(g.signals).toContain("OPERATOR_HALTED");
  });

  it("returns RESTRICTED for edge at risk", () => {
    const g = resolve({ lifecycleState: "EDGE_AT_RISK" });
    expect(g.state).toBe("RESTRICTED");
    expect(g.action).toBe("PAUSE");
    expect(g.heartbeatAuthority).toBe("PAUSE");
    expect(g.signals).toContain("LIFECYCLE_EDGE_AT_RISK");
  });

  it("returns RESTRICTED for override pending", () => {
    const g = resolve({ operatorHold: "OVERRIDE_PENDING" });
    expect(g.state).toBe("RESTRICTED");
    expect(g.action).toBe("PAUSE");
  });

  it("returns RESTRICTED for monitoring suppressed", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const g = resolve({ monitoringSuppressedUntil: future });
    expect(g.state).toBe("RESTRICTED");
    expect(g.action).toBe("PAUSE");
    expect(g.signals).toContain("MONITORING_SUPPRESSED");
  });

  it("returns REVIEW_REQUIRED for escalated incident", () => {
    const g = resolve({ hasEscalatedIncident: true });
    expect(g.state).toBe("REVIEW_REQUIRED");
    expect(g.action).toBe("REVIEW");
    expect(g.signals).toContain("INCIDENT_ESCALATED");
  });

  it("returns REVIEW_REQUIRED for open incident", () => {
    const g = resolve({ hasOpenIncident: true });
    expect(g.state).toBe("REVIEW_REQUIRED");
    expect(g.action).toBe("REVIEW");
  });

  it("returns REVIEW_REQUIRED for degraded health", () => {
    const g = resolve({ healthStatus: "DEGRADED" });
    expect(g.state).toBe("REVIEW_REQUIRED");
    expect(g.action).toBe("REVIEW");
    expect(g.signals).toContain("HEALTH_DEGRADED");
  });

  it("returns REVIEW_REQUIRED for connection error", () => {
    const g = resolve({ connectionStatus: "ERROR" });
    expect(g.state).toBe("REVIEW_REQUIRED");
    expect(g.action).toBe("REVIEW");
  });

  it("returns OBSERVATION for health warning", () => {
    const g = resolve({ healthStatus: "WARNING" });
    expect(g.state).toBe("OBSERVATION");
    expect(g.action).toBe("OBSERVE");
  });

  it("returns OBSERVATION for drift detected", () => {
    const g = resolve({ driftDetected: true });
    expect(g.state).toBe("OBSERVATION");
    expect(g.action).toBe("OBSERVE");
    expect(g.signals).toContain("DRIFT_DETECTED");
  });

  it("returns OBSERVATION for no health data", () => {
    const g = resolve({ hasHealthData: false });
    expect(g.state).toBe("OBSERVATION");
    expect(g.confidence).toBe("LOW");
  });

  it("returns OBSERVATION for no baseline", () => {
    const g = resolve({ hasBaseline: false });
    expect(g.state).toBe("OBSERVATION");
    expect(g.signals).toContain("NO_BASELINE");
    expect(g.confidence).toBe("MEDIUM");
  });

  it("returns OBSERVATION for outdated version", () => {
    const g = resolve({ versionCurrency: "OUTDATED" });
    expect(g.state).toBe("OBSERVATION");
    expect(g.signals).toContain("VERSION_OUTDATED");
  });

  it("returns OBSERVATION for offline connection", () => {
    const g = resolve({ connectionStatus: "OFFLINE" });
    expect(g.state).toBe("OBSERVATION");
    expect(g.confidence).toBe("MEDIUM");
  });
});

// ── Signal ordering ──────────────────────────────────────

describe("resolveDeploymentGovernance — signal ordering", () => {
  it("orders signals by severity (most severe first)", () => {
    const g = resolve({
      healthStatus: "WARNING",
      hasBaseline: false,
      versionCurrency: "OUTDATED",
      driftDetected: true,
    });
    // DRIFT_DETECTED (8) < HEALTH_WARNING (9) < NO_BASELINE (13) < VERSION_OUTDATED (14)
    expect(g.signals[0]).toBe("DRIFT_DETECTED");
    expect(g.signals[1]).toBe("HEALTH_WARNING");
    expect(g.signals[2]).toBe("NO_BASELINE");
    expect(g.signals[3]).toBe("VERSION_OUTDATED");
  });
});

// ── Heartbeat authority alignment ────────────────────────

describe("resolveDeploymentGovernance — heartbeat authority", () => {
  it("returns RUN for healthy LIVE_MONITORING", () => {
    expect(resolve().heartbeatAuthority).toBe("RUN");
  });

  it("returns STOP for HALTED", () => {
    expect(resolve({ operatorHold: "HALTED" }).heartbeatAuthority).toBe("STOP");
  });

  it("returns STOP for INVALIDATED", () => {
    expect(resolve({ lifecycleState: "INVALIDATED" }).heartbeatAuthority).toBe("STOP");
  });

  it("returns PAUSE for pre-live states", () => {
    expect(resolve({ lifecycleState: "VERIFIED" }).heartbeatAuthority).toBe("PAUSE");
    expect(resolve({ lifecycleState: "DRAFT" }).heartbeatAuthority).toBe("PAUSE");
  });

  it("returns PAUSE for EDGE_AT_RISK", () => {
    expect(resolve({ lifecycleState: "EDGE_AT_RISK" }).heartbeatAuthority).toBe("PAUSE");
  });
});

// ── Fail-closed behavior ─────────────────────────────────

describe("resolveDeploymentGovernance — fail-closed", () => {
  it("never returns CLEAR with no health data", () => {
    const g = resolve({ hasHealthData: false });
    expect(g.state).not.toBe("CLEAR");
    expect(g.confidence).toBe("LOW");
  });

  it("never returns CLEAR with insufficient health data", () => {
    const g = resolve({ healthStatus: "INSUFFICIENT_DATA" });
    expect(g.state).not.toBe("CLEAR");
    expect(g.confidence).toBe("LOW");
  });

  it("never returns CLEAR with no baseline", () => {
    const g = resolve({ hasBaseline: false });
    expect(g.state).not.toBe("CLEAR");
  });

  it("detects stale heartbeat", () => {
    const staleHb = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
    const g = resolve({ lastHeartbeat: staleHb });
    expect(g.signals).toContain("STALE_HEARTBEAT");
    expect(g.state).toBe("OBSERVATION");
  });
});

// ── Summary and reasons ──────────────────────────────────

describe("resolveDeploymentGovernance — output", () => {
  it("provides _type discriminator", () => {
    expect(resolve()._type).toBe("deployment_governance");
  });

  it("provides summary line", () => {
    const g = resolve();
    expect(g.summaryLine).toBeTruthy();
    expect(typeof g.summaryLine).toBe("string");
  });

  it("provides matching reasons for signals", () => {
    const g = resolve({ healthStatus: "WARNING", driftDetected: true });
    expect(g.reasons).toHaveLength(g.signals.length);
    expect(g.reasons.every((r) => typeof r === "string" && r.length > 0)).toBe(true);
  });
});

// ── getSignalLabel ───────────────────────────────────────

describe("getSignalLabel", () => {
  it("returns a human-readable label for each signal", () => {
    expect(getSignalLabel("LIFECYCLE_INVALIDATED")).toBe("Deployment has been invalidated");
    expect(getSignalLabel("DRIFT_DETECTED")).toBe("Edge drift detected from baseline");
  });
});
