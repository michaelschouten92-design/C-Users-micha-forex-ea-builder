import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";
import { sendWithRetryForOutbox } from "@/lib/email";
import { fireWebhook } from "@/lib/webhook";
import { sendTelegramAlert, resolveTelegramBotToken } from "@/lib/telegram";
import { sendSlackMessage } from "@/lib/slack";
import { sendPushNotification } from "@/lib/push";
import * as Sentry from "@sentry/nextjs";

const log = logger.child({ route: "/api/cron/process-outbox" });

const BATCH_SIZE = 50;
const CRON_TIMEOUT_MS = 55_000;
// 2 minutes: short enough that double-delivery windows stay bounded (external
// services like Stripe/email providers usually accept within seconds), long
// enough that an in-flight delivery isn't stolen from a still-alive worker.
// Any stuck-recovery fires a Sentry alert so an operator can verify whether
// the external side actually received the notification.
const STUCK_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Outbox Status State Machine
 *
 * PENDING ──[claimed by cron]──────────> PROCESSING
 * FAILED  ──[retry, nextRetryAt due]──> PROCESSING
 * PROCESSING ──[delivery success]──────> SENT       (terminal)
 * PROCESSING ──[delivery failure]──────> FAILED
 * PROCESSING ──[max attempts reached]─> DEAD       (terminal)
 * PROCESSING ──[stuck >10 min]─────────> FAILED     (crash recovery)
 * PROCESSING ──[cron timeout]──────────> FAILED     (timeout release)
 */
export type OutboxStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "DEAD";

/**
 * Centralized single-entry transition: update status + log in one call.
 * Every outbox state change for a known entry goes through here.
 *
 * Uses compare-and-swap semantics (WHERE status = from) to prevent clobbering
 * transitions done concurrently by the timeout-release or stuck-recovery
 * paths. If the row's status no longer matches `from`, the update is a no-op
 * and this returns false so callers can log/ignore the stale transition
 * without double-delivering.
 */
export async function transitionOutboxEntry(
  entryId: string,
  from: OutboxStatus,
  to: OutboxStatus,
  reason: string,
  extraData?: Record<string, unknown>
): Promise<boolean> {
  const result = await prisma.notificationOutbox.updateMany({
    where: { id: entryId, status: from },
    data: { status: to, ...extraData },
  });
  if (result.count === 0) {
    log.warn(
      { outboxId: entryId, expectedFrom: from, to, reason },
      "Outbox transition skipped — row not in expected state (likely concurrent timeout/recovery release)"
    );
    return false;
  }
  log.info({ outboxId: entryId, from, to, reason }, "Outbox status transition");
  return true;
}

/**
 * Log transitions for bulk operations where the DB update already happened
 * atomically (raw SQL UPDATE ... RETURNING).
 */
function logBulkTransition(
  ids: string[],
  from: OutboxStatus,
  to: OutboxStatus,
  reason: string
): void {
  for (const id of ids) {
    log.info({ outboxId: id, from, to, reason }, "Outbox status transition");
  }
}

/**
 * Atomically claim a batch of outbox entries for processing.
 * Uses raw SQL UPDATE ... RETURNING to prevent concurrent cron runs
 * from picking up the same entries (no read-then-write race).
 */
async function claimOutboxBatch(): Promise<Array<{ id: string; attempts: number }>> {
  return prisma.$queryRaw<Array<{ id: string; attempts: number }>>`
    UPDATE "NotificationOutbox"
    SET status = 'PROCESSING', "updatedAt" = NOW()
    WHERE id IN (
      SELECT id FROM "NotificationOutbox"
      WHERE status IN ('PENDING', 'FAILED')
        AND "nextRetryAt" <= NOW()
        AND attempts < "maxAttempts"
      ORDER BY "nextRetryAt" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, attempts
  `;
}

/**
 * Atomically recover entries stuck in PROCESSING for >10 minutes.
 * Uses raw SQL UPDATE ... RETURNING to avoid read-then-write races.
 */
