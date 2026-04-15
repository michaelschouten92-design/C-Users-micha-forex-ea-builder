"use client";

import type { LiveInstanceDTO } from "@/lib/live/live-instance-dto";

type EdgeScore = NonNullable<LiveInstanceDTO["edgeScore"]>;

function scoreColor(score: number): string {
  if (score >= 90) return "#10B981";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

export function EdgeScoreBadge({ edgeScore }: { edgeScore: EdgeScore }) {
  if (edgeScore.phase === "AWAITING_HISTORY") {
    // Heartbeat reports trades but none have been ingested as events yet —
    // typical when the Monitor EA was attached after the EA had already been
    // running. Show the reported count so the user knows activity is real,
    // and signal that historical detail isn't available.
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1E293B]/60 text-[9px] text-[#94A3B8] tabular-nums"
        title="MT5 reports trades, but Monitor EA attached after they closed. Only trades that close while the Monitor is running are tracked in detail."
      >
        <span>{edgeScore.reportedTrades ?? 0} trades · history unavailable</span>
      </span>
    );
  }

  if (edgeScore.phase === "COLLECTING") {
    const pct = (edgeScore.tradesCompleted / edgeScore.tradesRequired) * 100;
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1E293B]/60 text-[9px] text-[#64748B] tabular-nums">
        <span className="relative w-6 h-1 rounded-full bg-[#0F172A] overflow-hidden">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-[#52525B] transition-all"
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
