import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/csrf";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalStrategyTrendsRateLimiter,
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(
    internalStrategyTrendsRateLimiter,
    `internal-strategy-trends:${ip}`
  );
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const { id: strategyId } = await params;

  const windowParam = request.nextUrl.searchParams.get("window");
  let windowDays = 30;
  if (windowParam) {
    const parsed = parseInt(windowParam, 10);
    if (!isNaN(parsed)) {
      windowDays = Math.max(1, Math.min(365, parsed));
    }
  }

  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  try {
    const [monitoringRuns, incidents, overrides] = await Promise.all([
      prisma.monitoringRun.findMany({
        where: {
          strategyId,
          requestedAt: { gte: windowStart },
        },
        orderBy: { completedAt: "desc" },
        select: {
          id: true,
          completedAt: true,
          status: true,
          verdict: true,
          reasons: true,
        },
      }),
      prisma.incident.findMany({
        where: {
          strategyId,
          openedAt: { gte: windowStart },
        },
        orderBy: { openedAt: "desc" },
        select: {
          id: true,
          status: true,
          openedAt: true,
          closedAt: true,
          closeReason: true,
        },
      }),
      prisma.overrideRequest.findMany({
        where: {
          strategyId,
          requestedAt: { gte: windowStart },
        },
        select: {
          status: true,
        },
      }),
    ]);

    // ── Monitoring aggregates ──────────────────────────
    let healthyCount = 0;
    let atRiskCount = 0;
    let invalidatedCount = 0;
    let failedCount = 0;
    const reasonCounter = new Map<string, number>();

    for (const run of monitoringRuns) {
      if (run.status === "FAILED") {
        failedCount++;
        continue;
      }
      switch (run.verdict) {
        case "HEALTHY":
          healthyCount++;
          break;
        case "AT_RISK":
          atRiskCount++;
          break;
        case "INVALIDATED":
          invalidatedCount++;
          break;
      }
      if (Array.isArray(run.reasons)) {
        for (const reason of run.reasons) {
          if (typeof reason === "string") {
            reasonCounter.set(reason, (reasonCounter.get(reason) ?? 0) + 1);
          }
        }
      }
    }

    const mostCommonReasons = [...reasonCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reasonCode, count]) => ({ reasonCode, count }));

    const lastRuns = monitoringRuns.slice(0, 10).map((r) => ({
      completedAt: r.completedAt,
      verdict: r.verdict,
      reasonCodes: Array.isArray(r.reasons) ? r.reasons : [],
    }));

    // ── Incident aggregates ────────────────────────────
    let escalatedInWindow = 0;
    let autoInvalidatedInWindow = 0;

    for (const inc of incidents) {
      if (
        inc.status === "ESCALATED" ||
        (inc.status === "CLOSED" &&
          inc.closeReason !== "RECOVERED" &&
          inc.closeReason !== "OVERRIDE_APPLIED")
      ) {
        // Count incidents that escalated at any point — check status or closeReason
        if (inc.status === "ESCALATED") escalatedInWindow++;
      }
      if (inc.closeReason === "AUTO_INVALIDATED") autoInvalidatedInWindow++;
    }

    const lastIncident =
      incidents.length > 0
        ? {
            id: incidents[0].id,
            status: incidents[0].status,
            openedAt: incidents[0].openedAt,
            closedAt: incidents[0].closedAt,
            closeReason: incidents[0].closeReason,
          }
        : null;

    // ── Override aggregates ─────────────────────────────
    let appliedInWindow = 0;
    let expiredInWindow = 0;

    for (const ov of overrides) {
      if (ov.status === "APPLIED") appliedInWindow++;
      if (ov.status === "EXPIRED") expiredInWindow++;
    }

    return NextResponse.json({
      strategyId,
      window: windowDays,
      monitoring: {
        totalRuns: monitoringRuns.length,
        healthyCount,
        atRiskCount,
        invalidatedCount,
        failedCount,
        mostCommonReasons,
        lastRuns,
      },
      incidents: {
        openedInWindow: incidents.length,
        escalatedInWindow,
        autoInvalidatedInWindow,
        lastIncident,
      },
      overrides: {
        requestedInWindow: overrides.length,
        appliedInWindow,
        expiredInWindow,
      },
    });
  } catch {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }
}
