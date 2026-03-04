import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  computeHeartbeatAnalytics,
  type HeartbeatEvent,
  type HeartbeatAnalyticsResult,
} from "@/domain/heartbeat/heartbeat-analytics";
import type { AuthorityBlockReason } from "@/domain/heartbeat/authority-readiness";

const log = logger.child({ page: "/app/monitor" });

// ── Types ────────────────────────────────────────────────

export interface AuthorityDecision {
  action: string;
  reasonCode: string;
  decidedAt: string; // ISO-8601
  strategyId: string;
  authorityReasons?: AuthorityBlockReason[];
}

export interface MonitorData {
  eaInstances: Awaited<ReturnType<typeof queryEaInstances>>;
  subscription: Awaited<ReturnType<typeof querySubscription>>;
  /** Most restrictive authority across all instances. null = fail-closed PAUSE. */
  authority: AuthorityDecision | null;
  /** Portfolio-level 24h cadence analytics. null = computation unavailable. */
  analytics: HeartbeatAnalyticsResult | null;
}

// ── Helpers ──────────────────────────────────────────────

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

const VALID_ACTIONS = new Set(["RUN", "PAUSE", "STOP"]);

/** Normalize meta.action to RUN | PAUSE | STOP; default PAUSE on anything else. */
function sanitizeAction(value: unknown): string {
  return typeof value === "string" && VALID_ACTIONS.has(value) ? value : "PAUSE";
}

const VALID_AUTHORITY_REASONS = new Set<string>(["NO_STRATEGIES", "NO_LIVE_INSTANCE"]);

/** Accept unknown, return at most 2 valid AuthorityBlockReason values. */
export function sanitizeAuthorityReasons(value: unknown): AuthorityBlockReason[] {
  if (!Array.isArray(value)) return [];
  const result: AuthorityBlockReason[] = [];
  for (const item of value) {
    if (typeof item === "string" && VALID_AUTHORITY_REASONS.has(item)) {
      result.push(item as AuthorityBlockReason);
      if (result.length >= 2) break;
    }
  }
  return result;
}

function queryEaInstances(userId: string) {
  return prisma.liveEAInstance.findMany({
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
      // Governance fields
      operatorHold: true,
      monitoringSuppressedUntil: true,
      lifecycleState: true,
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
  });
}

function querySubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
  });
}

const AUTHORITY_PRIORITY: Record<string, number> = { STOP: 0, PAUSE: 1, RUN: 2 };

/**
 * From a list of per-instance decisions, return the most restrictive.
 * STOP > PAUSE > RUN. Ties broken by most recent.
 */
function pickMostRestrictive(
  decisions: {
    action: string;
    reasonCode: string;
    createdAt: Date;
    strategyId: string | null;
    authorityReasons?: AuthorityBlockReason[];
  }[]
): AuthorityDecision | null {
  if (decisions.length === 0) return null;

  const sorted = [...decisions].sort((a, b) => {
    const pa = AUTHORITY_PRIORITY[a.action] ?? 1;
    const pb = AUTHORITY_PRIORITY[b.action] ?? 1;
    if (pa !== pb) return pa - pb; // lower = more restrictive
    return b.createdAt.getTime() - a.createdAt.getTime(); // more recent first
  });

  const best = sorted[0];
  return {
    action: best.action,
    reasonCode: best.reasonCode,
    decidedAt: best.createdAt.toISOString(),
    strategyId: best.strategyId ?? "",
    ...(best.authorityReasons && best.authorityReasons.length > 0
      ? { authorityReasons: best.authorityReasons }
      : {}),
  };
}

// ── Main loader ──────────────────────────────────────────

/**
 * Loads monitor page data from the database.
 * Returns null on core DB error (fail-closed).
 *
 * Authority and analytics queries are non-critical:
 * if they fail, the page still renders with PAUSE fallback.
 */
export async function loadMonitorData(userId: string): Promise<MonitorData | null> {
  // Environment check — boolean only, never log the value
  const dbUrlPresent =
    typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;
  if (!dbUrlPresent) {
    log.error({ step: "missing_env_var", name: "DATABASE_URL" }, "DATABASE_URL not set");
    return null;
  }

  log.info(
    { step: "load_start", runtime: process.env.NEXT_RUNTIME || "nodejs" },
    "monitor data load starting"
  );

  try {
    // ── Phase 1: Core data (critical — null on failure) ──
    const [eaResult, subResult] = await Promise.allSettled([
      queryEaInstances(userId),
      querySubscription(userId),
    ]);

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

    const eaInstances = eaResult.value;
    const subscription = subResult.value;

    log.info({ step: "load_success", eaCount: eaInstances.length }, "monitor data loaded");

    // ── Phase 2: Authority data (non-critical — null on failure) ──
    let authority: AuthorityDecision | null = null;
    let analytics: HeartbeatAnalyticsResult | null = null;

    const instanceIds = eaInstances.map((ea) => ea.id);

    if (instanceIds.length > 0) {
      try {
        const windowEnd = new Date();
        const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);
        // Single query: fetch 24h of heartbeat events (used for both authority + analytics)
        const recentEvents = await prisma.proofEventLog.findMany({
          where: {
            type: "HEARTBEAT_DECISION_MADE",
            strategyId: { in: instanceIds },
            createdAt: { gte: windowStart },
          },
          orderBy: { createdAt: "desc" },
          select: { strategyId: true, meta: true, createdAt: true },
          take: 5000, // Safety cap
        });

        // Extract authority from latest per-instance decisions
        const latestPerInstance = new Map<
          string,
          {
            action: string;
            reasonCode: string;
            createdAt: Date;
            strategyId: string | null;
            authorityReasons?: AuthorityBlockReason[];
          }
        >();
        for (const ev of recentEvents) {
          const sid = ev.strategyId ?? "";
          if (!latestPerInstance.has(sid)) {
            const meta = ev.meta as Record<string, unknown> | null;
            const action = sanitizeAction(meta?.action);
            const reasonCode =
              typeof meta?.reasonCode === "string" ? meta.reasonCode : "COMPUTATION_FAILED";
            const sanitizedReasons =
              reasonCode === "AUTHORITY_UNINITIALIZED"
                ? sanitizeAuthorityReasons(meta?.authorityReasons)
                : [];
            latestPerInstance.set(sid, {
              action,
              reasonCode,
              createdAt: ev.createdAt,
              strategyId: ev.strategyId,
              ...(sanitizedReasons.length > 0 ? { authorityReasons: sanitizedReasons } : {}),
            });
          }
        }
        authority = pickMostRestrictive([...latestPerInstance.values()]);

        // Compute portfolio-level analytics
        const heartbeatEvents: HeartbeatEvent[] = recentEvents.map((ev) => {
          const meta = ev.meta as Record<string, unknown> | null;
          return {
            timestamp: ev.createdAt,
            action: sanitizeAction(meta?.action),
            reasonCode:
              typeof meta?.reasonCode === "string" ? meta.reasonCode : "COMPUTATION_FAILED",
          };
        });
        analytics = computeHeartbeatAnalytics(
          heartbeatEvents,
          windowStart,
          windowEnd,
          60_000 // 60s expected cadence
        );
      } catch (err) {
        const diag = classifyDbError(err);
        log.error(
          {
            step: "authority_query_error",
            errorName: diag.errorName,
            message: diag.message,
            classification: diag.classification,
          },
          "authority/analytics query failed (non-critical)"
        );
        // authority + analytics remain null — page shows PAUSE fallback
      }
    }

    return { eaInstances, subscription, authority, analytics };
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
