import { describe, it, expect } from "vitest";
import {
  buildHeartbeatGovernanceSnapshot,
  serializeGovernanceSnapshot,
} from "./build-governance-snapshot";
import type { HeartbeatInput } from "./decide-heartbeat-action";
import { buildConfigSnapshot } from "@/domain/verification/config-snapshot";

const NOW = new Date("2026-03-03T12:00:00Z");

function input(overrides: Partial<HeartbeatInput> = {}): HeartbeatInput {
  return {
    lifecycleState: "LIVE_MONITORING",
    operatorHold: "NONE",
    monitoringSuppressedUntil: null,
    now: NOW,
    ...overrides,
  };
}

describe("buildHeartbeatGovernanceSnapshot", () => {
  const config = buildConfigSnapshot();

  it("contains exactly 5 keys", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(input());
    const keys = Object.keys(snapshot);
    expect(keys).toHaveLength(5);
    expect(keys.sort()).toEqual([
      "configVersion",
      "lifecycleState",
      "operatorHold",
      "suppressionActive",
      "thresholdsHash",
    ]);
  });

  it("matches DB state used in decision (healthy instance)", () => {
    const inp = input({
      lifecycleState: "LIVE_MONITORING",
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    const snapshot = buildHeartbeatGovernanceSnapshot(inp);

    expect(snapshot.lifecycleState).toBe("LIVE_MONITORING");
    expect(snapshot.operatorHold).toBe("NONE");
    expect(snapshot.suppressionActive).toBe(false);
    expect(snapshot.configVersion).toBe(config.configVersion);
    expect(snapshot.thresholdsHash).toBe(config.thresholdsHash);
  });

  it("matches DB state for halted instance", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(input({ operatorHold: "HALTED" }));
    expect(snapshot.operatorHold).toBe("HALTED");
    expect(snapshot.lifecycleState).toBe("LIVE_MONITORING");
  });

  it("matches DB state for invalidated instance", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(input({ lifecycleState: "INVALIDATED" }));
    expect(snapshot.lifecycleState).toBe("INVALIDATED");
  });

  it("suppressionActive is true when suppression is active", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(
      input({
        monitoringSuppressedUntil: new Date("2026-03-03T13:00:00Z"),
      })
    );
    expect(snapshot.suppressionActive).toBe(true);
  });

  it("suppressionActive is false when suppression has expired", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(
      input({
        monitoringSuppressedUntil: new Date("2026-03-03T11:00:00Z"),
      })
    );
    expect(snapshot.suppressionActive).toBe(false);
  });

  it("uses null for lifecycleState and operatorHold when no instance", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(null);
    expect(snapshot.lifecycleState).toBeNull();
    expect(snapshot.operatorHold).toBeNull();
    expect(snapshot.suppressionActive).toBe(false);
  });

  it("excludes internal identifiers (accountId, instanceTag, instanceId)", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(input());
    const keys = Object.keys(snapshot);
    expect(keys).not.toContain("accountId");
    expect(keys).not.toContain("instanceTag");
    expect(keys).not.toContain("instanceId");
    expect(keys).not.toContain("strategyId");
  });

  it("thresholdsHash matches current config governance value", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(input());
    expect(snapshot.thresholdsHash).toBe(config.thresholdsHash);
    expect(snapshot.thresholdsHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("configVersion matches system constant", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(input());
    expect(snapshot.configVersion).toBe(config.configVersion);
  });

  it("is stable across repeated calls with identical state", () => {
    const inp = input();
    const s1 = buildHeartbeatGovernanceSnapshot(inp);
    const s2 = buildHeartbeatGovernanceSnapshot(inp);
    expect(s1).toEqual(s2);
    expect(serializeGovernanceSnapshot(s1)).toBe(serializeGovernanceSnapshot(s2));
  });

  it("no dynamic timestamps inside snapshot", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(input());
    const serialized = serializeGovernanceSnapshot(snapshot);
    // Must not contain ISO timestamp patterns
    expect(serialized).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe("serializeGovernanceSnapshot", () => {
  it("produces sorted keys in JSON output", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(input());
    const serialized = serializeGovernanceSnapshot(snapshot);
    const parsed = JSON.parse(serialized);
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });

  it("is deterministic (identical input → identical string)", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(input());
    const a = serializeGovernanceSnapshot(snapshot);
    const b = serializeGovernanceSnapshot(snapshot);
    expect(a).toBe(b);
  });

  it("round-trips correctly", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(
      input({ operatorHold: "HALTED", lifecycleState: "EDGE_AT_RISK" })
    );
    const serialized = serializeGovernanceSnapshot(snapshot);
    const parsed = JSON.parse(serialized);
    expect(parsed.lifecycleState).toBe("EDGE_AT_RISK");
    expect(parsed.operatorHold).toBe("HALTED");
    expect(parsed.suppressionActive).toBe(false);
    expect(parsed.configVersion).toBe(snapshot.configVersion);
    expect(parsed.thresholdsHash).toBe(snapshot.thresholdsHash);
  });

  it("null values serialize as JSON null", () => {
    const snapshot = buildHeartbeatGovernanceSnapshot(null);
    const serialized = serializeGovernanceSnapshot(snapshot);
    const parsed = JSON.parse(serialized);
    expect(parsed.lifecycleState).toBeNull();
    expect(parsed.operatorHold).toBeNull();
  });
});
