import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanitizeAuthorityReasons } from "./load-monitor-data";

const mockLogError = vi.fn();
const mockLogInfo = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: (...args: unknown[]) => mockLogInfo(...args),
      error: (...args: unknown[]) => mockLogError(...args),
    }),
  },
}));

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockProofEventFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    subscription: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    proofEventLog: {
      findMany: (...args: unknown[]) => mockProofEventFindMany(...args),
    },
  },
}));

const mockComputeAnalytics = vi.fn();

vi.mock("@/domain/heartbeat/heartbeat-analytics", () => ({
  computeHeartbeatAnalytics: (...args: unknown[]) => mockComputeAnalytics(...args),
}));

describe("loadMonitorData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure DATABASE_URL is present for all tests (diagnostic check)
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    // Default: no proof events, analytics returns fail-closed shape
    mockProofEventFindMany.mockResolvedValue([]);
    mockComputeAnalytics.mockReturnValue({
      windowStart: "",
      windowEnd: "",
      windowMs: 0,
      expectedCadenceMs: 60000,
      totalEvents: 0,
      coverageMs: 0,
      coveragePct: 0,
      runMs: 0,
      runPct: 0,
      cadenceBreached: true,
      longestGapMs: 0,
      lastDecision: null,
    });
  });

  it("returns data on successful DB queries", async () => {
    const mockInstances = [
      {
        id: "ea_1",
        eaName: "Test EA",
        status: "CONNECTED",
        trades: [],
        heartbeats: [],
      },
    ];
    const mockSub = { tier: "PRO", status: "active" };

    mockFindMany.mockResolvedValue(mockInstances);
    mockFindUnique.mockResolvedValue(mockSub);

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).not.toBeNull();
    expect(result!.eaInstances).toEqual(mockInstances);
    expect(result!.subscription).toEqual(mockSub);
    // Authority and analytics fields present (may be null for no events)
    expect(result).toHaveProperty("authority");
    expect(result).toHaveProperty("analytics");
  });

  it("returns null on liveEAInstance query failure (fail-closed)", async () => {
    mockFindMany.mockRejectedValue(new Error("Connection pool exhausted"));
    mockFindUnique.mockResolvedValue({ tier: "PRO" });

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).toBeNull();
  });

  it("returns null on subscription query failure (fail-closed)", async () => {
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockRejectedValue(new Error("DB timeout"));

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).toBeNull();
  });

  it("returns null on Prisma initialization error", async () => {
    mockFindMany.mockRejectedValue(
      new Error("PrismaClientInitializationError: Can't reach database server")
    );
    mockFindUnique.mockRejectedValue(
      new Error("PrismaClientInitializationError: Can't reach database server")
    );

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).toBeNull();
  });

  it("does not leak error details in return value", async () => {
    mockFindMany.mockRejectedValue(
      new Error("password authentication failed for user 'algostudio'")
    );
    mockFindUnique.mockRejectedValue(new Error("same"));

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    // Returns null, not the error object
    expect(result).toBeNull();
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("algostudio");
  });

  it("returns empty instances array when user has no EAs", async () => {
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue({ tier: "PRO", status: "active" });

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).not.toBeNull();
    expect(result!.eaInstances).toEqual([]);
  });

  it("returns null subscription when user has no subscription", async () => {
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue(null);

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).not.toBeNull();
    expect(result!.subscription).toBeNull();
  });

  // ── Diagnostic logging tests ──────────────────────────

  it("returns null when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).toBeNull();
    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ step: "missing_env_var", name: "DATABASE_URL" }),
      expect.any(String)
    );
  });

  it("logs ea_instances_error with classification on findMany failure", async () => {
    mockFindMany.mockRejectedValue(new Error("Connection pool exhausted"));
    mockFindUnique.mockResolvedValue({ tier: "PRO" });

    const { loadMonitorData } = await import("./load-monitor-data");
    await loadMonitorData("user_123");

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({
        step: "ea_instances_error",
        errorName: "Error",
        classification: expect.any(String),
      }),
      "liveEAInstance.findMany failed"
    );
  });

  it("logs subscription_error with classification on findUnique failure", async () => {
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockRejectedValue(new Error("DB timeout"));

    const { loadMonitorData } = await import("./load-monitor-data");
    await loadMonitorData("user_123");

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({
        step: "subscription_error",
        errorName: "Error",
        classification: "timeout",
      }),
      "subscription.findUnique failed"
    );
  });

  it("classifies pool exhaustion errors correctly", async () => {
    mockFindMany.mockRejectedValue(new Error("Too many connections"));
    mockFindUnique.mockResolvedValue(null);

    const { loadMonitorData } = await import("./load-monitor-data");
    await loadMonitorData("user_123");

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({
        step: "ea_instances_error",
        classification: "pool_exhaustion",
      }),
      expect.any(String)
    );
  });

  it("classifies Prisma P1001 errors as timeout", async () => {
    const err = new Error("Can't reach database server");
    (err as Error & { code?: string }).code = "P1001";
    mockFindMany.mockRejectedValue(err);
    mockFindUnique.mockResolvedValue(null);

    const { loadMonitorData } = await import("./load-monitor-data");
    await loadMonitorData("user_123");

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({
        step: "ea_instances_error",
        errorCode: "P1001",
        classification: "timeout",
      }),
      expect.any(String)
    );
  });

  it("scrubs connection strings from error messages", async () => {
    mockFindMany.mockRejectedValue(
      new Error(
        "connect ECONNREFUSED postgresql://admin:s3cret@db.example.com:5432/mydb?sslmode=require"
      )
    );
    mockFindUnique.mockResolvedValue(null);

    const { loadMonitorData } = await import("./load-monitor-data");
    await loadMonitorData("user_123");

    const errorCall = mockLogError.mock.calls.find(
      (call: unknown[]) => (call[0] as { step?: string })?.step === "ea_instances_error"
    );
    expect(errorCall).toBeDefined();
    const loggedMessage = (errorCall![0] as { message: string }).message;
    expect(loggedMessage).not.toContain("s3cret");
    expect(loggedMessage).not.toContain("admin");
    expect(loggedMessage).toContain("[REDACTED_URL]");
  });

  it("logs load_success with eaCount on success", async () => {
    mockFindMany.mockResolvedValue([{ id: "1" }, { id: "2" }]);
    mockFindUnique.mockResolvedValue(null);

    const { loadMonitorData } = await import("./load-monitor-data");
    await loadMonitorData("user_123");

    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.objectContaining({ step: "load_success", eaCount: 2 }),
      expect.any(String)
    );
  });

  it("filters soft-deleted instances (deletedAt: null)", async () => {
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue(null);

    const { loadMonitorData } = await import("./load-monitor-data");
    await loadMonitorData("user_123");

    // Verify the findMany query includes deletedAt: null filter
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  // ── Query shape regression tests ──────────────────────

  it("uses explicit select instead of include to avoid fetching sensitive columns", async () => {
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue(null);

    const { loadMonitorData } = await import("./load-monitor-data");
    await loadMonitorData("user_123");

    const queryArg = mockFindMany.mock.calls[0][0] as Record<string, unknown>;

    // Must use select, not include
    expect(queryArg).toHaveProperty("select");
    expect(queryArg).not.toHaveProperty("include");

    // Must NOT fetch sensitive columns
    const select = queryArg.select as Record<string, unknown>;
    expect(select).not.toHaveProperty("apiKeyHash");
    expect(select).not.toHaveProperty("apiKeyHashPrev");
    expect(select).not.toHaveProperty("keyRotatedAt");
    expect(select).not.toHaveProperty("keyGracePeriodEnd");
    expect(select).not.toHaveProperty("userId");
  });

  it("selects all fields required by page.tsx serialization", async () => {
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue(null);

    const { loadMonitorData } = await import("./load-monitor-data");
    await loadMonitorData("user_123");

    const queryArg = mockFindMany.mock.calls[0][0] as Record<string, unknown>;
    const select = queryArg.select as Record<string, boolean>;

    // Every field that page.tsx serializes must be in the select
    const requiredFields = [
      "id",
      "eaName",
      "symbol",
      "timeframe",
      "broker",
      "accountNumber",
      "status",
      "tradingState",
      "lastHeartbeat",
      "lastError",
      "balance",
      "equity",
      "openTrades",
      "totalTrades",
      "totalProfit",
      "strategyStatus",
      "mode",
      "trades",
      "heartbeats",
      // Governance fields required by Command Center
      "operatorHold",
      "monitoringSuppressedUntil",
      "lifecycleState",
    ];

    for (const field of requiredFields) {
      expect(select).toHaveProperty(field);
    }
  });

  // ── Command Center: Authority + Analytics ─────────────

  it("returns authority from proof events when instances exist", async () => {
    const mockInstances = [{ id: "ea_1", trades: [], heartbeats: [] }];
    mockFindMany.mockResolvedValue(mockInstances);
    mockFindUnique.mockResolvedValue({ tier: "PRO" });
    mockProofEventFindMany.mockResolvedValue([
      {
        strategyId: "ea_1",
        meta: { action: "RUN", reasonCode: "WITHIN_BOUNDS" },
        createdAt: new Date("2025-01-01T12:00:00Z"),
      },
    ]);
    mockComputeAnalytics.mockReturnValue({
      coveragePct: 99,
      runPct: 99,
      cadenceBreached: false,
      longestGapMs: 5000,
      totalEvents: 1,
    });

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).not.toBeNull();
    expect(result!.authority).toEqual({
      action: "RUN",
      reasonCode: "WITHIN_BOUNDS",
      decidedAt: "2025-01-01T12:00:00.000Z",
      strategyId: "ea_1",
    });
    expect(result!.analytics).toEqual(
      expect.objectContaining({ coveragePct: 99, cadenceBreached: false })
    );
  });

  it("returns null authority when no instances exist (skips phase 2)", async () => {
    mockFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue({ tier: "PRO" });

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).not.toBeNull();
    expect(result!.authority).toBeNull();
    expect(result!.analytics).toBeNull();
    // proofEventLog should not have been queried
    expect(mockProofEventFindMany).not.toHaveBeenCalled();
  });

  it("returns null authority/analytics when proof query fails (fail-closed, non-critical)", async () => {
    const mockInstances = [{ id: "ea_1", trades: [], heartbeats: [] }];
    mockFindMany.mockResolvedValue(mockInstances);
    mockFindUnique.mockResolvedValue({ tier: "PRO" });
    mockProofEventFindMany.mockRejectedValue(new Error("DB timeout on proof query"));

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    // Core data still returned — authority/analytics degrade gracefully
    expect(result).not.toBeNull();
    expect(result!.eaInstances).toEqual(mockInstances);
    expect(result!.authority).toBeNull();
    expect(result!.analytics).toBeNull();
  });

  it("picks most restrictive authority across multiple instances (STOP > PAUSE > RUN)", async () => {
    const mockInstances = [
      { id: "ea_1", trades: [], heartbeats: [] },
      { id: "ea_2", trades: [], heartbeats: [] },
    ];
    mockFindMany.mockResolvedValue(mockInstances);
    mockFindUnique.mockResolvedValue({ tier: "PRO" });
    mockProofEventFindMany.mockResolvedValue([
      {
        strategyId: "ea_1",
        meta: { action: "RUN", reasonCode: "WITHIN_BOUNDS" },
        createdAt: new Date("2025-01-01T12:01:00Z"),
      },
      {
        strategyId: "ea_2",
        meta: { action: "STOP", reasonCode: "HARD_LIMIT_BREACHED" },
        createdAt: new Date("2025-01-01T12:00:00Z"),
      },
    ]);

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result).not.toBeNull();
    expect(result!.authority!.action).toBe("STOP");
    expect(result!.authority!.reasonCode).toBe("HARD_LIMIT_BREACHED");
  });

  it("sanitizes action to PAUSE for unknown values in meta", async () => {
    const mockInstances = [{ id: "ea_1", trades: [], heartbeats: [] }];
    mockFindMany.mockResolvedValue(mockInstances);
    mockFindUnique.mockResolvedValue({ tier: "PRO" });
    mockProofEventFindMany.mockResolvedValue([
      {
        strategyId: "ea_1",
        meta: { action: "INVALID_ACTION", reasonCode: "OK" },
        createdAt: new Date("2025-01-01T12:00:00Z"),
      },
    ]);

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result!.authority!.action).toBe("PAUSE");
  });

  it("sanitizes authorityReasons, filtering invalid values", async () => {
    const mockInstances = [{ id: "ea_1", trades: [], heartbeats: [] }];
    mockFindMany.mockResolvedValue(mockInstances);
    mockFindUnique.mockResolvedValue({ tier: "PRO" });
    mockProofEventFindMany.mockResolvedValue([
      {
        strategyId: "ea_1",
        meta: {
          action: "PAUSE",
          reasonCode: "AUTHORITY_UNINITIALIZED",
          authorityReasons: ["NO_STRATEGIES", "INJECTED_VALUE", 42],
        },
        createdAt: new Date("2025-01-01T12:00:00Z"),
      },
    ]);

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result!.authority!.authorityReasons).toEqual(["NO_STRATEGIES"]);
  });

  it("does not include authorityReasons for non-AUTHORITY_UNINITIALIZED codes", async () => {
    const mockInstances = [{ id: "ea_1", trades: [], heartbeats: [] }];
    mockFindMany.mockResolvedValue(mockInstances);
    mockFindUnique.mockResolvedValue({ tier: "PRO" });
    mockProofEventFindMany.mockResolvedValue([
      {
        strategyId: "ea_1",
        meta: {
          action: "RUN",
          reasonCode: "OK",
          authorityReasons: ["NO_STRATEGIES"],
        },
        createdAt: new Date("2025-01-01T12:00:00Z"),
      },
    ]);

    const { loadMonitorData } = await import("./load-monitor-data");
    const result = await loadMonitorData("user_123");

    expect(result!.authority!.authorityReasons).toBeUndefined();
  });
});

