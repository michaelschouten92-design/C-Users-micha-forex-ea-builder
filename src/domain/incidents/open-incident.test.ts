import { describe, it, expect } from "vitest";
import { buildIncidentData } from "./open-incident";
import type { IncidentOpenParams } from "./types";

const BASE_NOW = new Date("2026-03-03T12:00:00.000Z");

const baseParams: IncidentOpenParams = {
  strategyId: "strat_1",
  instanceId: "inst_1",
  severity: "AT_RISK",
  triggerRecordId: "rec_abc",
  reasonCodes: ["MONITORING_DRAWDOWN_BREACH"],
  snapshotHash: "snap_hash",
  configVersion: "2.2.0",
  thresholdsHash: "th_hash",
  ackDeadlineMinutes: 60,
  autoInvalidateMinutes: null,
  now: BASE_NOW,
};

describe("buildIncidentData", () => {
  it("returns correct structure with status OPEN", () => {
    const data = buildIncidentData(baseParams);
    expect(data.strategyId).toBe("strat_1");
    expect(data.status).toBe("OPEN");
    expect(data.severity).toBe("AT_RISK");
    expect(data.triggerRecordId).toBe("rec_abc");
    expect(data.reasonCodes).toEqual(["MONITORING_DRAWDOWN_BREACH"]);
    expect(data.snapshotHash).toBe("snap_hash");
    expect(data.configVersion).toBe("2.2.0");
    expect(data.thresholdsHash).toBe("th_hash");
  });

  it("computes ackDeadlineAt = now + ackDeadlineMinutes", () => {
    const data = buildIncidentData(baseParams);
    const expected = new Date(BASE_NOW.getTime() + 60 * 60_000);
    expect(data.ackDeadlineAt).toEqual(expected);
  });

  it("invalidateDeadlineAt is null when autoInvalidateMinutes is null", () => {
    const data = buildIncidentData(baseParams);
    expect(data.invalidateDeadlineAt).toBeNull();
  });

  it("computes invalidateDeadlineAt when autoInvalidateMinutes is set", () => {
    const data = buildIncidentData({ ...baseParams, autoInvalidateMinutes: 480 });
    const expected = new Date(BASE_NOW.getTime() + 480 * 60_000);
    expect(data.invalidateDeadlineAt).toEqual(expected);
  });

  it("handles different ackDeadlineMinutes values", () => {
    const data = buildIncidentData({ ...baseParams, ackDeadlineMinutes: 30 });
    const expected = new Date(BASE_NOW.getTime() + 30 * 60_000);
    expect(data.ackDeadlineAt).toEqual(expected);
  });

  it("passes through null snapshotHash", () => {
    const data = buildIncidentData({ ...baseParams, snapshotHash: null });
    expect(data.snapshotHash).toBeNull();
  });
});
