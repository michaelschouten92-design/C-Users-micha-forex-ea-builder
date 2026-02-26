/**
 * Seed script for Proof Engine development data.
 *
 * Seeds ProofThreshold defaults into the database.
 * Can be extended with sample strategies for local development.
 *
 * Usage: npx tsx prisma/seed-proof.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const THRESHOLDS = [
  { key: "VALIDATED_MIN_SCORE", value: 50, label: "Min backtest health score for VALIDATED" },
  {
    key: "VALIDATED_MIN_SURVIVAL",
    value: 0.7,
    label: "Min Monte Carlo survival rate for VALIDATED",
  },
  { key: "MIN_TRADES_VALIDATION", value: 100, label: "Min backtest trades for VALIDATED" },
  { key: "MIN_LIVE_TRADES_VERIFIED", value: 50, label: "Min live trades for VERIFIED" },
  { key: "MIN_LIVE_DAYS_PROVEN", value: 90, label: "Min live days for PROVEN" },
  { key: "PROVEN_MAX_DRAWDOWN_PCT", value: 30, label: "Max drawdown % for PROVEN" },
  { key: "PROVEN_MIN_SCORE_STABILITY", value: 40, label: "Min health score stability for PROVEN" },
  { key: "HUB_MIN_TRADES", value: 50, label: "Min trades to appear on recognition hub" },
  { key: "HUB_MIN_DAYS", value: 14, label: "Min days to appear on recognition hub" },
];

async function main() {
  console.log("Seeding ProofThreshold defaults...");

  for (const t of THRESHOLDS) {
    await prisma.proofThreshold.upsert({
      where: { key: t.key },
      update: { value: t.value, label: t.label },
      create: { key: t.key, value: t.value, label: t.label },
    });
    console.log(`  ${t.key} = ${t.value}`);
  }

  console.log("Done. Seeded", THRESHOLDS.length, "thresholds.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
