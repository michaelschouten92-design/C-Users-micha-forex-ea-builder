import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    subscription: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

describe("loadMonitorData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure DATABASE_URL is present for all tests (diagnostic check)
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
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
});
