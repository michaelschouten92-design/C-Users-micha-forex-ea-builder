/**
 * One-shot cleanup for EATrade rows with symbol="UNKNOWN" — these were
 * created by an early version of the TrackRecordEvent→EATrade mirror that
 * produced placeholder rows when TRADE_CLOSE arrived without a matching
 * TRADE_OPEN. The current mirror skips instead of creating placeholders, so
 * this residue can be deleted.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/cleanup-unknown-eatrade.ts <email>?
 *   npx tsx scripts/cleanup-unknown-eatrade.ts <email>?
 */
import { prisma } from "../src/lib/prisma";

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
    console.log(`Filtering to user: ${user.id} (${email})`);
  }

  const instances = await prisma.liveEAInstance.findMany({
    where: instanceFilter,
    select: { id: true, eaName: true },
  });
  const instanceIds = instances.map((i) => i.id);

  const rows = await prisma.eATrade.findMany({
    where: { instanceId: { in: instanceIds }, symbol: "UNKNOWN" },
    select: { id: true, instanceId: true, ticket: true, profit: true, closeTime: true },
  });

  console.log(
    `Found ${rows.length} EATrade rows with symbol="UNKNOWN"${dryRun ? " [DRY RUN]" : ""}`
  );
  if (rows.length === 0) return;

  const byInstance = new Map<string, number>();
  for (const r of rows) byInstance.set(r.instanceId, (byInstance.get(r.instanceId) ?? 0) + 1);
  for (const [id, count] of byInstance) {
    const ea = instances.find((i) => i.id === id);
    console.log(`  [${id}] ${ea?.eaName ?? "?"}: ${count} rows`);
  }

  if (dryRun) return;

  const deleted = await prisma.eATrade.deleteMany({
    where: { id: { in: rows.map((r) => r.id) } },
  });
  console.log(`\nDeleted ${deleted.count} rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
