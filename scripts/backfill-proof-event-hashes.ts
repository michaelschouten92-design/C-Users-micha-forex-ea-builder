/**
 * One-time backfill script for proof event hash chains.
 *
 * Chain scope: per verification-run recordId (stored in sessionId).
 * For each distinct sessionId that has sequenced but unhashed events
 * (from the migration backfill), this script computes and stores
 * eventHash + prevEventHash for each event in sequence order.
 *
 * Usage:
 *   npx tsx scripts/backfill-proof-event-hashes.ts
 *
 * Safe to re-run — skips events that already have an eventHash.
 */

import { PrismaClient } from "@prisma/client";
import { PROOF_GENESIS_HASH, computeProofEventHash } from "../src/lib/proof/chain";

const prisma = new PrismaClient();

async function main() {
  // Find all recordIds (sessionId) that have sequenced but unhashed events
  const runs = await prisma.proofEventLog.findMany({
    where: {
      sequence: { not: null },
      eventHash: null,
    },
    select: { sessionId: true, strategyId: true },
    distinct: ["sessionId"],
  });

  console.log(`Found ${runs.length} verification runs to backfill`);

  let totalUpdated = 0;

  for (const { sessionId: recordId, strategyId } of runs) {
    if (!strategyId) continue;

    // Fetch all sequenced events for this run in order
    const events = await prisma.proofEventLog.findMany({
      where: { sessionId: recordId, sequence: { not: null } },
      orderBy: { sequence: "asc" },
      select: {
        id: true,
        sequence: true,
        strategyId: true,
        type: true,
        sessionId: true,
        meta: true,
        eventHash: true,
      },
    });

    let prevHash = PROOF_GENESIS_HASH;
    let updated = 0;

    for (const event of events) {
      // Skip already-hashed events
      if (event.eventHash) {
        prevHash = event.eventHash;
        continue;
      }

      const eventHash = computeProofEventHash({
        sequence: event.sequence!,
        strategyId: event.strategyId ?? strategyId,
        type: event.type,
        recordId: event.sessionId,
        prevEventHash: prevHash,
        payload: (event.meta as Record<string, unknown>) ?? {},
      });

      await prisma.proofEventLog.update({
        where: { id: event.id },
        data: { eventHash, prevEventHash: prevHash },
      });

      prevHash = eventHash;
      updated++;
    }

    totalUpdated += updated;
    console.log(`  ${recordId} (${strategyId}): ${updated}/${events.length} events hashed`);
  }

  console.log(`\nBackfill complete: ${totalUpdated} events updated`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
