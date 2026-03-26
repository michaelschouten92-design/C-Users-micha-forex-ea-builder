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
import { appendProofEventInTx } from "@/lib/proof/events";

const log = logger.child({ route: "/api/internal/monitoring/operator-hold" });

const HOLD_ACTIONS = {
  HALT: { proofEvent: "OPERATOR_HALT_APPLIED", from: "NONE", to: "HALTED" },
  RESUME: { proofEvent: "OPERATOR_HALT_RELEASED", from: "HALTED", to: "NONE" },
} as const;

const operatorHoldSchema = z.object({
  strategyId: z.string().min(1),
  recordId: z.string().min(1),
  action: z.enum(["HALT", "RESUME"]),
  note: z.string().max(280).optional(),
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

  const validation = validate(operatorHoldSchema, bodyResult.data);
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
  const holdAction = HOLD_ACTIONS[action];

  // Look up instance via strategy identity chain
  const instance = await prisma.liveEAInstance.findFirst({
    where: {
      deletedAt: null,
      strategyVersion: {
        strategyIdentity: { strategyId },
      },
    },
    select: { id: true, lifecycleState: true, operatorHold: true },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Strategy instance not found"), {
      status: 404,
    });
  }

  // Validate hold state transition
  if (instance.operatorHold !== holdAction.from) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `${action} requires operatorHold=${holdAction.from}, currently ${instance.operatorHold}`
      ),
      { status: 400 }
    );
  }

  // HALT additionally requires EDGE_AT_RISK lifecycle state
  if (action === "HALT" && instance.lifecycleState !== "EDGE_AT_RISK") {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        `HALT requires lifecycleState=EDGE_AT_RISK, currently ${instance.lifecycleState}`
      ),
      { status: 400 }
    );
  }

  // Proof-first: write proof event THEN update operatorHold in same serializable tx
  try {
    await prisma.$transaction(
      async (tx) => {
        await appendProofEventInTx(tx, strategyId, holdAction.proofEvent, {
          eventType: holdAction.proofEvent,
          recordId,
          strategyId,
          previousHold: holdAction.from,
          newHold: holdAction.to,
          note: note ?? null,
          actor: "operator",
          lifecycleState: instance.lifecycleState,
          timestamp: new Date().toISOString(),
        });

        await tx.liveEAInstance.update({
          where: { id: instance.id },
          data: { operatorHold: holdAction.to },
        });
      },
      { isolationLevel: "Serializable" }
    );
  } catch (err) {
    log.error({ err, strategyId, action }, "Failed to apply operator hold");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal server error"), {
      status: 500,
    });
  }

  return NextResponse.json({ ok: true, operatorHold: holdAction.to });
}
