import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "@/lib/csrf";
import { sendWithRetryForOutbox } from "@/lib/email";
import { fireWebhook } from "@/lib/webhook";
import { sendTelegramAlert } from "@/lib/telegram";
import { sendPushNotification } from "@/lib/push";

const log = logger.child({ route: "/api/cron/process-outbox" });

const BATCH_SIZE = 50;
const CRON_TIMEOUT_MS = 55_000;
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

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
 */
export async function transitionOutboxEntry(
  entryId: string,
  from: OutboxStatus,
  to: OutboxStatus,
  reason: string,
  extraData?: Record<string, unknown>
): Promise<void> {
  await prisma.notificationOutbox.update({
    where: { id: entryId },
    data: { status: to, ...extraData },
  });
  log.info({ outboxId: entryId, from, to, reason }, "Outbox status transition");
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
 */
async function releaseOnTimeout(claimedIds: string[]): Promise<string[]> {
  if (claimedIds.length === 0) return [];
  const released = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "NotificationOutbox"
    SET status = 'FAILED', "updatedAt" = NOW()
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
    // Recovery: reset entries stuck in PROCESSING for >10 minutes (crash recovery)
    const recoveredIds = await recoverStuckEntries();
    if (recoveredIds.length > 0) {
      logBulkTransition(recoveredIds, "PROCESSING", "FAILED", "crash_recovery_stuck_10m");
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
        const payload = entry.payload as Record<string, unknown>;
        let success = false;

        switch (entry.channel) {
          case "EMAIL": {
            const result = await sendWithRetryForOutbox({
              to: entry.destination,
              subject: entry.subject || "AlgoStudio Notification",
              html: (payload.html as string) || "",
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
            const botToken = payload.botToken as string;
            const message = payload.message as string;
            if (botToken && message) {
              success = await sendTelegramAlert(botToken, entry.destination, message);
            }
            break;
          }
          case "BROWSER_PUSH": {
            await sendPushNotification(entry.userId, {
              title: (payload.title as string) || "AlgoStudio",
              body: (payload.body as string) || "",
              url: payload.url as string | undefined,
              tag: payload.tag as string | undefined,
            });
            success = true;
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
        const backoffMs = 30_000 * Math.pow(2, newAttempts); // 30s * 2^attempts
        const nextRetry = new Date(Date.now() + backoffMs);
        const newStatus: OutboxStatus = newAttempts >= entry.maxAttempts ? "DEAD" : "FAILED";
        const reason = newStatus === "DEAD" ? "max_attempts_exceeded" : "delivery_failure";

        await transitionOutboxEntry(entry.id, "PROCESSING", newStatus, reason, {
          attempts: newAttempts,
          lastError: err instanceof Error ? err.message : String(err),
          nextRetryAt: nextRetry,
        });

        if (newStatus === "DEAD") dead++;
        else failed++;
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
