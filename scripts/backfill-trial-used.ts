/**
 * One-time backfill script: sets trialUsed = true for all subscriptions
 * where stripeCustomerId is not null (i.e., users who have ever had a paid subscription).
 *
 * Run after `npx prisma db push`:
 *   npx tsx scripts/backfill-trial-used.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.subscription.updateMany({
    where: {
      stripeCustomerId: { not: null },
      trialUsed: false,
    },
    data: {
      trialUsed: true,
    },
  });

  console.log(`Backfill complete: ${result.count} subscriptions updated with trialUsed = true`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
