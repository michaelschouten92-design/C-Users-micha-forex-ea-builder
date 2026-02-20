import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { TrackRecordEventType } from "@/lib/track-record/types";
import { verifySingleEvent } from "@/lib/track-record/chain-verifier";
import { processEvent, stateToDbUpdate, stateFromDb } from "@/lib/track-record/state-manager";
import { shouldCreateCheckpoint, buildCheckpointData } from "@/lib/track-record/checkpoint";
import { evaluateHealthIfDue } from "@/lib/strategy-health";

const ingestSchema = z.object({
  eventType: z.enum([
    "TRADE_OPEN",
    "TRADE_CLOSE",
    "TRADE_MODIFY",
    "PARTIAL_CLOSE",
    "SNAPSHOT",
    "SESSION_START",
    "SESSION_END",
    "CHAIN_RECOVERY",
    "CASHFLOW",
    "BROKER_EVIDENCE",
    "BROKER_HISTORY_DIGEST",
  ]),
  seqNo: z.number().int().positive(),
  prevHash: z.string().length(64),
  eventHash: z.string().length(64),
  timestamp: z.number().int().positive(),
  payload: z.record(z.unknown()),
});

// POST /api/track-record/ingest — accept events from EA, verify chain, store
export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  const { instanceId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = ingestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const { eventType, seqNo, prevHash, eventHash, timestamp, payload } = validation.data;

  try {
    // Load or create state
    let dbState = await prisma.trackRecordState.findUnique({
      where: { instanceId },
    });

    if (!dbState) {
      dbState = await prisma.trackRecordState.create({
        data: { instanceId },
      });
    }

    // Idempotency check: if EA resends same seqNo, check if eventHash matches
    if (seqNo <= dbState.lastSeqNo) {
      if (seqNo === dbState.lastSeqNo) {
        // Check if it's a retry of the same event
        const existingEvent = await prisma.trackRecordEvent.findUnique({
          where: { instanceId_seqNo: { instanceId, seqNo } },
          select: { eventHash: true },
        });
        if (existingEvent?.eventHash === eventHash) {
          // Safe retry — return success with current state
          return NextResponse.json({
            success: true,
            lastSeqNo: dbState.lastSeqNo,
            lastEventHash: dbState.lastEventHash,
          });
        }
      }
      return NextResponse.json(
        { error: `Duplicate or past seqNo: ${seqNo}, expected ${dbState.lastSeqNo + 1}` },
        { status: 409 }
      );
    }

    // Verify chain integrity
    const verification = verifySingleEvent(
      { eventType, seqNo, prevHash, eventHash, timestamp, payload },
      instanceId,
      dbState.lastSeqNo,
      dbState.lastEventHash
    );

    if (!verification.valid) {
      return NextResponse.json(
        {
          error: "Chain verification failed",
          details: verification.error,
          lastSeqNo: dbState.lastSeqNo,
          lastEventHash: dbState.lastEventHash,
        },
        { status: 409 }
      );
    }

    // Process event to compute new state
    const state = stateFromDb(dbState);
    processEvent(state, eventType as TrackRecordEventType, eventHash, seqNo, payload);
    const stateUpdate = stateToDbUpdate(state);

    // Build checkpoint if needed
    const checkpoint = shouldCreateCheckpoint(eventType, seqNo)
      ? buildCheckpointData(instanceId, state)
      : null;

    // Atomic transaction: store event + update state + optional checkpoint
    await prisma.$transaction([
      prisma.trackRecordEvent.create({
        data: {
          instanceId,
          seqNo,
          eventType,
          eventHash,
          prevHash,
          payload: payload as Prisma.InputJsonValue,
          timestamp: new Date(timestamp * 1000),
        },
      }),
      prisma.trackRecordState.update({
        where: { instanceId },
        data: stateUpdate,
      }),
      ...(checkpoint ? [prisma.trackRecordCheckpoint.create({ data: checkpoint })] : []),
    ]);

    // Fire-and-forget: evaluate health after trade closes
    if (eventType === "TRADE_CLOSE") {
      evaluateHealthIfDue(instanceId).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      lastSeqNo: state.lastSeqNo,
      lastEventHash: state.lastEventHash,
    });
  } catch (error) {
    // Handle unique constraint violation (race condition / duplicate)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Duplicate event (concurrent write)", lastSeqNo: seqNo },
        { status: 409 }
      );
    }
    console.error("Track record ingest error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
