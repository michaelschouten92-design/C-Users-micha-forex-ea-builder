import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelemetry } from "@/lib/telemetry-auth";
import { enqueueNotification } from "@/lib/outbox";
import { logger } from "@/lib/logger";
import { apiError, ErrorCode } from "@/lib/error-codes";

const log = logger.child({ module: "heartbeat" });
import {
  checkDrawdownAlerts,
  checkOfflineAlerts,
  checkDailyLossAlerts,
  checkWeeklyLossAlerts,
  checkEquityTargetAlerts,
} from "@/lib/alerts";
import { computeAndCacheStatus } from "@/lib/strategy-status/compute-and-cache";
import { emitControlLayerAlert, clearAlertByDedupe } from "@/lib/alerts/control-layer-alerts";
import { decideHeartbeatAction } from "@/domain/heartbeat/decide-heartbeat-action";
import { detectMaterialChange, suspendBaselineTrust } from "@/lib/deployment/material-change";
import { createHash } from "crypto";
import { z } from "zod";

// NOTE: Alert processing uses only the EAAlertConfig system (via @/lib/alerts).
// The legacy EAAlertRule/EAAlert system has been removed from runtime code.
// See prisma/schema.prisma for deprecated model annotations.

/** Strict hex hash: 64 chars (SHA-256 output). */
const HEX_HASH_RE = /^[0-9a-fA-F]{64}$/;

