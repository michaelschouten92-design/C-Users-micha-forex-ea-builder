import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
vi.mock("./prisma", () => ({
  prisma: {
    liveEAInstance: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue({ success: true });
vi.mock("./rate-limit", () => ({
  telemetryRateLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("./error-codes", async () => {
  const actual = await vi.importActual("./error-codes");
  return actual;
});

vi.mock("./validations", () => ({
  checkContentType: (req: Request) => {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return new Response("bad ct", { status: 415 });
    return null;
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────

// Valid hex key (64 chars)
const VALID_KEY = "a".repeat(64);
const INSTANCE_ID = "inst_123";
const USER_ID = "user_456";

function makeRequest(opts: { key?: string | null; contentType?: string } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": opts.contentType ?? "application/json",
  };
  if (opts.key !== null && opts.key !== undefined) {
    headers["X-EA-Key"] = opts.key;
  }
  return new Request("http://localhost/api/telemetry/heartbeat", {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
}

function mockInstanceFound() {
  const hash = createHash("sha256").update(VALID_KEY).digest("hex");
  mockFindUnique.mockResolvedValue({
    id: INSTANCE_ID,
    userId: USER_ID,
    apiKeyHash: hash,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("authenticateTelemetry", () => {
  let authenticateTelemetry: typeof import("./telemetry-auth").authenticateTelemetry;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    const mod = await import("./telemetry-auth");
    authenticateTelemetry = mod.authenticateTelemetry;
  });

  it("rejects missing Content-Type with 415", async () => {
    const result = await authenticateTelemetry(
      makeRequest({ key: VALID_KEY, contentType: "text/plain" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(result.response.status).toBe(415);
      expect(body.code).toBe("INVALID_CONTENT_TYPE");
    }
  });

  it("rejects missing X-EA-Key with 401", async () => {
    const result = await authenticateTelemetry(makeRequest({ key: undefined }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(result.response.status).toBe(401);
      expect(body.code).toBe("MISSING_API_KEY");
    }
  });

  it("rejects non-hex key with 401 without hitting DB", async () => {
    const result = await authenticateTelemetry(
      makeRequest({ key: "not-a-hex-key-!@#$%^&*()_+long-enough" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(result.response.status).toBe(401);
      expect(body.code).toBe("INVALID_API_KEY");
    }
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("rejects too-short key with 401", async () => {
    const result = await authenticateTelemetry(makeRequest({ key: "abcd1234" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rate-limits before verifying key (prevents brute-force)", async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false });
    const result = await authenticateTelemetry(makeRequest({ key: VALID_KEY }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(429);
      const body = await result.response.json();
      expect(body.code).toBe("RATE_LIMITED");
    }
    // Key should NOT have been verified (rate limit fires first)
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns 401 for unknown key (no existence leakage)", async () => {
    const result = await authenticateTelemetry(makeRequest({ key: VALID_KEY }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(result.response.status).toBe(401);
      expect(body.code).toBe("INVALID_API_KEY");
      // Should NOT leak whether a key exists or not
      expect(body.error).toBe("Invalid API key");
    }
  });

  it("succeeds for valid key", async () => {
    mockInstanceFound();
    const result = await authenticateTelemetry(makeRequest({ key: VALID_KEY }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.instanceId).toBe(INSTANCE_ID);
      expect(result.userId).toBe(USER_ID);
    }
  });

  it("trims whitespace from key", async () => {
    mockInstanceFound();
    const result = await authenticateTelemetry(makeRequest({ key: `  ${VALID_KEY}  ` }));
    expect(result.success).toBe(true);
  });
});

describe("hashApiKey", () => {
  it("produces consistent SHA-256 hex", async () => {
    const { hashApiKey } = await import("./telemetry-auth");
    const hash1 = hashApiKey("test");
    const hash2 = hashApiKey("test");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });
});
