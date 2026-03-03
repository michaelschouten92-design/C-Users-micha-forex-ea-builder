import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
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
});
