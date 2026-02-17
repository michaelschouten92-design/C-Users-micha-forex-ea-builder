import { describe, it, expect, beforeEach } from "vitest";

// Create a fresh rate limiter for testing
class TestRateLimiter {
  private store: Map<string, { count: number; resetAt: number }> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(config: { limit: number; windowMs: number }) {
    this.limit = config.limit;
    this.windowMs = config.windowMs;
  }

  check(key: string) {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        resetAt: new Date(resetAt),
      };
    }

    if (entry.count >= this.limit) {
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        resetAt: new Date(entry.resetAt),
      };
    }

    entry.count++;
    return {
      success: true,
      limit: this.limit,
      remaining: this.limit - entry.count,
      resetAt: new Date(entry.resetAt),
    };
  }

  reset() {
    this.store.clear();
  }
}

describe("RateLimiter", () => {
  let limiter: TestRateLimiter;

  beforeEach(() => {
    limiter = new TestRateLimiter({ limit: 3, windowMs: 1000 });
  });

  it("allows requests within limit", () => {
    const result1 = limiter.check("user1");
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = limiter.check("user1");
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = limiter.check("user1");
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("blocks requests exceeding limit", () => {
    limiter.check("user1");
    limiter.check("user1");
    limiter.check("user1");

    const result = limiter.check("user1");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks different users separately", () => {
    limiter.check("user1");
    limiter.check("user1");
    limiter.check("user1");

    // User1 is now limited
    expect(limiter.check("user1").success).toBe(false);

    // User2 should still be allowed
    expect(limiter.check("user2").success).toBe(true);
  });

  it("resets after window expires", async () => {
    const shortLimiter = new TestRateLimiter({ limit: 1, windowMs: 50 });

    shortLimiter.check("user1");
    expect(shortLimiter.check("user1").success).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(shortLimiter.check("user1").success).toBe(true);
  });

  it("returns correct rate limit info", () => {
    const result = limiter.check("user1");
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(2);
    expect(result.resetAt).toBeInstanceOf(Date);
  });
});
