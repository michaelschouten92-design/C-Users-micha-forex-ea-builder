import webPush from "web-push";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "push" });

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;

  webPush.setVapidDetails(
    env.VAPID_SUBJECT || "mailto:support@algo-studio.com",
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  configured = true;
  return true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send push notification to all subscribed devices for a user.
 * Fire-and-forget pattern — consistent with existing alert channels.
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  if (subscriptions.length === 0) return;

  const jsonPayload = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        jsonPayload
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      // 410 Gone or 404 Not Found — subscription expired, remove it
      if (statusCode === 410 || statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        log.info({ subscriptionId: sub.id }, "Removed expired push subscription");
      } else {
        log.warn({ error: err, subscriptionId: sub.id }, "Failed to send push notification");
      }
    }
  }
}
