import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.eATrade.deleteMany({
    where: { ticket: { startsWith: "test_direct_" } },
  });
  console.log(`Deleted ${result.count} test row(s).`);
}

main().finally(() => prisma.$disconnect());
