import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ page: "/app/monitor" });

/**
 * Loads monitor page data from the database.
 * Returns null on any DB error (fail-closed).
 */
export async function loadMonitorData(userId: string) {
  try {
    const [eaInstances, subscription] = await Promise.all([
      prisma.liveEAInstance.findMany({
        where: { userId },
        orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } },
        include: {
          trades: {
            where: { closeTime: { not: null } },
            select: { profit: true, closeTime: true },
          },
          heartbeats: {
            orderBy: { createdAt: "desc" },
            take: 200,
            select: { equity: true, createdAt: true },
          },
        },
      }),
      prisma.subscription.findUnique({
        where: { userId },
      }),
    ]);
    return { eaInstances, subscription };
  } catch (err) {
    log.error({ err, route: "/app/monitor" }, "monitor data load failed");
    return null;
  }
}
