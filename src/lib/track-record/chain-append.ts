/**
 * Server-side chain event appender.
 *
 * Used to insert server-generated events (like BROKER_HISTORY_DIGEST)
 * into an instance's tamper-evident hash chain.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildCanonicalEvent, computeEventHash } from "./canonical";
import { processEvent, stateFromDb, stateToDbUpdate } from "./state-manager";
import { shouldCreateCheckpoint, buildCheckpointData, computeCheckpointHmac } from "./checkpoint";
import { shouldCreateCommitment, buildCommitmentData } from "./ledger-commitment";
import type { TrackRecordEventType } from "./types";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "chain-append" });

const MAX_SERIALIZATION_RETRIES = 3;

/**
 * Thrown when appendChainEvent exhausts all retries on a Serializable
 * transaction conflict (Prisma P2034). Callers can match on this class
 * to return a retryable 409 instead of a generic 500.
 */
export class ChainSerializationError extends Error {
  constructor(
    public readonly instanceId: string,
    public readonly attempts: number,
    cause?: unknown
  ) {
    super(`Chain append failed after ${attempts} serialization retries for instance ${instanceId}`);
    this.name = "ChainSerializationError";
    if (cause instanceof Error) this.cause = cause;
  }
}

/**
 * Append a server-generated event to an instance's chain.
 * Used for BROKER_HISTORY_DIGEST and other server-originated events.
 *
 * Includes a bounded retry loop for Serializable transaction conflicts (P2034).
 * Each retry reads fresh state — no risk of double-append because P2034 means
 * the previous attempt was fully rolled back by PostgreSQL.
 *
 * Throws ChainSerializationError after retry exhaustion so callers can
 * distinguish transaction conflicts from other failures.
 */
export async function appendChainEvent(
  instanceId: string,
  eventType: TrackRecordEventType,
  payload: Record<string, unknown>
): Promise<{ seqNo: number; eventHash: string }> {
  for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const dbState = await tx.trackRecordState.findUnique({
            where: { instanceId },
          });
          if (!dbState) throw new Error(`No track record state for instance ${instanceId}`);

          const seqNo = dbState.lastSeqNo + 1;
          const prevHash = dbState.lastEventHash;
          const timestamp = Math.floor(Date.now() / 1000);

          const canonical = buildCanonicalEvent(
            instanceId, eventType, seqNo, prevHash, timestamp, payload
          );
          const eventHash = computeEventHash(canonical);

          const state = stateFromDb(dbState);
          processEvent(state, eventType, eventHash, seqNo, payload, timestamp);
          const stateUpdate = stateToDbUpdate(state);

          const checkpoint = shouldCreateCheckpoint(eventType, seqNo)
            ? buildCheckpointData(instanceId, state)
            : null;

          await tx.trackRecordEvent.create({
            data: {
              instanceId, seqNo, eventType, eventHash, prevHash,
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

          if (shouldCreateCommitment(seqNo)) {
            const stateHmac = checkpoint ? checkpoint.hmac : computeCheckpointHmac(instanceId, state);
            const commitment = buildCommitmentData(instanceId, seqNo, state.lastEventHash, stateHmac);
            await tx.ledgerCommitment.create({ data: commitment });
          }

          return { seqNo, eventHash };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (err) {
      const isP2034 =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (isP2034 && attempt < MAX_SERIALIZATION_RETRIES) {
        log.warn({ instanceId, eventType, attempt }, "Serialization conflict in chain append — retrying");
        continue;
      }
      if (isP2034) {
        throw new ChainSerializationError(instanceId, attempt, err);
      }
      throw err; // non-P2034 error → propagate as-is
    }
  }
  // Unreachable — loop always returns or throws. TypeScript needs this.
  throw new Error("appendChainEvent: retry loop exited unexpectedly");
}
