import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalHeartbeatAnalyticsRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { computeHeartbeatAnalytics, HeartbeatEvent } from "@/domain/heartbeat/heartbeat-analytics";

const log = logger.child({ route: "/api/internal/heartbeat/analytics" });

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

const FAIL_CLOSED_METRICS = {
  windowStart: "",
  windowEnd: "",
  windowMs: 0,
  expectedCadenceMs: 0,
  totalEvents: 0,
  coverageMs: 0,
  coveragePct: 0,
  runMs: 0,
  runPct: 0,
  cadenceBreached: true,
  longestGapMs: 0,
  lastDecision: null,
};

/**
 * GET /api/internal/heartbeat/analytics?strategyId=...&windowHours=24&cadenceSeconds=60
 *
 * Read-model: returns cadence analytics and authority uptime metrics
 * computed from HEARTBEAT_DECISION_MADE proof events.
 *
 * Always returns 200 for valid auth. Fail-closed on errors.
 */
export async function GET(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(
    internalHeartbeatAnalyticsRateLimiter,
    `internal-heartbeat-analytics:${ip}`
  );
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const strategyId = request.nextUrl.searchParams.get("strategyId");
  if (!strategyId || strategyId.trim().length === 0) {
    return NextResponse.json(
      apiError(ErrorCode.VALIDATION_FAILED, "strategyId query parameter is required"),
      { status: 400 }
    );
  }

  // Parse + clamp parameters
  const windowHoursRaw = Number(request.nextUrl.searchParams.get("windowHours") ?? "24");
  const windowHours = Math.min(
    720,
    Math.max(1, Number.isFinite(windowHoursRaw) ? windowHoursRaw : 24)
  );

  const cadenceSecondsRaw = Number(request.nextUrl.searchParams.get("cadenceSeconds") ?? "60");
  const cadenceSeconds = Math.min(
    3600,
    Math.max(5, Number.isFinite(cadenceSecondsRaw) ? cadenceSecondsRaw : 60)
  );

  const now = new Date();
  const windowEnd = now;
  const windowStart = new Date(windowEnd.getTime() - windowHours * 3_600_000);
  const expectedCadenceMs = cadenceSeconds * 1000;

  // Fetch one anchor event before windowStart for continuity
  const lookbackStart = new Date(windowStart.getTime() - expectedCadenceMs);

  try {
    const events = await prisma.proofEventLog.findMany({
      where: {
        strategyId,
        type: "HEARTBEAT_DECISION_MADE",
        createdAt: { gte: lookbackStart },
      },
      orderBy: { createdAt: "asc" },
      select: { meta: true, createdAt: true },
    });

    // Map to HeartbeatEvent[] with defensive meta extraction
    const heartbeatEvents: HeartbeatEvent[] = events.map((e) => {
      const meta = e.meta as Record<string, unknown> | null;
      return {
        timestamp: e.createdAt,
        action: typeof meta?.action === "string" ? meta.action : "PAUSE",
        reasonCode: typeof meta?.reasonCode === "string" ? meta.reasonCode : "COMPUTATION_FAILED",
      };
    });

    const metrics = computeHeartbeatAnalytics(
      heartbeatEvents,
      windowStart,
      windowEnd,
      expectedCadenceMs
    );

    return NextResponse.json({
      strategyId,
      metrics,
      serverTime: now.toISOString(),
    });
  } catch (err) {
    log.error({ err, strategyId }, "heartbeat analytics computation failed");

    return NextResponse.json({
      strategyId,
      metrics: {
        ...FAIL_CLOSED_METRICS,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        windowMs: windowEnd.getTime() - windowStart.getTime(),
        expectedCadenceMs,
        failClosed: true,
      },
      serverTime: now.toISOString(),
    });
  }
}
