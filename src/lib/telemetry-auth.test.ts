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
  telemetryRateLimiter: { _tag: "telemetry" },
  telemetryPreauthRateLimiter: { _tag: "preauth" },
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: (req: Request) => req.headers.get("x-forwarded-for") || "127.0.0.1",
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

function makeRequest(opts: { key?: string | null; contentType?: string; ip?: string } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": opts.contentType ?? "application/json",
  };
  if (opts.key !== null && opts.key !== undefined) {
    headers["X-EA-Key"] = opts.key;
  }
  if (opts.ip) {
    headers["x-forwarded-for"] = opts.ip;
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

/** Extract the limiter and key from a specific checkRateLimit call */
function getRateLimitCall(index: number) {
  const call = mockCheckRateLimit.mock.calls[index];
  return { limiter: call?.[0], key: call?.[1] as string };
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

  // ── Pre-auth rate limiting ────────────────────────────────────────

  it("pre-auth rate limit runs before anything else", async () => {
    // Make pre-auth limiter reject
    mockCheckRateLimit.mockResolvedValueOnce({ success: false });
    const result = await authenticateTelemetry(makeRequest({ key: VALID_KEY }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(429);
    }

    // Only one rate limit call (pre-auth), no DB calls
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("pre-auth limiter key uses IP hash, not user-supplied key", async () => {
    await authenticateTelemetry(makeRequest({ key: VALID_KEY, ip: "1.2.3.4" }));

    const { key } = getRateLimitCall(0);
    expect(key).toMatch(/^telemetry:preauth:/);
    // Must NOT contain the raw key or its hash
    const keyHash = createHash("sha256").update(VALID_KEY).digest("hex");
    expect(key).not.toContain(VALID_KEY);
    expect(key).not.toContain(keyHash);
  });

  it("same IP produces same pre-auth limiter key regardless of supplied key", async () => {
    const ip = "10.0.0.1";
    await authenticateTelemetry(makeRequest({ key: "b".repeat(64), ip }));
    const key1 = getRateLimitCall(0).key;

    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true });
    await authenticateTelemetry(makeRequest({ key: "c".repeat(64), ip }));
    const key2 = getRateLimitCall(0).key;

    expect(key1).toBe(key2);
  });

  it("missing X-EA-Key is still rate-limited by pre-auth", async () => {
    await authenticateTelemetry(makeRequest({}));
    // Pre-auth rate limit was called
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    const { key } = getRateLimitCall(0);
    expect(key).toMatch(/^telemetry:preauth:/);
  });

  it("invalid hex key is still rate-limited by pre-auth", async () => {
    await authenticateTelemetry(makeRequest({ key: "not-hex-!@#$%^&*()_+long-enough-string" }));
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    const { key } = getRateLimitCall(0);
    expect(key).toMatch(/^telemetry:preauth:/);
  });

  // ── Post-auth per-instance rate limiting ──────────────────────────

  it("post-auth rate limit uses verified instanceId", async () => {
    mockInstanceFound();
    await authenticateTelemetry(makeRequest({ key: VALID_KEY }));

    // Two rate limit calls: pre-auth (IP) + post-auth (instanceId)
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);
    const { key } = getRateLimitCall(1);
    expect(key).toBe(`telemetry:${INSTANCE_ID}`);
  });

  it("post-auth rate limit rejection returns 429", async () => {
    mockInstanceFound();
    // Pre-auth passes, post-auth rejects
    mockCheckRateLimit
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false });

    const result = await authenticateTelemetry(makeRequest({ key: VALID_KEY }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(429);
    }
  });

  // ── Content-Type / key validation / auth ──────────────────────────

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

  it("returns 401 for unknown key (no existence leakage)", async () => {
    const result = await authenticateTelemetry(makeRequest({ key: VALID_KEY }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(result.response.status).toBe(401);
      expect(body.code).toBe("INVALID_API_KEY");
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
