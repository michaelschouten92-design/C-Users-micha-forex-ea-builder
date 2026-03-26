import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "outbox" });

type NotificationChannel = "EMAIL" | "WEBHOOK" | "TELEGRAM" | "SLACK" | "BROWSER_PUSH";

interface EnqueueParams {
  userId: string;
  channel: NotificationChannel;
  destination: string;
  subject?: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  /** Optional dedup key — ties this outbox entry to a source alert + channel.
   *  When set, @@unique([alertSourceId, channel]) prevents duplicate entries. */
  alertSourceId?: string;
}

/**
 * Enqueue a notification for reliable delivery via the outbox processor.
 *
 * Throws on real failure so callers see enqueue errors propagate.
 * Duplicate entries (P2002 on alertSourceId + channel) are silently
 * absorbed as idempotent success — no throw, no retry needed.
 */
export async function enqueueNotification(params: EnqueueParams): Promise<void> {
  try {
    await prisma.notificationOutbox.create({
      data: {
        userId: params.userId,
        channel: params.channel,
        destination: params.destination,
        subject: params.subject ?? null,
        payload: params.payload as Prisma.InputJsonValue,
        maxAttempts: params.maxAttempts ?? 5,
        alertSourceId: params.alertSourceId ?? null,
      },
    });
  } catch (err) {
    // Duplicate entry for same alertSourceId + channel → idempotent success
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      log.info(
        { channel: params.channel, alertSourceId: params.alertSourceId },
        "Outbox entry already exists — idempotent skip"
      );
      return;
    }
    log.error(
      { err, channel: params.channel, userId: params.userId },
      "Failed to enqueue notification"
    );
    throw err;
  }
}
