/**
 * External baseline linking — creates canonical strategy chain for external EAs.
 *
 * When a user manually links a backtest to an external LiveEAInstance, this function
 * creates the same StrategyIdentity → StrategyVersion → BacktestBaseline chain
 * that native/exported strategies use.
 *
 * Differences from native/export flow:
 *  - StrategyIdentity.origin = EXTERNAL (vs PROJECT for native)
 *  - StrategyIdentity.projectId = null (no builder project exists)
 *  - StrategyVersion.buildVersionId = null (no build artifact exists)
 *  - Fingerprints are sentinel values — we do NOT know the EA's true logic or parameters.
 *    The hashes represent a "manually asserted baseline identity", not a discovered fingerprint.
 *
 * After linking, the instance resolves baseline through the same canonical path
 * as every other strategy: LiveEAInstance.strategyVersionId → StrategyVersion → BacktestBaseline.
 * No fallback paths exist. One model, one resolution path.
 */

import type { PrismaClient } from "@prisma/client";
import { sha256 } from "@/lib/track-record/canonical";
import { logger } from "@/lib/logger";
import { appendProofEventInTx } from "@/lib/proof/events";
import { createBaselineFromBacktest, type BacktestRunForBaseline } from "./baseline";

const log = logger.child({ module: "external-baseline" });

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Generate a deterministic strategy ID for an external instance.
 *
 * The ID is scoped to the instance — the same instance always produces the same
 * strategyId. This ensures idempotency if the identity is ever recreated.
 */
function generateExternalStrategyId(instanceId: string): string {
  return "AS-" + sha256("external:" + instanceId).substring(0, 8);
}

/**
 * Generate sentinel fingerprint values for an external strategy.
 *
 * IMPORTANT: These are NOT discovered fingerprints. External strategies have unknown
 * logic and parameters — we cannot inspect the EA binary. These sentinel hashes
 * represent a "manually asserted baseline identity" tied to the selected backtest.
 *
 * - logicHash: constant sentinel — we do not know the EA's logic topology.
 * - parameterHash: derived from backtestRunId — ties this version to a specific backtest.
 * - fingerprint: derived from backtestRunId — deterministic version identifier.
 *
 * The "external:" prefix prevents collision with real build-derived fingerprints.
 */
function computeExternalFingerprint(backtestRunId: string) {
  const fingerprint = sha256("external:backtest:" + backtestRunId);
  const logicHash = sha256("external:logic:unknown");
  const parameterHash = sha256("external:params:" + backtestRunId);
  return { fingerprint, logicHash, parameterHash };
}

export interface LinkExternalBaselineResult {
  strategyId: string;
  strategyIdentityId: string;
  strategyVersionId: string;
  baselineId: string;
}

/**
 * Link an external LiveEAInstance to a backtest through the canonical strategy chain.
 *
 * Record creation order:
 *   1. StrategyIdentity (origin=EXTERNAL, no project)
 *   2. StrategyVersion (no build, sentinel fingerprints)
 *   3. BacktestBaseline (locked metrics from the selected BacktestRun)
 *   4. LiveEAInstance.strategyVersionId update
 *
 * Each step is preceded by a proof event (proof-before-mutation).
 * The function is idempotent for the identity and version (reuses if they exist).
 *
 * Must be called within a Prisma transaction.
 * Caller is responsible for ownership/eligibility validation and relinking guards.
 */
export async function linkExternalBaseline(
  tx: TransactionClient,
  instanceId: string,
  backtestRun: BacktestRunForBaseline
): Promise<LinkExternalBaselineResult> {
  const now = new Date();
  const strategyId = generateExternalStrategyId(instanceId);
  const fp = computeExternalFingerprint(backtestRun.id);

  // ── Step 1: StrategyIdentity (origin=EXTERNAL, no projectId) ──
  // Check if one already exists for this strategyId (idempotent).
  let identity = await tx.strategyIdentity.findUnique({
    where: { strategyId },
    select: { id: true, strategyId: true },
  });

  if (!identity) {
    await appendProofEventInTx(tx, strategyId, "STRATEGY_IDENTITY_CREATED", {
      recordId: instanceId,
      strategyId,
      origin: "EXTERNAL",
      instanceId,
    });

    identity = await tx.strategyIdentity.create({
      data: {
        origin: "EXTERNAL",
        strategyId,
        currentFingerprint: fp.fingerprint,
        createdAt: now,
      },
    });
  }

  // ── Step 2: StrategyVersion (no buildVersionId, sentinel fingerprints) ──
  // Idempotent: if the same backtest was linked before, reuse the version.
  let version = await tx.strategyVersion.findUnique({
    where: {
      strategyIdentityId_fingerprint: {
        strategyIdentityId: identity.id,
        fingerprint: fp.fingerprint,
      },
    },
    select: { id: true, versionNo: true },
  });

  if (!version) {
    const latestVersion = await tx.strategyVersion.findFirst({
      where: { strategyIdentityId: identity.id },
      orderBy: { versionNo: "desc" },
      select: { versionNo: true },
    });
    const nextVersionNo = (latestVersion?.versionNo ?? 0) + 1;

    await appendProofEventInTx(tx, strategyId, "STRATEGY_VERSION_CREATED", {
      recordId: instanceId,
      strategyIdentityId: identity.id,
      versionNo: nextVersionNo,
      fingerprint: fp.fingerprint,
      origin: "EXTERNAL",
    });

    version = await tx.strategyVersion.create({
      data: {
        strategyIdentityId: identity.id,
        // buildVersionId intentionally omitted — external strategies have no build artifact.
        versionNo: nextVersionNo,
        fingerprint: fp.fingerprint,
        logicHash: fp.logicHash,
        parameterHash: fp.parameterHash,
      },
    });
  }

  // Deprecate the previously-current version (if any).
  // For external strategies, this means a new baseline was linked — the old
  // version's sentinel fingerprint is now superseded.
  const previousCurrentId = (
    await tx.strategyIdentity.findUnique({
      where: { id: identity.id },
      select: { currentVersionId: true },
    })
  )?.currentVersionId;

  if (previousCurrentId && previousCurrentId !== version.id) {
    await tx.strategyVersion.update({
      where: { id: previousCurrentId },
      data: { status: "DEPRECATED" },
    });
  }

  // Update identity to point at current version
  await tx.strategyIdentity.update({
    where: { id: identity.id },
    data: {
      currentFingerprint: fp.fingerprint,
      currentVersionId: version.id,
    },
  });

  // ── Step 3: BacktestBaseline (reuses canonical createBaselineFromBacktest) ──
  // The selected BacktestRun is used as INPUT to derive locked baseline metrics.
  // The BacktestRun itself is NOT the durable linkage — the BacktestBaseline is.
  const baseline = await createBaselineFromBacktest(tx, strategyId, version.id, backtestRun);

  // ── Step 4: Set strategyVersionId on the instance ──
  // After this, baseline resolution follows the same path as native strategies:
  // LiveEAInstance.strategyVersionId → StrategyVersion → BacktestBaseline
  await tx.liveEAInstance.update({
    where: { id: instanceId },
    data: { strategyVersionId: version.id },
  });

  log.info(
    {
      instanceId,
      strategyId,
      strategyVersionId: version.id,
      baselineId: baseline.id,
      backtestRunId: backtestRun.id,
      origin: "EXTERNAL",
    },
    "External instance linked to canonical baseline chain"
  );

  return {
    strategyId,
    strategyIdentityId: identity.id,
    strategyVersionId: version.id,
    baselineId: baseline.id,
  };
}
