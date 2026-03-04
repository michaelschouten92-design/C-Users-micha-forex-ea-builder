/**
 * Demo seed — creates exactly ONE public proof page for showcasing AlgoStudio.
 *
 * Idempotent: safe to re-run. Uses fixed IDs to enable upsert.
 * Reversible: `npx tsx scripts/demo-seed.ts --teardown` removes all demo data.
 *
 * Usage:
 *   npx tsx scripts/demo-seed.ts              # seed
 *   npx tsx scripts/demo-seed.ts --teardown   # remove
 *
 * Requires DATABASE_URL in env (or .env loaded by prisma).
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

// ---------- Fixed IDs (deterministic, idempotent) ----------

const DEMO_USER_ID = "demo_user_000000000000000";
const DEMO_PROJECT_ID = "demo_project_00000000000";
const DEMO_IDENTITY_ID = "demo_identity_000000000";
const DEMO_PAGE_ID = "demo_page_0000000000000";

const DEMO_EMAIL = "demo@algo-studio.internal";
const DEMO_AUTH_PROVIDER_ID = "demo-internal-seed";
const DEMO_PROJECT_NAME = "Demo: Trend-Following EURUSD";
const DEMO_FINGERPRINT = "demo-seed-fingerprint-v1";
const DEMO_SLUG = "demo";

function generateStrategyId(projectId: string, createdAt: Date): string {
  const hash = createHash("sha256")
    .update(projectId + createdAt.toISOString())
    .digest("hex");
  return "AS-" + hash.substring(0, 8).toUpperCase();
}

// ---------- Seed ----------

async function seed() {
  const createdAt = new Date("2025-01-01T00:00:00.000Z");
  const strategyId = generateStrategyId(DEMO_PROJECT_ID, createdAt);

  console.log(`Seeding demo proof page...`);
  console.log(`  Strategy ID: ${strategyId}`);
  console.log(`  Slug:        ${DEMO_SLUG}`);

  // 1. User (demo-only, not a real account)
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      authProviderId: DEMO_AUTH_PROVIDER_ID,
      email: DEMO_EMAIL,
      emailVerified: true,
      handle: "demo",
    },
  });

  // 2. Project
  await prisma.project.upsert({
    where: { id: DEMO_PROJECT_ID },
    update: {},
    create: {
      id: DEMO_PROJECT_ID,
      userId: DEMO_USER_ID,
      name: DEMO_PROJECT_NAME,
      description:
        "A demonstration strategy showing how AlgoStudio verifies and monitors algorithmic trading strategies with cryptographic proof.",
      createdAt,
    },
  });

  // 3. StrategyIdentity
  await prisma.strategyIdentity.upsert({
    where: { id: DEMO_IDENTITY_ID },
    update: {},
    create: {
      id: DEMO_IDENTITY_ID,
      projectId: DEMO_PROJECT_ID,
      strategyId,
      currentFingerprint: DEMO_FINGERPRINT,
      createdAt,
    },
  });

  // 4. VerifiedStrategyPage (isPublic = true)
  await prisma.verifiedStrategyPage.upsert({
    where: { id: DEMO_PAGE_ID },
    update: { isPublic: true },
    create: {
      id: DEMO_PAGE_ID,
      strategyIdentityId: DEMO_IDENTITY_ID,
      slug: DEMO_SLUG,
      isPublic: true,
      showEquityCurve: true,
      showTradeLog: false,
      showHealthStatus: true,
    },
  });

  console.log(`\nDone. Demo proof page is live:`);
  console.log(`  Full URL:  /proof/${strategyId}`);
  console.log(`  Short URL: /p/${DEMO_SLUG}`);
}

// ---------- Teardown ----------

async function teardown() {
  console.log("Removing demo data...");

  // Delete in reverse dependency order
  await prisma.verifiedStrategyPage.deleteMany({ where: { id: DEMO_PAGE_ID } });
  await prisma.strategyIdentity.deleteMany({ where: { id: DEMO_IDENTITY_ID } });
  await prisma.project.deleteMany({ where: { id: DEMO_PROJECT_ID } });
  await prisma.user.deleteMany({ where: { id: DEMO_USER_ID } });

  console.log("Done. All demo data removed.");
}

// ---------- Main ----------

async function main() {
  const isTeardown = process.argv.includes("--teardown");

  if (isTeardown) {
    await teardown();
  } else {
    await seed();
  }
}

main()
  .catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