const deploymentSchema = z.object({
  symbol: z.string().min(1).max(20).trim(),
  timeframe: z.string().min(1).max(10).trim(),
  magicNumber: z.number().int().min(1), // Must be > 0 — magic=0 is excluded by product rules
  eaName: z.string().min(1).max(100).trim(),
  /** Optional SHA-256 hash of EA material configuration. Reported by Monitor EA. */
  materialFingerprint: z
    .string()
    .regex(HEX_HASH_RE, "materialFingerprint must be a 64-char hex SHA-256 hash")
    .optional(),
});

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
  deployment: deploymentSchema.optional(),
});

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const auth = await authenticateTelemetry(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        apiError(
          ErrorCode.VALIDATION_FAILED,
          "Invalid heartbeat data",
          parsed.error.issues.map((i) => i.message)
        ),
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Security: auth.instanceId is derived from the API key (one key = one instance).
    // The request body has no instanceId field, preventing a leaked key from affecting other instances.

    // Fetch instance state before the update for status change detection
    const previousState = await prisma.liveEAInstance.findUnique({
      where: { id: auth.instanceId },
      select: {
        status: true,
        tradingState: true,
        lastHeartbeat: true,
        eaName: true,
        symbol: true,
        lifecycleState: true,
        operatorHold: true,
        monitoringSuppressedUntil: true,
        terminalConnectionId: true,
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

    // Fire-and-forget deployment discovery — process only if deployment data is present
    if (data.deployment) {
      processDeploymentDiscovery(
        auth.instanceId,
        auth.userId,
        data.deployment,
        previousState?.terminalConnectionId ?? null,
        data.broker ?? null,
        data.accountNumber ?? null
      ).catch((err) => {
        log.error({ err, instanceId: auth.instanceId }, "Deployment discovery failed");
      });
    }

    // Governance decision — reuse the same pure function as internal heartbeat.
    // The telemetry endpoint authenticates by API key (instance is confirmed to exist),
    // so authorityReady is always true here.
    const now = new Date();
    const decision = previousState
      ? decideHeartbeatAction({
          lifecycleState: previousState.lifecycleState,
          operatorHold: previousState.operatorHold as "NONE" | "HALTED" | "OVERRIDE_PENDING" | null,
          monitoringSuppressedUntil: previousState.monitoringSuppressedUntil,
          now,
          authorityReady: true,
        })
      : { action: "PAUSE" as const, reasonCode: "NO_INSTANCE" as const };

    return NextResponse.json({
      success: true,
      instanceId: auth.instanceId,
      action: decision.action,
      reasonCode: decision.reasonCode,
    });
  } catch (err) {
    log.error({ err, instanceId: auth.instanceId }, "Heartbeat processing failed");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal error"), { status: 500 });
  }
}

interface PreviousState {
  status: string;
  tradingState: string;
  lastHeartbeat: Date | null;
  eaName: string;
  symbol: string | null;
  lifecycleState: string | null;
  operatorHold: string | null;
  monitoringSuppressedUntil: Date | null;
  terminalConnectionId: string | null;
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

  // Control-layer offline alert: EA was ONLINE and heartbeat gap > 1h → emit MONITOR_OFFLINE
  if (prev.status === "ONLINE" && prev.lastHeartbeat) {
    const elapsed = Date.now() - prev.lastHeartbeat.getTime();
    if (elapsed > ONE_HOUR_MS) {
      emitControlLayerAlert(prisma, {
        userId,
        instanceId,
        alertType: "MONITOR_OFFLINE",
        reasons: [`Offline for ${Math.round(elapsed / 60000)} minutes`],
      }).catch((err) => {
        log.error({ err, instanceId }, "Control-layer offline alert failed");
      });
    }
  }
  // EA came back online from OFFLINE/ERROR → clear any existing offline alert
  if (prev.status !== "ONLINE") {
    clearAlertByDedupe(prisma, `MONITOR_OFFLINE:${instanceId}`).catch((err) => {
      log.error({ err, instanceId }, "Failed to clear offline alert");
    });
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

// ── Deployment Discovery ──────────────────────────────────────────────

/**
 * Compute stable deployment identity key — same formula as terminal/deployments endpoint.
 * SHA-256(SYMBOL:TIMEFRAME:MAGICNUMBER:EANAME) — case-normalized.
 */
function computeDeploymentKey(d: {
  symbol: string;
  timeframe: string;
  magicNumber: number;
  eaName: string;
}): string {
  const raw = `${d.symbol.toUpperCase()}:${d.timeframe.toUpperCase()}:${d.magicNumber}:${d.eaName}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Process deployment discovery from heartbeat data.
 *
 * Resolve or auto-create a TerminalConnection for this instance,
 * then upsert the TerminalDeployment. Idempotent — safe to call on every heartbeat.
 */
async function processDeploymentDiscovery(
  instanceId: string,
  userId: string,
  deployment: {
    symbol: string;
    timeframe: string;
    magicNumber: number;
    eaName: string;
    materialFingerprint?: string;
  },
  existingTerminalId: string | null,
  broker: string | null,
  accountNumber: string | null
): Promise<void> {
  const now = new Date();
  const reportedFingerprint = deployment.materialFingerprint ?? null;

  // Step 1: Resolve or auto-create TerminalConnection
  let terminalId = existingTerminalId;
  if (!terminalId) {
    // Auto-create terminal — use deterministic apiKeyHash so repeated calls are safe.
    // This hash is synthetic (not for X-Terminal-Key auth) — just satisfies the unique constraint.
    const syntheticHash = createHash("sha256").update(`auto:instance:${instanceId}`).digest("hex");

    const label = [broker, accountNumber].filter(Boolean).join(" ") || "Monitor EA";

    // Use upsert to handle race conditions (concurrent heartbeats)
    const terminal = await prisma.terminalConnection.upsert({
      where: { apiKeyHash: syntheticHash },
      create: {
        userId,
        label: `Auto: ${label}`,
        apiKeyHash: syntheticHash,
        status: "ONLINE",
        lastHeartbeat: now,
        broker: broker ?? undefined,
        accountNumber: accountNumber ?? undefined,
      },
      update: {
        status: "ONLINE",
        lastHeartbeat: now,
        ...(broker != null && { broker }),
        ...(accountNumber != null && { accountNumber }),
      },
      select: { id: true },
    });

    terminalId = terminal.id;

    // Link instance to terminal (only if not already linked)
    await prisma.liveEAInstance.update({
      where: { id: instanceId },
      data: { terminalConnectionId: terminalId },
    });

    log.info(
      { instanceId, terminalId },
      "Auto-created TerminalConnection for deployment discovery"
    );
  } else {
    // Terminal exists — update heartbeat timestamp
    await prisma.terminalConnection.update({
      where: { id: terminalId },
      data: { status: "ONLINE", lastHeartbeat: now },
    });
  }

  // Step 2: Compute deployment key and upsert TerminalDeployment
  const deploymentKey = computeDeploymentKey(deployment);

  // Read existing row for material change detection
  const existing = await prisma.terminalDeployment.findUnique({
    where: {
      terminalConnectionId_deploymentKey: {
        terminalConnectionId: terminalId,
        deploymentKey,
      },
    },
    select: {
      id: true,
      instanceId: true,
      baselineStatus: true,
      materialFingerprint: true,
    },
  });

  // Detect material change using shared helper
  const changeResult = detectMaterialChange({
    reportedFingerprint,
    existingFingerprint: existing?.materialFingerprint ?? null,
    existingBaselineStatus: existing?.baselineStatus ?? null,
  });

  // Build update data
  const updateData: Record<string, unknown> = {
    lastSeenAt: now,
    instanceId, // Re-link if previously unlinked
  };
  if (reportedFingerprint !== null) {
    updateData.materialFingerprint = reportedFingerprint;
  }
  if (changeResult.newBaselineStatus) {
    updateData.baselineStatus = changeResult.newBaselineStatus;
  }

  const upsertedDeployment = await prisma.terminalDeployment.upsert({
    where: {
      terminalConnectionId_deploymentKey: {
        terminalConnectionId: terminalId,
        deploymentKey,
      },
    },
    create: {
      terminalConnectionId: terminalId,
      instanceId,
      deploymentKey,
      symbol: deployment.symbol.toUpperCase(),
      timeframe: deployment.timeframe.toUpperCase(),
      magicNumber: deployment.magicNumber,
      eaName: deployment.eaName,
      lastSeenAt: now,
      ...(reportedFingerprint !== null && { materialFingerprint: reportedFingerprint }),
    },
    update: updateData,
    select: { id: true },
  });

  // Suspend baseline trust on material change for LINKED deployments
  if (
    changeResult.isMaterialChange &&
    changeResult.newBaselineStatus === "RELINK_REQUIRED" &&
    existing?.instanceId
  ) {
    suspendBaselineTrust({
      instanceId: existing.instanceId,
      terminalConnectionId: terminalId,
      terminalDeploymentId: upsertedDeployment.id,
      deploymentKey,
      previousFingerprint: existing.materialFingerprint,
      newFingerprint: reportedFingerprint,
      previousBaselineStatus: existing.baselineStatus,
    }).catch((err) => {
      log.error({ err, instanceId, deploymentKey }, "Baseline trust suspension failed");
    });
  }
}
