/**
 * Integration test setup: forces Prisma to use TEST_DATABASE_URL (Neon dev
 * branch) and refuses to start if pointed at the production hostname. Belt-
 * and-suspenders so a test run cannot accidentally write to prod.
 *
 * IMPORTANT: this file MUST be imported before any module that imports
 * `@/lib/prisma`, because we override DATABASE_URL so the singleton client
 * points at the same dev branch as our local test client.
 */
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error(
    "TEST_DATABASE_URL is required for integration tests. Set it to a Neon dev branch URL."
  );
}

// Refuse to run if the URL looks like production. Adjust the deny-list if
// the prod hostname ever changes — this is a guardrail, not a security
// boundary.
const PROD_HOSTNAMES = ["ep-jolly-paper-ah237san"];
for (const needle of PROD_HOSTNAMES) {
  if (url.includes(needle) && !url.includes("br-")) {
    throw new Error(
      `TEST_DATABASE_URL points at a production hostname (${needle}). ` +
        `Use a Neon branch (typically contains 'br-' in the host) instead.`
    );
  }
}

// Redirect the application's prisma singleton too — must happen BEFORE any
// `import { prisma } from "@/lib/prisma"` runs.
process.env.DATABASE_URL = url;
process.env.DIRECT_DATABASE_URL = url;

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({ datasources: { db: { url } } });

/** Wipe all referral tables AND test users in dependency order. */
export async function resetReferralTables(): Promise<void> {
  // Order matters: ledger/payout/attribution/click reference partner;
  // partner references user. Test users use @test.local emails — only those
  // are deleted so any real prod-snapshot users in the branch stay intact.
  await prisma.referralLedger.deleteMany();
  await prisma.referralPayout.deleteMany();
  await prisma.referralAttribution.deleteMany();
  await prisma.referralClick.deleteMany();
  await prisma.referralInvite.deleteMany();
  await prisma.referralPartner.deleteMany({
    where: { user: { email: { endsWith: "@test.local" } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@test.local" } } });
  // Audit logs from prior test runs
  await prisma.auditLog.deleteMany({
    where: { eventType: { startsWith: "referral." } },
  });
}

/** Create a partner + their owning user. Returns both ids. */
export async function makePartner(opts?: {
  email?: string;
  status?: string;
  commissionBps?: number;
}): Promise<{ userId: string; partnerId: string; referralCode: string }> {
  const referralCode = `T${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  const email = opts?.email ?? `partner-${referralCode.toLowerCase()}@test.local`;
  const user = await prisma.user.create({
    data: {
      email,
      authProviderId: `test_${email}`,
      referralCode,
      subscription: { create: { tier: "PRO" } },
    },
  });
  const partner = await prisma.referralPartner.create({
    data: {
      userId: user.id,
      status: opts?.status ?? "ACTIVE",
      commissionBps: opts?.commissionBps ?? 2000,
    },
  });
  return { userId: user.id, partnerId: partner.id, referralCode };
}

/** Create a regular user with optional attribution to a partner. */
export async function makeReferredUser(
  partnerId: string,
  referralCode: string
): Promise<{ userId: string }> {
  const slug = Math.random().toString(36).slice(2, 12);
  const email = `referred-${slug}@test.local`;
  const user = await prisma.user.create({
    data: {
      email,
      authProviderId: `test_${email}`,
      referralCode: `R${slug.toUpperCase()}`, // unique 11-char code per user
      referredBy: referralCode,
      subscription: { create: { tier: "PRO" } },
    },
  });
  await prisma.referralAttribution.create({
    data: { referredUserId: user.id, partnerId, referralCode, status: "PENDING" },
  });
  return { userId: user.id };
}

/** Tear down the prisma client so the test process can exit. */
export async function teardown(): Promise<void> {
  await prisma.$disconnect();
}
