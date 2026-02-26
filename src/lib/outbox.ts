import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

const log = logger.child({ module: "outbox" });

type NotificationChannel = "EMAIL" | "WEBHOOK" | "TELEGRAM" | "BROWSER_PUSH";

interface EnqueueParams {
  userId: string;
  channel: NotificationChannel;
  destination: string;
  subject?: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
}

/**
 * Enqueue a notification for reliable delivery via the outbox processor.
 * This is a fast, non-throwing write — failures are logged but never bubble up.
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
      },
    });
  } catch (err) {
    log.error(
      { err, channel: params.channel, userId: params.userId },
      "Failed to enqueue notification — message will be lost"
    );
  }
}
