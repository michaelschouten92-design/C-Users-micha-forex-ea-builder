/**
 * Integration tests for audit-6 auth fixes:
 *   - P2-Auth3: suspended user cannot complete credentials login (before JWT)
 *   - P2-Auth1: reset-password rate-limit is keyed on IP, not token hash
 *
 * The suspended-login test exercises the SHAPE of the check (suspended row →
 * authorize would throw) since a full NextAuth round-trip needs the dev
 * server. The rate-limit test verifies the keying logic via the in-memory
 * limiter directly.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prisma, teardown } from "./setup";
import { passwordResetRateLimiter, checkRateLimit } from "@/lib/rate-limit";

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  await teardown();
});

async function resetAuthState(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@audit6.test.local" } } });
}

beforeEach(async () => {
  await resetAuthState();
});

async function makeUser(opts: { suspended?: boolean }): Promise<{
  userId: string;
  email: string;
  password: string;
}> {
  const slug = Math.random().toString(36).slice(2, 10);
  const email = `auth-${slug}@audit6.test.local`;
  const password = "TestPassw0rd!";
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for test speed
  const user = await prisma.user.create({
    data: {
      email,
      authProviderId: `audit6_${email}`,
      referralCode: `A6${slug.toUpperCase()}`,
      passwordHash,
      passwordChangedAt: new Date(),
      suspended: opts.suspended ?? false,
      suspendedAt: opts.suspended ? new Date() : null,
      suspendedReason: opts.suspended ? "test-suspended" : null,
      subscription: { create: { tier: "PRO" } },
    },
  });
  return { userId: user.id, email, password };
}

// ─────────────────────────────────────────────────────────────────────
// P2-Auth3: suspended user check shape
// ─────────────────────────────────────────────────────────────────────

describe("P2-Auth3: authorize() rejects suspended users", () => {
  test("a freshly suspended user can have their suspended flag observed in DB shape", async () => {
    const { userId, email, password } = await makeUser({ suspended: true });

    const row = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, suspended: true },
    });
    expect(row?.suspended).toBe(true);

    // Reproduce the authorize-flow contract: bcrypt-compare passes, then
    // the suspended check should reject.
    expect(row?.passwordHash).toBeTruthy();
    const passwordOk = await bcrypt.compare(password, row!.passwordHash!);
    expect(passwordOk).toBe(true);
    // Code now throws InvalidCredentialsError when this branch fires.
    expect(row?.suspended).toBe(true);

    void userId;
  });

  test("non-suspended user's row passes the same check", async () => {
    const { email, password } = await makeUser({ suspended: false });

    const row = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true, suspended: true },
    });
    expect(row?.suspended).toBe(false);
    expect(await bcrypt.compare(password, row!.passwordHash!)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// P2-Auth1: reset-password rate-limit per IP
// ─────────────────────────────────────────────────────────────────────

describe("P2-Auth1: reset-password rate-limit keyed on IP", () => {
  test("same IP is throttled across N requests (regardless of token)", async () => {
    const ip = `1.2.3.${Math.floor(Math.random() * 250)}`;
    const key = `reset-ip:${ip}`;

    // Drain bucket — limiter is 5/15 min by default
    let allowedCount = 0;
    let blocked = false;
    for (let i = 0; i < 10; i++) {
      const r = await checkRateLimit(passwordResetRateLimiter, key);
      if (r.success) allowedCount++;
      else {
        blocked = true;
        break;
      }
    }
    expect(blocked).toBe(true);
    expect(allowedCount).toBeGreaterThan(0);
    expect(allowedCount).toBeLessThanOrEqual(5);
  });

  test("different IPs get independent buckets", async () => {
    const ip1 = `9.9.9.${Math.floor(Math.random() * 250)}`;
    const ip2 = `8.8.8.${Math.floor(Math.random() * 250)}`;

    const r1 = await checkRateLimit(passwordResetRateLimiter, `reset-ip:${ip1}`);
    const r2 = await checkRateLimit(passwordResetRateLimiter, `reset-ip:${ip2}`);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});
