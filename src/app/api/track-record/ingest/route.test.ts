import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuthenticateTelemetry = vi.fn();
vi.mock("@/lib/telemetry-auth", () => ({
  authenticateTelemetry: (...args: unknown[]) => mockAuthenticateTelemetry(...args),
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/track-record/rate-limiter", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

const mockLoggerError = vi.fn();
const mockLoggerWarn = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockSentryCaptureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockSentryCaptureException(...args),
}));

const mockTransaction = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockVerifySingleEvent = vi.fn();
vi.mock("@/lib/track-record/chain-verifier", () => ({
  verifySingleEvent: (...args: unknown[]) => mockVerifySingleEvent(...args),
}));

vi.mock("@/lib/track-record/state-manager", () => ({
  processEvent: vi.fn(),
  stateToDbUpdate: vi.fn(),
  stateFromDb: vi.fn(),
}));

vi.mock("@/lib/track-record/checkpoint", () => ({
  shouldCreateCheckpoint: vi.fn(),
  buildCheckpointData: vi.fn(),
  computeCheckpointHmac: vi.fn(),
}));

vi.mock("@/lib/track-record/ledger-commitment", () => ({
  shouldCreateCommitment: vi.fn(),
  buildCommitmentData: vi.fn(),
}));

vi.mock("@/lib/track-record/payload-schemas", () => ({
  validatePayload: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/strategy-health", () => ({
  evaluateHealthIfDue: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────

const INSTANCE_ID = "inst_test_123";
const USER_ID = "user_test_456";

function makeRequest(body: string | object, contentType = "application/json") {
  return new NextRequest("http://localhost/api/track-record/ingest", {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-EA-Key": "test-api-key-that-is-at-least-32-chars-long",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function authSuccess() {
  mockAuthenticateTelemetry.mockResolvedValue({
    success: true,
    instanceId: INSTANCE_ID,
    userId: USER_ID,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("POST /api/track-record/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSuccess();
  });

  describe("malformed JSON body", () => {
    it("returns 400 with error message", async () => {
      const { POST } = await import("./route");
      const request = makeRequest("{ not valid json !!!");
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid JSON");
    });

    it("logs the parse error with instanceId", async () => {
      const { POST } = await import("./route");
      const request = makeRequest("<<<broken>>>");
      await POST(request);

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ instanceId: INSTANCE_ID }),
        expect.stringContaining("malformed JSON body")
      );
    });

    it("reports to Sentry with instanceId context", async () => {
      const { POST } = await import("./route");
      const request = makeRequest("{truncated");
      await POST(request);

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          extra: expect.objectContaining({
            instanceId: INSTANCE_ID,
            context: "track-record-json-parse",
          }),
        })
      );
    });

    it("returns 400 for empty body", async () => {
      const { POST } = await import("./route");
      const request = makeRequest("");
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("valid JSON but invalid schema", () => {
    it("returns 400 with validation details and code", async () => {
      const { POST } = await import("./route");
      const request = makeRequest({ eventType: "INVALID", seqNo: -1 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
      expect(body.code).toBe("VALIDATION_FAILED");
      expect(body.details).toBeDefined();
    });
  });

  describe("chain fork prevention — 409 contract for EA queue flush", () => {
    // These tests verify the backend contract that the EA's FlushOfflineQueue relies on.
    // The EA advances local chain state on enqueue (enqueue = local commit), then
    // replays queued events later. The backend must return 409 for past/duplicate seqNos
    // so the EA can skip them and continue flushing.

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      trackRecordState: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      trackRecordEvent: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      liveEAInstance: {
        findUnique: vi.fn().mockResolvedValue({ createdAt: new Date("2025-01-01") }),
      },
      tradeCloseClaim: { create: vi.fn() },
      trackRecordCheckpoint: { create: vi.fn() },
      ledgerCommitment: { create: vi.fn() },
    };

    function validEvent(seqNo: number, prevHash: string, eventHash: string) {
      return {
        eventType: "SNAPSHOT",
        seqNo,
        prevHash,
        eventHash,
        timestamp: Math.floor(Date.now() / 1000) - 60,
        payload: {},
      };
    }

    beforeEach(() => {
      // Reset all mockTx sub-mocks
      mockTx.$queryRaw.mockResolvedValue([]);
      mockTx.trackRecordState.findUnique.mockReset();
      mockTx.trackRecordState.create.mockReset();
      mockTx.trackRecordState.update.mockReset();
      mockTx.trackRecordEvent.findUnique.mockReset();
      mockTx.trackRecordEvent.create.mockReset();
      mockTx.tradeCloseClaim.create.mockReset();
      mockTx.liveEAInstance.findUnique.mockResolvedValue({ createdAt: new Date("2025-01-01") });
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
        return fn(mockTx);
      });
    });

    it("returns 409 DUPLICATE_EVENT for past seqNo (server already ahead)", async () => {
      // Server state: lastSeqNo=5
      mockTx.trackRecordState.findUnique.mockResolvedValue({
        instanceId: INSTANCE_ID,
        lastSeqNo: 5,
        lastEventHash: "b".repeat(64),
      });

      const { POST } = await import("./route");
      // EA sends queued event with seqNo=3 (past)
      const response = await POST(makeRequest(validEvent(3, "a".repeat(64), "c".repeat(64))));

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.code).toBe("DUPLICATE_EVENT");
    });

    it("returns 200 for idempotent resend of exact same seqNo+eventHash", async () => {
      const hash = "d".repeat(64);
      mockTx.trackRecordState.findUnique.mockResolvedValue({
        instanceId: INSTANCE_ID,
        lastSeqNo: 5,
        lastEventHash: hash,
      });
      // First call: receivedAt monotonicity check; second call: idempotency check
      mockTx.trackRecordEvent.findUnique
        .mockResolvedValueOnce({ receivedAt: new Date() })
        .mockResolvedValueOnce({ eventHash: hash });

      const { POST } = await import("./route");
      const response = await POST(makeRequest(validEvent(5, "a".repeat(64), hash)));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.lastSeqNo).toBe(5);
    });

    it("returns 409 for same seqNo but different eventHash (chain fork)", async () => {
      mockTx.trackRecordState.findUnique.mockResolvedValue({
        instanceId: INSTANCE_ID,
        lastSeqNo: 5,
        lastEventHash: "e".repeat(64),
      });
      // First call: receivedAt monotonicity check; second call: idempotency check (different hash)
      mockTx.trackRecordEvent.findUnique
        .mockResolvedValueOnce({ receivedAt: new Date() })
        .mockResolvedValueOnce({ eventHash: "e".repeat(64) });

      const { POST } = await import("./route");
      // EA sends seqNo=5 with different hash — fork attempt
      const response = await POST(makeRequest(validEvent(5, "a".repeat(64), "f".repeat(64))));

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.code).toBe("DUPLICATE_EVENT");
    });

    it("returns 409 with CHAIN_VERIFICATION_FAILED when prevHash mismatches", async () => {
      const serverHash = "g".repeat(64);
      mockTx.trackRecordState.findUnique.mockResolvedValue({
        instanceId: INSTANCE_ID,
        lastSeqNo: 5,
        lastEventHash: serverHash,
      });

      // Mock chain verifier to reject
      mockVerifySingleEvent.mockReturnValue({
        valid: false,
        error: "prevHash mismatch: expected " + serverHash,
      });

      const { POST } = await import("./route");
      // EA sends seqNo=6 but with wrong prevHash
      const response = await POST(makeRequest(validEvent(6, "x".repeat(64), "h".repeat(64))));

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.code).toBe("CHAIN_VERIFICATION_FAILED");
      // Response includes server state so EA can diagnose
      expect(body.lastSeqNo).toBe(5);
      expect(body.lastEventHash).toBe(serverHash);
    });

    it("returns 400 VALIDATION_FAILED for invalid payload (permanent client error for EA)", async () => {
      // This proves the backend returns a stable 4xx (not 409, not 429, not 5xx)
      // for validation errors. The EA classifies this as a permanent client error
      // and increments the poison retry count.
      const { POST } = await import("./route");
      // Valid JSON, valid schema shape, but payload validation fails
      const response = await POST(
        makeRequest({
          eventType: "INVALID_TYPE",
          seqNo: 1,
          prevHash: "0".repeat(64),
          eventHash: "a".repeat(64),
          timestamp: Math.floor(Date.now() / 1000) - 60,
          payload: {},
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe("VALIDATION_FAILED");
      // Key: status is NOT 409, NOT 429, NOT 5xx — EA treats as permanent
      expect(response.status).not.toBe(409);
      expect(response.status).not.toBe(429);
      expect(response.status).toBeLessThan(500);
    });

    it("returns 400 for future timestamp (permanent, not retryable)", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        makeRequest({
          eventType: "SNAPSHOT",
          seqNo: 1,
          prevHash: "0".repeat(64),
          eventHash: "a".repeat(64),
          timestamp: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
          payload: {},
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe("VALIDATION_FAILED");
    });

    it("returns 500 on internal error (EA should stop flush and retry later)", async () => {
      mockTransaction.mockRejectedValue(new Error("DB connection lost"));

      const { POST } = await import("./route");
      const response = await POST(makeRequest(validEvent(1, "0".repeat(64), "a".repeat(64))));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("error response shape", () => {
    it("malformed JSON has stable {error, code} shape", async () => {
      const { POST } = await import("./route");
      const response = await POST(makeRequest("not json"));
      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("code");
      expect(body.code).toBe("INVALID_JSON");
    });

    it("auth failure returns 401 from authenticateTelemetry", async () => {
      const { NextResponse } = await import("next/server");
      mockAuthenticateTelemetry.mockResolvedValue({
        success: false,
        response: NextResponse.json(
          { error: "Missing X-EA-Key header", code: "MISSING_API_KEY" },
          { status: 401 }
        ),
      });
      const { POST } = await import("./route");
      const response = await POST(makeRequest({}));
      expect(response.status).toBe(401);
    });

    it("rate limit returns 429 with code", async () => {
      mockCheckRateLimit.mockResolvedValue("Rate limit exceeded");
      const { POST } = await import("./route");
      const response = await POST(makeRequest({}));
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.code).toBe("RATE_LIMITED");
    });
  });

  describe("duplicate TRADE_CLOSE guard (TradeCloseClaim)", () => {
    // Prisma P2002 error for unique constraint violation
    class MockP2002 extends Error {
      code = "P2002";
      constructor() { super("Unique constraint failed"); Object.setPrototypeOf(this, MockP2002.prototype); }
    }
    // Patch class name so instanceof checks in route work
    Object.defineProperty(MockP2002.prototype, "constructor", { value: MockP2002 });

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      trackRecordState: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      trackRecordEvent: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      tradeCloseClaim: { create: vi.fn() },
      liveEAInstance: {
        findUnique: vi.fn().mockResolvedValue({ createdAt: new Date("2025-01-01") }),
      },
      trackRecordCheckpoint: { create: vi.fn() },
      ledgerCommitment: { create: vi.fn() },
    };

    function tradeCloseEvent(seqNo: number, ticket: string | null) {
      return {
        eventType: "TRADE_CLOSE",
        seqNo,
        prevHash: "a".repeat(64),
        eventHash: "b".repeat(64),
        timestamp: Math.floor(Date.now() / 1000) - 60,
        payload: {
          ...(ticket !== null ? { ticket } : {}),
          closePrice: 1.1, profit: 50, swap: 0, commission: -2, closeReason: "tp",
        },
      };
    }

    beforeEach(() => {
      vi.clearAllMocks();
      authSuccess();
      mockTx.$queryRaw.mockResolvedValue([]);
      mockTx.trackRecordState.findUnique.mockReset();
      mockTx.trackRecordState.create.mockReset();
      mockTx.trackRecordState.update.mockReset();
      mockTx.trackRecordEvent.findUnique.mockReset();
      mockTx.trackRecordEvent.create.mockReset();
      mockTx.tradeCloseClaim.create.mockReset();
      mockTx.liveEAInstance.findUnique.mockResolvedValue({ createdAt: new Date("2025-01-01") });
      mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
        return fn(mockTx);
      });
    });

    it("first TRADE_CLOSE for a ticket succeeds (claim insert works)", async () => {
      mockTx.trackRecordState.findUnique.mockResolvedValue({
        instanceId: INSTANCE_ID, lastSeqNo: 5, lastEventHash: "a".repeat(64),
      });
      // Claim insert succeeds (first close)
      mockTx.tradeCloseClaim.create.mockResolvedValue({ id: "claim_1" });

      mockVerifySingleEvent.mockReturnValue({ valid: true });
      const { stateFromDb, processEvent, stateToDbUpdate } = await import("@/lib/track-record/state-manager");
      (stateFromDb as ReturnType<typeof vi.fn>).mockReturnValue({
        lastSeqNo: 5, lastEventHash: "a".repeat(64), openPositions: [{ ticket: "12345" }],
      });
      (processEvent as ReturnType<typeof vi.fn>).mockReturnValue({ lastSeqNo: 6, lastEventHash: "b".repeat(64) });
      (stateToDbUpdate as ReturnType<typeof vi.fn>).mockReturnValue({});
      const { shouldCreateCheckpoint } = await import("@/lib/track-record/checkpoint");
      (shouldCreateCheckpoint as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const { shouldCreateCommitment } = await import("@/lib/track-record/ledger-commitment");
      (shouldCreateCommitment as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const { POST } = await import("./route");
      const response = await POST(makeRequest(tradeCloseEvent(6, "12345")));

      expect(response.status).toBe(200);
      expect(mockTx.tradeCloseClaim.create).toHaveBeenCalledWith({
        data: { instanceId: INSTANCE_ID, ticket: "12345", seqNo: 6 },
      });
      expect(mockTx.trackRecordState.update).toHaveBeenCalled();
      expect(mockTx.trackRecordEvent.create).toHaveBeenCalled();
    });

    it("second TRADE_CLOSE for same ticket returns 409 (P2002 on claim)", async () => {
      mockTx.trackRecordState.findUnique.mockResolvedValue({
        instanceId: INSTANCE_ID, lastSeqNo: 6, lastEventHash: "b".repeat(64),
      });
      // Claim insert fails with P2002 (ticket already claimed)
      mockTx.tradeCloseClaim.create.mockRejectedValue(new MockP2002());

      const { POST } = await import("./route");
      const response = await POST(makeRequest(tradeCloseEvent(7, "12345")));

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.code).toBe("DUPLICATE_EVENT");
      expect(body.error).toContain("12345");
      // No state mutation must have occurred
      expect(mockTx.trackRecordState.update).not.toHaveBeenCalled();
      expect(mockTx.trackRecordEvent.create).not.toHaveBeenCalled();
    });

    it("TRADE_CLOSE without ticket returns 400", async () => {
      mockTx.trackRecordState.findUnique.mockResolvedValue({
        instanceId: INSTANCE_ID, lastSeqNo: 5, lastEventHash: "a".repeat(64),
      });

      const { POST } = await import("./route");
      const response = await POST(makeRequest(tradeCloseEvent(6, null)));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe("VALIDATION_FAILED");
      expect(mockTx.tradeCloseClaim.create).not.toHaveBeenCalled();
      expect(mockTx.trackRecordState.update).not.toHaveBeenCalled();
    });

    it("seqNo idempotency still works (same seqNo+hash returns 200 without claim)", async () => {
      const hash = "d".repeat(64);
      mockTx.trackRecordState.findUnique.mockResolvedValue({
        instanceId: INSTANCE_ID, lastSeqNo: 5, lastEventHash: hash,
      });
      // Exact same seqNo as last processed
      mockTx.trackRecordEvent.findUnique.mockResolvedValue({ eventHash: hash });

      const { POST } = await import("./route");
      const response = await POST(makeRequest({
        eventType: "TRADE_CLOSE", seqNo: 5, prevHash: "a".repeat(64), eventHash: hash,
        timestamp: Math.floor(Date.now() / 1000) - 60,
        payload: { ticket: "99999", closePrice: 1.0, profit: 10, swap: 0, commission: 0, closeReason: "sl" },
      }));

      expect(response.status).toBe(200);
      // Idempotent path: no claim insert, no state update
      expect(mockTx.tradeCloseClaim.create).not.toHaveBeenCalled();
      expect(mockTx.trackRecordState.update).not.toHaveBeenCalled();
    });
  });
});
