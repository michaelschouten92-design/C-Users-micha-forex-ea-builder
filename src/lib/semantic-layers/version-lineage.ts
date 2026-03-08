/**
 * Version Lineage — read-only derived models for strategy version lifecycle.
 *
 * Provides deterministic answers to:
 *   - What versions exist for a strategy identity?
 *   - Which version is current/latest?
 *   - Which deployments are on which version?
 *   - Is a deployment current or outdated?
 *   - What is the version history over time?
 *
 * Rules:
 *   - "Current" = the version pointed to by StrategyIdentity.currentVersionId.
 *   - "Outdated" = a deployment whose strategyVersionId differs from currentVersionId.
 *   - Version status (ACTIVE/DEPRECATED/RETIRED) is explicit, stored in DB.
 *   - Instance monitoring truth (Layer 1) is never affected by version lineage.
 *   - External strategies have weaker lineage — sentinel fingerprints, not discovered logic.
 *
 * All functions are pure builders — no DB access, deterministic, composable.
 */

// ── Types ────────────────────────────────────────────────

/**
 * Explicit version lifecycle status, stored on StrategyVersion.status.
 *
 *   ACTIVE:     Usable for deployments.
 *   DEPRECATED: Superseded by a newer version. Existing deployments function
 *               but new deployments should use the current version.
 *   RETIRED:    No longer recommended. Deployments on this version are outdated.
 */
export type VersionLifecycleStatus = "ACTIVE" | "DEPRECATED" | "RETIRED";

/**
 * Whether a deployment is running the current version of its strategy.
 *
 *   CURRENT:    Deployment is on the version pointed to by currentVersionId.
 *   OUTDATED:   Deployment is on an older or non-current version.
 *   UNLINKED:   Deployment has no strategyVersionId (not yet linked).
 *   UNKNOWN:    currentVersionId is null — cannot determine currency.
 */
export type DeploymentVersionCurrency = "CURRENT" | "OUTDATED" | "UNLINKED" | "UNKNOWN";

/** Minimal version shape needed for lineage building. */
export interface VersionForLineage {
  id: string;
  versionNo: number;
  status: string; // ACTIVE | DEPRECATED | RETIRED
  fingerprint: string;
  createdAt: string; // ISO
}

/** Minimal deployment shape needed for lineage queries. */
export interface DeploymentForLineage {
  id: string;
  eaName: string;
  strategyVersionId: string | null;
  status: string; // ONLINE | OFFLINE | ERROR
}

/** A version with its associated deployments. */
export interface VersionWithDeployments {
  version: VersionForLineage;
  isCurrent: boolean;
  deployments: DeploymentForLineage[];
}

/** Complete lineage read-model for a strategy identity. */
export interface StrategyLineage {
  /** Explicitly marks this as a lineage read-model, not monitoring truth. */
  readonly _type: "strategy_lineage";

  strategyId: string;
  origin: "PROJECT" | "EXTERNAL";

  /** The currentVersionId from StrategyIdentity. Null if not yet set. */
  currentVersionId: string | null;

  /** All versions ordered by versionNo descending (newest first). */
  versions: VersionWithDeployments[];

  /** Total active (non-deleted) deployments across all versions. */
  totalDeployments: number;

  /** Deployments on the current version. */
  currentDeployments: number;

  /** Deployments on older/non-current versions. */
  outdatedDeployments: number;

  /** Deployments with no version link. */
  unlinkedDeployments: number;

  /**
   * Whether lineage is weakened due to external/manual origin.
   * When true, version fingerprints are sentinel values — they represent
   * manually asserted baseline identities, not discovered source-code versions.
   */
  externalLineageCaveat: boolean;
}

// ── Builders ─────────────────────────────────────────────

/**
 * Determine whether a deployment is on the current version.
 *
 * Pure function — no DB access.
 */
export function resolveDeploymentCurrency(
  deploymentVersionId: string | null,
  currentVersionId: string | null
): DeploymentVersionCurrency {
  if (deploymentVersionId === null) return "UNLINKED";
  if (currentVersionId === null) return "UNKNOWN";
  return deploymentVersionId === currentVersionId ? "CURRENT" : "OUTDATED";
}

/**
 * Build the complete lineage read-model from raw data.
 *
 * Pure function — no DB access, deterministic.
 *
 * @param strategyId    - The public strategy identifier (e.g. "AS-10F10DCA")
 * @param origin        - PROJECT or EXTERNAL
 * @param currentVersionId - From StrategyIdentity.currentVersionId
 * @param versions      - All versions for this identity, any order
 * @param deployments   - All active deployments linked to any version of this identity
 */
export function buildStrategyLineage(
  strategyId: string,
  origin: "PROJECT" | "EXTERNAL",
  currentVersionId: string | null,
  versions: VersionForLineage[],
  deployments: DeploymentForLineage[]
): StrategyLineage {
  // Sort versions by versionNo descending (newest first)
  const sorted = [...versions].sort((a, b) => b.versionNo - a.versionNo);

  // Group deployments by version
  const deploymentsByVersion = new Map<string, DeploymentForLineage[]>();
  const unlinked: DeploymentForLineage[] = [];

  for (const d of deployments) {
    if (d.strategyVersionId === null) {
      unlinked.push(d);
    } else {
      const list = deploymentsByVersion.get(d.strategyVersionId) ?? [];
      list.push(d);
      deploymentsByVersion.set(d.strategyVersionId, list);
    }
  }

  const versionsWithDeployments: VersionWithDeployments[] = sorted.map((v) => ({
    version: v,
    isCurrent: v.id === currentVersionId,
    deployments: deploymentsByVersion.get(v.id) ?? [],
  }));

  let currentDeployments = 0;
  let outdatedDeployments = 0;

  for (const d of deployments) {
    const currency = resolveDeploymentCurrency(d.strategyVersionId, currentVersionId);
    if (currency === "CURRENT") currentDeployments++;
    else if (currency === "OUTDATED") outdatedDeployments++;
  }

  return {
    _type: "strategy_lineage",
    strategyId,
    origin,
    currentVersionId,
    versions: versionsWithDeployments,
    totalDeployments: deployments.length,
    currentDeployments,
    outdatedDeployments,
    unlinkedDeployments: unlinked.length,
    externalLineageCaveat: origin === "EXTERNAL",
  };
}
