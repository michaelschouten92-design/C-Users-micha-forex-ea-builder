/**
 * Monitoring system constants — versioned thresholds for monitoring rules.
 *
 * Follows the same pattern as verification/constants.ts:
 * all thresholds are deterministic, immutable per config version.
 */

export const MONITORING = {
  /** Config version — increment on any threshold change */
  CONFIG_VERSION: "1.0.0",

  /** Minimum seconds between monitoring runs for the same strategy */
  COOLDOWN_SECONDS: 300, // 5 minutes
} as const;
