/**
 * Server-side chain event appender.
 *
 * Used to insert server-generated events (like BROKER_HISTORY_DIGEST)
 * into an instance's tamper-evident hash chain.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { buildCanonicalEvent, computeEventHash } from "./canonical";
import { processEvent, stateFromDb, stateToDbUpdate } from "./state-manager";
import { shouldCreateCheckpoint, buildCheckpointData } from "./checkpoint";
import type { TrackRecordEventType } from "./types";

/**
 * Append a server-generated event to an instance's chain.
 * Used for BROKER_HISTORY_DIGEST and other server-originated events.
 */
export async function appendChainEvent(
  instanceId: string,
  eventType: TrackRecordEventType,
  payload: Record<string, unknown>
): Promise<{ seqNo: number; eventHash: string }> {
  const dbState = await prisma.trackRecordState.findUnique({
    where: { instanceId },
  });
  if (!dbState) throw new Error(`No track record state for instance ${instanceId}`);

  const seqNo = dbState.lastSeqNo + 1;
  const prevHash = dbState.lastEventHash;
  const timestamp = Math.floor(Date.now() / 1000);

  const canonical = buildCanonicalEvent(instanceId, eventType, seqNo, prevHash, timestamp, payload);
  const eventHash = computeEventHash(canonical);

  const state = stateFromDb(dbState);
  processEvent(state, eventType, eventHash, seqNo, payload);
  const stateUpdate = stateToDbUpdate(state);

  const checkpoint = shouldCreateCheckpoint(eventType, seqNo)
    ? buildCheckpointData(instanceId, state)
    : null;

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

  return { seqNo, eventHash };
}
