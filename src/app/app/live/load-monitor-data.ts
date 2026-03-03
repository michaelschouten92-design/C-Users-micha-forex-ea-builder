import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ page: "/app/monitor" });

/**
 * Classify a DB error for structured logging.
 * Never logs DATABASE_URL, raw stacks, or account data.
 */
function classifyDbError(err: unknown): {
  errorName: string;
  errorCode: string | undefined;
  message: string;
  classification: "timeout" | "pool_exhaustion" | "init_error" | "auth_error" | "unknown";
} {
  const errorName = err instanceof Error ? err.name : "UnknownError";
  const errorCode = (err as { code?: string })?.code;
  const rawMessage = err instanceof Error ? err.message : String(err);
  // Truncate to 200 chars, scrub connection strings
  const message = rawMessage
    .replace(/(?:postgresql|postgres|mysql|mongodb):\/\/[^\s]+/gi, "[REDACTED_URL]")
    .slice(0, 200);

  let classification: "timeout" | "pool_exhaustion" | "init_error" | "auth_error" | "unknown" =
    "unknown";

  if (errorCode === "P1001" || errorCode === "P1002" || /timed?\s*out/i.test(rawMessage)) {
    classification = "timeout";
  } else if (/too many|pool.*exhaust|connection.*limit/i.test(rawMessage)) {
    classification = "pool_exhaustion";
  } else if (
    errorName === "PrismaClientInitializationError" ||
    rawMessage.includes("InitializationError")
  ) {
    classification = "init_error";
  } else if (/authenticat|password/i.test(rawMessage)) {
    classification = "auth_error";
  }

  return { errorName, errorCode, message, classification };
}

/**
 * Loads monitor page data from the database.
 * Returns null on any DB error (fail-closed).
 *
 * Uses Promise.allSettled to identify which query fails.
 */
export async function loadMonitorData(userId: string) {
  // C) Environment check — boolean only, never log the value
  const dbUrlPresent =
    typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;
  if (!dbUrlPresent) {
    log.error({ step: "missing_env_var", name: "DATABASE_URL" }, "DATABASE_URL not set");
    return null;
  }

  // B) Runtime check
  log.info(
    { step: "load_start", runtime: process.env.NEXT_RUNTIME || "nodejs" },
    "monitor data load starting"
  );

  try {
    // A) Individual query diagnostics via Promise.allSettled
    const [eaResult, subResult] = await Promise.allSettled([
      prisma.liveEAInstance.findMany({
        where: { userId, deletedAt: null },
        orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } },
        select: {
          id: true,
          eaName: true,
          symbol: true,
          timeframe: true,
          broker: true,
          accountNumber: true,
          status: true,
          tradingState: true,
          lastHeartbeat: true,
          lastError: true,
          balance: true,
          equity: true,
          openTrades: true,
          totalTrades: true,
          totalProfit: true,
          strategyStatus: true,
          mode: true,
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

    // D) Check each result and classify any failure
    if (eaResult.status === "rejected") {
      const diag = classifyDbError(eaResult.reason);
      log.error(
        {
          step: "ea_instances_error",
          errorName: diag.errorName,
          errorCode: diag.errorCode,
          message: diag.message,
          classification: diag.classification,
        },
        "liveEAInstance.findMany failed"
      );
      return null;
    }

    if (subResult.status === "rejected") {
      const diag = classifyDbError(subResult.reason);
      log.error(
        {
          step: "subscription_error",
          errorName: diag.errorName,
          errorCode: diag.errorCode,
          message: diag.message,
          classification: diag.classification,
        },
        "subscription.findUnique failed"
      );
      return null;
    }

    log.info({ step: "load_success", eaCount: eaResult.value.length }, "monitor data loaded");

    return { eaInstances: eaResult.value, subscription: subResult.value };
  } catch (err) {
    // Outer catch for unexpected errors (non-query failures like import errors)
    const diag = classifyDbError(err);
    log.error(
      {
        step: "unexpected_error",
        errorName: diag.errorName,
        errorCode: diag.errorCode,
        message: diag.message,
        classification: diag.classification,
      },
      "monitor data load failed unexpectedly"
    );
    return null;
  }
}
