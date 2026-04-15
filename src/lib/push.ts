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

export interface PushResult {
  /**
   * True when the notification reached (or was accepted by) at least one
   * live push subscription. Outbox treats `false` as a FAILED delivery
   * so the user's retry machinery can reason about actual delivery.
   */
  delivered: boolean;
  /** Stats for observability / tests. */
  sent: number;
  expired: number;
  failed: number;
  /** True when there were no push subscriptions at all — NOT a failure. */
  noSubscriptions: boolean;
}

/**
 * Send push notification to all subscribed devices for a user.
 *
 * Returns a structured result so the outbox worker can tell success apart
 * from silent failure — previously this function returned void and the
 * caller always marked the entry SENT regardless of whether any
 * subscription actually accepted the push.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  if (!ensureConfigured()) {
    return { delivered: false, sent: 0, expired: 0, failed: 0, noSubscriptions: false };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  if (subscriptions.length === 0) {
    return { delivered: false, sent: 0, expired: 0, failed: 0, noSubscriptions: true };
  }

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

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent++;
      return;
    }
    const statusCode = (result.reason as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      expiredIds.push(subscriptions[i].id);
      log.info({ subscriptionId: subscriptions[i].id }, "Removed expired push subscription");
    } else {
      failed++;
      log.warn(
        { error: result.reason, subscriptionId: subscriptions[i].id },
        "Failed to send push notification"
      );
    }
  });

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } }).catch((err) => {
      log.error({ err, count: expiredIds.length }, "Failed to clean up expired push subscriptions");
    });
  }

  return {
    delivered: sent > 0,
    sent,
    expired: expiredIds.length,
    failed,
    noSubscriptions: false,
  };
}
