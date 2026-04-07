/**
 * VersionLineagePanel — secondary panel showing strategy version lifecycle.
 *
 * Displays on the instance detail page, clearly separated from monitoring truth.
 * Shows: this deployment's version, whether it's current/outdated, version history,
 * and deployment distribution across versions.
 *
 * This is informational lineage context — it never replaces or overrides the
 * instance-level monitoring verdict (Layer 1).
 */

import type { StrategyLineage, DeploymentVersionCurrency } from "@/lib/semantic-layers";

// ── Currency badge ───────────────────────────────────────

const CURRENCY_CONFIG: Record<DeploymentVersionCurrency, { color: string; label: string }> = {
  CURRENT: { color: "#10B981", label: "Current Version" },
  OUTDATED: { color: "#F59E0B", label: "Outdated Version" },
  UNLINKED: { color: "#71717A", label: "Not Linked" },
  UNKNOWN: { color: "#71717A", label: "Unknown" },
};

function CurrencyBadge({ currency }: { currency: DeploymentVersionCurrency }) {
  const config = CURRENCY_CONFIG[currency];
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
      style={{
        color: config.color,
        borderColor: `${config.color}25`,
        backgroundColor: `${config.color}10`,
      }}
    >
      {config.label}
    </span>
  );
}

// ── Version status badge ─────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#10B981",
  DEPRECATED: "#F59E0B",
  RETIRED: "#71717A",
};

// ── Main component ───────────────────────────────────────

interface VersionLineagePanelProps {
  versionNo: number | null;
  currency: DeploymentVersionCurrency;
  lineage: StrategyLineage;
}

export function VersionLineagePanel({ versionNo, currency, lineage }: VersionLineagePanelProps) {
  // Don't render if no versions exist
  if (lineage.versions.length === 0) return null;

  return (
    <details className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)]">
      <summary className="px-4 py-3 cursor-pointer select-none flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
            Version Lineage
          </span>
          {versionNo !== null && <span className="text-[10px] text-[#A1A1AA]">v{versionNo}</span>}
        </div>
        <CurrencyBadge currency={currency} />
      </summary>

      <div className="px-4 pb-4 pt-1 border-t border-[rgba(255,255,255,0.06)]">
        {/* External caveat */}
        {lineage.externalLineageCaveat && (
          <p className="text-[10px] text-[#71717A] italic mb-3">
            External strategy — version lineage reflects manually linked baselines, not discovered
            source-code versions.
          </p>
        )}

        {/* Summary counts */}
        <div className="flex items-center gap-6 mb-3">
          <CountItem label="Versions" value={lineage.versions.length} color="#FAFAFA" />
          <CountItem label="Current" value={lineage.currentDeployments} color="#10B981" />
          {lineage.outdatedDeployments > 0 && (
            <CountItem label="Outdated" value={lineage.outdatedDeployments} color="#F59E0B" />
          )}
          {lineage.unlinkedDeployments > 0 && (
            <CountItem label="Unlinked" value={lineage.unlinkedDeployments} color="#71717A" />
          )}
        </div>

        {/* Version list — only show if more than one version */}
        {lineage.versions.length > 1 && (
          <div className="space-y-1.5">
            {lineage.versions.map((entry) => {
              const statusColor = STATUS_COLOR[entry.version.status] ?? "#71717A";
              const deployCount = entry.deployments.length;

              return (
                <div
                  key={entry.version.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                  style={{
                    backgroundColor: entry.isCurrent ? "rgba(16,185,129,0.05)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#FAFAFA] font-medium">
                      v{entry.version.versionNo}
                    </span>
                    {entry.isCurrent && (
                      <span className="text-[9px] text-[#10B981] font-medium uppercase">
                        current
                      </span>
                    )}
                    {entry.version.status !== "ACTIVE" && (
                      <span
                        className="text-[9px] font-medium uppercase"
                        style={{ color: statusColor }}
                      >
                        {entry.version.status.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#71717A]">
                    {deployCount === 0
                      ? "no deployments"
                      : deployCount === 1
                        ? "1 deployment"
                        : `${deployCount} deployments`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
}

function CountItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold" style={{ color: value > 0 ? color : "#52525B" }}>
        {value}
      </p>
      <p className="text-[10px] text-[#52525B]">{label}</p>
    </div>
  );
}
