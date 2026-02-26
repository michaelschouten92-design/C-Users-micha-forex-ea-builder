import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { enqueueNotification } from "@/lib/outbox";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "heartbeat" });
import {
  checkDrawdownAlerts,
  checkOfflineAlerts,
  checkDailyLossAlerts,
  checkWeeklyLossAlerts,
  checkEquityTargetAlerts,
} from "@/lib/alerts";
import { computeAndCacheStatus } from "@/lib/strategy-status/compute-and-cache";
import { z } from "zod";

// NOTE: Alert processing uses only the EAAlertConfig system (via @/lib/alerts).
// The legacy EAAlertRule/EAAlert system has been removed from runtime code.
// See prisma/schema.prisma for deprecated model annotations.

const heartbeatSchema = z.object({
  symbol: z.string().max(32).optional(),
  timeframe: z.string().max(8).optional(),
  broker: z.string().max(128).optional(),
  accountNumber: z.union([z.string(), z.number()]).transform(String).optional(),
  balance: z.number().finite().min(0).max(1e12).default(0),
  equity: z.number().finite().min(0).max(1e12).default(0),
  openTrades: z.number().int().min(0).max(1000).default(0),
  totalTrades: z.number().int().min(0).max(1e8).default(0),
  totalProfit: z.number().finite().min(-1e12).max(1e12).default(0),
  drawdown: z.number().finite().min(0).max(100).default(0),
  spread: z.number().finite().min(0).max(10000).default(0),
  mode: z.enum(["LIVE", "PAPER"]).optional(),
});

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid heartbeat data" }, { status: 400 });
    }

    const data = parsed.data;

    // Security: auth.instanceId is derived from the API key (one key = one instance).
    // The request body has no instanceId field, preventing a leaked key from affecting other instances.

    // Fetch instance state before the update for status change detection
    const previousState = await prisma.liveEAInstance.findUnique({
      where: { id: auth.instanceId },
      select: {
        status: true,
        paused: true,
        lastHeartbeat: true,
        eaName: true,
        symbol: true,
        user: { select: { email: true, webhookUrl: true } },
      },
    });

    // Atomically update instance + insert heartbeat record
    await prisma.$transaction([
      prisma.liveEAInstance.update({
        where: { id: auth.instanceId },
        data: {
          status: "ONLINE",
          lastHeartbeat: new Date(),
          symbol: data.symbol ?? undefined,
          timeframe: data.timeframe ?? undefined,
          broker: data.broker ?? undefined,
          accountNumber: data.accountNumber ?? undefined,
          mode: data.mode === "PAPER" ? "PAPER" : undefined,
          balance: data.balance,
          equity: data.equity,
          openTrades: data.openTrades,
          totalTrades: data.totalTrades,
          totalProfit: data.totalProfit,
        },
      }),
      prisma.eAHeartbeat.create({
        data: {
          instanceId: auth.instanceId,
          balance: data.balance,
          equity: data.equity,
          openTrades: data.openTrades,
          totalTrades: data.totalTrades,
          totalProfit: data.totalProfit,
          drawdown: data.drawdown,
          spread: data.spread,
        },
      }),
    ]);

    // Fire-and-forget side effects: webhook and EAAlertConfig-based alerts
    if (previousState) {
      processHeartbeatSideEffects(auth.instanceId, auth.userId, data, previousState).catch(
        (err) => {
          log.error({ err, instanceId: auth.instanceId }, "Heartbeat side effects failed");
        }
      );

      // Recompute strategy status when EA comes online from offline/error
      const statusChanged = previousState.status !== "ONLINE";
      if (statusChanged) {
        computeAndCacheStatus(auth.instanceId).catch((err) => {
          log.error({ err, instanceId: auth.instanceId }, "Strategy status recomputation failed");
        });
      }
    }

    // If the instance is paused, instruct the EA to pause trading
    const isPaused = previousState?.paused ?? false;
    if (isPaused) {
      return NextResponse.json({ success: true, action: "PAUSE" });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

interface PreviousState {
  status: string;
  paused: boolean;
  lastHeartbeat: Date | null;
  eaName: string;
  symbol: string | null;
  user: { email: string; webhookUrl: string | null };
}

async function processHeartbeatSideEffects(
  instanceId: string,
  userId: string,
  data: { symbol?: string; balance: number; equity: number; drawdown: number; totalProfit: number },
  prev: PreviousState
): Promise<void> {
  // Webhook notification via outbox
  if (prev.user.webhookUrl) {
    enqueueNotification({
      userId,
      channel: "WEBHOOK",
      destination: prev.user.webhookUrl,
      payload: {
        event: "heartbeat",
        data: {
          eaName: prev.eaName,
          symbol: data.symbol ?? prev.symbol ?? "",
          balance: data.balance,
          equity: data.equity,
          profit: data.totalProfit,
          status: "ONLINE",
        },
      },
    });
  }

  // Email alert: EA was ONLINE but last heartbeat was more than 1 hour ago (unexpected disconnect)
  if (prev.status === "ONLINE" && prev.lastHeartbeat) {
    const elapsed = Date.now() - prev.lastHeartbeat.getTime();
    if (elapsed > ONE_HOUR_MS) {
      enqueueNotification({
        userId,
        channel: "EMAIL",
        destination: prev.user.email,
        subject: `EA Alert: ${prev.eaName}`,
        payload: {
          html: `<p>Your EA "${prev.eaName}" came back online after being unreachable for ${Math.round(elapsed / 60000)} minutes. Please verify it is operating correctly.</p>`,
        },
      });

      // Trigger user-configured offline alerts (EAAlertConfig system)
      checkOfflineAlerts(userId, instanceId, prev.eaName, Math.round(elapsed / 60000)).catch(
        (err) => {
          log.error({ err, instanceId }, "Offline alert check failed");
        }
      );
    }
  }

  // Check user-configured drawdown alerts (EAAlertConfig system)
  if (data.drawdown > 0) {
    checkDrawdownAlerts(userId, instanceId, prev.eaName, data.drawdown).catch((err) => {
      log.error({ err, instanceId }, "Drawdown alert check failed");
    });
  }

  // Check daily/weekly loss alerts and equity target alerts
  checkDailyLossAlerts(userId, instanceId, prev.eaName).catch((err) => {
    log.error({ err, instanceId }, "Daily loss alert check failed");
  });
  checkWeeklyLossAlerts(userId, instanceId, prev.eaName).catch((err) => {
    log.error({ err, instanceId }, "Weekly loss alert check failed");
  });
  if (data.equity > 0) {
    checkEquityTargetAlerts(userId, instanceId, prev.eaName, data.equity).catch((err) => {
      log.error({ err, instanceId }, "Equity target alert check failed");
    });
  }
}
