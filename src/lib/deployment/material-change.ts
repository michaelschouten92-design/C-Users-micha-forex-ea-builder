/**
 * Material fingerprint change detection + trust suspension.
 *
 * Shared between:
 *   - POST /api/telemetry/heartbeat (deployment discovery via EA key)
 *   - POST /api/telemetry/terminal/deployments (direct terminal reporting)
 *
 * A "material change" means the EA's configuration fingerprint differs from
 * the previously stored one — indicating parameters/settings were modified.
 * When a LINKED deployment detects a material change, baseline trust is
 * suspended (RELINK_REQUIRED) and the instance's strategyVersionId is cleared.
 */

import { prisma } from "@/lib/prisma";
import { appendProofEvent } from "@/lib/proof/events";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "material-change" });

// ── Pure detection ──────────────────────────────────────────────────

export interface MaterialChangeInput {
  reportedFingerprint: string | null;
  existingFingerprint: string | null;
  existingBaselineStatus: string | null;
}

export interface MaterialChangeResult {
  isMaterialChange: boolean;
  /** Set only when baseline status should transition. */
  newBaselineStatus?: "RELINK_REQUIRED";
}

/**
 * Pure function — determines if a material change occurred and whether
 * baseline status should transition.
 *
 * Rules:
 *   - Both fingerprints must be non-null to compare.
 *   - Only LINKED deployments transition to RELINK_REQUIRED.
 *   - First fingerprint (existing is null) is stored silently.
 */
export function detectMaterialChange(input: MaterialChangeInput): MaterialChangeResult {
  const { reportedFingerprint, existingFingerprint, existingBaselineStatus } = input;

  const isMaterialChange =
    reportedFingerprint !== null &&
    existingFingerprint !== null &&
    existingFingerprint !== reportedFingerprint;

  if (isMaterialChange && existingBaselineStatus === "LINKED") {
    return { isMaterialChange: true, newBaselineStatus: "RELINK_REQUIRED" };
  }

  return { isMaterialChange };
}

// ── Suspension side effects ─────────────────────────────────────────

export interface SuspensionContext {
  instanceId: string;
  terminalConnectionId: string;
  terminalDeploymentId: string;
  deploymentKey: string;
  previousFingerprint: string | null;
  newFingerprint: string | null;
  previousBaselineStatus: string;
}

/**
 * Suspend baseline trust for an instance after material change detection.
 *
 * 1. Snapshots strategyVersionId + strategyId before nullification.
 * 2. Clears strategyVersionId on the LiveEAInstance.
 * 3. Appends MATERIAL_CHANGE_TRUST_SUSPENDED proof event.
 *
 * Errors are logged but not rethrown — caller decides error handling.
 */
export async function suspendBaselineTrust(ctx: SuspensionContext): Promise<void> {
  const { instanceId, terminalConnectionId, terminalDeploymentId, deploymentKey } = ctx;

  try {
    // Snapshot before nullification
    const snapshot = await prisma.liveEAInstance.findUnique({
      where: { id: instanceId },
      select: {
        strategyVersionId: true,
        strategyVersion: {
          select: {
            strategyIdentity: { select: { strategyId: true } },
          },
        },
      },
    });

    const previousStrategyVersionId = snapshot?.strategyVersionId ?? null;
    const strategyId = snapshot?.strategyVersion?.strategyIdentity?.strategyId ?? null;

    // Clear strategyVersionId at both instance and deployment level (atomic)
    await prisma.$transaction(
      async (tx) => {
        // Idempotency: only clear if still linked (prevents redundant proof events)
        const current = await tx.liveEAInstance.findUnique({
          where: { id: instanceId },
          select: { strategyVersionId: true },
        });
        if (!current?.strategyVersionId) return; // already cleared

        await tx.liveEAInstance.update({
          where: { id: instanceId },
          data: { strategyVersionId: null },
        });
        await tx.terminalDeployment.update({
          where: { id: terminalDeploymentId },
          data: { strategyVersionId: null },
        });
      },
      { isolationLevel: "RepeatableRead" }
    );

    log.warn(
      {
        terminalConnectionId,
        deploymentKey,
        instanceId,
        previousFingerprint: ctx.previousFingerprint,
        newFingerprint: ctx.newFingerprint,
      },
      "Material change detected — baseline trust suspended (strategyVersionId cleared)"
    );

    // Append audit proof event
    if (strategyId) {
      const recordId = crypto.randomUUID();
      await appendProofEvent(strategyId, "MATERIAL_CHANGE_TRUST_SUSPENDED", {
        eventType: "MATERIAL_CHANGE_TRUST_SUSPENDED",
        recordId,
        terminalConnectionId,
        terminalDeploymentId,
        instanceId,
        previousStrategyVersionId,
        previousMaterialFingerprint: ctx.previousFingerprint,
        newMaterialFingerprint: ctx.newFingerprint,
        previousBaselineStatus: ctx.previousBaselineStatus,
        newBaselineStatus: "RELINK_REQUIRED",
        timestamp: new Date().toISOString(),
      }).catch((proofErr) => {
        log.error(
          { err: proofErr, strategyId, instanceId },
          "Failed to append MATERIAL_CHANGE_TRUST_SUSPENDED proof event"
        );
      });
    }
  } catch (err) {
    log.error(
      { err, instanceId, deploymentKey },
      "Failed to clear strategyVersionId on material change"
    );
  }
}
