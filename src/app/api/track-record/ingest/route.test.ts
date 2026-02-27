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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/track-record/chain-verifier", () => ({
  verifySingleEvent: vi.fn(),
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
    it("returns 400 with validation details", async () => {
      const { POST } = await import("./route");
      const request = makeRequest({ eventType: "INVALID", seqNo: -1 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
    });
  });
});
