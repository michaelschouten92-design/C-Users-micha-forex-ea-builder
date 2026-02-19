import { prisma } from "@/lib/prisma";
import { sendEAAlertEmail } from "@/lib/email";
import { fireWebhook } from "@/lib/webhook";
import { sendTelegramAlert } from "@/lib/telegram";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "alerts" });

const RATE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes per alert type

interface TriggerAlertPayload {
  userId: string;
  instanceId: string;
  eaName: string;
  alertType: string;
  message: string;
}

/**
 * Trigger all matching alert configurations for a given event.
 * Rate-limited to 1 alert per type per 15 minutes per config.
 * Supports EMAIL, WEBHOOK, and TELEGRAM channels.
 */
export async function triggerAlert(payload: TriggerAlertPayload): Promise<void> {
  const { userId, instanceId, alertType, message, eaName } = payload;

  const configs = await prisma.eAAlertConfig.findMany({
    where: {
      userId,
      alertType,
      enabled: true,
      OR: [{ instanceId: null }, { instanceId }],
    },
    include: {
      user: { select: { email: true, telegramBotToken: true, telegramChatId: true } },
    },
  });

  if (configs.length === 0) return;

  const now = new Date();

  for (const config of configs) {
    // Rate limit: skip if triggered within the last 15 minutes
    if (config.lastTriggered) {
      const elapsed = now.getTime() - config.lastTriggered.getTime();
      if (elapsed < RATE_LIMIT_MS) {
        continue;
      }
    }

    // Update lastTriggered timestamp
    await prisma.eAAlertConfig.update({
      where: { id: config.id },
      data: { lastTriggered: now },
    });

    if (config.channel === "EMAIL") {
      sendEAAlertEmail(config.user.email, eaName, message).catch(() => {});
    } else if (config.channel === "WEBHOOK" && config.webhookUrl) {
      fireWebhook(config.webhookUrl, {
        event: "alert",
        alertType,
        eaName,
        instanceId,
        message,
        triggeredAt: now.toISOString(),
      }).catch(() => {});
    } else if (config.channel === "TELEGRAM") {
      const botToken = config.user.telegramBotToken;
      const chatId = config.user.telegramChatId;
      if (botToken && chatId) {
        const telegramMessage = `<b>AlgoStudio Alert: ${alertType}</b>\n\nEA: ${eaName}\n${message}`;
        sendTelegramAlert(botToken, chatId, telegramMessage).catch(() => {});
      }
    }

    log.info({ alertType, channel: config.channel, instanceId }, "Alert triggered");
  }
}

/**
 * Check drawdown threshold alerts for a specific heartbeat.
 */
export async function checkDrawdownAlerts(
  userId: string,
  instanceId: string,
  eaName: string,
  drawdown: number
): Promise<void> {
  const configs = await prisma.eAAlertConfig.findMany({
    where: {
      userId,
      alertType: "DRAWDOWN",
      enabled: true,
      OR: [{ instanceId: null }, { instanceId }],
    },
  });

  for (const config of configs) {
    if (config.threshold !== null && drawdown >= config.threshold) {
      await triggerAlert({
        userId,
        instanceId,
        eaName,
        alertType: "DRAWDOWN",
        message: `Drawdown of ${drawdown.toFixed(2)}% exceeded your threshold of ${config.threshold}%`,
      });
    }
  }
}

/**
 * Check offline alerts when an EA comes back online after being offline.
 */
export async function checkOfflineAlerts(
  userId: string,
  instanceId: string,
  eaName: string,
  offlineMinutes: number
): Promise<void> {
  await triggerAlert({
    userId,
    instanceId,
    eaName,
    alertType: "OFFLINE",
    message: `EA "${eaName}" was offline for ${offlineMinutes} minutes and is now back online.`,
  });
}

/**
 * Trigger a new trade alert.
 */
export async function checkNewTradeAlerts(
  userId: string,
  instanceId: string,
  eaName: string,
  symbol: string,
  type: string,
  profit: number
): Promise<void> {
  await triggerAlert({
    userId,
    instanceId,
    eaName,
    alertType: "NEW_TRADE",
    message: `New ${type} trade on ${symbol} - P/L: $${profit.toFixed(2)}`,
  });
}

/**
 * Trigger an error alert.
 */
export async function checkErrorAlerts(
  userId: string,
  instanceId: string,
  eaName: string,
  errorMessage: string
): Promise<void> {
  await triggerAlert({
    userId,
    instanceId,
    eaName,
    alertType: "ERROR",
    message: `EA error: ${errorMessage}`,
  });
}
