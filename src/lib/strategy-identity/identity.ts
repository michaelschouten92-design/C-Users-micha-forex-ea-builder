/**
 * Strategy identity management — creating and maintaining strategy identities and versions.
 */

import type { PrismaClient } from "@prisma/client";
import { sha256 } from "@/lib/track-record/canonical";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { appendProofEventInTx } from "@/lib/proof/events";
import { computeSnapshotHash, computeBaselineHash } from "@/lib/proof/identity-hashing";
import type { FingerprintResult } from "./types";

const log = logger.child({ module: "strategy-identity" });

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Generate a permanent strategy ID: "AS-" + first 8 hex chars of SHA-256(projectId + createdAt).
 */
export function generateStrategyId(projectId: string, createdAt: Date): string {
  const hash = sha256(projectId + createdAt.toISOString());
  return "AS-" + hash.substring(0, 8);
}

/**
 * Ensure a StrategyIdentity exists for the given project.
 * Creates one if it doesn't exist yet.
 * Must be called within a transaction.
 */
export async function ensureStrategyIdentity(
  tx: TransactionClient,
  projectId: string,
  initialFingerprint: string
): Promise<{ id: string; strategyId: string; isNew: boolean }> {
  const existing = await tx.strategyIdentity.findUnique({
    where: { projectId },
    select: { id: true, strategyId: true },
  });

  if (existing) {
    return { id: existing.id, strategyId: existing.strategyId, isNew: false };
  }

  const now = new Date();
  const strategyId = generateStrategyId(projectId, now);

  // Proof event first — record identity minting before mutation
  await appendProofEventInTx(tx, strategyId, "STRATEGY_IDENTITY_CREATED", {
    recordId: projectId,
    strategyId,
    projectId,
  });

  const identity = await tx.strategyIdentity.create({
    data: {
      projectId,
      strategyId,
      currentFingerprint: initialFingerprint,
    },
  });

  return { id: identity.id, strategyId: identity.strategyId, isNew: true };
}

/**
 * Record a strategy version for the given identity + fingerprint.
 * If a version with the same fingerprint already exists, returns the existing one.
 * Otherwise creates a new version with incremented versionNo.
 * Must be called within a transaction.
 */
export async function recordStrategyVersion(
  tx: TransactionClient,
  strategyIdentityId: string,
  buildVersionId: string,
  fingerprintResult: FingerprintResult
): Promise<{ id: string; versionNo: number; isNew: boolean }> {
  // Check if this exact fingerprint already exists for this identity
  const existing = await tx.strategyVersion.findUnique({
    where: {
      strategyIdentityId_fingerprint: {
        strategyIdentityId,
        fingerprint: fingerprintResult.fingerprint,
      },
    },
    select: { id: true, versionNo: true },
  });

  if (existing) {
    return { id: existing.id, versionNo: existing.versionNo, isNew: false };
  }

  // Get the next version number
  const latestVersion = await tx.strategyVersion.findFirst({
    where: { strategyIdentityId },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });

  const nextVersionNo = (latestVersion?.versionNo ?? 0) + 1;

  // Resolve strategyId for proof event
  const identity = await tx.strategyIdentity.findUnique({
    where: { id: strategyIdentityId },
    select: { strategyId: true },
  });

  // Proof-before-mutation: record version creation before writing the row.
  await appendProofEventInTx(tx, identity!.strategyId, "STRATEGY_VERSION_CREATED", {
    recordId: buildVersionId,
    strategyIdentityId,
    versionNo: nextVersionNo,
    fingerprint: fingerprintResult.fingerprint,
  });

  const version = await tx.strategyVersion.create({
    data: {
      strategyIdentityId,
      buildVersionId,
      versionNo: nextVersionNo,
      fingerprint: fingerprintResult.fingerprint,
      logicHash: fingerprintResult.logicHash,
      parameterHash: fingerprintResult.parameterHash,
    },
  });

  // Update identity with current fingerprint and version
  await tx.strategyIdentity.update({
    where: { id: strategyIdentityId },
    data: {
      currentFingerprint: fingerprintResult.fingerprint,
      currentVersionId: version.id,
    },
  });

  return { id: version.id, versionNo: version.versionNo, isNew: true };
}

