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

  // Compute drift for all instances, then filter to flagged only (WARNING or HIGH)
  const allDrift = instances.map((inst) => {
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
  });

  const flagged = allDrift
    .filter(({ drift }) => drift !== null && drift.status !== "OK")
    .sort((a, b) => b.liveResult.sampleSize - a.liveResult.sampleSize);

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8]">
          Edge Drift (v0)
        </h3>
        <span className="text-[10px] font-mono text-[#64748B]">
          {flagged.length} of {instances.length} flagged
        </span>
      </div>

      {flagged.length === 0 ? (
        <p className="text-xs text-[#64748B]">No drift signals detected</p>
      ) : (
        <div className="space-y-3">
          {flagged.map(({ inst, liveResult, hasBaseline, drift }) => (
            <InstanceDriftRow
              key={inst.id}
              label={inst.eaName || inst.symbol || inst.id.slice(0, 8)}
              liveResult={liveResult}
              baselineWinrate={hasBaseline ? inst.baselineWinrate! : null}
              drift={drift}
            />
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-[#64748B] leading-relaxed">
        Informational signal only — does not affect execution authority.
      </p>
      <p className="text-[9px] text-[#475569] font-mono mt-1">
        OK &lt;5% | WARNING &lt;10% | HIGH &ge;10%
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
        <span className="text-[#7C8DB0] text-xs">
          Live winrate (n={liveResult.sampleSize}/{EDGE_DRIFT_TRADES_N})
        </span>
        {liveResult.ok ? (
          <span className="font-mono text-xs text-[#CBD5E1]">
            {liveResult.liveWinrate!.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[10px] text-[#F59E0B]">
            Insufficient (need {EDGE_DRIFT_TRADES_N >= 20 ? "20+" : EDGE_DRIFT_TRADES_N})
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[#7C8DB0] text-xs">Baseline</span>
        {baselineWinrate !== null ? (
          <span className="font-mono text-xs text-[#CBD5E1]">{baselineWinrate.toFixed(1)}%</span>
        ) : (
          <span className="text-[10px] text-[#64748B]">
            unavailable (no backtest baseline attached)
          </span>
        )}
      </div>

      {drift && (
        <div className="flex items-center justify-between">
          <span className="text-[#7C8DB0] text-xs">Drift</span>
          <span
            className="font-mono text-xs"
            style={{ color: (DRIFT_BADGE[drift.status] ?? DRIFT_BADGE.WARNING).color }}
          >
            {Math.round(drift.driftPct)}%
          </span>
        </div>
      )}
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
      {status} ({Math.round(driftPct)}%)
    </span>
  );
}
