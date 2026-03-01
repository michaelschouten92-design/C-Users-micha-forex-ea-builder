/**
 * Production-safe, idempotent backfill for proof event hash chains.
 *
 * Chain scope: per verification-run recordId (stored in ProofEventLog.sessionId).
 * For each distinct sessionId that has sequenced but unhashed events, this script
 * computes and stores eventHash + prevEventHash in sequence order, then verifies
 * the chain integrity.
 *
 * Idempotent — only touches rows where sequence IS NOT NULL AND eventHash IS NULL.
 * Never overwrites existing hashes. Safe to re-run after partial failures.
 *
 * Usage:
 *   npx tsx scripts/backfill-proof-event-hashes.ts              # full run
 *   npx tsx scripts/backfill-proof-event-hashes.ts --dry-run     # preview only
 *   npx tsx scripts/backfill-proof-event-hashes.ts --limit 10    # first 10 recordIds
 *   npx tsx scripts/backfill-proof-event-hashes.ts --dry-run --limit 5
 *
 * Exit codes:
 *   0 — success, all chains verified
 *   1 — error during backfill or chain verification failure
 */

import { PrismaClient } from "@prisma/client";
import {
  PROOF_GENESIS_HASH,
  computeProofEventHash,
  verifyProofChain,
} from "../src/lib/proof/chain";
import type { StoredProofEvent } from "../src/lib/proof/chain";

const BATCH_SIZE = 100;

interface CliOptions {
  dryRun: boolean;
  limit: number | null;
}

function parseArgs(args: string[]): CliOptions {
  const opts: CliOptions = { dryRun: false, limit: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      opts.dryRun = true;
    } else if (args[i] === "--limit") {
      const next = args[i + 1];
      const n = Number(next);
      if (!next || isNaN(n) || n < 1) {
        console.error("--limit requires a positive integer");
        process.exit(1);
      }
      opts.limit = n;
      i++;
    } else {
      console.error(`Unknown argument: ${args[i]}`);
      process.exit(1);
    }
  }
  return opts;
}

const prisma = new PrismaClient();

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.dryRun) {
    console.log("[DRY RUN] No database writes will be performed.\n");
  }

  // Step 1: Find affected recordIds (sessionId) — deterministic lexicographic order
  const affectedRuns = await prisma.proofEventLog.findMany({
    where: {
      sequence: { not: null },
      eventHash: null,
    },
    select: { sessionId: true },
    distinct: ["sessionId"],
    orderBy: { sessionId: "asc" },
  });

  let recordIds = affectedRuns.map((r) => r.sessionId);

  if (opts.limit !== null) {
    recordIds = recordIds.slice(0, opts.limit);
    console.log(
      `Found ${affectedRuns.length} recordIds with unhashed events, processing first ${opts.limit}`
    );
  } else {
    console.log(`Found ${recordIds.length} recordIds with unhashed events`);
  }

  if (recordIds.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  // Count total rows to update
  const totalUnhashed = await prisma.proofEventLog.count({
    where: {
      sessionId: { in: recordIds },
      sequence: { not: null },
      eventHash: null,
    },
  });

  console.log(`Total rows to hash: ${totalUnhashed}\n`);

  if (opts.dryRun) {
    for (const recordId of recordIds) {
      const count = await prisma.proofEventLog.count({
        where: { sessionId: recordId, sequence: { not: null }, eventHash: null },
      });
      console.log(`  ${recordId}: ${count} unhashed events`);
    }
    console.log(
      "\n[DRY RUN] Would update %d rows across %d recordIds",
      totalUnhashed,
      recordIds.length
    );
    return;
  }

  // Step 2: Process each recordId inside a transaction
  let totalUpdated = 0;
  let verifiedCount = 0;

  for (const recordId of recordIds) {
    const updated = await prisma.$transaction(async (tx) => {
      // Fetch ALL sequenced events for this recordId (including already-hashed)
      // to reconstruct the full chain for correct prevEventHash linkage.
      const events = await tx.proofEventLog.findMany({
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
      let batchUpdated = 0;

      for (const event of events) {
        // Skip already-hashed — never overwrite
        if (event.eventHash) {
          prevHash = event.eventHash;
          continue;
        }

        const strategyId = event.strategyId;
        if (!strategyId) {
          throw new Error(
            `Event id=${event.id} seq=${event.sequence} in recordId=${recordId} has no strategyId`
          );
        }

        const eventHash = computeProofEventHash({
          sequence: event.sequence!,
          strategyId,
          type: event.type,
          recordId: event.sessionId,
          prevEventHash: prevHash,
          payload: (event.meta as Record<string, unknown>) ?? {},
        });

        await tx.proofEventLog.update({
          where: { id: event.id },
          data: { eventHash, prevEventHash: prevHash },
        });

        prevHash = eventHash;
        batchUpdated++;
      }

      return batchUpdated;
    });

    totalUpdated += updated;
    console.log(`  ${recordId}: ${updated} events hashed`);

    // Step 3: Post-verification — verify the full chain for this recordId
    const verifyEvents = await prisma.proofEventLog.findMany({
      where: { sessionId: recordId, sequence: { not: null } },
      orderBy: { sequence: "asc" },
      select: {
        sequence: true,
        strategyId: true,
        type: true,
        sessionId: true,
        eventHash: true,
        prevEventHash: true,
        meta: true,
        createdAt: true,
      },
    });

    const chainEvents: StoredProofEvent[] = verifyEvents.map((e) => ({
      sequence: e.sequence!,
      strategyId: e.strategyId ?? "",
      type: e.type,
      sessionId: e.sessionId,
      eventHash: e.eventHash ?? "",
      prevEventHash: e.prevEventHash ?? "",
      meta: (e.meta as Record<string, unknown>) ?? null,
      createdAt: e.createdAt,
    }));

    const verification = verifyProofChain(chainEvents, recordId);
    if (!verification.valid) {
      console.error(`\nCHAIN VERIFICATION FAILED for recordId=${recordId}: ${verification.error}`);
      console.error(`  Break at sequence: ${verification.breakAtSequence}`);
      process.exit(1);
    }
    verifiedCount++;
  }

  console.log(
    `\nBackfill complete: ${totalUpdated} rows updated, ${verifiedCount} chains verified`
  );
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
