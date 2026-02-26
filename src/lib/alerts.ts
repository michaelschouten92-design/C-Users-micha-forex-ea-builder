import { prisma } from "@/lib/prisma";
import { enqueueNotification } from "@/lib/outbox";
import { decrypt, isEncrypted } from "@/lib/crypto";
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
  const triggeredIds: string[] = [];

  for (const config of configs) {
    // Rate limit: skip if triggered within the last 15 minutes
    if (config.lastTriggered) {
      const elapsed = now.getTime() - config.lastTriggered.getTime();
      if (elapsed < RATE_LIMIT_MS) {
        continue;
      }
    }

    triggeredIds.push(config.id);

    const channel = config.channel;
    if (channel === "EMAIL") {
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      await enqueueNotification({
        userId,
        channel: "EMAIL",
        destination: config.user.email,
        subject: `AlgoStudio Alert: ${alertType} — ${eaName}`,
        payload: {
          html: `<h2>EA Alert: ${esc(alertType)}</h2><p><strong>EA:</strong> ${esc(eaName)}</p><p>${esc(message)}</p>`,
        },
      });
    } else if (channel === "WEBHOOK" && config.webhookUrl) {
      await enqueueNotification({
        userId,
        channel: "WEBHOOK",
        destination: config.webhookUrl,
        payload: {
          event: "alert",
          alertType,
          eaName,
          instanceId,
          message,
          triggeredAt: now.toISOString(),
        },
      });
    } else if (channel === "BROWSER_PUSH") {
      await enqueueNotification({
        userId,
        channel: "BROWSER_PUSH",
        destination: userId,
        payload: {
          title: `AlgoStudio: ${alertType}`,
          body: `${eaName} — ${message}`,
          url: "/app/monitor",
          tag: `${alertType}-${instanceId}`,
        },
      });
    } else if (channel === "TELEGRAM") {
      const rawToken = config.user.telegramBotToken;
      const chatId = config.user.telegramChatId;
      if (rawToken && chatId) {
        const botToken = isEncrypted(rawToken) ? decrypt(rawToken) : rawToken;
        if (botToken) {
          const telegramMessage = `<b>AlgoStudio Alert: ${alertType}</b>\n\nEA: ${eaName}\n${message}`;
          await enqueueNotification({
            userId,
            channel: "TELEGRAM",
            destination: chatId,
            payload: { botToken, message: telegramMessage },
          });
        }
      }
    }

    log.info({ alertType, channel: config.channel, instanceId }, "Alert triggered");
  }

  // Batch update lastTriggered for all triggered configs (avoids N+1 UPDATE)
  if (triggeredIds.length > 0) {
    await prisma.eAAlertConfig.updateMany({
      where: { id: { in: triggeredIds } },
      data: { lastTriggered: now },
    });
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

  // Find the lowest exceeded threshold to build the alert message.
  // triggerAlert already handles all matching configs internally,
  // so we only need to call it once (not per config).
  const lowestExceeded = configs.reduce<number | null>((lowest, config) => {
    if (config.threshold !== null && drawdown >= config.threshold) {
      return lowest === null ? config.threshold : Math.min(lowest, config.threshold);
    }
    return lowest;
  }, null);

  if (lowestExceeded !== null) {
    await triggerAlert({
      userId,
      instanceId,
      eaName,
      alertType: "DRAWDOWN",
      message: `Drawdown of ${drawdown.toFixed(2)}% exceeded your threshold of ${lowestExceeded}%`,
    });
  }
}

/**
 * Check absolute (dollar) drawdown threshold alerts for a specific heartbeat.
 */
