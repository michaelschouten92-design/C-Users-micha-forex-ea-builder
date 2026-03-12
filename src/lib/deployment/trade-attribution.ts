/**
 * Deployment-level trade attribution resolver.
 *
 * Deterministically resolves which TerminalDeployment a trade belongs to
 * based on hard matching keys: instanceId + symbol + magicNumber.
 *
 * Fail-closed: returns null rather than guessing when ambiguous.
 * Write-once: attribution is set at ingestion time and never re-evaluated.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "trade-attribution" });

export type AttributionReason = "magic_match" | "symbol_only_match" | "no_match" | "ambiguous";

export interface AttributionResult {
  terminalDeploymentId: string | null;
  reason: AttributionReason;
}

/**
 * Resolve the TerminalDeployment for a trade based on deterministic matching.
 *
 * Priority:
 *   1. If magicNumber present → exact match on instanceId + symbol + magicNumber
 *   2. If magicNumber absent  → fallback match on instanceId + symbol (only if exactly 1)
 *
 * Fail-closed: returns { terminalDeploymentId: null } for 0 matches or >1 matches.
 */
export async function resolveTradeDeploymentAttribution(
  instanceId: string,
  symbol: string,
  magicNumber: number | null | undefined
): Promise<AttributionResult> {
  try {
    if (magicNumber != null) {
      // Primary: exact match on all three hard keys
      const deployment = await prisma.terminalDeployment.findFirst({
        where: { instanceId, symbol: symbol.toUpperCase(), magicNumber },
        select: { id: true },
      });

      if (deployment) {
        return { terminalDeploymentId: deployment.id, reason: "magic_match" };
      }

      log.debug(
        { instanceId, symbol, magicNumber },
        "Trade attribution: no deployment match for magic number"
      );
      return { terminalDeploymentId: null, reason: "no_match" };
    }

    // Fallback: match on instanceId + symbol only (legacy EA without magic number)
    const candidates = await prisma.terminalDeployment.findMany({
      where: { instanceId, symbol: symbol.toUpperCase() },
      select: { id: true },
      take: 2, // Only need to know if 0, 1, or >1
    });

    if (candidates.length === 1) {
      return { terminalDeploymentId: candidates[0].id, reason: "symbol_only_match" };
    }

    if (candidates.length === 0) {
      return { terminalDeploymentId: null, reason: "no_match" };
    }

    // >1 candidate — ambiguous, fail closed
    log.warn(
      { instanceId, symbol, candidateCount: candidates.length },
      "Trade attribution ambiguous: multiple deployments match symbol without magic number"
    );
    return { terminalDeploymentId: null, reason: "ambiguous" };
  } catch (err) {
    log.error({ err, instanceId, symbol, magicNumber }, "Trade attribution resolver failed");
    return { terminalDeploymentId: null, reason: "no_match" };
  }
}
