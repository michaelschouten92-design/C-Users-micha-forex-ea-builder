import {
  computeLiveWinrateFromTrades,
  EDGE_DRIFT_TRADES_N,
  type LiveWinrateResult,
} from "../edge-drift-helpers";

interface InstanceForDrift {
  id: string;
  eaName: string | null;
  symbol: string | null;
  trades: { profit: number | null; closeTime: string | null }[];
}

export function EdgeDriftPanel({ instances }: { instances: InstanceForDrift[] }) {
  if (instances.length === 0) return null;

  // Show top 3 instances by trade count
  const withDrift = instances
    .map((inst) => {
      const recentTrades = inst.trades.slice(0, EDGE_DRIFT_TRADES_N);
      const result = computeLiveWinrateFromTrades(recentTrades);
      return { inst, result };
    })
    .sort((a, b) => b.result.sampleSize - a.result.sampleSize)
    .slice(0, 3);

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
      <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8] mb-3">
        Edge Drift (v0)
      </h3>

      <div className="space-y-3">
        {withDrift.map(({ inst, result }) => (
          <InstanceDriftRow
            key={inst.id}
            label={inst.eaName || inst.symbol || inst.id.slice(0, 8)}
            result={result}
          />
        ))}
      </div>

      <p className="mt-4 text-[10px] text-[#64748B] leading-relaxed">
        Informational signal only — does not affect execution authority.
      </p>
    </div>
  );
}

function InstanceDriftRow({ label, result }: { label: string; result: LiveWinrateResult }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm text-[#CBD5E1] truncate block">{label}</span>

      <div className="flex items-center justify-between">
        <span className="text-[#7C8DB0] text-xs">Live winrate (last {result.needed})</span>
        {result.ok ? (
          <span className="font-mono text-xs text-[#CBD5E1]">
            {result.liveWinrate!.toFixed(1)}%
            <span className="text-[#64748B] ml-1">({result.sampleSize} trades)</span>
          </span>
        ) : (
          <span className="text-[10px] text-[#F59E0B]">
            Insufficient trades ({result.sampleSize}/{result.needed})
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[#7C8DB0] text-xs">Baseline</span>
        <span className="text-[11px] font-mono text-[#64748B]">unavailable</span>
      </div>

      {/* Drift status only renderable when both baseline + live are available */}
    </div>
  );
}
