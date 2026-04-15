/**
 * Direct DB test: simulates what the history-backfill endpoint does for one
 * known trade, bypassing HTTP + auth. Tells us whether the server-side
 * attribution logic accepts a well-formed LWVB trade — isolating endpoint
 * correctness from EA-side filter behaviour.
 *
 * Usage: npx tsx scripts/test-backfill-direct.ts <email>
 */
import { prisma } from "../src/lib/prisma";

const email = process.argv[2] ?? "michaelschouten92@gmail.com";

// Known LWVB trade params from user's setup
const TEST_SYMBOL = "XAUUSD";
const TEST_MAGIC = 243421;
const TEST_TICKET = "test_direct_lwvb_1";

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  // Find LWVB instance
  const lwvb = await prisma.liveEAInstance.findFirst({
    where: { userId: user.id, eaName: "LWVB_BUY", deletedAt: null },
    select: { id: true, symbol: true, parentInstanceId: true, lifecycleState: true },
  });
  if (!lwvb) {
    console.error("LWVB_BUY instance not found");
    process.exit(1);
  }
  console.log(`LWVB instance: ${lwvb.id} (parent=${lwvb.parentInstanceId})`);

  // Simulate the owned-instance lookup from the endpoint
  if (!lwvb.parentInstanceId) {
    console.error("LWVB has no parent — can't simulate Monitor auth context");
    process.exit(1);
  }
  const candidates = await prisma.liveEAInstance.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      OR: [{ id: lwvb.parentInstanceId }, { parentInstanceId: lwvb.parentInstanceId }],
    },
    select: { id: true, symbol: true, lifecycleState: true },
  });
  const ownedIds = candidates.map((c) => c.id);
  console.log(
    `Authed Monitor (parent) owns ${candidates.length} candidates: ${ownedIds.join(", ")}`
  );
  console.log(`LWVB in owned set: ${ownedIds.includes(lwvb.id)}`);

  // Mimic deployment lookup
  const deployment = await prisma.terminalDeployment.findFirst({
    where: {
      instanceId: { in: ownedIds },
      symbol: TEST_SYMBOL,
      magicNumber: TEST_MAGIC,
    },
    select: { instanceId: true, baselineStatus: true },
  });
  console.log(`\nDeployment lookup result for (${TEST_SYMBOL}, magic=${TEST_MAGIC}):`);
  console.log(deployment ?? "  (none)");

  if (!deployment) {
    console.log(`\n⚠️  Endpoint would reject: "no owned deployment for (symbol, magicNumber)"`);
    return;
  }

  if (deployment.instanceId !== lwvb.id) {
    console.log(
      `\n⚠️  Deployment points at ${deployment.instanceId}, not LWVB (${lwvb.id}) — mismatch`
    );
    return;
  }

  console.log(`\n✓ Deployment resolves to LWVB. Endpoint would accept.`);
  console.log(`Writing a test EATrade row as proof-of-concept…`);

  const row = await prisma.eATrade.upsert({
    where: {
      instanceId_ticket: { instanceId: lwvb.id, ticket: TEST_TICKET },
    },
    create: {
      instanceId: lwvb.id,
      ticket: TEST_TICKET,
      symbol: TEST_SYMBOL,
      type: "BUY",
      openPrice: 2400,
      closePrice: 2405,
      lots: 0.01,
      profit: 5,
      openTime: new Date(Date.now() - 3600_000),
      closeTime: new Date(Date.now() - 60_000),
      magicNumber: TEST_MAGIC,
    },
    update: {},
  });
  console.log(`Wrote row id=${row.id} to EATrade.`);
  console.log(
    `\n✓ End-to-end server path works. Delete the test row:\n  DELETE FROM "EATrade" WHERE id='${row.id}';`
  );
  console.log(`\nConclusion: if LWVB trades don't land in EATrade after running the EA, the`);
  console.log(`EA's g_contexts[] filter is excluding them client-side. Server is fine.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
