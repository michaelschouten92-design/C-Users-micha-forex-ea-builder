import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRunMonitoring = vi.fn();
const mockIsMonitoringCooldownExpired = vi.fn();
const mockLiveEAInstanceFindUnique = vi.fn();

vi.mock("./run-monitoring", () => ({
  runMonitoring: (...args: unknown[]) => mockRunMonitoring(...args),
  isMonitoringCooldownExpired: (...args: unknown[]) => mockIsMonitoringCooldownExpired(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: {
      findUnique: (...args: unknown[]) => mockLiveEAInstanceFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

const INSTANCE_ID = "inst_1";
const STRATEGY_ID = "strat_1";

describe("triggerMonitoringAfterIngest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLiveEAInstanceFindUnique.mockResolvedValue({
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
      strategyVersion: {
        strategyIdentity: { strategyId: STRATEGY_ID },
      },
    });
  });

  async function importTrigger() {
    const mod = await import("./trigger");
    return mod.triggerMonitoringAfterIngest;
  }

  const fakeResult = {
    runId: "run_1",
    recordId: "rec_1",
    verdict: "HEALTHY" as const,
    reasons: [],
    tradeSnapshotHash: "hash_abc",
    liveFactCount: 5,
  };

  it("triggers monitoring when cooldown is expired", async () => {
    mockIsMonitoringCooldownExpired.mockResolvedValue(true);
    mockRunMonitoring.mockResolvedValue(fakeResult);

    const trigger = await importTrigger();
    const result = await trigger(INSTANCE_ID);

    expect(result).toEqual({
      triggered: true,
      reason: "OK",
      result: fakeResult,
    });
    expect(mockRunMonitoring).toHaveBeenCalledWith({
      instanceId: INSTANCE_ID,
      strategyId: STRATEGY_ID,
      source: "live_ingest",
    });
  });

  it("skips monitoring when cooldown is active", async () => {
    mockIsMonitoringCooldownExpired.mockResolvedValue(false);

    const trigger = await importTrigger();
    const result = await trigger(INSTANCE_ID);

    expect(result).toEqual({
      triggered: false,
      reason: "COOLDOWN_ACTIVE",
    });
    expect(mockRunMonitoring).not.toHaveBeenCalled();
  });

  it("propagates errors from runMonitoring", async () => {
    mockIsMonitoringCooldownExpired.mockResolvedValue(true);
    mockRunMonitoring.mockRejectedValue(new Error("DB crash"));

    const trigger = await importTrigger();
    await expect(trigger(INSTANCE_ID)).rejects.toThrow("DB crash");
  });

  it("skips monitoring when operator hold is HALTED", async () => {
    mockLiveEAInstanceFindUnique.mockResolvedValue({
      operatorHold: "HALTED",
      monitoringSuppressedUntil: null,
      strategyVersion: {
        strategyIdentity: { strategyId: STRATEGY_ID },
      },
    });

    const trigger = await importTrigger();
    const result = await trigger(INSTANCE_ID);

    expect(result).toEqual({ triggered: false, reason: "OPERATOR_HALTED" });
    expect(mockRunMonitoring).not.toHaveBeenCalled();
    expect(mockIsMonitoringCooldownExpired).not.toHaveBeenCalled();
  });

  it("proceeds when operator hold is NONE", async () => {
    mockIsMonitoringCooldownExpired.mockResolvedValue(true);
    mockRunMonitoring.mockResolvedValue(fakeResult);

    const trigger = await importTrigger();
    const result = await trigger(INSTANCE_ID);

    expect(result).toEqual({ triggered: true, reason: "OK", result: fakeResult });
    expect(mockRunMonitoring).toHaveBeenCalled();
  });

  it("skips monitoring when suppression window is active", async () => {
    const now = new Date("2026-03-02T12:00:00Z");
    const suppressedUntil = new Date("2026-03-02T12:10:00Z"); // 10 min in the future
    mockLiveEAInstanceFindUnique.mockResolvedValue({
      operatorHold: "NONE",
      monitoringSuppressedUntil: suppressedUntil,
      strategyVersion: {
        strategyIdentity: { strategyId: STRATEGY_ID },
      },
    });

    const trigger = await importTrigger();
    const result = await trigger(INSTANCE_ID, now);

    expect(result).toEqual({ triggered: false, reason: "MONITORING_SUPPRESSED" });
    expect(mockRunMonitoring).not.toHaveBeenCalled();
    expect(mockIsMonitoringCooldownExpired).not.toHaveBeenCalled();
  });

  it("proceeds when suppression window has expired", async () => {
    const now = new Date("2026-03-02T12:15:00Z");
    const suppressedUntil = new Date("2026-03-02T12:10:00Z"); // 5 min in the past
    mockLiveEAInstanceFindUnique.mockResolvedValue({
      operatorHold: "NONE",
      monitoringSuppressedUntil: suppressedUntil,
      strategyVersion: {
        strategyIdentity: { strategyId: STRATEGY_ID },
      },
    });
    mockIsMonitoringCooldownExpired.mockResolvedValue(true);
    mockRunMonitoring.mockResolvedValue(fakeResult);

    const trigger = await importTrigger();
    const result = await trigger(INSTANCE_ID, now);

    expect(result).toEqual({ triggered: true, reason: "OK", result: fakeResult });
    expect(mockRunMonitoring).toHaveBeenCalled();
  });

  it("skips monitoring when instance is not found", async () => {
    mockLiveEAInstanceFindUnique.mockResolvedValue(null);

    const trigger = await importTrigger();
    const result = await trigger(INSTANCE_ID);

    expect(result).toEqual({ triggered: false, reason: "INSTANCE_NOT_FOUND" });
    expect(mockRunMonitoring).not.toHaveBeenCalled();
  });

  it("skips monitoring when no strategy is linked", async () => {
    mockLiveEAInstanceFindUnique.mockResolvedValue({
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
      strategyVersion: null,
    });

    const trigger = await importTrigger();
    const result = await trigger(INSTANCE_ID);

    expect(result).toEqual({ triggered: false, reason: "NO_STRATEGY_LINKED" });
    expect(mockRunMonitoring).not.toHaveBeenCalled();
  });
});
