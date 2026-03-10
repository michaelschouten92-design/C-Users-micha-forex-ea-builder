/**
 * Baseline Trust State — shared display helper for baseline status across surfaces.
 *
 * Maps the DB-level `baselineStatus` (LINKED, UNLINKED, RELINK_REQUIRED) and
 * presence flags into a user-facing trust state with display metadata.
 *
 * Pure function — no IO, no DB.
 */

export type BaselineTrustState = "VERIFIED" | "MISSING" | "SUSPENDED";

export interface BaselineTrustDisplay {
  state: BaselineTrustState;
  label: string;
  color: string;
  actionLabel: string | null;
}

/**
 * Resolve baseline trust state from deployment-level status.
 * Used by the terminal panel where `baselineStatus` comes from DeploymentDiscovery.
 */
export function resolveBaselineTrust(baselineStatus: string): BaselineTrustDisplay {
  switch (baselineStatus) {
    case "LINKED":
      return { state: "VERIFIED", label: "Verified", color: "#10B981", actionLabel: null };
    case "RELINK_REQUIRED":
      return {
        state: "SUSPENDED",
        label: "Suspended",
        color: "#F59E0B",
        actionLabel: "Restore baseline trust",
      };
    default:
      return { state: "MISSING", label: "Missing", color: "#71717A", actionLabel: "Link baseline" };
  }
}

/**
 * Resolve baseline trust state from instance-level flags.
 * Used by the live dashboard where baseline presence and relink flags
 * come from the EA instance data.
 */
export function resolveInstanceBaselineTrust(opts: {
  hasBaseline: boolean;
  relinkRequired: boolean;
}): BaselineTrustDisplay {
  if (opts.relinkRequired) {
    return {
      state: "SUSPENDED",
      label: "Suspended",
      color: "#F59E0B",
      actionLabel: "Restore baseline trust",
    };
  }
  if (!opts.hasBaseline) {
    return { state: "MISSING", label: "Missing", color: "#71717A", actionLabel: "Link baseline" };
  }
  return { state: "VERIFIED", label: "Verified", color: "#10B981", actionLabel: null };
}
