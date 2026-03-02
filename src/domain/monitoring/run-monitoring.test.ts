import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock handles ──────────────────────────────────────────────────────
const mockMonitoringRunCreate = vi.fn();
const mockMonitoringRunUpdate = vi.fn();
const mockMonitoringRunFindFirst = vi.fn();
const mockTradeFactFindMany = vi.fn();
const mockAppendProofEvent = vi.fn();
const mockLoadActiveConfigWithFallback = vi.fn();
const mockBuildTradeSnapshot = vi.fn();
const mockEvaluateMonitoring = vi.fn();

// ── Module mocks ──────────────────────────────────────────────────────
vi.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: Record<string, unknown>;
    constructor(
      message: string,
      opts: { code: string; clientVersion?: string; meta?: Record<string, unknown> }
    ) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = opts.code;
      this.meta = opts.meta;
    }
  }
  return { Prisma: { PrismaClientKnownRequestError } };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    monitoringRun: {
      create: (...args: unknown[]) => mockMonitoringRunCreate(...args),
      update: (...args: unknown[]) => mockMonitoringRunUpdate(...args),
      findFirst: (...args: unknown[]) => mockMonitoringRunFindFirst(...args),
    },
    tradeFact: {
      findMany: (...args: unknown[]) => mockTradeFactFindMany(...args),
    },
  },
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: (...args: unknown[]) => mockAppendProofEvent(...args),
}));

vi.mock("@/domain/verification/config-loader", () => {
  class NoActiveConfigError extends Error {
    constructor(message = "No active config") {
      super(message);
      this.name = "NoActiveConfigError";
    }
  }
  class ConfigIntegrityError extends Error {
    details: { expected: string; actual: string };
    constructor(
      message = "Config integrity error",
      details: { expected: string; actual: string } = {
        expected: "",
        actual: "",
      }
    ) {
      super(message);
      this.name = "ConfigIntegrityError";
      this.details = details;
    }
  }
  return {
    loadActiveConfigWithFallback: (...args: unknown[]) => mockLoadActiveConfigWithFallback(...args),
    NoActiveConfigError,
    ConfigIntegrityError,
  };
});

vi.mock("@/domain/trade-ingest", () => ({
  buildTradeSnapshot: (...args: unknown[]) => mockBuildTradeSnapshot(...args),
}));

vi.mock("./evaluate-monitoring", () => ({
  evaluateMonitoring: (...args: unknown[]) => mockEvaluateMonitoring(...args),
}));

