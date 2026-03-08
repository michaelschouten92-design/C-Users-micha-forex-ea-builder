/**
 * StrategyAggregateSummary — Layer 2 secondary panel on the instance detail page.
 *
 * Shows a read-only aggregate across all deployments sharing the same strategy
 * identity. Clearly labeled as derived — this never replaces or overrides the
 * instance-level monitoring verdict (Layer 1) shown elsewhere on the page.
 */

import type { StrategyAggregateHealth } from "@/lib/semantic-layers";

const SEVERITY_COLOR: Record<string, string> = {
  HEALTHY: "#10B981",
  AT_RISK: "#F59E0B",
  INVALIDATED: "#EF4444",
  NO_INSTANCES: "#71717A",
};

interface StrategyAggregateSummaryProps {
  aggregate: StrategyAggregateHealth;
}

export function StrategyAggregateSummary({ aggregate }: StrategyAggregateSummaryProps) {
  // Don't render for single-instance strategies — the aggregate adds no value
  if (aggregate.instanceCount <= 1) return null;

  const severityColor = SEVERITY_COLOR[aggregate.aggregateSeverity] ?? "#71717A";

  return (
    <details className="rounded-xl bg-[#111114] border border-[rgba(255,255,255,0.06)]">
      <summary className="px-4 py-3 cursor-pointer select-none flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
            Strategy Aggregate
          </span>
          <span className="text-[10px] text-[#52525B] italic">(derived — not instance truth)</span>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
          style={{
            color: severityColor,
            borderColor: `${severityColor}25`,
            backgroundColor: `${severityColor}10`,
          }}
        >
          {aggregate.aggregateSeverity === "NO_INSTANCES"
            ? "No Instances"
            : aggregate.aggregateSeverity}
        </span>
      </summary>

      <div className="px-4 pb-4 pt-1 border-t border-[rgba(255,255,255,0.06)]">
        {/* Summary line */}
        <p className="text-xs text-[#A1A1AA] mb-3">{aggregate.summaryLine}</p>

        {/* Counts grid */}
        <div className="flex items-center gap-6">
          <CountItem label="Deployments" value={aggregate.instanceCount} color="#CBD5E1" />
          <CountItem label="Healthy" value={aggregate.healthyCount} color="#10B981" />
          <CountItem label="At Risk" value={aggregate.atRiskCount} color="#F59E0B" />
          <CountItem label="Invalidated" value={aggregate.invalidatedCount} color="#EF4444" />
          {aggregate.awaitingDataCount > 0 && (
            <CountItem label="Awaiting" value={aggregate.awaitingDataCount} color="#71717A" />
          )}
        </div>
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