export async function checkAbsoluteDrawdownAlerts(
  userId: string,
  instanceId: string,
  eaName: string,
  balance: number,
  equity: number
): Promise<void> {
  const drawdownAmount = balance - equity;
  if (drawdownAmount <= 0) return;

  const configs = await prisma.eAAlertConfig.findMany({
    where: {
      userId,
      alertType: "ABSOLUTE_DRAWDOWN",
      enabled: true,
      OR: [{ instanceId: null }, { instanceId }],
    },
  });

  const lowestExceeded = configs.reduce<number | null>((lowest, config) => {
    if (config.threshold !== null && drawdownAmount >= config.threshold) {
      return lowest === null ? config.threshold : Math.min(lowest, config.threshold);
    }
    return lowest;
  }, null);

  if (lowestExceeded !== null) {
    await triggerAlert({
      userId,
      instanceId,
      eaName,
      alertType: "ABSOLUTE_DRAWDOWN",
      message: `Absolute drawdown of $${drawdownAmount.toFixed(2)} exceeded your threshold of $${lowestExceeded.toFixed(2)}`,
    });
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

/**
 * Check daily loss alerts.
 * Calculates today's P&L from closed trades and triggers if threshold exceeded.
 */
export async function checkDailyLossAlerts(
  userId: string,
  instanceId: string,
  eaName: string
): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const agg = await prisma.eATrade.aggregate({
    where: {
      instanceId,
      closeTime: { gte: startOfDay },
    },
    _sum: { profit: true },
    _count: true,
  });

  if (agg._count === 0) return;

  const dailyPnl = agg._sum.profit ?? 0;
  if (dailyPnl >= 0) return;

  const dailyLossPct = Math.abs(dailyPnl); // Simplified: use absolute value

  const configs = await prisma.eAAlertConfig.findMany({
    where: {
      userId,
      alertType: "DAILY_LOSS",
      enabled: true,
      OR: [{ instanceId: null }, { instanceId }],
    },
  });

  const lowestExceeded = configs.reduce<number | null>((lowest, config) => {
    if (config.threshold !== null && dailyLossPct >= config.threshold) {
      return lowest === null ? config.threshold : Math.min(lowest, config.threshold);
    }
    return lowest;
  }, null);

  if (lowestExceeded !== null) {
    await triggerAlert({
      userId,
      instanceId,
      eaName,
      alertType: "DAILY_LOSS",
      message: `Daily loss of $${dailyLossPct.toFixed(2)} exceeded your threshold of $${lowestExceeded}`,
    });
  }
}

/**
 * Check weekly loss alerts.
 */
export async function checkWeeklyLossAlerts(
  userId: string,
  instanceId: string,
  eaName: string
): Promise<void> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const agg = await prisma.eATrade.aggregate({
    where: {
      instanceId,
      closeTime: { gte: startOfWeek },
    },
    _sum: { profit: true },
    _count: true,
  });

  if (agg._count === 0) return;

  const weeklyPnl = agg._sum.profit ?? 0;
  if (weeklyPnl >= 0) return;

  const weeklyLoss = Math.abs(weeklyPnl);

  const configs = await prisma.eAAlertConfig.findMany({
    where: {
      userId,
      alertType: "WEEKLY_LOSS",
      enabled: true,
      OR: [{ instanceId: null }, { instanceId }],
    },
  });

  const lowestExceeded = configs.reduce<number | null>((lowest, config) => {
    if (config.threshold !== null && weeklyLoss >= config.threshold) {
      return lowest === null ? config.threshold : Math.min(lowest, config.threshold);
    }
    return lowest;
  }, null);

  if (lowestExceeded !== null) {
    await triggerAlert({
      userId,
      instanceId,
      eaName,
      alertType: "WEEKLY_LOSS",
      message: `Weekly loss of $${weeklyLoss.toFixed(2)} exceeded your threshold of $${lowestExceeded}`,
    });
  }
}

/**
 * Check equity target alerts (positive target reached).
 */
export async function checkEquityTargetAlerts(
  userId: string,
  instanceId: string,
  eaName: string,
  equity: number
): Promise<void> {
  const configs = await prisma.eAAlertConfig.findMany({
    where: {
      userId,
      alertType: "EQUITY_TARGET",
      enabled: true,
      OR: [{ instanceId: null }, { instanceId }],
    },
  });

  const lowestReached = configs.reduce<number | null>((lowest, config) => {
    if (config.threshold !== null && equity >= config.threshold) {
      return lowest === null ? config.threshold : Math.min(lowest, config.threshold);
    }
    return lowest;
  }, null);

  if (lowestReached !== null) {
    await triggerAlert({
      userId,
      instanceId,
      eaName,
      alertType: "EQUITY_TARGET",
      message: `Equity target of $${lowestReached.toLocaleString()} reached! Current equity: $${equity.toFixed(2)}`,
    });
  }
}