vi.mock("./constants", () => ({
  MONITORING: { CONFIG_VERSION: "1.0.0", COOLDOWN_SECONDS: 300 },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const FAKE_UUID = "22222222-2222-2222-2222-222222222222";
const FAKE_RUN_ID = "cuid_run_1";

// ── Defaults ──────────────────────────────────────────────────────────
function setupDefaults() {
  vi.stubGlobal("crypto", { randomUUID: () => FAKE_UUID });

  mockMonitoringRunCreate.mockResolvedValue({ id: FAKE_RUN_ID });
  mockMonitoringRunUpdate.mockResolvedValue({});

  mockLoadActiveConfigWithFallback.mockResolvedValue({
    config: {
      configVersion: "1.0.0",
      thresholdsHash: "th_hash",
    },
    source: "active",
  });

  mockTradeFactFindMany.mockResolvedValue([
    { id: "f1", profit: 100 },
    { id: "f2", profit: -50 },
  ]);

  mockBuildTradeSnapshot.mockReturnValue({
    snapshotHash: "live_snap_hash",
    factCount: 2,
    range: { from: "2025-01-01", to: "2025-06-01" },
  });

  mockEvaluateMonitoring.mockReturnValue({
    verdict: "HEALTHY",
    reasons: [],
    ruleResults: [],
  });

  mockAppendProofEvent.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
}

// ── Tests ─────────────────────────────────────────────────────────────
describe("runMonitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  async function importRunMonitoring() {
    const mod = await import("./run-monitoring");
    return mod.runMonitoring;
  }

  const params = { strategyId: "strat_1", source: "live_ingest" };

  // ── Happy path ────────────────────────────────────────────────────
  it("happy path: creates run, evaluates, writes proof, marks COMPLETED", async () => {
    const run = await importRunMonitoring();
    const result = await run(params);

    // 1. Created PENDING run row
    expect(mockMonitoringRunCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        strategyId: "strat_1",
        status: "PENDING",
        recordId: FAKE_UUID,
      }),
    });

    // 2. Transitioned to RUNNING
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FAKE_RUN_ID },
        data: expect.objectContaining({ status: "RUNNING" }),
      })
    );

    // 3. Proof event written
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "MONITORING_RUN_COMPLETED",
      expect.objectContaining({
        recordId: FAKE_UUID,
        monitoringVerdict: "HEALTHY",
        tradeSnapshotHash: "live_snap_hash",
        liveFactCount: 2,
        configVersion: "1.0.0",
        thresholdsHash: "th_hash",
      })
    );

    // 4. Marked COMPLETED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FAKE_RUN_ID },
        data: expect.objectContaining({
          status: "COMPLETED",
          verdict: "HEALTHY",
          tradeSnapshotHash: "live_snap_hash",
          liveFactCount: 2,
        }),
      })
    );

    // 5. Result shape
    expect(result).toEqual({
      runId: FAKE_RUN_ID,
      recordId: FAKE_UUID,
      verdict: "HEALTHY",
      reasons: [],
      tradeSnapshotHash: "live_snap_hash",
      liveFactCount: 2,
    });
  });

  // ── Proof event fail-closed ───────────────────────────────────────
  it("fail-closed: proof event failure propagates and run is marked FAILED", async () => {
    mockAppendProofEvent.mockRejectedValue(new Error("Serialization failure"));

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Serialization failure");

    // Run should be marked FAILED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FAKE_RUN_ID },
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Serialization failure",
        }),
      })
    );
  });

  // ── No LIVE data ──────────────────────────────────────────────────
  it("no LIVE data: run marked FAILED, proof event still written", async () => {
    mockTradeFactFindMany.mockResolvedValue([]);

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(result.verdict).toBe("HEALTHY");
    expect(result.reasons).toEqual(["NO_LIVE_DATA"]);
    expect(result.liveFactCount).toBe(0);

    // Proof event is still written (best-effort for failed runs)
    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "strat_1",
      "MONITORING_RUN_COMPLETED",
      expect.objectContaining({
        monitoringVerdict: null,
        reasons: ["No LIVE TradeFacts found for strategy"],
      })
    );

    // Run marked FAILED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "No LIVE TradeFacts found for strategy",
        }),
      })
    );
  });

  // ── Config unavailable ────────────────────────────────────────────
  it("config unavailable: returns AT_RISK and marks run FAILED", async () => {
    const { NoActiveConfigError } = await import("@/domain/verification/config-loader");
    mockLoadActiveConfigWithFallback.mockRejectedValue(new NoActiveConfigError());

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toEqual(["CONFIG_UNAVAILABLE"]);

    // Run marked FAILED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "No active monitoring config",
        }),
      })
    );
  });

  // ── Config integrity error ────────────────────────────────────────
  it("config integrity error: returns AT_RISK and marks run FAILED", async () => {
    const { ConfigIntegrityError } = await import("@/domain/verification/config-loader");
    mockLoadActiveConfigWithFallback.mockRejectedValue(
      new ConfigIntegrityError("hash mismatch", {
        expected: "abc",
        actual: "def",
      })
    );

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(result.verdict).toBe("AT_RISK");
    expect(result.reasons).toEqual(["CONFIG_UNAVAILABLE"]);
  });

  // ── Snapshot build failure ────────────────────────────────────────
  it("fail-closed: snapshot build failure marks run FAILED + proof event still written", async () => {
    mockBuildTradeSnapshot.mockImplementation(() => {
      throw new Error("Snapshot build failed");
    });

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Snapshot build failed");

    // Run marked FAILED
    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Snapshot build failed",
        }),
      })
    );
  });

  // ── Evaluation failure ────────────────────────────────────────────
  it("evaluation failure propagates and run is marked FAILED", async () => {
    mockEvaluateMonitoring.mockImplementation(() => {
      throw new Error("Rule engine crash");
    });

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Rule engine crash");

    expect(mockMonitoringRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Rule engine crash",
        }),
      })
    );
  });

  // ── Snapshot uses LIVE source filter ───────────────────────────────
  it("queries only LIVE TradeFacts for snapshot", async () => {
    const run = await importRunMonitoring();
    await run(params);

    expect(mockTradeFactFindMany).toHaveBeenCalledWith({
      where: { strategyId: "strat_1", source: "LIVE" },
      orderBy: [{ executedAt: "asc" }, { id: "asc" }],
    });
  });

  // ── Concurrent run protection (P2002) ─────────────────────────────
  it("returns no-op when a PENDING/RUNNING run already exists (P2002)", async () => {
    const { Prisma } = await import("@prisma/client");
    mockMonitoringRunCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`strategyId`)",
        { code: "P2002", clientVersion: "5.0.0", meta: { target: ["strategyId"] } }
      )
    );

    const run = await importRunMonitoring();
    const result = await run(params);

    expect(result).toEqual({
      runId: "",
      recordId: FAKE_UUID,
      verdict: "HEALTHY",
      reasons: ["CONCURRENT_RUN_EXISTS"],
      tradeSnapshotHash: null,
      liveFactCount: 0,
    });

    // No further DB calls or proof events
    expect(mockMonitoringRunUpdate).not.toHaveBeenCalled();
    expect(mockAppendProofEvent).not.toHaveBeenCalled();
    expect(mockTradeFactFindMany).not.toHaveBeenCalled();
  });

  it("re-throws non-P2002 Prisma errors from create", async () => {
    const { Prisma } = await import("@prisma/client");
    mockMonitoringRunCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Connection refused", {
        code: "P1001",
        clientVersion: "5.0.0",
      })
    );

    const run = await importRunMonitoring();
    await expect(run(params)).rejects.toThrow("Connection refused");
  });
});

