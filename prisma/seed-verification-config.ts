/**
 * Seed script for VerificationConfig — inserts the current config snapshot
 * as the initial ACTIVE config if not already present.
 *
 * Idempotent: skips if configVersion "1.0.0" already exists.
 *
 * Usage: npx tsx prisma/seed-verification-config.ts
 */

import { PrismaClient } from "@prisma/client";
import { buildConfigSnapshot } from "../src/domain/verification/config-snapshot";

const prisma = new PrismaClient();

async function main() {
  const snapshot = buildConfigSnapshot();

  const existing = await prisma.verificationConfig.findUnique({
    where: { configVersion: snapshot.configVersion },
  });

  if (existing) {
    console.log(
      `VerificationConfig ${snapshot.configVersion} already exists (status: ${existing.status}). Skipping.`
    );
    return;
  }

  await prisma.verificationConfig.create({
    data: {
      configVersion: snapshot.configVersion,
      thresholdsHash: snapshot.thresholdsHash,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      status: "ACTIVE",
      activatedBy: "system",
    },
  });

  console.log(
    `Seeded VerificationConfig ${snapshot.configVersion} (hash: ${snapshot.thresholdsHash.slice(0, 12)}…) as ACTIVE`
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