describe("sanitizeAuthorityReasons", () => {
  it("returns empty array for non-array input", () => {
    expect(sanitizeAuthorityReasons(undefined)).toEqual([]);
    expect(sanitizeAuthorityReasons(null)).toEqual([]);
    expect(sanitizeAuthorityReasons("NO_STRATEGIES")).toEqual([]);
    expect(sanitizeAuthorityReasons(42)).toEqual([]);
    expect(sanitizeAuthorityReasons({})).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(sanitizeAuthorityReasons([])).toEqual([]);
  });

  it("keeps valid AuthorityBlockReason values", () => {
    expect(sanitizeAuthorityReasons(["NO_STRATEGIES"])).toEqual(["NO_STRATEGIES"]);
    expect(sanitizeAuthorityReasons(["NO_LIVE_INSTANCE"])).toEqual(["NO_LIVE_INSTANCE"]);
    expect(sanitizeAuthorityReasons(["NO_STRATEGIES", "NO_LIVE_INSTANCE"])).toEqual([
      "NO_STRATEGIES",
      "NO_LIVE_INSTANCE",
    ]);
  });

  it("filters out unknown string values", () => {
    expect(sanitizeAuthorityReasons(["INJECTED"])).toEqual([]);
    expect(sanitizeAuthorityReasons(["NO_STRATEGIES", "BOGUS", "NO_LIVE_INSTANCE"])).toEqual([
      "NO_STRATEGIES",
      "NO_LIVE_INSTANCE",
    ]);
  });

  it("filters out non-string values", () => {
    expect(sanitizeAuthorityReasons([42, null, true, "NO_STRATEGIES"])).toEqual(["NO_STRATEGIES"]);
  });

  it("caps output at 2 entries", () => {
    const input = ["NO_STRATEGIES", "NO_LIVE_INSTANCE", "NO_STRATEGIES"];
    expect(sanitizeAuthorityReasons(input)).toHaveLength(2);
  });
});
