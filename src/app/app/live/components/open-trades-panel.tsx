"use client";

import { useState, useEffect, useRef } from "react";
import type { OpenTrade, EAInstanceData } from "./types";
import { formatCurrency, formatPnl } from "./utils";

export function OpenTradesPanel({ instances }: { instances: EAInstanceData[] }) {
  const [openTrades, setOpenTrades] = useState<Map<string, OpenTrade[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fetchedRef = useRef(false);
  const prevCountsRef = useRef<Map<string, number>>(new Map());
  const fetchingInstancesRef = useRef<Set<string>>(new Set());

  // Instances with reported open trades
  const activeInstances = instances.filter((ea) => ea.openTrades > 0);
  const totalOpen = activeInstances.reduce((sum, ea) => sum + ea.openTrades, 0);

  useEffect(() => {
    if (!expanded || fetchedRef.current || activeInstances.length === 0) return;
    fetchedRef.current = true;
    let cancelled = false;

    async function fetchOpenTrades(): Promise<void> {
      setLoading(true);
      const results = new Map<string, OpenTrade[]>();
      // Fetch in parallel, capped at 10 concurrent requests
      const batches: EAInstanceData[][] = [];
      for (let i = 0; i < activeInstances.length; i += 10) {
        batches.push(activeInstances.slice(i, i + 10));
      }
      for (const batch of batches) {
        if (cancelled) break;
        const responses = await Promise.allSettled(
          batch.map(async (ea) => {
            const res = await fetch(`/api/live/${ea.id}/open-trades?pageSize=50`);
            if (!res.ok) return { instanceId: ea.id, trades: [] as OpenTrade[] };
            const json = await res.json();
            return { instanceId: ea.id, trades: (json.data ?? []) as OpenTrade[] };
          })
        );
        for (const r of responses) {
          if (r.status === "fulfilled" && r.value.trades.length > 0) {
            results.set(r.value.instanceId, r.value.trades);
          }
        }
      }
      if (!cancelled) {
        setOpenTrades(results);
        setLoading(false);
        // Seed count tracker so the first heartbeat after expand doesn't spuriously re-fetch
        for (const ea of activeInstances) {
          prevCountsRef.current.set(ea.id, ea.openTrades);
        }
      }
    }

    fetchOpenTrades();
    return () => {
      cancelled = true;
    };
  }, [expanded, activeInstances.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset fetch flag when panel is collapsed so re-expanding triggers a fresh fetch
  useEffect(() => {
    if (!expanded) fetchedRef.current = false;
  }, [expanded]);

  // Re-fetch when heartbeat updates the openTrades count for any instance
  useEffect(() => {
    if (!fetchedRef.current) return;

    const instancesToRefetch: string[] = [];
    for (const ea of instances) {
      const prevCount = prevCountsRef.current.get(ea.id) ?? -1;
      if (prevCount !== -1 && prevCount !== ea.openTrades) {
        instancesToRefetch.push(ea.id);
      }
      prevCountsRef.current.set(ea.id, ea.openTrades);
    }

    if (instancesToRefetch.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const instanceId of instancesToRefetch) {
        if (fetchingInstancesRef.current.has(instanceId) || cancelled) continue;
        fetchingInstancesRef.current.add(instanceId);
        try {
          const res = await fetch(`/api/live/${instanceId}/open-trades?pageSize=50`);
          if (!res.ok || cancelled) continue;
          const json = await res.json();
          const trades = (json.data ?? []) as OpenTrade[];
          if (!cancelled) {
            setOpenTrades((prev: Map<string, OpenTrade[]>) => {
              const next = new Map(prev);
              if (trades.length > 0) {
                next.set(instanceId, trades);
              } else {
                next.delete(instanceId);
              }
              return next;
            });
          }
        } finally {
          fetchingInstancesRef.current.delete(instanceId);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instances]);

  if (totalOpen === 0) return null;

  return (
    <div className="rounded-md bg-white/[0.015] border border-[#1E293B]/25 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium">
          Open Positions ({totalOpen})
        </span>
        <span className="text-[10px] text-[#475569]">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {loading ? (
            <p className="text-[11px] text-[#475569] py-2">Loading positions...</p>
          ) : openTrades.size === 0 ? (
            <p className="text-[11px] text-[#475569] py-2">
              No open position details available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {activeInstances.map((ea) => {
                const trades = openTrades.get(ea.id);
                if (!trades || trades.length === 0) return null;
                return (
                  <div key={ea.id}>
                    <p className="text-[10px] text-[#64748B] font-medium mb-1">
                      {ea.eaName} {ea.symbol ? `\u00B7 ${ea.symbol}` : ""}
                    </p>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-[#475569] text-left">
                          <th className="font-medium pb-1 pr-3">Symbol</th>
                          <th className="font-medium pb-1 pr-3">Type</th>
                          <th className="font-medium pb-1 pr-3 text-right">Lots</th>
                          <th className="font-medium pb-1 pr-3 text-right">Entry</th>
                          <th className="font-medium pb-1 text-right">P/L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((t) => (
                          <tr key={t.ticket} className="text-[#94A3B8]">
                            <td className="pr-3 py-0.5 font-mono">{t.symbol}</td>
                            <td
                              className={`pr-3 py-0.5 font-medium ${t.type === "BUY" ? "text-[#10B981]" : "text-[#EF4444]"}`}
                            >
                              {t.type}
                            </td>
                            <td className="pr-3 py-0.5 text-right tabular-nums">
                              {t.lots.toFixed(2)}
                            </td>
                            <td className="pr-3 py-0.5 text-right tabular-nums">
                              {t.openPrice.toFixed(5)}
                            </td>
                            <td
                              className={`py-0.5 text-right tabular-nums font-semibold ${t.profit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                            >
                              {formatPnl(t.profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
