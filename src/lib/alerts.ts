import { prisma } from "@/lib/prisma";
import { enqueueNotification } from "@/lib/outbox";
import { decrypt, isEncrypted } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { isAlertChannelAllowed } from "@/lib/plans";
import { resolveTier } from "@/lib/plan-limits";

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

  // Resolve tier for alert channel gating
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true, status: true, currentPeriodEnd: true, manualPeriodEnd: true },
  });
  const tier = resolveTier(subscription);

  const allConfigs = await prisma.eAAlertConfig.findMany({
    where: {
      userId,
      alertType,
      state: "ACTIVE",
      OR: [{ instanceId: null }, { instanceId }],
    },
    include: {
      user: { select: { email: true, telegramBotToken: true, telegramChatId: true } },
    },
  });

  // Filter configs to only tier-allowed channels (fail-closed)
  const configs = allConfigs.filter((c) => isAlertChannelAllowed(tier, c.channel));

  if (configs.length === 0) return;

  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - RATE_LIMIT_MS);

  // Atomic claim: only configs where cooldown has passed get their lastTriggered
  // updated. This prevents concurrent heartbeats from both passing the rate limit.
  const eligibleIds = configs.map((c) => c.id);
  const { count: claimedCount } = await prisma.eAAlertConfig.updateMany({
    where: {
      id: { in: eligibleIds },
      OR: [{ lastTriggered: null }, { lastTriggered: { lt: cooldownCutoff } }],
    },
    data: { lastTriggered: now },
  });

  if (claimedCount === 0) return;

  // Re-read which configs were claimed (those with lastTriggered === now)
  // Use the original configs list and filter by cooldown eligibility
  const claimedConfigs = configs.filter((c) => {
    if (!c.lastTriggered) return true; // was null → claimed
    return c.lastTriggered.getTime() < cooldownCutoff.getTime(); // was expired → claimed
  });

  for (const config of claimedConfigs) {
    const channel = config.channel;
    if (channel === "BROWSER_PUSH") {
      await enqueueNotification({
        userId,
        channel: "BROWSER_PUSH",
        destination: userId,
        payload: {
          title: `Algo Studio: ${alertType}`,
          body: `${eaName} — ${message}`,
          url: "/app/monitor",
          tag: `${alertType}-${instanceId}`,
        },
      });
    } else if (channel === "TELEGRAM") {
      const chatId = config.user.telegramChatId;
      if (chatId) {
        // Use central Algo Studio bot token; fall back to user's own bot (legacy)
        const centralToken = process.env.ALGO_TELEGRAM_BOT_TOKEN;
        const rawUserToken = config.user.telegramBotToken;
        const userToken = rawUserToken
          ? isEncrypted(rawUserToken)
            ? decrypt(rawUserToken)
            : rawUserToken
          : null;
        const botToken = centralToken || userToken;
        if (botToken) {
          const telegramMessage = `<b>Algo Studio Alert: ${alertType}</b>\n\nEA: ${eaName}\n${message}`;
          await enqueueNotification({
            userId,
            channel: "TELEGRAM",
            destination: chatId,
            payload: { botToken, message: telegramMessage },
          });
        }
      }
    } else if (channel === "EMAIL") {
      const email = config.user.email;
      if (email) {
        await enqueueNotification({
          userId,
          channel: "EMAIL",
          destination: email,
          subject: `Algo Studio Alert: ${eaName} — ${alertType}`,
          payload: {
            html: `<p><strong>${alertType}</strong></p><p>EA: ${eaName}</p><p>${message}</p><p><a href="https://algo-studio.com/app/live">View in dashboard</a></p>`,
          },
        });
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
      state: "ACTIVE",
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
      state: "ACTIVE",
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

  const dailyLossAmount = Math.abs(dailyPnl); // Absolute dollar loss value

  const configs = await prisma.eAAlertConfig.findMany({
    where: {
      userId,
      alertType: "DAILY_LOSS",
      state: "ACTIVE",
      OR: [{ instanceId: null }, { instanceId }],
    },
  });

  const lowestExceeded = configs.reduce<number | null>((lowest, config) => {
    if (config.threshold !== null && dailyLossAmount >= config.threshold) {
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
      message: `Daily loss of $${dailyLossAmount.toFixed(2)} exceeded your threshold of $${lowestExceeded}`,
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
      state: "ACTIVE",
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
      state: "ACTIVE",
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
