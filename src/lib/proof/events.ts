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