async function recoverStuckEntries(): Promise<string[]> {
  const stuck = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "NotificationOutbox"
    SET status = 'FAILED', "updatedAt" = NOW()
    WHERE status = 'PROCESSING'
      AND "updatedAt" < ${new Date(Date.now() - STUCK_THRESHOLD_MS)}
    RETURNING id
  `;
  return stuck.map((r) => r.id);
}

/**
 * Atomically release still-processing entries back to FAILED on cron timeout.
 * Uses raw SQL UPDATE ... RETURNING to avoid read-then-write races.
 *
 * Sets `nextRetryAt` to ~1 minute in the future so the next cron run
 * doesn't immediately re-claim + re-timeout the same slow entries. Without
 * this cushion a single stubborn entry could loop forever between PROCESSING
 * and FAILED on every minute-tick, never settling into SENT or DEAD.
 */
async function releaseOnTimeout(claimedIds: string[]): Promise<string[]> {
  if (claimedIds.length === 0) return [];
  const retryAt = new Date(Date.now() + 60_000);
  const released = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "NotificationOutbox"
    SET status = 'FAILED', "updatedAt" = NOW(), "nextRetryAt" = ${retryAt}
    WHERE id = ANY(${claimedIds}::text[])
      AND status = 'PROCESSING'
    RETURNING id
  `;
  return released.map((r) => r.id);
}

/**
 * Cron endpoint to process the notification outbox.
 * Atomically claims pending/failed entries, then dispatches to the appropriate channel.
 * Runs every 1 minute.
 */
