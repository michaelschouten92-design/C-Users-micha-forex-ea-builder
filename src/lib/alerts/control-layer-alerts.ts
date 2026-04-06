/**
 * Control-layer alert generation — deterministic, transition-based alerts.
 *
 * Alerts are emitted on governance-relevant state transitions, not continuous
 * polling. Each alert uses a dedupeKey to prevent duplicates for the same state.
 *
 * Alert types:
 *   DEPLOYMENT_INVALIDATED   — lifecycle → INVALIDATED
 *   DEPLOYMENT_RESTRICTED    — governance → RESTRICTED (edge at risk, operator halt)
 *   DEPLOYMENT_REVIEW        — governance → REVIEW_REQUIRED (degraded health, incidents)
 *   MONITOR_OFFLINE          — heartbeat ONLINE → OFFLINE (>1h gap)
 *   BASELINE_MISSING         — monitoring run detects no baseline
 *   VERSION_OUTDATED         — deployment running outdated strategy version
 */

import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { enqueueNotification } from "@/lib/outbox";
import { decrypt, isEncrypted } from "@/lib/crypto";

const log = logger.child({ service: "control-layer-alerts" });

// ── Alert types ──────────────────────────────────────────

import type { ControlLayerAlertType } from "./alert-severity";
export type { ControlLayerAlertType } from "./alert-severity";

// ── Summaries ────────────────────────────────────────────

const ALERT_SUMMARIES: Record<ControlLayerAlertType, string> = {
  DEPLOYMENT_INVALIDATED: "Deployment has been invalidated. Trading authority revoked.",
  DEPLOYMENT_RESTRICTED: "Deployment restricted. Trading paused pending operator action.",
  DEPLOYMENT_REVIEW: "Deployment requires review. One or more signals need attention.",
  MONITOR_OFFLINE: "Deployment went offline. No heartbeat received.",
  BASELINE_MISSING: "No baseline linked. Monitoring is limited without backtest reference.",
  VERSION_OUTDATED: "Running an outdated strategy version.",
  HEALTH_DEGRADED: "Strategy edge is at risk. Performance deviating from baseline.",
  HEALTH_CRITICAL: "Strategy edge is critical. Sustained performance decline detected.",
  EDGE_DECAY_WARNING:
    "Edge decay detected. Performance trending below baseline — projected to break threshold.",
};

// ── Public API ───────────────────────────────────────────

export interface EmitAlertParams {
  userId: string;
  instanceId: string;
  alertType: ControlLayerAlertType;
  reasons?: string[];
}

/**
 * Emit a control-layer alert with deduplication.
 *
 * The dedupeKey is `{alertType}:{instanceId}` — only one active (unacknowledged)
 * alert per type per instance. If the operator acknowledges, a new alert can
 * be created for the same state if it recurs.
 *
 * Uses upsert-style: try create, catch P2002 (duplicate) silently.
 * On successful creation, attempts webhook delivery (fire-and-forget).
 */
export async function emitControlLayerAlert(
  db: PrismaClient | Prisma.TransactionClient,
  params: EmitAlertParams
): Promise<void> {
  const { userId, instanceId, alertType, reasons } = params;
  const dedupeKey = `${alertType}:${instanceId}`;

  let alertId: string | null = null;
  try {
    const created = await (db as PrismaClient).controlLayerAlert.create({
      data: {
        userId,
        instanceId,
        alertType,
        summary: ALERT_SUMMARIES[alertType],
        reasons: reasons ? (reasons as Prisma.InputJsonValue) : Prisma.JsonNull,
        dedupeKey,
      },
    });
    alertId = created.id;
    log.info({ instanceId, alertType }, "Control-layer alert emitted");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Duplicate — alert already exists for this state. Expected, not an error.
      return;
    }
    log.error({ err, instanceId, alertType }, "Failed to emit control-layer alert");
    return;
  }

  // Deliver via all configured channels — awaited so enqueue failures are visible
  if (alertId) {
    try {
      await deliverAlertAllChannels(alertId, userId, instanceId, alertType, reasons);
    } catch (err) {
      log.error({ err, alertId }, "Alert delivery failed");
    }
  }
}

// ── Severity labels ──────────────────────────────────────

import { ALERT_SEVERITY } from "./alert-severity";

/** Alert types that should trigger outbound notifications (email/telegram/slack) */
const OUTBOUND_ALERT_TYPES: ReadonlySet<ControlLayerAlertType> = new Set([
  "DEPLOYMENT_INVALIDATED",
  "DEPLOYMENT_RESTRICTED",
  "DEPLOYMENT_REVIEW",
  "MONITOR_OFFLINE",
  "HEALTH_DEGRADED",
  "HEALTH_CRITICAL",
  "EDGE_DECAY_WARNING",
]);

