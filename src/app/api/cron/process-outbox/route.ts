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

/**
 * Atomically claim a batch of outbox entries for processing.
 * Uses raw SQL UPDATE ... RETURNING to prevent concurrent cron runs
 * from picking up the same entries (no read-then-write race).
 */
async function claimOutboxBatch(): Promise<Array<{ id: string }>> {
  return prisma.$queryRaw<Array<{ id: string }>>`
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
    RETURNING id
  `;
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
    // Atomically claim entries — concurrent cron runs will get disjoint sets
    const claimed = await claimOutboxBatch();
    if (claimed.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, dead: 0 });
    }

    const claimedIds = claimed.map((r) => r.id);
    const entries = await prisma.notificationOutbox.findMany({
      where: { id: { in: claimedIds } },
    });

    for (const entry of entries) {
      if (Date.now() - startTime > CRON_TIMEOUT_MS) {
        // Release unclaimed entries back to FAILED so they're retried
        await prisma.notificationOutbox.updateMany({
          where: { id: { in: claimedIds }, status: "PROCESSING" },
          data: { status: "FAILED" },
        });
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
          await prisma.notificationOutbox.update({
            where: { id: entry.id },
            data: { status: "SENT", attempts: entry.attempts + 1 },
          });
          sent++;
        } else {
          throw new Error("Channel delivery returned failure");
        }
      } catch (err) {
        const newAttempts = entry.attempts + 1;
        const backoffMs = 30_000 * Math.pow(2, newAttempts); // 30s * 2^attempts
        const nextRetry = new Date(Date.now() + backoffMs);
        const newStatus = newAttempts >= entry.maxAttempts ? "DEAD" : "FAILED";

        await prisma.notificationOutbox.update({
          where: { id: entry.id },
          data: {
            status: newStatus,
            attempts: newAttempts,
            lastError: err instanceof Error ? err.message : String(err),
            nextRetryAt: nextRetry,
          },
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
