import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/csrf";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalStrategyTimelineRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

// ── Types ──────────────────────────────────────────────

type TimelineType = "MONITORING_RUN" | "INCIDENT" | "OVERRIDE" | "HOLD" | "LIFECYCLE";

type Severity = "INFO" | "WARN" | "CRITICAL";

interface TimelineItem {
  type: TimelineType;
  ts: string;
  title: string;
  severity: Severity;
  ref: {
    incidentId?: string;
    overrideId?: string;
    runId?: string;
    recordId?: string;
  };
  details: Record<string, unknown>;
}

// ── Proof event types we pull for HOLD / LIFECYCLE ─────

const HOLD_TYPES = ["OPERATOR_HALT_APPLIED", "OPERATOR_HALT_RELEASED"] as const;

const LIFECYCLE_TYPES = [
  "STRATEGY_EDGE_AT_RISK",
  "STRATEGY_INVALIDATED",
  "STRATEGY_RECOVERED",
] as const;

const PROOF_EVENT_TYPES: string[] = [...HOLD_TYPES, ...LIFECYCLE_TYPES];

// ── Whitelisted meta keys for proof events ─────────────

const HOLD_META_KEYS = new Set(["previousHold", "newHold", "actor", "note"]);
const LIFECYCLE_META_KEYS = new Set(["from", "to", "triggeringReasons", "consecutiveHealthyRuns"]);

function extractWhitelistedMeta(meta: unknown, allowedKeys: Set<string>): Record<string, unknown> {
  if (!meta || typeof meta !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (allowedKeys.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

// ── Mappers ────────────────────────────────────────────

function monitoringRunToItems(run: {
  id: string;
  completedAt: Date | null;
  requestedAt: Date;
  status: string;
  verdict: string | null;
  reasons: unknown;
  tradeSnapshotHash: string | null;
  configVersion: string | null;
  thresholdsHash: string | null;
  recordId: string;
}): TimelineItem[] {
  const ts = run.completedAt ?? run.requestedAt;
  const reasonCodes = Array.isArray(run.reasons) ? run.reasons : [];
  let severity: Severity = "INFO";
  if (run.verdict === "INVALIDATED") severity = "CRITICAL";
  else if (run.verdict === "AT_RISK") severity = "WARN";

  return [
    {
      type: "MONITORING_RUN",
      ts: ts.toISOString(),
      title:
        run.status === "COMPLETED"
          ? `Monitoring: ${run.verdict ?? "unknown"}`
          : `Monitoring run ${run.status}`,
      severity,
      ref: { runId: run.id, recordId: run.recordId },
      details: {
        status: run.status,
        verdict: run.verdict,
        reasonCodes,
        snapshotHash: run.tradeSnapshotHash,
        configVersion: run.configVersion,
      },
    },
  ];
}

function incidentToItems(inc: {
  id: string;
  status: string;
  severity: string;
  openedAt: Date;
  closedAt: Date | null;
  closeReason: string | null;
  ackDeadlineAt: Date;
  escalationCount: number;
  triggerRecordId: string;
}): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      type: "INCIDENT",
      ts: inc.openedAt.toISOString(),
      title: `Incident opened (${inc.severity})`,
      severity: inc.severity === "INVALIDATED" ? "CRITICAL" : "WARN",
      ref: { incidentId: inc.id, recordId: inc.triggerRecordId },
      details: {
        status: inc.status,
        severity: inc.severity,
        escalationCount: inc.escalationCount,
        ackDeadlineAt: inc.ackDeadlineAt.toISOString(),
      },
    },
  ];

  if (inc.closedAt) {
    items.push({
      type: "INCIDENT",
      ts: inc.closedAt.toISOString(),
      title: `Incident closed (${inc.closeReason ?? "unknown"})`,
      severity: "INFO",
      ref: { incidentId: inc.id },
      details: { closeReason: inc.closeReason },
    });
  }

  return items;
}

