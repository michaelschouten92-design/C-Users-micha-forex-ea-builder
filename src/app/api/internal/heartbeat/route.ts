import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalHeartbeatRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson, validate, formatZodErrors } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { decideHeartbeatAction } from "@/domain/heartbeat/decide-heartbeat-action";
import { assertHeartbeatConsistency } from "@/domain/heartbeat/assert-heartbeat-consistency";
import {
  buildHeartbeatGovernanceSnapshot,
  serializeGovernanceSnapshot,
} from "@/domain/heartbeat/build-governance-snapshot";
import {
  evaluateAuthorityReadiness,
  type AuthorityBlockReason,
} from "@/domain/heartbeat/authority-readiness";

const log = logger.child({ route: "/api/internal/heartbeat" });

/** Control-plane responses must never be cached. */
const HEARTBEAT_HEADERS = {
  "Cache-Control": "no-store",
};

const heartbeatSchema = z.object({
  strategyId: z.string().min(1),
  instanceTag: z.string().optional(),
  accountId: z.string().optional(),
});

function authenticateInternal(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) return false;
  if (!apiKey) return false;

  return timingSafeEqual(apiKey, expectedKey);
}

export async function POST(request: NextRequest) {
  if (!authenticateInternal(request)) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(internalHeartbeatRateLimiter, `internal-heartbeat:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError(ErrorCode.RATE_LIMITED, formatRateLimitError(rl)), {
      status: 429,
      headers: createRateLimitHeaders(rl),
    });
  }

  const ctError = checkContentType(request);
  if (ctError) return ctError;

  const bodyResult = await safeReadJson(request);
  if ("error" in bodyResult) return bodyResult.error;

  const validation = validate(heartbeatSchema, bodyResult.data);
  if (!validation.success) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid request body",
        formatZodErrors(validation.error)
      ),
      { status: 400 }
    );
  }

  const { strategyId } = validation.data;

  try {
    const instance = await prisma.liveEAInstance.findFirst({
      where: {
        strategyVersion: {
          strategyIdentity: { strategyId },
        },
      },
      select: {
        userId: true,
        lifecycleState: true,
        operatorHold: true,
        monitoringSuppressedUntil: true,
      },
    });

    const now = new Date();

    // ── Authority readiness (fail-closed) ─────────────────────
    let authorityReady = true;
    let authorityReasons: AuthorityBlockReason[] = [];

    if (instance) {
      try {
        const [strategyCount, liveEACount] = await Promise.all([
          prisma.project.count({ where: { userId: instance.userId, deletedAt: null } }),
          prisma.liveEAInstance.count({ where: { userId: instance.userId, deletedAt: null } }),
        ]);
        const authority = evaluateAuthorityReadiness(strategyCount, liveEACount);
        authorityReady = authority.ready;
        authorityReasons = authority.reasons;
      } catch {
        // Fail-closed: DB error → treat as authority uninitialized
        authorityReady = false;
        authorityReasons = ["NO_STRATEGIES", "NO_LIVE_INSTANCE"];
      }
    }

    const heartbeatInput = instance
      ? {
          lifecycleState: instance.lifecycleState,
          operatorHold: instance.operatorHold as "NONE" | "HALTED" | "OVERRIDE_PENDING" | null,
          monitoringSuppressedUntil: instance.monitoringSuppressedUntil,
          now,
          authorityReady,
          authorityReasons,
        }
      : null;

    const rawDecision = decideHeartbeatAction(heartbeatInput);
    const decision = assertHeartbeatConsistency(heartbeatInput, rawDecision);

    // Deterministic governance snapshot — derived from the same DB read,
    // no additional queries. Included in proof events only, never in API response.
    const governanceSnapshot = serializeGovernanceSnapshot(
      buildHeartbeatGovernanceSnapshot(heartbeatInput)
    );

    // If guard triggered, log structured warning + best-effort proof event
    if (decision.reasonCode === "CONTROL_INCONSISTENCY_DETECTED") {
      log.warn(
        {
          strategyId,
          originalAction: rawDecision.action,
          originalReasonCode: rawDecision.reasonCode,
          guardedAction: decision.action,
        },
        "heartbeat control inconsistency detected"
      );
      logControlInconsistencyEvent(
        strategyId,
        rawDecision.action,
        rawDecision.reasonCode,
        governanceSnapshot
      ).catch(() => {});
    } else if (decision.reasonCode === "AUTHORITY_UNINITIALIZED") {
      log.info(
        { strategyId, action: "PAUSE", reasonCode: "AUTHORITY_UNINITIALIZED", authorityReasons },
        "heartbeat authority block"
      );
      logAuthorityBlockEvent(strategyId, authorityReasons).catch(() => {});
    } else {
      // Structured log — safe fields only (no accountId/instanceTag)
      log.info(
        { strategyId, action: decision.action, reasonCode: decision.reasonCode },
        "heartbeat"
      );
    }

    // Best-effort proof event for the final decision
    logHeartbeatProofEvent(
      strategyId,
      decision.action,
      decision.reasonCode,
      governanceSnapshot
    ).catch(() => {});

    return NextResponse.json(
      {
        strategyId,
        action: decision.action,
        reasonCode: decision.reasonCode,
        ...(decision.reasonCode === "AUTHORITY_UNINITIALIZED" ? { authorityReasons } : {}),
        serverTime: now.toISOString(),
      },
      { headers: HEARTBEAT_HEADERS }
    );
  } catch (err) {
    log.error({ err, strategyId }, "heartbeat computation failed");

    // Fail-closed: PAUSE on any error
    return NextResponse.json(
      {
        strategyId,
        action: "PAUSE",
        reasonCode: "COMPUTATION_FAILED",
        serverTime: new Date().toISOString(),
      },
      { headers: HEARTBEAT_HEADERS }
    );
  }
}

async function logHeartbeatProofEvent(
  strategyId: string,
  action: string,
  reasonCode: string,
  governanceSnapshot: string
): Promise<void> {
  try {
    const { appendProofEvent } = await import("@/lib/proof/events");
    await appendProofEvent(strategyId, "HEARTBEAT_DECISION_MADE", {
      eventType: "HEARTBEAT_DECISION_MADE",
      recordId: crypto.randomUUID(),
      strategyId,
      action,
      reasonCode,
      governanceSnapshot,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Best-effort — do not break heartbeat response
  }
}

async function logControlInconsistencyEvent(
  strategyId: string,
  originalAction: string,
  originalReasonCode: string,
  governanceSnapshot: string
): Promise<void> {
  try {
    const { appendProofEvent } = await import("@/lib/proof/events");
    await appendProofEvent(strategyId, "HEARTBEAT_CONTROL_INCONSISTENCY", {
      eventType: "HEARTBEAT_CONTROL_INCONSISTENCY",
      recordId: crypto.randomUUID(),
      strategyId,
      originalAction,
      originalReasonCode,
      guardedAction: "PAUSE",
      guardedReasonCode: "CONTROL_INCONSISTENCY_DETECTED",
      governanceSnapshot,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Best-effort — do not break heartbeat response
  }
}

async function logAuthorityBlockEvent(strategyId: string, reasons: string[]): Promise<void> {
  try {
    const { appendProofEvent } = await import("@/lib/proof/events");
    await appendProofEvent(strategyId, "AUTHORITY_BLOCK", {
      eventType: "AUTHORITY_BLOCK",
      recordId: crypto.randomUUID(),
      strategyId,
      action: "PAUSE",
      reasonCode: "AUTHORITY_UNINITIALIZED",
      reasons,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Best-effort — do not break heartbeat response
  }
}
