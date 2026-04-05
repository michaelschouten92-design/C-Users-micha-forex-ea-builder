"use client";

import { useState } from "react";

interface ClosedTrade {
  closeTime: string;
  openTime: string;
  symbol: string;
  type: string;
  lots: number;
  openPrice: number;
  closePrice: number | null;
  profit: number;
}

interface TradesTableProps {
  trades: ClosedTrade[];
}

const PAGE_SIZE = 25;

function formatDuration(ms: number): string {
  if (ms < 60000) return "<1m";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function TradesTable({ trades }: TradesTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(trades.length / PAGE_SIZE);
  const visible = trades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (trades.length === 0) {
    return <div className="text-center py-8 text-sm text-[#64748B]">No closed trades yet.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1E293B]/60">
              {["Closed", "Symbol", "Side", "Lots", "Open", "Close", "P&L", "Duration"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#64748B] font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((t, i) => {
              const duration = new Date(t.closeTime).getTime() - new Date(t.openTime).getTime();
              const isBuy = t.type === "BUY" || t.type === "DEAL_TYPE_BUY";
              return (
                <tr
                  key={`${t.closeTime}-${i}`}
                  className={`border-b border-[#1E293B]/30 ${i % 2 === 0 ? "bg-[#0A0118]/20" : ""} hover:bg-white/[0.02]`}
                >
                  <td className="px-3 py-2 text-[#94A3B8] whitespace-nowrap">
                    {new Date(t.closeTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 text-white font-medium">{t.symbol}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        isBuy ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#EF4444]/10 text-[#EF4444]"
                      }`}
                    >
                      {isBuy ? "Buy" : "Sell"}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[#94A3B8]">{t.lots.toFixed(2)}</td>
                  <td className="px-3 py-2 tabular-nums text-[#94A3B8]">
                    {t.openPrice.toFixed(t.openPrice > 100 ? 2 : 5)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[#94A3B8]">
                    {t.closePrice?.toFixed(t.openPrice > 100 ? 2 : 5) ?? "—"}
                  </td>
                  <td
                    className={`px-3 py-2 tabular-nums font-semibold ${
                      t.profit > 0
                        ? "text-[#10B981]"
                        : t.profit < 0
                          ? "text-[#EF4444]"
                          : "text-[#64748B]"
                    }`}
                  >
                    {t.profit > 0 ? "+" : ""}
                    {t.profit.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-[#64748B] whitespace-nowrap">
                    {formatDuration(duration)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#1E293B]/40">
          <span className="text-[10px] text-[#64748B]">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, trades.length)} of{" "}
            {trades.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-[10px] rounded border border-[#1E293B] text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-[10px] text-[#64748B] tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-[10px] rounded border border-[#1E293B] text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