// ── Multi-channel delivery ───────────────────────────────

/**
 * Deliver a newly created alert via all configured channels.
 * Channels: webhook (direct), email + telegram + slack (via outbox).
 *
 * Deduplication is already handled upstream — if we reach this function,
 * the ControlLayerAlert was successfully created (P2002 = silently skipped).
 */
async function deliverAlertAllChannels(
  alertId: string,
  userId: string,
  instanceId: string,
  alertType: ControlLayerAlertType,
  reasons?: string[]
): Promise<void> {
  // Load user notification settings + instance name in one query pair
  const [user, instance] = await Promise.all([
    defaultPrisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramBotToken: true,
        telegramChatId: true,
      },
    }),
    defaultPrisma.liveEAInstance.findUnique({
      where: { id: instanceId },
      select: { eaName: true, symbol: true },
    }),
  ]);

  if (!user) return;

  const eaName = instance?.eaName ?? "Unknown Strategy";
  const symbol = instance?.symbol ?? "";
  const summary = ALERT_SUMMARIES[alertType];
  const severity = ALERT_SEVERITY[alertType];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://algo-studio.com";
  const investigateUrl = `${appUrl}/app/strategy/${instanceId}`;

  // Skip outbound notifications for low-priority alert types
  if (!OUTBOUND_ALERT_TYPES.has(alertType)) return;

  const reasonText =
    reasons && reasons.length > 0 ? reasons.join(", ") : "See strategy detail for more info.";

  // ── Telegram (via outbox) ──
  if (user.telegramBotToken && user.telegramChatId) {
    const rawToken = user.telegramBotToken;
    const botToken = isEncrypted(rawToken) ? decrypt(rawToken) : rawToken;
    if (botToken) {
      const tgMessage =
        `<b>[${severity}] ${eaName}</b>${symbol ? ` (${symbol})` : ""}\n\n` +
        `${summary}\n\n` +
        `${reasonText}\n\n` +
        `<a href="${investigateUrl}">Investigate</a>`;

      await enqueueNotification({
        userId,
        channel: "TELEGRAM",
        destination: user.telegramChatId,
        alertSourceId: alertId,
        payload: { botToken, message: tgMessage },
      });
    }
  }
}

// ── Lifecycle transition alerts ──────────────────────────

/**
 * Emit alerts based on a lifecycle state transition.
 * Called from within the monitoring run's atomic transaction.
 */
export async function emitTransitionAlerts(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    userId: string;
    instanceId: string;
    fromState: string;
    toState: string;
    reasons: string[];
  }
): Promise<void> {
  const { userId, instanceId, toState, reasons } = params;

  if (toState === "INVALIDATED") {
    await emitControlLayerAlert(db, {
      userId,
      instanceId,
      alertType: "DEPLOYMENT_INVALIDATED",
      reasons,
    });
  }

  if (toState === "EDGE_AT_RISK") {
    await emitControlLayerAlert(db, {
      userId,
      instanceId,
      alertType: "DEPLOYMENT_RESTRICTED",
      reasons,
    });
  }
}

// ── Monitoring signal alerts ─────────────────────────────

/**
 * Emit alerts for monitoring-detected signals (baseline missing, version outdated).
 * Called after monitoring evaluation, outside the serializable tx.
 */
export async function emitMonitoringSignalAlerts(
  db: PrismaClient,
  params: {
    userId: string;
    instanceId: string;
    baselineMissing: boolean;
    versionOutdated: boolean;
  }
): Promise<void> {
  if (params.baselineMissing) {
    await emitControlLayerAlert(db, {
      userId: params.userId,
      instanceId: params.instanceId,
      alertType: "BASELINE_MISSING",
    });
  }
  if (params.versionOutdated) {
    await emitControlLayerAlert(db, {
      userId: params.userId,
      instanceId: params.instanceId,
      alertType: "VERSION_OUTDATED",
    });
  }
}

/**
 * Clear a dedupeKey when the condition resolves (e.g., baseline linked, back online).
 * Deletes the alert row (regardless of acknowledgment) so a fresh one can fire
 * if the condition recurs later.
 */
export async function clearAlertByDedupe(db: PrismaClient, dedupeKey: string): Promise<void> {
  await db.controlLayerAlert.deleteMany({
    where: { dedupeKey },
  });
}