async function handleProcessOutbox(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.VERCEL && !request.headers.get("x-vercel-cron")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let sent = 0;
  let failed = 0;
  let dead = 0;

  try {
    // Recovery: reset entries stuck in PROCESSING past STUCK_THRESHOLD_MS.
    // Every stuck entry is a potential at-least-once duplicate (external
    // delivery may have succeeded before the worker died), so escalate to
    // Sentry so an operator can verify the other side actually received.
    const recoveredIds = await recoverStuckEntries();
    if (recoveredIds.length > 0) {
      logBulkTransition(recoveredIds, "PROCESSING", "FAILED", "crash_recovery_stuck");
      Sentry.captureMessage("Outbox stuck-recovery — verify external delivery", {
        level: "warning",
        extra: {
          count: recoveredIds.length,
          stuckThresholdMs: STUCK_THRESHOLD_MS,
          entryIds: recoveredIds.slice(0, 20),
        },
      });
    }

    // Atomically claim entries — concurrent cron runs will get disjoint sets
    const claimed = await claimOutboxBatch();
    if (claimed.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, dead: 0 });
    }

    // Log claim transitions (SQL UPDATE already moved them to PROCESSING)
    for (const row of claimed) {
      const fromState: OutboxStatus = row.attempts > 0 ? "FAILED" : "PENDING";
      log.info(
        { outboxId: row.id, from: fromState, to: "PROCESSING", reason: "claimed_for_delivery" },
        "Outbox status transition"
      );
    }

    const claimedIds = claimed.map((r) => r.id);
    const entries = await prisma.notificationOutbox.findMany({
      where: { id: { in: claimedIds } },
    });

    for (const entry of entries) {
      if (Date.now() - startTime > CRON_TIMEOUT_MS) {
        // Release unprocessed entries back to FAILED so they're retried
        const releasedIds = await releaseOnTimeout(claimedIds);
        if (releasedIds.length > 0) {
          logBulkTransition(releasedIds, "PROCESSING", "FAILED", "cron_timeout_release");
        }
        break;
      }

      try {
        const payload = (entry.payload ?? {}) as Record<string, unknown>;
        const str = (v: unknown) => (typeof v === "string" ? v : "");
        let success = false;

        switch (entry.channel) {
          case "EMAIL": {
            const result = await sendWithRetryForOutbox({
              to: entry.destination,
              subject: entry.subject || "Algo Studio Notification",
              html: str(payload.html),
            });
            success = !result.error;
            break;
          }
          case "WEBHOOK": {
            await fireWebhook(entry.destination, payload);
            success = true;
            break;
          }
          case "TELEGRAM": {
            // Resolve the bot token at delivery-time from the user record —
            // the outbox payload only carries a `tokenSource` marker so
            // decrypted tokens never land in `NotificationOutbox.payload`.
            const rawTokenSource =
              typeof payload.tokenSource === "string" ? payload.tokenSource : "";
            const tokenSource: "central" | "user" | null =
              rawTokenSource === "central" || rawTokenSource === "user" ? rawTokenSource : null;
            const message = str(payload.message);
            if (tokenSource && message) {
              const botToken = await resolveTelegramBotToken(entry.userId, tokenSource);
              if (botToken) {
                success = await sendTelegramAlert(botToken, entry.destination, message);
              }
            } else if (typeof payload.botToken === "string" && message) {
              // Legacy path: older queued entries still carry the token in
              // the payload. Accept them to drain the queue safely; new
              // entries always go through the marker path above.
              success = await sendTelegramAlert(payload.botToken, entry.destination, message);
            }
            break;
          }
          case "SLACK": {
            const slackText = str(payload.message);
            if (slackText) {
              success = await sendSlackMessage(entry.destination, slackText);
            }
            break;
          }
          case "BROWSER_PUSH": {
            const result = await sendPushNotification(entry.userId, {
              title: str(payload.title) || "Algo Studio",
              body: str(payload.body),
              url: typeof payload.url === "string" ? payload.url : undefined,
              tag: typeof payload.tag === "string" ? payload.tag : undefined,
            });
            // Treat "no subscriptions" as a success (there's nothing to
            // deliver to — retrying won't help). Otherwise require at
            // least one accepted delivery; transient failures will retry
            // via the outbox backoff.
            success = result.delivered || result.noSubscriptions;
            break;
          }
          default:
            log.warn({ channel: entry.channel, id: entry.id }, "Unknown outbox channel");
        }

        if (success) {
          await transitionOutboxEntry(entry.id, "PROCESSING", "SENT", "delivery_success", {
            attempts: entry.attempts + 1,
          });
          sent++;
        } else {
          throw new Error("Channel delivery returned failure");
        }
      } catch (err) {
        const newAttempts = entry.attempts + 1;
        const backoffMs = 30_000 * Math.pow(2, Math.min(newAttempts, 10)); // 30s * 2^attempts, capped at ~8.5h
        const nextRetry = new Date(Date.now() + backoffMs);
        const newStatus: OutboxStatus = newAttempts >= entry.maxAttempts ? "DEAD" : "FAILED";
        const reason = newStatus === "DEAD" ? "max_attempts_exceeded" : "delivery_failure";

        await transitionOutboxEntry(entry.id, "PROCESSING", newStatus, reason, {
          attempts: newAttempts,
          lastError: err instanceof Error ? err.message : String(err),
          nextRetryAt: nextRetry,
        });

        if (newStatus === "DEAD") {
          dead++;
          // DEAD is terminal — the notification will never reach the user.
          // Escalate to Sentry so an operator sees the drop instead of
          // waiting for a user complaint.
          Sentry.captureMessage("Outbox entry gave up (DEAD)", {
            level: "error",
            extra: {
              outboxId: entry.id,
              channel: entry.channel,
              destination: entry.destination,
              attempts: newAttempts,
              maxAttempts: entry.maxAttempts,
              lastError: err instanceof Error ? err.message : String(err),
            },
          });
        } else {
          failed++;
        }
      }
    }

    log.info(
      { sent, failed, dead, total: entries.length, durationMs: Date.now() - startTime },
      "Outbox processing completed"
    );

    return NextResponse.json({ success: true, sent, failed, dead });
  } catch (error) {
    log.error({ error }, "Outbox processing failed");
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleProcessOutbox(request);
}
