import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRunMonitoring = vi.fn();
const mockIsMonitoringCooldownExpired = vi.fn();
const mockLiveEAInstanceFindFirst = vi.fn();

vi.mock("./run-monitoring", () => ({
  runMonitoring: (...args: unknown[]) => mockRunMonitoring(...args),
  isMonitoringCooldownExpired: (...args: unknown[]) => mockIsMonitoringCooldownExpired(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: {
      findFirst: (...args: unknown[]) => mockLiveEAInstanceFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ debug: vi.fn(), info: vi.fn(), error: vi.fn() }),
  },
}));

describe("triggerMonitoringAfterIngest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
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
    const result = await trigger("strat_1");

    expect(result).toEqual({
      triggered: true,
      reason: "OK",
      result: fakeResult,
    });
    expect(mockRunMonitoring).toHaveBeenCalledWith({
      strategyId: "strat_1",
      source: "live_ingest",
    });
  });

  it("skips monitoring when cooldown is active", async () => {
    mockIsMonitoringCooldownExpired.mockResolvedValue(false);

    const trigger = await importTrigger();
    const result = await trigger("strat_1");

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
    await expect(trigger("strat_1")).rejects.toThrow("DB crash");
  });

  it("skips monitoring when operator hold is HALTED", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({ operatorHold: "HALTED" });

    const trigger = await importTrigger();
    const result = await trigger("strat_1");

    expect(result).toEqual({ triggered: false, reason: "OPERATOR_HALTED" });
    expect(mockRunMonitoring).not.toHaveBeenCalled();
    expect(mockIsMonitoringCooldownExpired).not.toHaveBeenCalled();
  });

  it("proceeds when operator hold is NONE", async () => {
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      operatorHold: "NONE",
      monitoringSuppressedUntil: null,
    });
    mockIsMonitoringCooldownExpired.mockResolvedValue(true);
    mockRunMonitoring.mockResolvedValue(fakeResult);

    const trigger = await importTrigger();
    const result = await trigger("strat_1");

    expect(result).toEqual({ triggered: true, reason: "OK", result: fakeResult });
    expect(mockRunMonitoring).toHaveBeenCalled();
  });

  it("skips monitoring when suppression window is active", async () => {
    const now = new Date("2026-03-02T12:00:00Z");
    const suppressedUntil = new Date("2026-03-02T12:10:00Z"); // 10 min in the future
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      operatorHold: "NONE",
      monitoringSuppressedUntil: suppressedUntil,
    });

    const trigger = await importTrigger();
    const result = await trigger("strat_1", now);

    expect(result).toEqual({ triggered: false, reason: "MONITORING_SUPPRESSED" });
    expect(mockRunMonitoring).not.toHaveBeenCalled();
    expect(mockIsMonitoringCooldownExpired).not.toHaveBeenCalled();
  });

  it("proceeds when suppression window has expired", async () => {
    const now = new Date("2026-03-02T12:15:00Z");
    const suppressedUntil = new Date("2026-03-02T12:10:00Z"); // 5 min in the past
    mockLiveEAInstanceFindFirst.mockResolvedValue({
      operatorHold: "NONE",
      monitoringSuppressedUntil: suppressedUntil,
    });
    mockIsMonitoringCooldownExpired.mockResolvedValue(true);
    mockRunMonitoring.mockResolvedValue(fakeResult);

    const trigger = await importTrigger();
    const result = await trigger("strat_1", now);

    expect(result).toEqual({ triggered: true, reason: "OK", result: fakeResult });
    expect(mockRunMonitoring).toHaveBeenCalled();
  });
});
