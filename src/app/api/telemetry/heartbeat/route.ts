import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canMonitorAdditionalTradingAccount } from "@/lib/plan-limits";
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
  timeframe: z.string().max(10).trim(), // Allow "" for auto-discovered contexts
  magicNumber: z.number().int().min(1), // Must be > 0 — magic=0 is excluded by product rules
  eaName: z.string().min(1).max(100).trim(),
  /** Optional SHA-256 hash of EA material configuration. Reported by Monitor EA. */
  materialFingerprint: z
    .string()
    .regex(HEX_HASH_RE, "materialFingerprint must be a 64-char hex SHA-256 hash")
    .optional(),
});

const discoveredDeploymentSchema = z.object({
  symbol: z.string().min(1).max(20).trim(),
  magicNumber: z.number().int().min(1), // Must be > 0
  eaHint: z.string().max(100).trim().optional().default(""),
  tradeCount: z.number().int().min(0).optional().default(0),
});

const heartbeatSchema = z.object({
  symbol: z.string().max(32).optional(),
  timeframe: z.string().max(16).optional(),
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
  // Account-wide deployment discovery
  discoveredDeployments: z.array(discoveredDeploymentSchema).max(50).optional(),
  unattributedTradeCount: z.number().int().min(0).optional(),
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

    // Resolve per-context instance: manifest mode (has materialFingerprint + timeframe)
    // or auto-discovery mode (has materialFingerprint + empty timeframe).
    const isAutoDiscovered =
      data.deployment?.materialFingerprint != null && data.deployment.timeframe === "";
    const isManifestDeploy =
      data.deployment?.materialFingerprint != null && data.deployment.timeframe !== "";

    const effectiveInstanceId = isAutoDiscovered
      ? await resolveAutoDiscoveredContextInstance(auth.instanceId, auth.userId, {
          symbol: data.deployment!.symbol,
          magicNumber: data.deployment!.magicNumber,
          eaName: data.deployment!.eaName,
          materialFingerprint: data.deployment!.materialFingerprint!,
          broker: data.broker ?? null,
          accountNumber: data.accountNumber ?? null,
        })
      : isManifestDeploy
        ? await resolveManifestContextInstance(auth.instanceId, auth.userId, {
            symbol: data.deployment!.symbol,
            timeframe: data.deployment!.timeframe,
            magicNumber: data.deployment!.magicNumber,
            eaName: data.deployment!.eaName,
            materialFingerprint: data.deployment!.materialFingerprint!,
          })
        : auth.instanceId;
    const isManifestContext = effectiveInstanceId !== auth.instanceId;

    // TODO: remove after manifest instanceId validation
    log.info(
      {
        baseInstanceId: auth.instanceId,
        fingerprint: data.deployment?.materialFingerprint ?? null,
        effectiveInstanceId,
        isManifestContext,
      },
      "heartbeat:instance-resolution"
    );

    // Fetch instance state before the update for status change detection
    const previousState = await prisma.liveEAInstance.findUnique({
      where: { id: effectiveInstanceId },
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

    // Atomically update instance + insert heartbeat record.
    // In manifest mode, also pulse the base instance so the terminal doesn't go OFFLINE.
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txOps: any[] = [
      prisma.liveEAInstance.update({
        where: { id: effectiveInstanceId },
        data: {
          status: "ONLINE",
          lastHeartbeat: now,
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
          instanceId: effectiveInstanceId,
          balance: data.balance,
          equity: data.equity,
          openTrades: data.openTrades,
          totalTrades: data.totalTrades,
          totalProfit: data.totalProfit,
          drawdown: data.drawdown,
          spread: data.spread,
        },
      }),
    ];
    if (isManifestContext) {
      txOps.push(
        prisma.liveEAInstance.update({
          where: { id: auth.instanceId },
          data: {
            status: "ONLINE",
            lastHeartbeat: now,
            // Propagate broker/accountNumber to the base (account-wide) instance
            // so all instances share the same grouping key in the Command Center.
            ...(data.broker != null && { broker: data.broker }),
            ...(data.accountNumber != null && { accountNumber: data.accountNumber }),
            // Propagate account-level metrics so the base instance card shows live values.
            // Only balance/equity are truly account-level; openTrades/totalTrades/totalProfit
            // are strategy-level and must NOT overwrite the base instance (the last context
            // heartbeat would clobber values reported by the account-wide heartbeat).
            balance: data.balance,
            equity: data.equity,
          },
        }),
        // Also create a heartbeat record for the base instance so the SSE
        // live stream detects the update and pushes it to the client.
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
        })
      );
    }
    await prisma.$transaction(txOps);

    // Side effects: webhook, alerts, strategy status recomputation.
    // Alert checks are DB-heavy (4-5 queries each) — only run on status change
    // to avoid connection pool saturation on routine heartbeats.
    if (previousState) {
      const statusChanged = previousState.status !== "ONLINE";

      processHeartbeatSideEffects(
        effectiveInstanceId,
        auth.userId,
        data,
        previousState,
        statusChanged
      ).catch((err) => {
        log.error({ err, instanceId: effectiveInstanceId }, "Heartbeat side effects failed");
      });

      if (statusChanged) {
        computeAndCacheStatus(effectiveInstanceId).catch((err) => {
          log.error(
            { err, instanceId: effectiveInstanceId },
            "Strategy status recomputation failed"
          );
        });
      }
    }

    // Deployment discovery — await to ensure it completes before response.
    // Only runs when deployment payload is present (SYMBOL_ONLY mode).
    // Idempotent: safe to run on every heartbeat (upsert-based).
    if (data.deployment) {
      try {
        await processDeploymentDiscovery(
          effectiveInstanceId,
          auth.instanceId,
          auth.userId,
          data.deployment,
          previousState?.terminalConnectionId ?? null,
          data.broker ?? null,
          data.accountNumber ?? null
        );
      } catch (err) {
        log.error({ err, instanceId: effectiveInstanceId }, "Deployment discovery failed");
      }
    }

    // Account-wide deployment discovery — process discovered deployment candidates.
    // Runs when discoveredDeployments array is present (ACCOUNT_WIDE mode).
    if (data.discoveredDeployments && data.discoveredDeployments.length > 0) {
      try {
        await processDiscoveredDeployments(
          effectiveInstanceId,
          auth.instanceId,
          auth.userId,
          data.discoveredDeployments,
          previousState?.terminalConnectionId ?? null,
          data.broker ?? null,
          data.accountNumber ?? null,
          data.unattributedTradeCount ?? 0
        );
      } catch (err) {
        log.error(
          { err, instanceId: effectiveInstanceId },
          "Account-wide deployment discovery failed"
        );
      }
    }

    // Governance decision — reuse the same pure function as internal heartbeat.
    // The telemetry endpoint authenticates by API key (instance is confirmed to exist),
    // so authorityReady is always true here.
    const decision = previousState
      ? decideHeartbeatAction({
          lifecycleState: previousState.lifecycleState,
          operatorHold: previousState.operatorHold as "NONE" | "HALTED" | "OVERRIDE_PENDING" | null,
          monitoringSuppressedUntil: previousState.monitoringSuppressedUntil,
          now,
          authorityReady: true,
        })
      : { action: "PAUSE" as const, reasonCode: "NO_INSTANCE" as const };

    // TODO: remove after manifest instanceId validation
    log.info(
      { responseInstanceId: effectiveInstanceId, action: decision.action },
      "heartbeat:response"
    );

    return NextResponse.json({
      success: true,
      instanceId: effectiveInstanceId,
      action: decision.action,
      reasonCode: decision.reasonCode,
    });
  } catch (err) {
    log.error({ err, instanceId: auth.instanceId }, "Heartbeat processing failed");
    return NextResponse.json(apiError(ErrorCode.INTERNAL_ERROR, "Internal error"), { status: 500 });
  }
}

