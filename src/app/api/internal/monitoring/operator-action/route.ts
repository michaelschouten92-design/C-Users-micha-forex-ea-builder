import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { ErrorCode, apiError } from "@/lib/error-codes";
import {
  checkRateLimit,
  internalOperatorActionRateLimiter,
  getClientIp,
  createRateLimitHeaders,
  formatRateLimitError,
} from "@/lib/rate-limit";
import { checkContentType, safeReadJson, validate, formatZodErrors } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { appendProofEvent } from "@/lib/proof/events";

const log = logger.child({ route: "/api/internal/monitoring/operator-action" });

const OPERATOR_ACTIONS = ["ACK", "HALT", "OVERRIDE_REQUEST"] as const;

const operatorActionSchema = z.object({
  strategyId: z.string().min(1),
  recordId: z.string().min(1),
  action: z.enum(OPERATOR_ACTIONS),
  note: z.string().max(280).optional(),
});

const ACTION_TO_PROOF_EVENT: Record<string, string> = {
  ACK: "OPERATOR_ACKNOWLEDGED_RISK",
  HALT: "OPERATOR_REQUESTED_HALT",
  OVERRIDE_REQUEST: "OPERATOR_OVERRIDE_REQUESTED",
};

const ACTION_ALLOWED_STATES: Record<string, string[]> = {
  ACK: ["EDGE_AT_RISK", "INVALIDATED"],
  HALT: ["EDGE_AT_RISK"],
  OVERRIDE_REQUEST: ["EDGE_AT_RISK"],
};

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
  const rl = await checkRateLimit(
    internalOperatorActionRateLimiter,
    `internal-operator-action:${ip}`
  );
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

  const validation = validate(operatorActionSchema, bodyResult.data);
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

  const { strategyId, recordId, action, note } = validation.data;

  // Look up instance via strategy identity chain
  const instance = await prisma.liveEAInstance.findFirst({
    where: {
      strategyVersion: {
        strategyIdentity: { strategyId },
      },
    },
    select: { id: true, lifecycleState: true },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Strategy instance not found"), {
      status: 404,
    });
  }

  // Validate action eligibility for current lifecycle state
  const allowedStates = ACTION_ALLOWED_STATES[action];
  if (!allowedStates.includes(instance.lifecycleState)) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `Action ${action} not allowed in state ${instance.lifecycleState}`
      ),
      { status: 400 }
    );
  }

  // Append proof event
  const proofEventType = ACTION_TO_PROOF_EVENT[action];
  try {
    await appendProofEvent(strategyId, proofEventType, {
      eventType: proofEventType,
      recordId,
      strategyId,
      action,
      note: note ?? null,
      lifecycleState: instance.lifecycleState,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    log.error({ err, strategyId, action }, "Failed to write operator action proof event");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }

  return NextResponse.json({ ok: true });
}
