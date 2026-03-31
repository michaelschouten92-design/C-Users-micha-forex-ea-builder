"use client";

import { useState, useEffect } from "react";
import type { TradeRecord } from "./types";
import { formatCurrency, formatPnl, formatDateTime } from "./utils";

export function TradeLogPanel({ instanceId, eaName }: { instanceId: string; eaName: string }) {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/live/${instanceId}/trades?page=${page}&pageSize=20`);
        if (!cancelled) {
          if (res.ok) {
            const json = await res.json();
            setTrades(json.data);
            setTotalPages(json.pagination.totalPages);
          } else {
            setError("Failed to load trades. Please try again.");
          }
        }
      } catch {
        if (!cancelled) setError("Network error loading trades.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, instanceId]);

  function handleExportCSV() {
    if (trades.length === 0) return;
    const headers = [
      "Type",
      "Symbol",
      "Lots",
      "Open Price",
      "Close Price",
      "P/L",
      "Open Time",
      "Close Time",
    ];
    const rows = trades.map((t) => [
      t.type,
      t.symbol,
      t.lots.toFixed(2),
      t.openPrice.toFixed(5),
      t.closePrice !== null ? t.closePrice.toFixed(5) : "",
      t.profit.toFixed(2),
      t.openTime,
      t.closeTime ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eaName.replace(/[^a-zA-Z0-9]/g, "_")}_trades.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  return (
    <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">
            Trade Log - {eaName}
          </p>
          {trades.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border border-[rgba(79,70,229,0.2)] text-[#22D3EE] hover:bg-[rgba(34,211,238,0.1)] transition-colors"
              title="Export trades as CSV"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export CSV
            </button>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-0.5 text-[10px] rounded border border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-[10px] tabular-nums text-[#7C8DB0]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-0.5 text-[10px] rounded border border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-xs text-[#7C8DB0] py-4">
          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading trades...
        </div>
      ) : error ? (
        <div className="text-xs text-[#EF4444] py-4 text-center">{error}</div>
      ) : trades.length === 0 ? (
        <div className="text-xs text-[#7C8DB0] py-4 text-center">No trades recorded yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[#7C8DB0] border-b border-[rgba(79,70,229,0.1)]">
                <th className="text-left py-1.5 pr-2">Type</th>
                <th className="text-left py-1.5 pr-2">Symbol</th>
                <th className="text-right py-1.5 pr-2">Lots</th>
                <th className="text-right py-1.5 pr-2">Open</th>
                <th className="text-right py-1.5 pr-2">Close</th>
                <th className="text-right py-1.5 pr-2">P/L</th>
                <th className="text-right py-1.5 pr-2">Opened</th>
                <th className="text-right py-1.5">Closed</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-[rgba(79,70,229,0.05)] hover:bg-[rgba(79,70,229,0.03)]"
                >
                  <td className="py-1.5 pr-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        trade.type.toUpperCase().includes("BUY")
                          ? "bg-[#10B981]/15 text-[#10B981]"
                          : "bg-[#EF4444]/15 text-[#EF4444]"
                      }`}
                    >
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-[#CBD5E1]">{trade.symbol}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-[#CBD5E1]">
                    {trade.lots.toFixed(2)}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-[#CBD5E1]">
                    {trade.openPrice.toFixed(5)}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-[#CBD5E1]">
                    {trade.closePrice !== null ? trade.closePrice.toFixed(5) : "---"}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right tabular-nums font-medium ${
                      trade.profit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {formatPnl(trade.profit)}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[#7C8DB0]">
                    {formatDateTime(trade.openTime)}
                  </td>
                  <td className="py-1.5 text-right text-[#7C8DB0]">
                    {trade.closeTime ? formatDateTime(trade.closeTime) : "Open"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
