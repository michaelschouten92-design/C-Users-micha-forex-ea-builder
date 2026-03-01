/**
 * Loads the ACTIVE VerificationConfig from DB and verifies hash integrity.
 *
 * Fallback policy:
 *   - loadActiveConfig():             Strict. Throws on missing or tampered config.
 *   - loadActiveConfigWithFallback(): Falls back to hardcoded snapshot ONLY when
 *                                     ALLOW_CONFIG_FALLBACK=true is set. Default: strict.
 *
 * Fail-closed: integrity errors always throw (never silent fallback for tampered configs).
 */

import { prisma } from "@/lib/prisma";
import { computeThresholdsHash, buildConfigSnapshot } from "./config-snapshot";
import type { VerificationThresholdsSnapshot } from "./config-snapshot";

export type ConfigSource = "db" | "fallback";

export interface LoadedConfig {
  config: VerificationThresholdsSnapshot;
  source: ConfigSource;
}

export class ConfigIntegrityError extends Error {
  constructor(
    message: string,
    public readonly details: { expected: string; actual: string }
  ) {
    super(message);
    this.name = "ConfigIntegrityError";
  }
}

export class NoActiveConfigError extends Error {
  constructor() {
    super("No ACTIVE VerificationConfig found in database");
    this.name = "NoActiveConfigError";
  }
}

/**
 * Load the ACTIVE VerificationConfig from DB, verify its hash integrity,
 * and return the thresholds snapshot.
 *
 * Throws ConfigIntegrityError if stored hash doesn't match recomputed hash.
 * Throws NoActiveConfigError if no ACTIVE config exists.
 */
export async function loadActiveConfig(): Promise<LoadedConfig> {
  const row = await prisma.verificationConfig.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!row) {
    throw new NoActiveConfigError();
  }

  const snapshot = row.snapshot as unknown as VerificationThresholdsSnapshot;
  const recomputed = computeThresholdsHash(snapshot.thresholds);

  if (recomputed !== row.thresholdsHash) {
    throw new ConfigIntegrityError(
      `VerificationConfig ${row.configVersion} hash mismatch — config may be tampered`,
      { expected: row.thresholdsHash, actual: recomputed }
    );
  }

  return { config: snapshot, source: "db" };
}

/**
 * Load config from DB, optionally falling back to hardcoded snapshot.
 *
 * Fallback is gated by ALLOW_CONFIG_FALLBACK env var:
 *   - "true"  → missing ACTIVE config falls back to hardcoded snapshot
 *   - absent  → missing ACTIVE config throws NoActiveConfigError (strict, production default)
 *
 * ConfigIntegrityError (tampered hash) ALWAYS throws — never falls back on tampered configs.
 */
export async function loadActiveConfigWithFallback(): Promise<LoadedConfig> {
  try {
    return await loadActiveConfig();
  } catch (err) {
    if (err instanceof NoActiveConfigError) {
      if (process.env.ALLOW_CONFIG_FALLBACK === "true") {
        return { config: buildConfigSnapshot(), source: "fallback" };
      }
    }
    throw err;
  }
}