// ── Manifest Context Instance Resolution ─────────────────────────────

/**
 * Resolve or create a per-context LiveEAInstance for manifest mode.
 *
 * In manifest mode the EA sends one heartbeat per strategy context (fingerprint).
 * Each context needs its own instanceId for isolated governance, tracking, and display.
 * Instance identity = SHA-256("manifest-ctx-key:v1:" + baseInstanceId + ":" + fingerprint).
 *
 * The synthetic apiKeyHash is not usable for authentication — no real API key maps to it.
 * Idempotent: safe to call on every heartbeat.
 */
async function resolveManifestContextInstance(
  baseInstanceId: string,
  userId: string,
  deployment: {
    symbol: string;
    timeframe: string;
    magicNumber: number;
    eaName: string;
    materialFingerprint: string;
  }
): Promise<string> {
  const syntheticKeyHash = createHash("sha256")
    .update(`manifest-ctx-key:v1:${baseInstanceId}:${deployment.materialFingerprint}`)
    .digest("hex");

  const ctx = await prisma.liveEAInstance.upsert({
    where: { apiKeyHash: syntheticKeyHash },
    create: {
      userId,
      apiKeyHash: syntheticKeyHash,
      eaName: deployment.eaName,
      symbol: deployment.symbol.toUpperCase(),
      timeframe: deployment.timeframe.toUpperCase(),
      // Start in LIVE_MONITORING so governance returns RUN immediately.
      // Manifest context instances represent actively deployed live strategies.
      lifecycleState: "LIVE_MONITORING",
      parentInstanceId: baseInstanceId,
    },
    update: {
      // Backfill parentInstanceId for instances created before this field existed
      parentInstanceId: baseInstanceId,
    },
    select: { id: true },
  });

  // Guard: child must never be its own parent — clear if upsert self-referenced
  if (ctx.id === baseInstanceId) {
    log.error(
      { instanceId: ctx.id },
      "manifest context resolved to base instance — clearing self-parent"
    );
    await prisma.liveEAInstance.update({
      where: { id: ctx.id },
      data: { parentInstanceId: null },
    });
  }

  return ctx.id;
}

