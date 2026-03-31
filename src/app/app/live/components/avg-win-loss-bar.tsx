"use client";

export function AvgWinLossBar({ avgWin, avgLoss }: { avgWin: number; avgLoss: number }) {
  const absWin = Math.abs(avgWin);
  const absLoss = Math.abs(avgLoss);
  const total = absWin + absLoss;

  // Edge cases: both zero or one is zero
  const winPct = total === 0 ? 50 : (absWin / total) * 100;
  const lossPct = total === 0 ? 50 : (absLoss / total) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium tabular-nums text-[#10B981]">
          ${absWin.toFixed(2)}
        </span>
        <span className="text-[10px] font-medium tabular-nums text-[#EF4444]">
          ${absLoss.toFixed(2)}
        </span>
      </div>
      <div className="flex h-[6px] rounded-full overflow-hidden">
        <div className="bg-[#10B981] transition-all" style={{ width: `${winPct}%` }} />
        <div className="bg-[#EF4444] transition-all" style={{ width: `${lossPct}%` }} />
      </div>
    </div>
  );
}
