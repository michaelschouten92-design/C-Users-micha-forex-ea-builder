import { describe, it, expect } from "vitest";
import { evaluateCusumDrift } from "./cusum-drift";
import type { CusumDriftInput, CusumDriftThresholds } from "./cusum-drift";

const thresholds: CusumDriftThresholds = { cusumDriftConsecutiveSnapshots: 3 };

describe("evaluateCusumDrift", () => {
  it("PASS when consecutive drift snapshots is below threshold", () => {
    const input: CusumDriftInput = { consecutiveDriftSnapshots: 1 };
    const result = evaluateCusumDrift(input, thresholds);
    expect(result.status).toBe("PASS");
    expect(result.reasonCode).toBeNull();
  });

  it("AT_RISK when consecutive drift snapshots reaches threshold", () => {
    const input: CusumDriftInput = { consecutiveDriftSnapshots: 3 };
    const result = evaluateCusumDrift(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_CUSUM_DRIFT");
    expect(result.measured).toBe(3);
    expect(result.threshold).toBe(3);
  });

  it("AT_RISK when consecutive drift snapshots exceeds threshold", () => {
    const input: CusumDriftInput = { consecutiveDriftSnapshots: 5 };
    const result = evaluateCusumDrift(input, thresholds);
    expect(result.status).toBe("AT_RISK");
    expect(result.reasonCode).toBe("MONITORING_CUSUM_DRIFT");
  });

  it("PASS at boundary (one below threshold)", () => {
    const input: CusumDriftInput = { consecutiveDriftSnapshots: 2 };
    const result = evaluateCusumDrift(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("PASS when zero consecutive drift (no HealthSnapshot data)", () => {
    const input: CusumDriftInput = { consecutiveDriftSnapshots: 0 };
    const result = evaluateCusumDrift(input, thresholds);
    expect(result.status).toBe("PASS");
  });

  it("ruleId is 'cusum-drift'", () => {
    const input: CusumDriftInput = { consecutiveDriftSnapshots: 1 };
    const result = evaluateCusumDrift(input, thresholds);
    expect(result.ruleId).toBe("cusum-drift");
  });
});
