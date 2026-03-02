import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_API_KEY = "test-internal-api-key-that-is-at-least-32-chars";

const mockMonitoringRunFindMany = vi.fn();
const mockProofEventLogFindMany = vi.fn();
const mockTradeFactFindMany = vi.fn();
const mockAlertOutboxCreate = vi.fn();
const mockVerifyProofChain = vi.fn();
const mockBuildTradeSnapshot = vi.fn();
const mockAppendProofEvent = vi.fn();

vi.mock("@/lib/csrf", () => ({
  timingSafeEqual: (a: string, b: string) => a === b,
}));

const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  internalIntegrityCheckRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limit exceeded."),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    monitoringRun: {
      findMany: (...args: unknown[]) => mockMonitoringRunFindMany(...args),
    },
    proofEventLog: {
      findMany: (...args: unknown[]) => mockProofEventLogFindMany(...args),
    },
    tradeFact: {
      findMany: (...args: unknown[]) => mockTradeFactFindMany(...args),
    },
    alertOutbox: {
      create: (...args: unknown[]) => mockAlertOutboxCreate(...args),
    },
  },
}));

vi.mock("@/lib/proof/chain", () => ({
  verifyProofChain: (...args: unknown[]) => mockVerifyProofChain(...args),
}));

vi.mock("@/lib/proof/events", () => ({
  appendProofEvent: (...args: unknown[]) => mockAppendProofEvent(...args),
}));

vi.mock("@/domain/trade-ingest", () => ({
  buildTradeSnapshot: (...args: unknown[]) => mockBuildTradeSnapshot(...args),
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
  return new NextRequest("http://localhost/api/internal/integrity/run", {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/internal/integrity/run", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.INTERNAL_API_KEY = TEST_API_KEY;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
      resetAt: new Date(),
    });
    mockMonitoringRunFindMany.mockResolvedValue([]);
    mockAlertOutboxCreate.mockResolvedValue({});
    mockAppendProofEvent.mockResolvedValue({ sequence: 1, eventHash: "eh_1" });
  });

  it("rejects requests without API key (401)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 3,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    expect(res.status).toBe(429);
  });

  it("invalid body returns 400", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ recordIdLimit: 999 }, TEST_API_KEY));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_FAILED");
  });

  it("returns zeros when no monitoring runs exist", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      chainsChecked: 0,
      chainsValid: 0,
      snapshotsChecked: 0,
      snapshotsValid: 0,
      failures: [],
    });
  });

  it("verifies valid proof chains", async () => {
    // Chain verification: 1 run found
    mockMonitoringRunFindMany
      .mockResolvedValueOnce([{ recordId: "rec_1", strategyId: "strat_1" }]) // chain pass
      .mockResolvedValueOnce([]); // snapshot pass (empty)

    mockProofEventLogFindMany.mockResolvedValue([
      {
        sequence: 1,
        strategyId: "strat_1",
        type: "MONITORING_RUN_COMPLETED",
        sessionId: "rec_1",
        eventHash: "hash_1",
        prevEventHash: "0".repeat(64),
        meta: {},
        createdAt: new Date(),
      },
    ]);

    mockVerifyProofChain.mockReturnValue({ valid: true, chainLength: 1 });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ snapshotSampleSize: 0 }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.chainsChecked).toBe(1);
    expect(json.chainsValid).toBe(1);
    expect(json.failures).toEqual([]);
    expect(mockVerifyProofChain).toHaveBeenCalledTimes(1);
  });

  it("detects broken proof chains and enqueues alert", async () => {
    mockMonitoringRunFindMany
      .mockResolvedValueOnce([{ recordId: "rec_1", strategyId: "strat_1" }])
      .mockResolvedValueOnce([]);

    mockProofEventLogFindMany.mockResolvedValue([]);

    mockVerifyProofChain.mockReturnValue({
      valid: false,
      chainLength: 0,
      breakAtSequence: 1,
      error: "Missing sequence 1",
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ snapshotSampleSize: 0 }, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.chainsChecked).toBe(1);
    expect(json.chainsValid).toBe(0);
    expect(json.failures).toHaveLength(1);
    expect(json.failures[0]).toContain("chain_broken:rec_1");

    // Alert enqueued
    expect(mockAlertOutboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "integrity_check_failed",
          dedupeKey: "integrity_failed:rec_1",
        }),
      })
    );
  });

  it("verifies matching snapshot hashes", async () => {
    // Chain pass: no runs
    mockMonitoringRunFindMany
      .mockResolvedValueOnce([]) // chain pass
      .mockResolvedValueOnce([
        { recordId: "rec_1", strategyId: "strat_1", tradeSnapshotHash: "abc123" },
      ]); // snapshot pass

    mockTradeFactFindMany.mockResolvedValue([
      { id: "tf_1", profit: 100, executedAt: new Date(), source: "LIVE" },
    ]);

    mockBuildTradeSnapshot.mockReturnValue({ snapshotHash: "abc123" });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.snapshotsChecked).toBe(1);
    expect(json.snapshotsValid).toBe(1);
    expect(json.failures).toEqual([]);
  });

  it("detects snapshot hash mismatches and enqueues alert", async () => {
    mockMonitoringRunFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { recordId: "rec_1", strategyId: "strat_1", tradeSnapshotHash: "stored_hash" },
      ]);

    mockTradeFactFindMany.mockResolvedValue([
      { id: "tf_1", profit: 100, executedAt: new Date(), source: "LIVE" },
    ]);

    mockBuildTradeSnapshot.mockReturnValue({ snapshotHash: "computed_hash" });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({}, TEST_API_KEY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.snapshotsChecked).toBe(1);
    expect(json.snapshotsValid).toBe(0);
    expect(json.failures).toHaveLength(1);
    expect(json.failures[0]).toContain("snapshot_mismatch:rec_1");

    expect(mockAlertOutboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "integrity_check_failed",
          dedupeKey: "integrity_failed:rec_1",
          payload: expect.objectContaining({
            checkType: "snapshot_hash",
            computedHash: "computed_hash",
            storedHash: "stored_hash",
          }),
        }),
      })
    );
  });

  it("writes INTEGRITY_CHECK_COMPLETED proof event", async () => {
    mockMonitoringRunFindMany.mockResolvedValue([]);

    const { POST } = await import("./route");
    await POST(makeRequest({ snapshotSampleSize: 0 }, TEST_API_KEY));

    expect(mockAppendProofEvent).toHaveBeenCalledWith(
      "__system__",
      "INTEGRITY_CHECK_COMPLETED",
      expect.objectContaining({
        eventType: "INTEGRITY_CHECK_COMPLETED",
        chainsChecked: 0,
        chainsValid: 0,
        snapshotsChecked: 0,
        snapshotsValid: 0,
        failureCount: 0,
      })
    );
  });
});
