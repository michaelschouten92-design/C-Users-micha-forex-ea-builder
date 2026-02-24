import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { TrackRecordEventType } from "@/lib/track-record/types";
import { verifySingleEvent } from "@/lib/track-record/chain-verifier";
import { processEvent, stateToDbUpdate, stateFromDb } from "@/lib/track-record/state-manager";
import {
  shouldCreateCheckpoint,
  buildCheckpointData,
  computeCheckpointHmac,
} from "@/lib/track-record/checkpoint";
import { shouldCreateCommitment, buildCommitmentData } from "@/lib/track-record/ledger-commitment";
import { validatePayload } from "@/lib/track-record/payload-schemas";
import { checkRateLimit } from "@/lib/track-record/rate-limiter";
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

  // Per-instance rate limiting (100 events/minute)
  const rateLimitError = checkRateLimit(instanceId);
  if (rateLimitError) {
    return NextResponse.json({ error: rateLimitError }, { status: 429 });
  }

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

  // Per-event-type payload validation
  const payloadError = validatePayload(eventType, payload);
  if (payloadError) {
    return NextResponse.json({ error: payloadError }, { status: 400 });
  }

  // Timestamp bounds validation (before entering transaction)
  // Tight window: 30 days back, 60 seconds forward.
  // Prevents backdating attacks while allowing reasonable offline buffering.
  const nowSec = Math.floor(Date.now() / 1000);
  const MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days
  const MAX_CLOCK_SKEW_SEC = 60;

  if (timestamp > nowSec + MAX_CLOCK_SKEW_SEC) {
    return NextResponse.json(
      { error: "Timestamp is in the future (max clock skew: 60s)" },
      { status: 400 }
    );
  }

  if (timestamp < nowSec - MAX_AGE_SEC) {
    return NextResponse.json(
      { error: "Timestamp is older than 30 days. Use CHAIN_RECOVERY for historical events." },
      { status: 400 }
    );
  }

  try {
    // All state reads + writes inside one interactive transaction to prevent races.
    // Serializable isolation ensures no concurrent reader sees stale state.
    const result = await prisma.$transaction(
      async (tx) => {
        // Load or create state (inside transaction — locked against concurrent writes)
        let dbState = await tx.trackRecordState.findUnique({
          where: { instanceId },
        });

        if (!dbState) {
          dbState = await tx.trackRecordState.create({
            data: { instanceId },
          });
        }

        // Validate timestamp against instance creation date
        const instance = await tx.liveEAInstance.findUnique({
          where: { id: instanceId },
          select: { createdAt: true },
        });
        if (instance) {
          const instanceCreatedSec = Math.floor(instance.createdAt.getTime() / 1000);
          const ONE_DAY_SEC = 24 * 60 * 60;
          if (timestamp < instanceCreatedSec - ONE_DAY_SEC) {
            return {
              status: 400 as const,
              body: { error: "Timestamp is before instance creation date (minus 1 day tolerance)" },
            };
          }
        }

        // receivedAt monotonicity check: detect clock manipulation or replays
        // Server-side receive time should not regress for sequential events
        if (dbState.lastSeqNo > 0) {
          const lastEvent = await tx.trackRecordEvent.findUnique({
            where: { instanceId_seqNo: { instanceId, seqNo: dbState.lastSeqNo } },
            select: { receivedAt: true },
          });
          if (lastEvent) {
            const lastReceivedMs = lastEvent.receivedAt.getTime();
            const nowMs = Date.now();
            // Allow 1 second tolerance for clock jitter between requests
            if (nowMs < lastReceivedMs - 1000) {
              logger.warn(
                { instanceId, seqNo, lastReceivedAt: lastEvent.receivedAt.toISOString(), nowMs },
                "receivedAt monotonicity violation: server clock may have regressed"
              );
            }
          }
        }

        // Idempotency check: if EA resends same seqNo, check if eventHash matches
        if (seqNo <= dbState.lastSeqNo) {
          if (seqNo === dbState.lastSeqNo) {
            const existingEvent = await tx.trackRecordEvent.findUnique({
              where: { instanceId_seqNo: { instanceId, seqNo } },
              select: { eventHash: true },
            });
            if (existingEvent?.eventHash === eventHash) {
              return {
                status: 200 as const,
                body: {
                  success: true,
                  lastSeqNo: dbState.lastSeqNo,
                  lastEventHash: dbState.lastEventHash,
                },
              };
            }
          }
          return {
            status: 409 as const,
            body: {
              error: `Duplicate or past seqNo: ${seqNo}, expected ${dbState.lastSeqNo + 1}`,
            },
          };
        }

        // Verify chain integrity
        const verification = verifySingleEvent(
          { eventType, seqNo, prevHash, eventHash, timestamp, payload },
          instanceId,
          dbState.lastSeqNo,
          dbState.lastEventHash
        );

        if (!verification.valid) {
          return {
            status: 409 as const,
            body: {
              error: "Chain verification failed",
              details: verification.error,
              lastSeqNo: dbState.lastSeqNo,
              lastEventHash: dbState.lastEventHash,
            },
          };
        }

        // Cross-event validation: CLOSE/MODIFY/PARTIAL_CLOSE must reference a known open ticket
        const state = stateFromDb(dbState);
        if (
          (eventType === "TRADE_CLOSE" ||
            eventType === "TRADE_MODIFY" ||
            eventType === "PARTIAL_CLOSE") &&
          payload.ticket
        ) {
          const ticketStr = String(payload.ticket);
          const knownOpen = state.openPositions.some((p) => p.ticket === ticketStr);
          if (!knownOpen) {
            logger.warn(
              { instanceId, eventType, ticket: ticketStr, seqNo },
              "Cross-event warning: ticket not found in open positions"
            );
          }
        }

        // Process event to compute new state
        processEvent(state, eventType as TrackRecordEventType, eventHash, seqNo, payload);
        const stateUpdate = stateToDbUpdate(state);

        // Build checkpoint if needed
        const checkpoint = shouldCreateCheckpoint(eventType, seqNo)
          ? buildCheckpointData(instanceId, state)
          : null;

        // Store event + update state + optional checkpoint (all inside the same tx)
        await tx.trackRecordEvent.create({
          data: {
            instanceId,
            seqNo,
            eventType,
            eventHash,
            prevHash,
            payload: payload as Prisma.InputJsonValue,
            timestamp: new Date(timestamp * 1000),
          },
        });

        await tx.trackRecordState.update({
          where: { instanceId },
          data: stateUpdate,
        });

        if (checkpoint) {
          await tx.trackRecordCheckpoint.create({ data: checkpoint });
        }

        // Build ledger commitment if due (every 500 events)
        if (shouldCreateCommitment(seqNo)) {
          const stateHmac = checkpoint ? checkpoint.hmac : computeCheckpointHmac(instanceId, state);
          const commitment = buildCommitmentData(instanceId, seqNo, state.lastEventHash, stateHmac);
          await tx.ledgerCommitment.create({ data: commitment });
        }

        return {
          status: 200 as const,
          body: {
            success: true,
            lastSeqNo: state.lastSeqNo,
            lastEventHash: state.lastEventHash,
          },
        };
      },
      { isolationLevel: "Serializable" }
    );

    // Fire-and-forget: evaluate health after trade closes (outside tx)
    if (result.status === 200 && eventType === "TRADE_CLOSE") {
      evaluateHealthIfDue(instanceId).catch(() => {});
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    // Handle unique constraint violation or serialization failure (concurrent write)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Duplicate event (concurrent write)", lastSeqNo: seqNo },
        { status: 409 }
      );
    }
    // Prisma serialization failures (P2034) — EA can retry
    if (error instanceof Error && error.message.includes("P2034")) {
      return NextResponse.json({ error: "Transaction conflict, please retry" }, { status: 409 });
    }
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Track record ingest error"
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
