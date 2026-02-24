import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import { logger } from "./logger";

const SLOW_QUERY_THRESHOLD_MS = 100;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Track P2034 (Serializable transaction conflict) rate
let p2034Count = 0;
let p2034WindowStart = Date.now();
const P2034_WINDOW_MS = 60_000; // 1-minute window
const P2034_WARN_THRESHOLD = 10; // warn after 10 conflicts per minute

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "event", level: "error" },
          ]
        : [
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
          ],
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

  // Monitor P2034 Serializable conflict errors
  client.$on("error" as never, (e: { message: string }) => {
    if (e.message && e.message.includes("P2034")) {
      const now = Date.now();
      // Reset window if expired
      if (now - p2034WindowStart > P2034_WINDOW_MS) {
        p2034Count = 0;
        p2034WindowStart = now;
      }
      p2034Count++;
      if (p2034Count === P2034_WARN_THRESHOLD) {
        logger.warn(
          { count: p2034Count, windowMs: P2034_WINDOW_MS },
          "High P2034 serialization conflict rate"
        );
      }
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache unconditionally to prevent connection pool exhaustion across hot reloads
globalForPrisma.prisma = prisma;

// Connection pool health monitoring: log connection errors as a proxy for pool exhaustion
// Prisma doesn't expose pool stats directly, but connection failures indicate pool pressure
let connectionErrorCount = 0;
let connectionErrorWindowStart = Date.now();
const CONNECTION_ERROR_WINDOW_MS = 60_000;
const CONNECTION_ERROR_WARN_THRESHOLD = 5;

/**
 * Track a database connection error for pool health monitoring.
 * Call this from catch blocks around database operations.
 */
export function trackConnectionError(): void {
  const now = Date.now();
  if (now - connectionErrorWindowStart > CONNECTION_ERROR_WINDOW_MS) {
    connectionErrorCount = 0;
    connectionErrorWindowStart = now;
  }
  connectionErrorCount++;
  if (connectionErrorCount === CONNECTION_ERROR_WARN_THRESHOLD) {
    logger.warn(
      { count: connectionErrorCount, windowMs: CONNECTION_ERROR_WINDOW_MS },
      "High database connection error rate — possible pool exhaustion"
    );
  }
}