// ── Identity Binding ────────────────────────────────────

export type BindingResult =
  | {
      ok: true;
      bindingId: string;
      snapshotHash: string;
      baselineHash: string | null;
      isNew: boolean;
    }
  | { ok: false; code: string };

/**
 * Bind deterministic hashes to a strategy version for permanent identity.
 *
 * Pattern mirrors setOperatorHold in transition-service.ts:
 * 1. Load version + baseline + identity + existing binding
 * 2. Idempotency: if binding exists, return it
 * 3. Proof-first: write audit event before mutation in serializable tx
 * 4. Never throws across boundary — returns structured error codes
 */
export async function bindIdentityToVersion(strategyVersionId: string): Promise<BindingResult> {
  // 1) Load version with relations
  const version = await prisma.strategyVersion.findUnique({
    where: { id: strategyVersionId },
    include: {
      backtestBaseline: true,
      binding: true,
      strategyIdentity: { select: { strategyId: true } },
    },
  });

  if (!version) {
    return { ok: false, code: "VERSION_NOT_FOUND" };
  }

  // 2) Idempotency — binding already exists
  if (version.binding) {
    return {
      ok: true,
      bindingId: version.binding.id,
      snapshotHash: version.binding.snapshotHash,
      baselineHash: version.binding.baselineHash,
      isNew: false,
    };
  }

  // 3) Compute hashes
  const snapshotHash = computeSnapshotHash({
    fingerprint: version.fingerprint,
    logicHash: version.logicHash,
    parameterHash: version.parameterHash,
    versionNo: version.versionNo,
  });

  const baselineHash = version.backtestBaseline
    ? computeBaselineHash({
        totalTrades: version.backtestBaseline.totalTrades,
        winRate: version.backtestBaseline.winRate,
        profitFactor: version.backtestBaseline.profitFactor,
        maxDrawdownPct: version.backtestBaseline.maxDrawdownPct,
        avgTradesPerDay: version.backtestBaseline.avgTradesPerDay,
        netReturnPct: version.backtestBaseline.netReturnPct,
        sharpeRatio: version.backtestBaseline.sharpeRatio,
        initialDeposit: version.backtestBaseline.initialDeposit,
        backtestDurationDays: version.backtestBaseline.backtestDurationDays,
      })
    : null;

  // 4) Proof-first mutation in serializable transaction
  const strategyId = version.strategyIdentity.strategyId;
  const recordId = strategyVersionId; // chain scope = version

  try {
    const binding = await prisma.$transaction(
      async (tx) => {
        // Double-check idempotency inside tx
        const existing = await tx.strategyIdentityBinding.findUnique({
          where: { strategyVersionId },
        });
        if (existing) return existing;

        // Proof event first
        await appendProofEventInTx(tx, strategyId, "STRATEGY_IDENTITY_BOUND", {
          recordId,
          strategyVersionId,
          snapshotHash,
          baselineHash,
          versionNo: version.versionNo,
        });

        // Then mutation
        return tx.strategyIdentityBinding.create({
          data: {
            strategyVersionId,
            snapshotHash,
            baselineHash,
          },
        });
      },
      { isolationLevel: "Serializable" }
    );

    log.info(
      { strategyVersionId, snapshotHash, baselineHash, bindingId: binding.id },
      "Strategy identity bound"
    );

    return {
      ok: true,
      bindingId: binding.id,
      snapshotHash: binding.snapshotHash,
      baselineHash: binding.baselineHash,
      isNew: true,
    };
  } catch (err) {
    log.error({ err, strategyVersionId }, "Failed to bind strategy identity");
    return { ok: false, code: "MUTATION_FAILED" };
  }
}