function overrideToItems(ov: {
  id: string;
  status: string;
  requestedAt: Date;
  requestedBy: string;
  approvedAt: Date | null;
  approvedBy: string | null;
  appliedAt: Date | null;
  rejectedAt: Date | null;
  expiredAt: Date | null;
  requestRecordId: string;
}): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      type: "OVERRIDE",
      ts: ov.requestedAt.toISOString(),
      title: "Override requested",
      severity: "INFO",
      ref: { overrideId: ov.id, recordId: ov.requestRecordId },
      details: { requestedBy: ov.requestedBy },
    },
  ];

  if (ov.approvedAt) {
    items.push({
      type: "OVERRIDE",
      ts: ov.approvedAt.toISOString(),
      title: "Override approved",
      severity: "INFO",
      ref: { overrideId: ov.id },
      details: { approvedBy: ov.approvedBy },
    });
  }

  if (ov.appliedAt) {
    items.push({
      type: "OVERRIDE",
      ts: ov.appliedAt.toISOString(),
      title: "Override applied",
      severity: "WARN",
      ref: { overrideId: ov.id },
      details: { status: ov.status },
    });
  }

  if (ov.rejectedAt) {
    items.push({
      type: "OVERRIDE",
      ts: ov.rejectedAt.toISOString(),
      title: "Override rejected",
      severity: "INFO",
      ref: { overrideId: ov.id },
      details: { status: ov.status },
    });
  }

  if (ov.expiredAt) {
    items.push({
      type: "OVERRIDE",
      ts: ov.expiredAt.toISOString(),
      title: "Override expired",
      severity: "INFO",
      ref: { overrideId: ov.id },
      details: { status: ov.status },
    });
  }

  return items;
}

function proofEventToItem(evt: {
  type: string;
  createdAt: Date;
  sessionId: string;
  meta: unknown;
}): TimelineItem {
  const isHold = (HOLD_TYPES as readonly string[]).includes(evt.type);

  const TITLE_MAP: Record<string, string> = {
    OPERATOR_HALT_APPLIED: "Operator halt applied",
    OPERATOR_HALT_RELEASED: "Operator halt released",
    STRATEGY_EDGE_AT_RISK: "Strategy edge at risk",
    STRATEGY_INVALIDATED: "Strategy invalidated",
    STRATEGY_RECOVERED: "Strategy recovered",
  };

  const SEVERITY_MAP: Record<string, Severity> = {
    OPERATOR_HALT_APPLIED: "CRITICAL",
    OPERATOR_HALT_RELEASED: "INFO",
    STRATEGY_EDGE_AT_RISK: "WARN",
    STRATEGY_INVALIDATED: "CRITICAL",
    STRATEGY_RECOVERED: "INFO",
  };

  const allowedKeys = isHold ? HOLD_META_KEYS : LIFECYCLE_META_KEYS;

  return {
    type: isHold ? "HOLD" : "LIFECYCLE",
    ts: evt.createdAt.toISOString(),
    title: TITLE_MAP[evt.type] ?? evt.type,
    severity: SEVERITY_MAP[evt.type] ?? "INFO",
    ref: { recordId: evt.sessionId },
    details: extractWhitelistedMeta(evt.meta, allowedKeys),
  };
}

// ── Route handler ──────────────────────────────────────

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(
    internalStrategyTimelineRateLimiter,
    `internal-strategy-timeline:${ip}`
  );
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const { id: strategyId } = await params;

  const limitParam = request.nextUrl.searchParams.get("limit");
  let limit = 50;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed)) {
      limit = Math.max(1, Math.min(200, parsed));
    }
  }

  try {
    // Pull from all sources in parallel — over-fetch then merge + trim
    const [monitoringRuns, incidents, overrides, proofEvents] = await Promise.all([
      prisma.monitoringRun.findMany({
        where: { strategyId },
        orderBy: { completedAt: "desc" },
        take: limit,
        select: {
          id: true,
          completedAt: true,
          requestedAt: true,
          status: true,
          verdict: true,
          reasons: true,
          tradeSnapshotHash: true,
          configVersion: true,
          thresholdsHash: true,
          recordId: true,
        },
      }),
      prisma.incident.findMany({
        where: { strategyId },
        orderBy: { openedAt: "desc" },
        take: limit,
        select: {
          id: true,
          status: true,
          severity: true,
          openedAt: true,
          closedAt: true,
          closeReason: true,
          ackDeadlineAt: true,
          escalationCount: true,
          triggerRecordId: true,
        },
      }),
      prisma.overrideRequest.findMany({
        where: { strategyId },
        orderBy: { requestedAt: "desc" },
        take: limit,
        select: {
          id: true,
          status: true,
          requestedAt: true,
          requestedBy: true,
          approvedAt: true,
          approvedBy: true,
          appliedAt: true,
          rejectedAt: true,
          expiredAt: true,
          requestRecordId: true,
        },
      }),
      prisma.proofEventLog.findMany({
        where: {
          strategyId,
          type: { in: PROOF_EVENT_TYPES },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          type: true,
          createdAt: true,
          sessionId: true,
          meta: true,
        },
      }),
    ]);

    // Map each source into TimelineItem[]
    const items: TimelineItem[] = [
      ...monitoringRuns.flatMap(monitoringRunToItems),
      ...incidents.flatMap(incidentToItems),
      ...overrides.flatMap(overrideToItems),
      ...proofEvents.map(proofEventToItem),
    ];

    // Sort newest first, then trim to limit
    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    const timeline = items.slice(0, limit);

    return NextResponse.json({ timeline });
  } catch {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
