"use client";

export function AvgWinLossBar({ avgWin, avgLoss }: { avgWin: number; avgLoss: number }) {
  const absWin = Math.abs(avgWin);
  const absLoss = Math.abs(avgLoss);
  const total = absWin + absLoss;

  // No trades at all
  if (total === 0) {
    return (
      <div className="w-full">
        <p className="text-[10px] text-[#475569]">No closed trades</p>
      </div>
    );
  }

  // All wins, no losses
  if (absLoss === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium tabular-nums text-[#10B981]">
            Avg Win: ${absWin.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#475569]">No losses</span>
        </div>
        <div className="flex h-[6px] rounded-full overflow-hidden">
          <div className="bg-[#10B981] w-full" />
        </div>
      </div>
    );
  }

  // All losses, no wins
  if (absWin === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#475569]">No wins</span>
          <span className="text-[10px] font-medium tabular-nums text-[#EF4444]">
            Avg Loss: ${absLoss.toFixed(2)}
          </span>
        </div>
        <div className="flex h-[6px] rounded-full overflow-hidden">
          <div className="bg-[#EF4444] w-full" />
        </div>
      </div>
    );
  }

  // Normal: both wins and losses
  const winPct = (absWin / total) * 100;
  const lossPct = (absLoss / total) * 100;

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
