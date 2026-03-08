import { describe, it, expect } from "vitest";
import { buildPortfolioSummary } from "./portfolio-summary";
import type { InstanceForPortfolio } from "./portfolio-summary";

const healthy: InstanceForPortfolio = {
  monitoringStatus: "HEALTHY",
  connectionStatus: "ONLINE",
  hasHealthData: true,
  driftDetected: false,
  healthScore: 85,
};

const atRisk: InstanceForPortfolio = {
  monitoringStatus: "AT_RISK",
  connectionStatus: "ONLINE",
  hasHealthData: true,
  driftDetected: false,
  healthScore: 40,
};

const invalidated: InstanceForPortfolio = {
  monitoringStatus: "INVALIDATED",
  connectionStatus: "OFFLINE",
  hasHealthData: true,
  driftDetected: false,
  healthScore: 10,
};

describe("buildPortfolioSummary", () => {
  it("returns NO_DATA for empty array", () => {
    const summary = buildPortfolioSummary([]);
    expect(summary._type).toBe("portfolio_operational");
    expect(summary.operationalStatus).toBe("NO_DATA");
    expect(summary.totalInstances).toBe(0);
  });

  it("returns ALL_CLEAR when all instances are healthy", () => {
    const summary = buildPortfolioSummary([healthy, healthy]);
    expect(summary.operationalStatus).toBe("ALL_CLEAR");
    expect(summary.healthyCount).toBe(2);
  });

  it("returns NEEDS_ATTENTION when any instance is at risk", () => {
    const summary = buildPortfolioSummary([healthy, atRisk]);
    expect(summary.operationalStatus).toBe("NEEDS_ATTENTION");
  });

  it("returns NEEDS_ATTENTION when drift is detected even if all healthy", () => {
    const drifting = { ...healthy, driftDetected: true };
    const summary = buildPortfolioSummary([healthy, drifting]);
    expect(summary.operationalStatus).toBe("NEEDS_ATTENTION");
    expect(summary.driftCount).toBe(1);
  });

  it("returns CRITICAL when any instance is invalidated (most conservative)", () => {
    const summary = buildPortfolioSummary([healthy, atRisk, invalidated]);
    expect(summary.operationalStatus).toBe("CRITICAL");
  });

  it("computes average health score across scored instances", () => {
    const summary = buildPortfolioSummary([healthy, atRisk]); // 85, 40
    expect(summary.avgHealthScore).toBe(63); // Math.round((85+40)/2)
  });

  it("returns null avgHealthScore when no instances have scores", () => {
    const noScore: InstanceForPortfolio = {
      ...healthy,
      hasHealthData: false,
      healthScore: null,
    };
    const summary = buildPortfolioSummary([noScore]);
    expect(summary.avgHealthScore).toBeNull();
  });

  it("counts connection statuses correctly", () => {
    const offline: InstanceForPortfolio = { ...healthy, connectionStatus: "OFFLINE" };
    const error: InstanceForPortfolio = { ...healthy, connectionStatus: "ERROR" };
    const summary = buildPortfolioSummary([healthy, offline, error]);
    expect(summary.onlineCount).toBe(1);
    expect(summary.offlineCount).toBe(1);
    expect(summary.errorCount).toBe(1);
  });

  it("generates appropriate summary lines", () => {
    expect(buildPortfolioSummary([healthy]).summaryLine).toContain(
      "all operating within expected range"
    );
    expect(buildPortfolioSummary([invalidated]).summaryLine).toContain("invalidated");
    expect(buildPortfolioSummary([atRisk]).summaryLine).toContain("requires attention");
    expect(buildPortfolioSummary([]).summaryLine).toBe("No active deployments");
  });

  it("always includes _type discriminator", () => {
    const summary = buildPortfolioSummary([healthy]);
    expect(summary._type).toBe("portfolio_operational");
  });

  it("is deterministic", () => {
    const instances = [healthy, atRisk, invalidated];
    const a = buildPortfolioSummary(instances);
    const b = buildPortfolioSummary(instances);
    expect(a).toEqual(b);
  });
});
