import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { HeartbeatAnalyticsResult } from "@/domain/heartbeat/heartbeat-analytics";
import type { AuthorityBlockReason } from "@/domain/heartbeat/authority-readiness";
import { computeEdgeScore } from "@/domain/monitoring/edge-score";
import { ORPHAN_EATRADE_SYMBOL } from "@/lib/track-record/mirror-to-eatrade";

const log = logger.child({ page: "/app/monitor" });

// ── Types ────────────────────────────────────────────────

export interface AuthorityDecision {
  action: string;
  reasonCode: string;
  decidedAt: string; // ISO-8601
  strategyId: string;
  authorityReasons?: AuthorityBlockReason[];
}

export interface DecisionContext {
  lifecycleState?: string;
  operatorHold?: "NONE" | "HALTED" | "OVERRIDE_PENDING" | null;
  suppressionActive?: boolean;
}

export interface RecentDecision {
  id: string;
  timestamp: string; // ISO-8601
  action: "RUN" | "PAUSE" | "STOP";
  reasonCode: string;
  context?: DecisionContext;
}

export interface MonitorData {
  eaInstances: (Awaited<ReturnType<typeof queryEaInstances>>[number] & {
    isAutoDiscovered: boolean;
  })[];
  subscription: Awaited<ReturnType<typeof querySubscription>>;
  /** Most restrictive authority across all instances. null = fail-closed PAUSE. */
  authority: AuthorityDecision | null;
  /** Portfolio-level 24h cadence analytics. null = computation unavailable. */
  analytics: HeartbeatAnalyticsResult | null;
  /** Last 25 heartbeat decisions, newest first. Empty on failure. */
  recentDecisions: RecentDecision[];
  /** Per-instance trade aggregates for edge score computation. */
  tradeAggregates: Map<
    string,
    {
      winCount: number;
      lossCount: number;
      grossProfit: number;
      grossLoss: number;
      tradeCount: number;
    }
  >;
  /** Recent closed trades for the activity feed (newest first, max 15). */
  recentTrades: {
    instanceId: string;
    profit: number;
    closeTime: string | null;
    symbol: string | null;
    magicNumber: number | null;
  }[];
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

// ── Decision context sanitizers ──────────────────────────

const VALID_LIFECYCLE_STATES = new Set([
  "DRAFT",
  "BACKTESTED",
  "VERIFIED",
  "LIVE_MONITORING",
  "EDGE_AT_RISK",
  "INVALIDATED",
]);

export function sanitizeLifecycleState(value: unknown): string | undefined {
  return typeof value === "string" && VALID_LIFECYCLE_STATES.has(value) ? value : undefined;
}

const VALID_OPERATOR_HOLDS = new Set(["NONE", "HALTED", "OVERRIDE_PENDING"]);

export function sanitizeOperatorHold(
  value: unknown
): "NONE" | "HALTED" | "OVERRIDE_PENDING" | null | undefined {
  if (value === null) return null;
  return typeof value === "string" && VALID_OPERATOR_HOLDS.has(value)
    ? (value as "NONE" | "HALTED" | "OVERRIDE_PENDING")
    : undefined;
}

export function sanitizeBool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/**
 * Parse the governanceSnapshot JSON string from meta and extract
 * a strict, whitelisted DecisionContext. Returns undefined when
 * no usable fields are present.
 */
export function extractDecisionContext(
  meta: Record<string, unknown> | null
): DecisionContext | undefined {
  if (!meta || typeof meta.governanceSnapshot !== "string") return undefined;

  let snapshot: Record<string, unknown>;
  try {
    snapshot = JSON.parse(meta.governanceSnapshot) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  if (typeof snapshot !== "object" || snapshot === null) return undefined;

  const lifecycleState = sanitizeLifecycleState(snapshot.lifecycleState);
  const operatorHold = sanitizeOperatorHold(snapshot.operatorHold);
  const suppressionActive = sanitizeBool(snapshot.suppressionActive);

  if (
    lifecycleState === undefined &&
    operatorHold === undefined &&
    suppressionActive === undefined
  ) {
    return undefined;
  }

  return {
    ...(lifecycleState !== undefined ? { lifecycleState } : {}),
    ...(operatorHold !== undefined ? { operatorHold } : {}),
    ...(suppressionActive !== undefined ? { suppressionActive } : {}),
  };
}

function queryEaInstances(userId: string) {
  return prisma.liveEAInstance.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
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
      sortOrder: true,
      strategyStatus: true,
      mode: true,
      parentInstanceId: true,
      apiKeySuffix: true,
      accountTrackRecordShares: {
        where: { isPublic: true },
        take: 1,
        select: { token: true },
      },
      // Governance fields
      operatorHold: true,
      monitoringSuppressedUntil: true,
      lifecycleState: true,
      exportJobId: true,
      strategyVersion: {
        select: {
          backtestBaseline: {
            select: {
              winRate: true,
              profitFactor: true,
              totalTrades: true,
              maxDrawdownPct: true,
              sharpeRatio: true,
              netReturnPct: true,
              initialDeposit: true,
            },
          },
        },
      },
      // Active incidents for monitoring reasons
      incidents: {
        where: { status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] } },
        orderBy: { openedAt: "desc" as const },
        select: { reasonCodes: true },
        take: 1,
      },
      // CUSUM drift: latest health snapshot for drift & monitoring status
      healthSnapshots: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: { driftDetected: true, driftSeverity: true, status: true },
      },
      // Terminal deployments — used for per-strategy baseline linking UI
      terminalDeployments: {
        where: { ignoredAt: null },
        select: {
          baselineStatus: true,
          symbol: true,
          magicNumber: true,
          materialFingerprint: true,
        },
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

    const eaInstances = eaResult.value.map((ea) => ({
      ...ea,
      isAutoDiscovered:
        ea.lifecycleState === "DRAFT" &&
        ea.terminalDeployments.some((d) => {
          // EA fingerprint formula: ctx:v3:SYMBOL:MAGIC:TIMEFRAME (timeframe="" for auto-discovered)
          const v3 = createHash("sha256")
            .update(`ctx:v3:${d.symbol}:${d.magicNumber}:`)
            .digest("hex");
          // Backward compat with older EA versions
          const v2 = createHash("sha256")
            .update(`ctx:v2:${d.symbol}:${d.magicNumber}`)
            .digest("hex");
          return d.materialFingerprint === v3 || d.materialFingerprint === v2;
        }),
    }));
    const subscription = subResult.value;

    log.info({ step: "load_success", eaCount: eaInstances.length }, "monitor data loaded");

    // ── Phase 1b: Trade aggregate stats for edge score (non-critical) ──
    // Single groupBy query for all instances with baselines — efficient, no N+1.
    const instancesWithBaseline = eaInstances.filter((ea) => ea.strategyVersion?.backtestBaseline);
    const tradeAggregates = new Map<
      string,
      {
        winCount: number;
        lossCount: number;
        grossProfit: number;
        grossLoss: number;
        tradeCount: number;
      }
    >();

    if (instancesWithBaseline.length > 0) {
      try {
        const ids = instancesWithBaseline.map((ea) => ea.id);
        const rows = await prisma.eATrade.groupBy({
          by: ["instanceId"],
          where: {
            instanceId: { in: ids },
            closeTime: { not: null },
          },
          _count: { id: true },
          _sum: { profit: true },
        });

        // For win/loss counts we need a raw query since groupBy can't do conditional aggregation
        const rawStats: {
          instanceId: string;
          winCount: bigint;
          grossProfit: number;
          grossLoss: number;
        }[] = await prisma.$queryRaw`
            SELECT "instanceId",
              COUNT(*) FILTER (WHERE profit > 0)::bigint AS "winCount",
              COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0) AS "grossProfit",
              COALESCE(SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END), 0) AS "grossLoss"
            FROM "EATrade"
            WHERE "instanceId" = ANY(${ids}) AND "closeTime" IS NOT NULL
            GROUP BY "instanceId"
          `;

        for (const row of rawStats) {
          const groupRow = rows.find((r) => r.instanceId === row.instanceId);
          tradeAggregates.set(row.instanceId, {
            winCount: Number(row.winCount),
            lossCount: (groupRow?._count?.id ?? 0) - Number(row.winCount),
            grossProfit: Number(row.grossProfit),
            grossLoss: Number(row.grossLoss),
            tradeCount: groupRow?._count?.id ?? 0,
          });
        }
      } catch (err) {
        log.warn(
          { step: "trade_aggregates_error" },
          "trade aggregates query failed (non-critical)"
        );
        // tradeAggregates remains empty — edge score won't be computed
      }
    }

    // ── Phase 1c: Recent trades for activity feed (non-critical) ──
    let recentTrades: {
      instanceId: string;
      profit: number;
      closeTime: string | null;
      symbol: string | null;
      magicNumber: number | null;
    }[] = [];

    const allIds = eaInstances.map((ea) => ea.id);
    if (allIds.length > 0) {
      try {
        // Exclude orphan placeholder rows from the activity feed — they
        // have no real symbol. Aggregates used for edge-score/totals still
        // include orphans (see rawStats query above).
        const trades = await prisma.eATrade.findMany({
          where: {
            instanceId: { in: allIds },
            closeTime: { not: null },
            symbol: { not: ORPHAN_EATRADE_SYMBOL },
          },
          orderBy: { closeTime: "desc" },
          take: 15,
          select: {
            instanceId: true,
            profit: true,
            closeTime: true,
            symbol: true,
            magicNumber: true,
          },
        });
        recentTrades = trades.map((t) => ({
          instanceId: t.instanceId,
          profit: t.profit,
          closeTime: t.closeTime?.toISOString() ?? null,
          symbol: t.symbol,
          magicNumber: t.magicNumber,
        }));
      } catch {
        // Non-critical — feed starts empty, fills from SSE
      }
    }

    return {
      eaInstances,
      subscription,
      authority: null,
      analytics: null,
      recentDecisions: [],
      tradeAggregates,
      recentTrades,
    };
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
