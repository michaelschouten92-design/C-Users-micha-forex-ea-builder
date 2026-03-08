import { describe, it, expect } from "vitest";
import { buildStrategyAggregate } from "./strategy-aggregate";
import type { InstanceForAggregation } from "./strategy-aggregate";

const healthy: InstanceForAggregation = {
  monitoringStatus: "HEALTHY",
  connectionStatus: "ONLINE",
  hasHealthData: true,
};

const atRisk: InstanceForAggregation = {
  monitoringStatus: "AT_RISK",
  connectionStatus: "ONLINE",
  hasHealthData: true,
};

const invalidated: InstanceForAggregation = {
  monitoringStatus: "INVALIDATED",
  connectionStatus: "OFFLINE",
  hasHealthData: true,
};

const awaitingData: InstanceForAggregation = {
  monitoringStatus: "HEALTHY",
  connectionStatus: "ONLINE",
  hasHealthData: false,
};

describe("buildStrategyAggregate", () => {
  it("returns NO_INSTANCES for empty array", () => {
    const agg = buildStrategyAggregate("strat_1", []);
    expect(agg._type).toBe("strategy_aggregate");
    expect(agg.aggregateSeverity).toBe("NO_INSTANCES");
    expect(agg.instanceCount).toBe(0);
  });

  it("returns HEALTHY when all instances are healthy", () => {
    const agg = buildStrategyAggregate("strat_1", [healthy, healthy]);
    expect(agg.aggregateSeverity).toBe("HEALTHY");
    expect(agg.healthyCount).toBe(2);
    expect(agg.instanceCount).toBe(2);
  });

  it("returns AT_RISK when any instance is at risk (conservative)", () => {
    const agg = buildStrategyAggregate("strat_1", [healthy, atRisk]);
    expect(agg.aggregateSeverity).toBe("AT_RISK");
    expect(agg.healthyCount).toBe(1);
    expect(agg.atRiskCount).toBe(1);
  });

  it("returns INVALIDATED when any instance is invalidated (most conservative)", () => {
    const agg = buildStrategyAggregate("strat_1", [healthy, atRisk, invalidated]);
    expect(agg.aggregateSeverity).toBe("INVALIDATED");
    expect(agg.invalidatedCount).toBe(1);
  });

  it("counts awaiting data instances separately", () => {
    const agg = buildStrategyAggregate("strat_1", [healthy, awaitingData]);
    expect(agg.healthyCount).toBe(1);
    expect(agg.awaitingDataCount).toBe(1);
    expect(agg.aggregateSeverity).toBe("HEALTHY");
  });

  it("counts connection statuses correctly", () => {
    const offline = { ...healthy, connectionStatus: "OFFLINE" as const };
    const error = { ...healthy, connectionStatus: "ERROR" as const };
    const agg = buildStrategyAggregate("strat_1", [healthy, offline, error]);
    expect(agg.onlineCount).toBe(1);
    expect(agg.offlineCount).toBe(1);
    expect(agg.errorCount).toBe(1);
  });

  it("generates summary line for single deployment", () => {
    const agg = buildStrategyAggregate("strat_1", [healthy]);
    expect(agg.summaryLine).toBe("1 deployment — healthy");
  });

  it("generates summary line for multiple deployments", () => {
    const agg = buildStrategyAggregate("strat_1", [healthy, atRisk, awaitingData]);
    expect(agg.summaryLine).toContain("3 deployments:");
    expect(agg.summaryLine).toContain("1 healthy");
    expect(agg.summaryLine).toContain("1 at risk");
    expect(agg.summaryLine).toContain("1 awaiting data");
  });

  it("is deterministic", () => {
    const instances = [healthy, atRisk, invalidated];
    const a = buildStrategyAggregate("strat_1", instances);
    const b = buildStrategyAggregate("strat_1", instances);
    expect(a).toEqual(b);
  });

  it("always includes _type discriminator", () => {
    const agg = buildStrategyAggregate("strat_1", [healthy]);
    expect(agg._type).toBe("strategy_aggregate");
  });
});
