/**
 * Backfill EATrade rows from historical TrackRecordEvent rows.
 *
 * Why: externally-monitored EAs (via the Monitor EA) post TRADE_OPEN/TRADE_CLOSE
 * to /api/track-record/ingest which only writes TrackRecordEvent. Until the
 * mirror-into-EATrade fix shipped, EATrade stayed empty for those instances,
 * so edge-score + dashboard aggregates read 0 trades. This script reconciles
 * the existing data.
 *
 * Idempotent: uses EATrade's (instanceId, ticket) unique key.
 *
 * Usage:
 *   npx tsx scripts/backfill-eatrade-from-trackrecord.ts            # all users
 *   npx tsx scripts/backfill-eatrade-from-trackrecord.ts <email>    # one user
 *   DRY_RUN=1 npx tsx scripts/backfill-eatrade-from-trackrecord.ts  # report only
 */
import { prisma } from "../src/lib/prisma";

type OpenPayload = {
  symbol?: string;
  direction?: "BUY" | "SELL";
  lots?: number;
  openPrice?: number;
  magicNumber?: number;
  ticket?: string | number;
};

type ClosePayload = {
  closePrice?: number;
  profit?: number;
  magicNumber?: number;
  ticket?: string | number;
};

const dryRun = process.env.DRY_RUN === "1";
const email = process.argv[2] ?? null;

async function main() {
  const instanceFilter: { userId?: string; deletedAt: null } = { deletedAt: null };
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }
    instanceFilter.userId = user.id;
    console.log(`Filtering to user: ${user.id} (${email})\n`);
  }

  const instances = await prisma.liveEAInstance.findMany({
    where: instanceFilter,
    select: { id: true, eaName: true, symbol: true },
  });
  console.log(`Scanning ${instances.length} instances…${dryRun ? " [DRY RUN]" : ""}\n`);

  let totalOpens = 0;
  let totalCloses = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const ea of instances) {
    const events = await prisma.trackRecordEvent.findMany({
      where: {
        instanceId: ea.id,
        eventType: { in: ["TRADE_OPEN", "TRADE_CLOSE"] },
      },
      orderBy: { seqNo: "asc" },
      select: { eventType: true, payload: true, timestamp: true },
    });
    if (events.length === 0) continue;

    let opens = 0;
    let closes = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const ev of events) {
      if (ev.eventType === "TRADE_OPEN") {
        opens++;
        const p = ev.payload as OpenPayload;
        const ticket = p.ticket != null ? String(p.ticket).trim() : "";
        if (!ticket || !p.symbol) {
          skipped++;
          continue;
        }
        if (!dryRun) {
          await prisma.eATrade.upsert({
            where: { instanceId_ticket: { instanceId: ea.id, ticket } },
            create: {
              instanceId: ea.id,
              ticket,
              symbol: p.symbol.toUpperCase(),
              type: p.direction ?? "BUY",
              openPrice: p.openPrice ?? 0,
              lots: p.lots ?? 0,
              profit: 0,
              openTime: ev.timestamp,
              magicNumber: p.magicNumber ?? null,
            },
            update: {},
          });
        }
        created++;
      } else {
        // TRADE_CLOSE
        closes++;
        const p = ev.payload as ClosePayload;
        const ticket = p.ticket != null ? String(p.ticket).trim() : "";
        if (!ticket) {
          skipped++;
          continue;
        }
        if (!dryRun) {
          const existing = await prisma.eATrade.findUnique({
            where: { instanceId_ticket: { instanceId: ea.id, ticket } },
            select: { id: true },
          });
          if (existing) {
            await prisma.eATrade.update({
              where: { instanceId_ticket: { instanceId: ea.id, ticket } },
              data: {
                closePrice: p.closePrice ?? null,
                profit: p.profit ?? 0,
                closeTime: ev.timestamp,
              },
            });
            updated++;
          } else {
            await prisma.eATrade.create({
              data: {
                instanceId: ea.id,
                ticket,
                symbol: "UNKNOWN",
                type: "BUY",
                openPrice: p.closePrice ?? 0,
                lots: 0,
                profit: p.profit ?? 0,
                openTime: ev.timestamp,
                closeTime: ev.timestamp,
                magicNumber: p.magicNumber ?? null,
              },
            });
            created++;
          }
        }
      }
    }

    console.log(
      `  [${ea.id}] ${ea.eaName}/${ea.symbol ?? "—"}: opens=${opens} closes=${closes} created=${created} updated=${updated} skipped=${skipped}`
    );
    totalOpens += opens;
    totalCloses += closes;
    totalCreated += created;
    totalUpdated += updated;
    totalSkipped += skipped;
  }

  console.log(
    `\nTotals: opens=${totalOpens} closes=${totalCloses} created=${totalCreated} updated=${totalUpdated} skipped=${totalSkipped}${dryRun ? " [DRY RUN — no writes]" : ""}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