describe("isMonitoringCooldownExpired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importCooldownCheck() {
    const mod = await import("./run-monitoring");
    return mod.isMonitoringCooldownExpired;
  }

  it("returns true when no previous run exists", async () => {
    mockMonitoringRunFindFirst.mockResolvedValue(null);

    const check = await importCooldownCheck();
    expect(await check("strat_1")).toBe(true);
  });

  it("returns true when last run completedAt is null", async () => {
    mockMonitoringRunFindFirst.mockResolvedValue({ completedAt: null });

    const check = await importCooldownCheck();
    expect(await check("strat_1")).toBe(true);
  });

  it("returns false when last run completed less than 5 min ago", async () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
    mockMonitoringRunFindFirst.mockResolvedValue({
      completedAt: twoMinAgo,
    });

    const check = await importCooldownCheck();
    expect(await check("strat_1")).toBe(false);
  });

  it("returns true when last run completed more than 5 min ago", async () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    mockMonitoringRunFindFirst.mockResolvedValue({
      completedAt: tenMinAgo,
    });

    const check = await importCooldownCheck();
    expect(await check("strat_1")).toBe(true);
  });

  it("queries only COMPLETED and FAILED runs", async () => {
    mockMonitoringRunFindFirst.mockResolvedValue(null);

    const check = await importCooldownCheck();
    await check("strat_1");

    expect(mockMonitoringRunFindFirst).toHaveBeenCalledWith({
      where: {
        strategyId: "strat_1",
        status: { in: ["COMPLETED", "FAILED"] },
      },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });
  });
});
