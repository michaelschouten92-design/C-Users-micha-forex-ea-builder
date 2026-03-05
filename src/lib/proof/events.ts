/**
 * Proof Engine event analytics — privacy-safe server-side event logging.
 *
 * Events:
 *   proof_page_view   — someone views a public proof page
 *   share_click       — user clicks share (copy/x/discord)
 *   proof_link_copy   — user copies proof link
 *   profile_view      — someone views a trader profile
 *   leaderboard_view  — someone views a recognition hub page
 */

import { createHash } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { PROOF_GENESIS_HASH, computeProofEventHash } from "./chain";

const log = logger.child({ service: "proof-events" });

export type ProofEventType =
  | "proof_page_view"
  | "share_click"
  | "proof_link_copy"
  | "profile_view"
  | "leaderboard_view";

export interface ProofEvent {
  type: ProofEventType;
  strategyId?: string;
  ownerId?: string;
  userId?: string;
  sessionId: string;
  referrer?: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

/** Prisma interactive-transaction client (everything except connection/tx lifecycle methods). */
type ProofTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Hash an IP address for privacy-safe storage.
 * Uses SHA-256 truncated to 16 chars — enough for analytics, not reversible.
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Log a proof event to the database.
 * Fire-and-forget — errors are logged but don't propagate.
 */
export async function logProofEvent(event: ProofEvent): Promise<void> {
  try {
    await prisma.proofEventLog.create({
      data: {
        type: event.type,
        strategyId: event.strategyId ?? null,
        ownerId: event.ownerId ?? null,
        userId: event.userId ?? null,
        sessionId: event.sessionId,
        referrer: event.referrer?.slice(0, 500) ?? null,
        ipHash: event.ip ? hashIp(event.ip) : null,
        userAgent: event.userAgent?.slice(0, 500) ?? null,
        meta: event.meta ? (event.meta as Record<string, string>) : undefined,
      },
    });
  } catch (err) {
    log.error({ err, type: event.type }, "Failed to log proof event");
  }
}

/**
 * Append a proof event inside an existing Prisma transaction.
 * Does NOT create its own transaction — the caller controls the tx boundary.
 * Used by orchestrators that need multiple DB writes + proof events atomically.
 *
 * Chain scope: per strategyId. Uses ProofChainHead with SELECT FOR UPDATE
 * for concurrency-safe monotonic sequence allocation.
 * Errors propagate to the caller (fail-closed).
 */
export async function appendProofEventInTx(
  tx: ProofTx,
  strategyId: string,
  type: string,
  payload: Record<string, unknown>
): Promise<{ sequence: number; eventHash: string }> {
  const recordId = payload.recordId;
  if (typeof recordId !== "string") {
    throw new Error(
      `appendProofEvent requires payload.recordId to be a string, got ${typeof recordId}`
    );
  }

  // Lock the chain head row (or discover it doesn't exist yet).
  // SELECT FOR UPDATE prevents concurrent readers from seeing stale state.
  const heads = await tx.$queryRawUnsafe<Array<{ lastSequence: number; lastEventHash: string }>>(
    `SELECT "lastSequence", "lastEventHash" FROM "ProofChainHead" WHERE "strategyId" = $1 FOR UPDATE`,
    strategyId
  );

  const headExists = heads.length > 0;
  const sequence = headExists ? heads[0].lastSequence + 1 : 1;
  const prevEventHash = headExists ? heads[0].lastEventHash : PROOF_GENESIS_HASH;

  const eventHash = computeProofEventHash({
    sequence,
    strategyId,
    type,
    recordId,
    prevEventHash,
    payload,
  });

  await tx.proofEventLog.create({
    data: {
      type,
      strategyId,
      sessionId: recordId,
      meta: payload as Record<string, string>,
      sequence,
      eventHash,
      prevEventHash,
    },
  });

  // Upsert chain head — create if first event, update otherwise
  if (headExists) {
    await tx.proofChainHead.update({
      where: { strategyId },
      data: { lastSequence: sequence, lastEventHash: eventHash },
    });
  } else {
    await tx.proofChainHead.create({
      data: { strategyId, lastSequence: sequence, lastEventHash: eventHash },
    });
  }

  return { sequence, eventHash };
}

/**
 * Append a domain event to the proof event log with hash chaining.
 * Uses a Serializable transaction to ensure monotonic sequencing.
 * Errors propagate to the caller (fail-closed).
 */
export async function appendProofEvent(
  strategyId: string,
  type: string,
  payload: Record<string, unknown>
): Promise<{ sequence: number; eventHash: string }> {
  return prisma.$transaction((tx) => appendProofEventInTx(tx, strategyId, type, payload), {
    isolationLevel: "Serializable",
  });
}

/** Return shape for each event written by appendVerificationRunProof. */
export interface ProofEventRecord {
  sequence: number;
  eventHash: string;
  type: string;
}

/** Params for the atomic verification-run proof append. */
export interface AppendVerificationRunParams {
  strategyId: string;
  recordId: string; // stored in ProofEventLog.sessionId
  runCompletedPayload: Record<string, unknown>;
  passedPayload?: Record<string, unknown>; // only provided when READY
}

/**
 * Atomically append one or two proof events for a verification run.
 *
 * Uses a single Serializable transaction so that either all events
 * are committed or none are — no partial-commit window.
 *
 *   event 1: VERIFICATION_RUN_COMPLETED  (always)
 *   event 2: VERIFICATION_PASSED         (only when passedPayload provided)
 *
 * Both events are chained in the strategy's proof chain via ProofChainHead.
 * Errors propagate to the caller (fail-closed).
 */
export async function appendVerificationRunProof(
  params: AppendVerificationRunParams
): Promise<{ runCompleted: ProofEventRecord; passed?: ProofEventRecord }> {
  const { strategyId, recordId, runCompletedPayload, passedPayload } = params;

  return prisma.$transaction(
    async (tx) => {
      // Both events share the same recordId — inject it into each payload
      const runResult = await appendProofEventInTx(tx, strategyId, "VERIFICATION_RUN_COMPLETED", {
        ...runCompletedPayload,
        recordId,
      });

      const runCompleted: ProofEventRecord = {
        sequence: runResult.sequence,
        eventHash: runResult.eventHash,
        type: "VERIFICATION_RUN_COMPLETED",
      };

      if (!passedPayload) {
        return { runCompleted };
      }

      const passedResult = await appendProofEventInTx(tx, strategyId, "VERIFICATION_PASSED", {
        ...passedPayload,
        recordId,
      });

      const passed: ProofEventRecord = {
        sequence: passedResult.sequence,
        eventHash: passedResult.eventHash,
        type: "VERIFICATION_PASSED",
      };

      return { runCompleted, passed };
    },
    { isolationLevel: "Serializable" }
  );
}

/**
 * Extract session ID from a cookie header string, or generate a new one.
 * Pure function — no Request dependency.
 */
export function extractSessionId(cookieHeader: string | null): string {
  const cookie = cookieHeader ?? "";
  const match = cookie.match(/(?:^|;\s*)proof_sid=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Generate a random session ID
  return createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 24);
}
