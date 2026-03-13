import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { ErrorCode, apiError } from "@/lib/error-codes";
import { z } from "zod";
import { performLifecycleTransitionInTx } from "@/lib/strategy-lifecycle/transition-service";
import type { StrategyLifecycleState } from "@/lib/strategy-lifecycle/transitions";
import { appendProofEventInTx } from "@/lib/proof/events";
import { randomUUID } from "crypto";

type Props = {
  params: Promise<{ instanceId: string }>;
};

const retireSchema = z.object({
  action: z.literal("retire"),
  reason: z.literal("manual"),
});

// GET /api/live/[instanceId]/lifecycle — lifecycle state
export async function GET(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { instanceId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: {
      lifecyclePhase: true,
      phaseEnteredAt: true,
      provenAt: true,
      retiredAt: true,
      retiredReason: true,
      peakScore: true,
      peakScoreAt: true,
    },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), { status: 404 });
  }

  return NextResponse.json({
    phase: instance.lifecyclePhase,
    phaseEnteredAt: instance.phaseEnteredAt,
    provenAt: instance.provenAt,
    retiredAt: instance.retiredAt,
    retiredReason: instance.retiredReason,
    peakScore: instance.peakScore,
    peakScoreAt: instance.peakScoreAt,
  });
}

// POST /api/live/[instanceId]/lifecycle — manual retirement
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  const { instanceId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json(apiError(ErrorCode.UNAUTHORIZED, "Unauthorized"), { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(apiError(ErrorCode.INVALID_JSON, "Invalid JSON body"), {
      status: 400,
    });
  }

  const parsed = retireSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid request. Expected: { action: 'retire', reason: 'manual' }"
      ),
      { status: 400 }
    );
  }

  const instance = await prisma.liveEAInstance.findFirst({
    where: { id: instanceId, userId: session.user.id, deletedAt: null },
    select: {
      id: true,
      lifecyclePhase: true,
      lifecycleState: true,
      strategyVersion: {
        select: { strategyIdentity: { select: { strategyId: true } } },
      },
    },
  });

  if (!instance) {
    return NextResponse.json(apiError(ErrorCode.NOT_FOUND, "Instance not found"), { status: 404 });
  }

  if (instance.lifecyclePhase === "RETIRED") {
    return NextResponse.json(apiError(ErrorCode.VALIDATION_FAILED, "Strategy is already retired"), {
      status: 400,
    });
  }

  const strategyId = instance.strategyVersion?.strategyIdentity?.strategyId;
  if (!strategyId) {
    return NextResponse.json(
      apiError(ErrorCode.INTERNAL_ERROR, "Instance has no linked strategy identity"),
      { status: 500 }
    );
  }

  const recordId = randomUUID();
  const now = new Date();

  try {
    await prisma.$transaction(
      async (tx) => {
        await appendProofEventInTx(tx, strategyId, "STRATEGY_MANUALLY_RETIRED", {
          eventType: "STRATEGY_MANUALLY_RETIRED",
          recordId,
          strategyId,
          instanceId,
          from: instance.lifecycleState,
          to: "INVALIDATED",
          reason: "manual",
          timestamp: now.toISOString(),
        });

        await performLifecycleTransitionInTx(
          tx,
          instanceId,
          instance.lifecycleState as StrategyLifecycleState,
          "INVALIDATED",
          "manual",
          "operator"
        );

        await tx.liveEAInstance.update({
          where: { id: instanceId },
          data: {
            lifecyclePhase: "RETIRED",
            phaseEnteredAt: now,
            retiredAt: now,
            retiredReason: "manual",
          },
        });
      },
      { isolationLevel: "Serializable" }
    );
  } catch (err) {
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Failed to retire strategy"), {
      status: 500,
    });
  }

  return NextResponse.json({ success: true, phase: "RETIRED" });
}
