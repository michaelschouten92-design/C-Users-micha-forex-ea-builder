"use client";

import type { LiveInstanceDTO } from "@/lib/live/live-instance-dto";

type EdgeScore = NonNullable<LiveInstanceDTO["edgeScore"]>;

function scoreColor(score: number): string {
  if (score >= 90) return "#10B981";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

export function EdgeScoreBadge({ edgeScore }: { edgeScore: EdgeScore }) {
  if (edgeScore.phase === "COLLECTING") {
    const pct = (edgeScore.tradesCompleted / edgeScore.tradesRequired) * 100;
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1E293B]/60 text-[9px] text-[#64748B] tabular-nums">
        <span className="relative w-6 h-1 rounded-full bg-[#0F172A] overflow-hidden">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-[#475569] transition-all"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span>
          {edgeScore.tradesCompleted}/{edgeScore.tradesRequired} trades
        </span>
      </span>
    );
  }

  if (edgeScore.phase === "EARLY") {
    const color = scoreColor(edgeScore.score!);
    return (
      <span className="inline-flex items-center gap-1 opacity-60">
        <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
          {Math.round(edgeScore.score!)}%
        </span>
        <span className="text-[7px] font-medium uppercase text-[#64748B]">Early</span>
      </span>
    );
  }

  // FULL
  const color = scoreColor(edgeScore.score!);
  return (
    <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
      {Math.round(edgeScore.score!)}%
    </span>
  );
}
