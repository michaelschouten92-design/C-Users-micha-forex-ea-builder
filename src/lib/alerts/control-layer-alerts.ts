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
import { fireWebhookWithResult } from "@/lib/webhook";

const log = logger.child({ service: "control-layer-alerts" });

// ── Alert types ──────────────────────────────────────────

export type ControlLayerAlertType =
  | "DEPLOYMENT_INVALIDATED"
  | "DEPLOYMENT_RESTRICTED"
  | "DEPLOYMENT_REVIEW"
  | "MONITOR_OFFLINE"
  | "BASELINE_MISSING"
  | "VERSION_OUTDATED";

// ── Summaries ────────────────────────────────────────────

const ALERT_SUMMARIES: Record<ControlLayerAlertType, string> = {
  DEPLOYMENT_INVALIDATED: "Deployment has been invalidated. Trading authority revoked.",
  DEPLOYMENT_RESTRICTED: "Deployment restricted. Trading paused pending operator action.",
  DEPLOYMENT_REVIEW: "Deployment requires review. One or more signals need attention.",
  MONITOR_OFFLINE: "Deployment went offline. No heartbeat received.",
  BASELINE_MISSING: "No baseline linked. Monitoring is limited without backtest reference.",
  VERSION_OUTDATED: "Running an outdated strategy version.",
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

  // Fire-and-forget webhook delivery — never blocks or throws
  if (alertId) {
    deliverAlertWebhook(alertId, userId, instanceId, alertType, reasons).catch((err) => {
      log.error({ err, alertId }, "Webhook delivery background task failed");
    });
  }
}

// ── Webhook delivery ─────────────────────────────────────

/**
 * Attempt webhook delivery for a newly created alert.
 * Looks up user's webhookUrl; if absent, marks SKIPPED.
 * On success/failure, updates the alert's delivery tracking fields.
 */
async function deliverAlertWebhook(
  alertId: string,
  userId: string,
  instanceId: string,
  alertType: ControlLayerAlertType,
  reasons?: string[]
): Promise<void> {
  // Look up user webhook URL and instance name
  const [user, instance] = await Promise.all([
    defaultPrisma.user.findUnique({
      where: { id: userId },
      select: { webhookUrl: true },
    }),
    defaultPrisma.liveEAInstance.findUnique({
      where: { id: instanceId },
      select: { eaName: true },
    }),
  ]);

  if (!user?.webhookUrl) {
    await defaultPrisma.controlLayerAlert
      .update({
        where: { id: alertId },
        data: { webhookStatus: "SKIPPED", webhookAt: new Date() },
      })
      .catch(() => {});
    return;
  }

  const payload = {
    event: "control_layer_alert",
    alertId,
    alertType,
    summary: ALERT_SUMMARIES[alertType],
    reasons: reasons ?? [],
    deploymentId: instanceId,
    deploymentName: instance?.eaName ?? null,
    createdAt: new Date().toISOString(),
  };

  const result = await fireWebhookWithResult(user.webhookUrl, payload);
  const now = new Date();
  if (result.ok) {
    await defaultPrisma.controlLayerAlert
      .update({
        where: { id: alertId },
        data: { webhookStatus: "DELIVERED", webhookAt: now },
      })
      .catch(() => {});
  } else {
    await defaultPrisma.controlLayerAlert
      .update({
        where: { id: alertId },
        data: {
          webhookStatus: "FAILED",
          webhookAt: now,
          webhookError: result.error.slice(0, 200),
        },
      })
      .catch(() => {});
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
 * Deletes the unacknowledged alert so a fresh one can fire if the condition recurs.
 */
export async function clearAlertByDedupe(db: PrismaClient, dedupeKey: string): Promise<void> {
  await db.controlLayerAlert.deleteMany({
    where: { dedupeKey, acknowledgedAt: null },
  });
}
