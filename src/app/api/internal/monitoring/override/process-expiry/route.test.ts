import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockAppendProofEventInTx = vi.fn();
const mockOverrideRequestFindMany = vi.fn();
const mockOverrideRequestUpdate = vi.fn();
const mockLiveEAInstanceUpdateMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalOverrideRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded. Try again in 60 seconds."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    overrideRequest: {
      findMany: (...args: unknown[]) => mockOverrideRequestFindMany(...args),
    },
  },
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEventInTx: (_tx: unknown, ...args: unknown[]) => mockAppendProofEventInTx(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

function makeRequest(body?: object, apiKey?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-internal-api-key"] = apiKey;
  }
  return new NextRequest("http://localhost/api/internal/monitoring/override/process-expiry", {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  });
}

describe("POST /api/internal/monitoring/override/process-expiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      resetAt: new Date(),
    });
    mockOverrideRequestFindMany.mockResolvedValue([]);
    mockAppendProofEventInTx.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
    mockOverrideRequestUpdate.mockResolvedValue({ id: "or_1", status: "EXPIRED" });
    mockLiveEAInstanceUpdateMany.mockResolvedValue({ count: 1 });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        overrideRequest: {
          update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
        },
        liveEAInstance: {
          updateMany: (...args: unknown[]) => mockLiveEAInstanceUpdateMany(...args),
        },
      };
      return fn(tx);
    });
  });

  // Test 1: Auth
  it("rejects requests without API key (401)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, undefined));
    expect(res.status).toBe(401);
  });

  // Test 2: No expired overrides
  it("returns expired: 0 when no expired overrides", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ expired: 0, errors: [] });
  });

  // Test 3: Expires PENDING override
  it("expires PENDING override: proof-first, status -> EXPIRED, operatorHold -> HALTED", async () => {
    mockOverrideRequestFindMany.mockResolvedValue([
      {
        id: "or_1",
        strategyId: "strat_1",
        status: "PENDING",
        expiresAt: new Date(Date.now() - 1000),
      },
    ]);

    const callOrder: string[] = [];
    mockAppendProofEventInTx.mockImplementation(async () => {
      callOrder.push("appendProofEventInTx");
      return { sequence: 1, eventHash: "eh_1" };
    });
    mockOverrideRequestUpdate.mockImplementation(async () => {
      callOrder.push("overrideRequest.update");
      return { id: "or_1", status: "EXPIRED" };
    });
    mockLiveEAInstanceUpdateMany.mockImplementation(async () => {
      callOrder.push("liveEAInstance.updateMany");
      return { count: 1 };
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.expired).toBe(1);
    expect(json.errors).toEqual([]);

    // Proof-first
    expect(callOrder[0]).toBe("appendProofEventInTx");
    expect(mockOverrideRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "EXPIRED" }),
      })
    );
    expect(mockLiveEAInstanceUpdateMany).toHaveBeenCalled();
  });

  // Test 4: Expires APPROVED override
  it("expires APPROVED override", async () => {
    mockOverrideRequestFindMany.mockResolvedValue([
      {
        id: "or_2",
        strategyId: "strat_2",
        status: "APPROVED",
        expiresAt: new Date(Date.now() - 1000),
      },
    ]);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.expired).toBe(1);
  });

  // Test 5: Error in one doesn't block others
  it("error in one override does not block others", async () => {
    mockOverrideRequestFindMany.mockResolvedValue([
      {
        id: "or_fail",
        strategyId: "strat_fail",
        status: "PENDING",
        expiresAt: new Date(Date.now() - 1000),
      },
      {
        id: "or_ok",
        strategyId: "strat_ok",
        status: "PENDING",
        expiresAt: new Date(Date.now() - 1000),
      },
    ]);

    let callCount = 0;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Simulated failure");
      }
      const tx = {
        overrideRequest: {
          update: (...args: unknown[]) => mockOverrideRequestUpdate(...args),
        },
        liveEAInstance: {
          updateMany: (...args: unknown[]) => mockLiveEAInstanceUpdateMany(...args),
        },
      };
      return fn(tx);
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.expired).toBe(1);
    expect(json.errors).toHaveLength(1);
    expect(json.errors[0]).toContain("or_fail");
  });
});
