import { describe, it, expect } from "vitest";
import {
  resolveDeploymentCurrency,
  buildStrategyLineage,
  type VersionForLineage,
  type DeploymentForLineage,
} from "./version-lineage";

// ── resolveDeploymentCurrency ────────────────────────────

describe("resolveDeploymentCurrency", () => {
  it("returns CURRENT when deployment matches currentVersionId", () => {
    expect(resolveDeploymentCurrency("v1", "v1")).toBe("CURRENT");
  });

  it("returns OUTDATED when deployment differs from currentVersionId", () => {
    expect(resolveDeploymentCurrency("v1", "v2")).toBe("OUTDATED");
  });

  it("returns UNLINKED when deployment has no version", () => {
    expect(resolveDeploymentCurrency(null, "v2")).toBe("UNLINKED");
  });

  it("returns UNKNOWN when currentVersionId is null", () => {
    expect(resolveDeploymentCurrency("v1", null)).toBe("UNKNOWN");
  });

  it("returns UNLINKED when both are null", () => {
    expect(resolveDeploymentCurrency(null, null)).toBe("UNLINKED");
  });
});

// ── buildStrategyLineage ─────────────────────────────────

const makeVersion = (overrides: Partial<VersionForLineage> = {}): VersionForLineage => ({
  id: "ver-1",
  versionNo: 1,
  status: "ACTIVE",
  fingerprint: "abc123",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const makeDeployment = (overrides: Partial<DeploymentForLineage> = {}): DeploymentForLineage => ({
  id: "dep-1",
  eaName: "TestEA",
  strategyVersionId: "ver-1",
  status: "ONLINE",
  ...overrides,
});

describe("buildStrategyLineage", () => {
  it("builds correct lineage for empty strategy", () => {
    const result = buildStrategyLineage("AS-TEST", "PROJECT", null, [], []);

    expect(result._type).toBe("strategy_lineage");
    expect(result.strategyId).toBe("AS-TEST");
    expect(result.origin).toBe("PROJECT");
    expect(result.versions).toHaveLength(0);
    expect(result.totalDeployments).toBe(0);
    expect(result.currentDeployments).toBe(0);
    expect(result.outdatedDeployments).toBe(0);
    expect(result.unlinkedDeployments).toBe(0);
    expect(result.externalLineageCaveat).toBe(false);
  });

  it("sorts versions by versionNo descending", () => {
    const v1 = makeVersion({ id: "v1", versionNo: 1 });
    const v2 = makeVersion({ id: "v2", versionNo: 2 });
    const v3 = makeVersion({ id: "v3", versionNo: 3 });

    const result = buildStrategyLineage("AS-TEST", "PROJECT", "v3", [v1, v3, v2], []);

    expect(result.versions.map((v) => v.version.versionNo)).toEqual([3, 2, 1]);
  });

  it("marks the current version correctly", () => {
    const v1 = makeVersion({ id: "v1", versionNo: 1 });
    const v2 = makeVersion({ id: "v2", versionNo: 2 });

    const result = buildStrategyLineage("AS-TEST", "PROJECT", "v2", [v1, v2], []);

    expect(result.versions[0].isCurrent).toBe(true); // v2 (sorted first)
    expect(result.versions[1].isCurrent).toBe(false); // v1
  });

  it("groups deployments by version", () => {
    const v1 = makeVersion({ id: "v1", versionNo: 1 });
    const v2 = makeVersion({ id: "v2", versionNo: 2 });
    const d1 = makeDeployment({ id: "d1", strategyVersionId: "v1" });
    const d2 = makeDeployment({ id: "d2", strategyVersionId: "v2" });
    const d3 = makeDeployment({ id: "d3", strategyVersionId: "v2" });

    const result = buildStrategyLineage("AS-TEST", "PROJECT", "v2", [v1, v2], [d1, d2, d3]);

    const v2Entry = result.versions.find((v) => v.version.id === "v2")!;
    const v1Entry = result.versions.find((v) => v.version.id === "v1")!;
    expect(v2Entry.deployments).toHaveLength(2);
    expect(v1Entry.deployments).toHaveLength(1);
  });

  it("counts current vs outdated deployments", () => {
    const v1 = makeVersion({ id: "v1", versionNo: 1 });
    const v2 = makeVersion({ id: "v2", versionNo: 2 });
    const dCurrent = makeDeployment({ id: "d1", strategyVersionId: "v2" });
    const dOutdated1 = makeDeployment({ id: "d2", strategyVersionId: "v1" });
    const dOutdated2 = makeDeployment({ id: "d3", strategyVersionId: "v1" });

    const result = buildStrategyLineage(
      "AS-TEST",
      "PROJECT",
      "v2",
      [v1, v2],
      [dCurrent, dOutdated1, dOutdated2]
    );

    expect(result.totalDeployments).toBe(3);
    expect(result.currentDeployments).toBe(1);
    expect(result.outdatedDeployments).toBe(2);
    expect(result.unlinkedDeployments).toBe(0);
  });

  it("counts unlinked deployments", () => {
    const v1 = makeVersion({ id: "v1", versionNo: 1 });
    const dLinked = makeDeployment({ id: "d1", strategyVersionId: "v1" });
    const dUnlinked = makeDeployment({ id: "d2", strategyVersionId: null });

    const result = buildStrategyLineage("AS-TEST", "PROJECT", "v1", [v1], [dLinked, dUnlinked]);

    expect(result.unlinkedDeployments).toBe(1);
    expect(result.currentDeployments).toBe(1);
  });

  it("sets externalLineageCaveat for EXTERNAL origin", () => {
    const result = buildStrategyLineage("AS-EXT", "EXTERNAL", null, [], []);

    expect(result.externalLineageCaveat).toBe(true);
  });

  it("does not set externalLineageCaveat for PROJECT origin", () => {
    const result = buildStrategyLineage("AS-PROJ", "PROJECT", null, [], []);

    expect(result.externalLineageCaveat).toBe(false);
  });

  it("handles single-version single-deployment strategy", () => {
    const v1 = makeVersion({ id: "v1", versionNo: 1 });
    const d1 = makeDeployment({ id: "d1", strategyVersionId: "v1" });

    const result = buildStrategyLineage("AS-TEST", "PROJECT", "v1", [v1], [d1]);

    expect(result.versions).toHaveLength(1);
    expect(result.versions[0].isCurrent).toBe(true);
    expect(result.versions[0].deployments).toHaveLength(1);
    expect(result.currentDeployments).toBe(1);
    expect(result.outdatedDeployments).toBe(0);
  });
});
