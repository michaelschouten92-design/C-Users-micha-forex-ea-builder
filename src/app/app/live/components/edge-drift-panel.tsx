import {
  computeLiveWinrateFromTrades,
  EDGE_DRIFT_TRADES_N,
  type LiveWinrateResult,
} from "../edge-drift-helpers";
import { computeEdgeDrift, type EdgeDriftResult } from "@/domain/strategy/edge-drift";

interface InstanceForDrift {
  id: string;
  eaName: string | null;
  symbol: string | null;
  trades: { profit: number | null; closeTime: string | null }[];
  baselineWinrate: number | null;
}

export function EdgeDriftPanel({ instances }: { instances: InstanceForDrift[] }) {
  if (instances.length === 0) return null;

  // Show top 3 instances by trade count
  const withDrift = instances
    .map((inst) => {
      const recentTrades = inst.trades.slice(0, EDGE_DRIFT_TRADES_N);
      const liveResult = computeLiveWinrateFromTrades(recentTrades);

      const hasBaseline =
        inst.baselineWinrate !== null &&
        Number.isFinite(inst.baselineWinrate) &&
        inst.baselineWinrate >= 0 &&
        inst.baselineWinrate <= 100;

      let drift: EdgeDriftResult | null = null;
      if (hasBaseline && liveResult.ok && liveResult.liveWinrate !== undefined) {
        drift = computeEdgeDrift(inst.baselineWinrate!, liveResult.liveWinrate);
      }

      return { inst, liveResult, hasBaseline, drift };
    })
    .sort((a, b) => b.liveResult.sampleSize - a.liveResult.sampleSize)
    .slice(0, 3);

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
      <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8] mb-3">
        Edge Drift (v0)
      </h3>

      <div className="space-y-3">
        {withDrift.map(({ inst, liveResult, hasBaseline, drift }) => (
          <InstanceDriftRow
            key={inst.id}
            label={inst.eaName || inst.symbol || inst.id.slice(0, 8)}
            liveResult={liveResult}
            baselineWinrate={hasBaseline ? inst.baselineWinrate! : null}
            drift={drift}
          />
        ))}
      </div>

      <p className="mt-4 text-[10px] text-[#64748B] leading-relaxed">
        Informational signal only — does not affect execution authority.
      </p>
    </div>
  );
}

const DRIFT_BADGE: Record<string, { color: string; bg: string; border: string }> = {
  OK: {
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
  },
  WARNING: {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
  },
  HIGH: {
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
  },
};

function InstanceDriftRow({
  label,
  liveResult,
  baselineWinrate,
  drift,
}: {
  label: string;
  liveResult: LiveWinrateResult;
  baselineWinrate: number | null;
  drift: EdgeDriftResult | null;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#CBD5E1] truncate">{label}</span>
        {drift && <DriftBadge status={drift.status} driftPct={drift.driftPct} />}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[#7C8DB0] text-xs">Live (last {liveResult.needed})</span>
        {liveResult.ok ? (
          <span className="font-mono text-xs text-[#CBD5E1]">
            {liveResult.liveWinrate!.toFixed(1)}%
            <span className="text-[#64748B] ml-1">({liveResult.sampleSize})</span>
          </span>
        ) : (
          <span className="text-[10px] text-[#F59E0B]">
            Insufficient ({liveResult.sampleSize}/{liveResult.needed})
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[#7C8DB0] text-xs">Baseline</span>
        {baselineWinrate !== null ? (
          <span className="font-mono text-xs text-[#CBD5E1]">{baselineWinrate.toFixed(1)}%</span>
        ) : (
          <span className="text-[11px] font-mono text-[#64748B]">unavailable</span>
        )}
      </div>
    </div>
  );
}

function DriftBadge({ status, driftPct }: { status: string; driftPct: number }) {
  const style = DRIFT_BADGE[status] ?? DRIFT_BADGE.WARNING;
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ color: style.color, backgroundColor: style.bg, border: `1px solid ${style.border}` }}
    >
      {status} ({driftPct.toFixed(1)}%)
    </span>
  );
}
