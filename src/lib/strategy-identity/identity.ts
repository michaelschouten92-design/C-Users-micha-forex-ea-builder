/**
 * Strategy identity management — creating and maintaining strategy identities and versions.
 */

import type { PrismaClient } from "@prisma/client";
import { sha256 } from "@/lib/track-record/canonical";
import type { FingerprintResult } from "./types";

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
