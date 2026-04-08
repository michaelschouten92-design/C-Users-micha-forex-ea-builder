import type { EdgeProjection } from "@/domain/monitoring/edge-projection";

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  return `${value < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface EdgeDecayPanelProps {
  projection: EdgeProjection;
  eaName: string;
  instanceId: string;
}

export function EdgeDecayPanel({ projection, eaName, instanceId }: EdgeDecayPanelProps) {
  // Only render for declining trends with estimated losses
  if (projection.trend !== "declining" || projection.estimatedDailyLoss === null) {
    return null;
  }

  const dailyLoss = projection.estimatedDailyLoss;
  const maxLoss = Math.abs(projection.projectedLoss30d ?? dailyLoss * 30);

  return (
    <div className="bg-[#111114] border border-[rgba(239,68,68,0.15)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[rgba(239,68,68,0.1)] flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-[#EF4444]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Edge Decay Detected</h3>
          <p className="text-[10px] text-[#71717A]">
            Based on {projection.dataPoints} health evaluations
          </p>
        </div>
      </div>

      {/* Daily loss callout */}
      <div className="bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.1)] rounded-lg px-4 py-3 mb-4">
        <p className="text-[10px] uppercase tracking-wider text-[#71717A] mb-1">
          Estimated daily edge loss
        </p>
        <p className="text-xl font-bold text-[#EF4444] tabular-nums">
          {formatCurrency(dailyLoss)}/day
        </p>
      </div>

      {/* Projection bars */}
      <div className="space-y-2.5 mb-4">
        {[
          { label: "7 days", value: projection.projectedLoss7d },
          { label: "14 days", value: projection.projectedLoss14d },
          { label: "30 days", value: projection.projectedLoss30d },
        ].map(({ label, value }) => {
          if (value === null) return null;
          const abs = Math.abs(value);
          const pct = maxLoss > 0 ? (abs / maxLoss) * 100 : 0;
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#A1A1AA]">{label}</span>
                <span className="text-[11px] font-semibold text-[#EF4444] tabular-nums">
                  {formatCurrency(value)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#EF4444]/60 transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Break-even point */}
      {projection.daysUntilBreak !== null && (
        <p className="text-[11px] text-[#A1A1AA] mb-4">
          Edge score projected to break below threshold in{" "}
          <span className="text-white font-medium">~{projection.daysUntilBreak} days</span> if trend
          continues.
        </p>
      )}

      {/* Action */}
      <a
        href={`/api/live/${instanceId}/pause`}
        onClick={(e) => {
          e.preventDefault();
          // Use the existing pause mechanism via fetch
          fetch(`/api/live/${instanceId}/pause`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tradingState: "PAUSED" }),
          }).then(() => window.location.reload());
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[rgba(239,68,68,0.3)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Pause Strategy
      </a>
    </div>
  );
}
