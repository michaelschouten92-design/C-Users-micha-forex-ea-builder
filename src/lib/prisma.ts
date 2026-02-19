import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import { logger } from "./logger";

const SLOW_QUERY_THRESHOLD_MS = 100;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
          ]
        : [{ emit: "event", level: "query" }],
  });

  // Log slow queries in all environments (omit full SQL in production)
  client.$on("query" as never, (e: { duration: number; query: string }) => {
    if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(
        {
          durationMs: e.duration,
          query: env.NODE_ENV === "development" ? e.query : undefined,
        },
        "Slow database query detected"
      );
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