// ── Auto-Discovered Context Instance Resolution ──────────────────────

/**
 * Resolve or create a per-context LiveEAInstance for auto-discovered strategies.
 *
 * Auto-discovered contexts use fingerprint = SHA256("AUTO:v1:" + symbol + ":" + magicNumber),
 * computed EA-side. The backend scopes instance identity by baseInstanceId so contexts from
 * different terminals remain isolated.
 *
 * Created with lifecycleState = "DRAFT" — governance returns PAUSE until the user links a baseline.
 * Idempotent: safe to call on every heartbeat. Does not overwrite lifecycleState on update.
 */
async function resolveAutoDiscoveredContextInstance(
  baseInstanceId: string,
  userId: string,
  deployment: {
    symbol: string;
    magicNumber: number;
    eaName: string;
    materialFingerprint: string;
    broker: string | null;
    accountNumber: string | null;
  }
): Promise<string> {
  const syntheticKeyHash = createHash("sha256")
    .update(`manifest-ctx-key:v1:${baseInstanceId}:${deployment.materialFingerprint}`)
    .digest("hex");

  const ctx = await prisma.liveEAInstance.upsert({
    where: { apiKeyHash: syntheticKeyHash },
    create: {
      userId,
      apiKeyHash: syntheticKeyHash,
      eaName: deployment.eaName,
      symbol: deployment.symbol.toUpperCase(),
      timeframe: "",
      lifecycleState: "DRAFT",
      broker: deployment.broker ?? undefined,
      accountNumber: deployment.accountNumber ?? undefined,
      parentInstanceId: baseInstanceId,
    },
    update: {
      // Backfill broker/accountNumber and parentInstanceId for pre-existing instances
      ...(deployment.broker != null && { broker: deployment.broker }),
      ...(deployment.accountNumber != null && { accountNumber: deployment.accountNumber }),
      parentInstanceId: baseInstanceId,
    },
    select: { id: true },
  });

  // Guard: child must never be its own parent — clear if upsert self-referenced
  if (ctx.id === baseInstanceId) {
    log.error(
      { instanceId: ctx.id },
      "auto-discovered context resolved to base instance — clearing self-parent"
    );
    await prisma.liveEAInstance.update({
      where: { id: ctx.id },
      data: { parentInstanceId: null },
    });
  }

  return ctx.id;
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
  prev: PreviousState,
  statusChanged: boolean
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

  // Alert checks are DB-heavy — only run when EA status changed (OFFLINE→ONLINE or vice versa)
  // to avoid saturating the connection pool on routine heartbeats.
  if (statusChanged) {
    if (data.drawdown > 0) {
      checkDrawdownAlerts(userId, instanceId, prev.eaName, data.drawdown).catch((err) => {
        log.error({ err, instanceId }, "Drawdown alert check failed");
      });
    }

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
 *
 * terminalAnchorInstanceId: base instance used for terminal synthetic hash. In manifest
 * mode this is always auth.instanceId so all contexts share one TerminalConnection.
 */
async function processDeploymentDiscovery(
  instanceId: string,
  terminalAnchorInstanceId: string,
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
    // Key is anchored to terminalAnchorInstanceId (base instance) so all manifest contexts
    // from the same terminal share one TerminalConnection.
    const syntheticHash = createHash("sha256")
      .update(`auto:instance:${terminalAnchorInstanceId}`)
      .digest("hex");

    // Check if this synthetic terminal already exists before enforcing limits
    const existingSynthetic = await prisma.terminalConnection.findUnique({
      where: { apiKeyHash: syntheticHash },
      select: { id: true },
    });

    // Only enforce account limit for genuinely new terminals
    if (!existingSynthetic) {
      const accountCheck = await canMonitorAdditionalTradingAccount(userId);
      if (!accountCheck.allowed) {
        log.warn(
          { userId, tier: accountCheck.tier, current: accountCheck.current, max: accountCheck.max },
          "Auto-creation blocked: monitored account limit reached"
        );
        return; // Silently skip — don't break heartbeat processing
      }
    }

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

// ── Account-Wide Deployment Discovery ────────────────────────────────

/**
 * Compute deployment key for discovered (account-wide) deployments.
 * Uses "*" for timeframe since it's unknown from trade data.
 * SHA-256(SYMBOL:*:MAGICNUMBER:EAHINT_OR_*) — deterministic.
 */
function computeDiscoveredDeploymentKey(d: {
  symbol: string;
  magicNumber: number;
  eaHint: string;
}): string {
  const eaKey = d.eaHint || "*";
  const raw = `${d.symbol.toUpperCase()}:*:${d.magicNumber}:${eaKey}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Process discovered deployments from account-wide monitoring.
 * Each candidate is a symbol+magicNumber group from trade history.
 * Creates TerminalDeployment entries with source="DISCOVERED".
 *
 * terminalAnchorInstanceId: base instance used for terminal synthetic hash (same as
 * processDeploymentDiscovery — always auth.instanceId so contexts share one terminal).
 */
async function processDiscoveredDeployments(
  instanceId: string,
  terminalAnchorInstanceId: string,
  userId: string,
  deployments: { symbol: string; magicNumber: number; eaHint?: string; tradeCount?: number }[],
  existingTerminalId: string | null,
  broker: string | null,
  accountNumber: string | null,
  unattributedTradeCount: number
): Promise<void> {
  const now = new Date();

  // Step 1: Resolve or auto-create TerminalConnection (same logic as precise discovery)
  let terminalId = existingTerminalId;
  if (!terminalId) {
    const syntheticHash = createHash("sha256")
      .update(`auto:instance:${terminalAnchorInstanceId}`)
      .digest("hex");

    // Check if this synthetic terminal already exists before enforcing limits
    const existingSynthetic = await prisma.terminalConnection.findUnique({
      where: { apiKeyHash: syntheticHash },
      select: { id: true },
    });

    if (!existingSynthetic) {
      const accountCheck = await canMonitorAdditionalTradingAccount(userId);
      if (!accountCheck.allowed) {
        log.warn(
          { userId, tier: accountCheck.tier, current: accountCheck.current, max: accountCheck.max },
          "Discovered deployment auto-creation blocked: monitored account limit reached"
        );
        return;
      }
    }

    const label = [broker, accountNumber].filter(Boolean).join(" ") || "Monitor EA";

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
        unattributedTradeCount,
      },
      update: {
        status: "ONLINE",
        lastHeartbeat: now,
        unattributedTradeCount,
        ...(broker != null && { broker }),
        ...(accountNumber != null && { accountNumber }),
      },
      select: { id: true },
    });

    terminalId = terminal.id;

    await prisma.liveEAInstance.update({
      where: { id: instanceId },
      data: { terminalConnectionId: terminalId },
    });

    log.info(
      { instanceId, terminalId, discovered: deployments.length },
      "Auto-created TerminalConnection for account-wide discovery"
    );
  } else {
    await prisma.terminalConnection.update({
      where: { id: terminalId },
      data: { status: "ONLINE", lastHeartbeat: now, unattributedTradeCount },
    });
  }

  // Step 2: Upsert each discovered deployment
  for (const d of deployments) {
    const eaHint = d.eaHint || "";
    const eaName = eaHint || `Magic ${d.magicNumber}`;
    const deploymentKey = computeDiscoveredDeploymentKey({
      symbol: d.symbol,
      magicNumber: d.magicNumber,
      eaHint: "", // Use empty for stable key — eaHint from comments is unreliable
    });

    await prisma.terminalDeployment.upsert({
      where: {
        terminalConnectionId_deploymentKey: {
          terminalConnectionId: terminalId,
          deploymentKey,
        },
      },
      create: {
        terminalConnectionId: terminalId,
        deploymentKey,
        symbol: d.symbol.toUpperCase(),
        timeframe: "*",
        magicNumber: d.magicNumber,
        eaName,
        source: "DISCOVERED",
        lastSeenAt: now,
      },
      update: {
        lastSeenAt: now,
        // Update eaName if we now have a hint and previously only had a magic label
        ...(eaHint && { eaName }),
      },
      select: { id: true },
    });
  }

  log.info(
    {
      instanceId,
      terminalId,
      discovered: deployments.length,
      unattributed: unattributedTradeCount,
    },
    "Processed account-wide deployment discovery"
  );
}
