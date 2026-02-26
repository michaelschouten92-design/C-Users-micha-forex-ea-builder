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

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        jsonPayload
      )
    )
  );

  // Collect expired/gone subscriptions for batch removal
  const expiredIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const statusCode = (result.reason as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        expiredIds.push(subscriptions[i].id);
        log.info({ subscriptionId: subscriptions[i].id }, "Removed expired push subscription");
      } else {
        log.warn(
          { error: result.reason, subscriptionId: subscriptions[i].id },
          "Failed to send push notification"
        );
      }
    }
  });

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } }).catch((err) => {
      log.error({ err, count: expiredIds.length }, "Failed to clean up expired push subscriptions");
    });
  }
}
