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
 * Append a domain event to the proof event log with hash chaining.
 * Uses a Serializable transaction to ensure monotonic sequencing.
 * Errors propagate to the caller (fail-closed).
 */
export async function appendProofEvent(
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

  return prisma.$transaction(
    async (tx) => {
      // Find the current chain head for this recordId (stored in sessionId).
      // Chain scope is per verification-run, not per strategy.
      const head = await tx.proofEventLog.findFirst({
        where: { sessionId: recordId, sequence: { not: null } },
        orderBy: { sequence: "desc" },
        select: { sequence: true, eventHash: true },
      });

      const sequence = (head?.sequence ?? 0) + 1;
      const prevEventHash = head?.eventHash ?? PROOF_GENESIS_HASH;

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

      return { sequence, eventHash };
    },
    { isolationLevel: "Serializable" }
  );
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
 *   seq 1: VERIFICATION_RUN_COMPLETED  (always)
 *   seq 2: VERIFICATION_PASSED         (only when passedPayload provided)
 *
 * Both events share the same recordId chain (sessionId).
 * Errors propagate to the caller (fail-closed).
 */
export async function appendVerificationRunProof(
  params: AppendVerificationRunParams
): Promise<{ runCompleted: ProofEventRecord; passed?: ProofEventRecord }> {
  const { strategyId, recordId, runCompletedPayload, passedPayload } = params;

  return prisma.$transaction(
    async (tx) => {
      // Find chain head for this recordId (sessionId)
      const head = await tx.proofEventLog.findFirst({
        where: { sessionId: recordId, sequence: { not: null } },
        orderBy: { sequence: "desc" },
        select: { sequence: true, eventHash: true },
      });

      let sequence = (head?.sequence ?? 0) + 1;
      let prevEventHash = head?.eventHash ?? PROOF_GENESIS_HASH;

      // 1. Insert VERIFICATION_RUN_COMPLETED
      const runCompletedHash = computeProofEventHash({
        sequence,
        strategyId,
        type: "VERIFICATION_RUN_COMPLETED",
        recordId,
        prevEventHash,
        payload: runCompletedPayload,
      });

      await tx.proofEventLog.create({
        data: {
          type: "VERIFICATION_RUN_COMPLETED",
          strategyId,
          sessionId: recordId,
          meta: runCompletedPayload as Record<string, string>,
          sequence,
          eventHash: runCompletedHash,
          prevEventHash,
        },
      });

      const runCompleted: ProofEventRecord = {
        sequence,
        eventHash: runCompletedHash,
        type: "VERIFICATION_RUN_COMPLETED",
      };

      // 2. If READY, insert VERIFICATION_PASSED chained to the previous event
      if (!passedPayload) {
        return { runCompleted };
      }

      sequence += 1;
      prevEventHash = runCompletedHash;

      const passedHash = computeProofEventHash({
        sequence,
        strategyId,
        type: "VERIFICATION_PASSED",
        recordId,
        prevEventHash,
        payload: passedPayload,
      });

      await tx.proofEventLog.create({
        data: {
          type: "VERIFICATION_PASSED",
          strategyId,
          sessionId: recordId,
          meta: passedPayload as Record<string, string>,
          sequence,
          eventHash: passedHash,
          prevEventHash,
        },
      });

      const passed: ProofEventRecord = {
        sequence,
        eventHash: passedHash,
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
