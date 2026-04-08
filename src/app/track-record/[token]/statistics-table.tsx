"use client";

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

interface StatisticsTableProps {
  trades: ClosedTrade[];
  durationDays: number | null;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function formatCurrency(v: number): string {
  const abs = Math.abs(v);
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    abs
  );
  if (v < 0) return `-${formatted}`;
  return formatted;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function StatisticsTable({ trades, durationDays }: StatisticsTableProps) {
  if (trades.length === 0) {
    return <div className="text-center py-8 text-sm text-[#64748B]">No closed trades yet.</div>;
  }

  const profitTrades = trades.filter((t) => t.profit > 0);
  const lossTrades = trades.filter((t) => t.profit <= 0);
  const grossProfit = profitTrades.reduce((s, t) => s + t.profit, 0);
  const grossLoss = lossTrades.reduce((s, t) => s + t.profit, 0);
  const netProfit = grossProfit + grossLoss;
  const netLoss = grossLoss;
  const bestTrade = Math.max(...trades.map((t) => t.profit));
  const worstTrade = Math.min(...trades.map((t) => t.profit));

  const longs = trades.filter((t) => t.type === "BUY" || t.type === "DEAL_TYPE_BUY");
  const shorts = trades.filter((t) => t.type === "SELL" || t.type === "DEAL_TYPE_SELL");
  const longsWon = longs.filter((t) => t.profit > 0);
  const shortsWon = shorts.filter((t) => t.profit > 0);

  const avgProfit = profitTrades.length > 0 ? grossProfit / profitTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? grossLoss / lossTrades.length : 0;

  const totalLots = trades.reduce((s, t) => s + t.lots, 0);

  const holdingTimes = trades.map(
    (t) => new Date(t.closeTime).getTime() - new Date(t.openTime).getTime()
  );
  const avgHoldingTime =
    holdingTimes.length > 0 ? holdingTimes.reduce((s, v) => s + v, 0) / holdingTimes.length : 0;

  const weeks = (durationDays ?? 1) / 7;
  const tradesPerWeek = weeks > 0 ? trades.length / weeks : trades.length;

  const profitFactor =
    grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : grossProfit > 0 ? Infinity : 0;

  const latestTrade = trades[0]?.closeTime;

  const rows: Array<[string, string, string?]> = [
    ["Trades", `${trades.length}`, undefined],
    [
      "Profit Trades",
      `${profitTrades.length} (${((profitTrades.length / trades.length) * 100).toFixed(2)}%)`,
      undefined,
    ],
    [
      "Loss Trades",
      `${lossTrades.length} (${((lossTrades.length / trades.length) * 100).toFixed(2)}%)`,
      undefined,
    ],
    [
      "Best / Worst Trade",
      `${formatCurrency(bestTrade)} / ${formatCurrency(worstTrade)}`,
      undefined,
    ],
    [
      "Longs Won",
      `(${longsWon.length}/${longs.length}) ${longs.length > 0 ? ((longsWon.length / longs.length) * 100).toFixed(2) : "0.00"}%`,
      undefined,
    ],
    [
      "Shorts Won",
      `(${shortsWon.length}/${shorts.length}) ${shorts.length > 0 ? ((shortsWon.length / shorts.length) * 100).toFixed(2) : "0.00"}%`,
      undefined,
    ],
    ["Average Profit", formatCurrency(avgProfit), undefined],
    ["Average Loss", formatCurrency(Math.abs(avgLoss)), undefined],
  ];

  const rows2: Array<[string, string, string?]> = [
    ["Gross Profit", formatCurrency(grossProfit), "green"],
    ["Gross Loss", formatCurrency(Math.abs(grossLoss)), "red"],
    ["Net Profit", formatCurrency(netProfit), netProfit >= 0 ? "green" : "red"],
    ["Net Loss", formatCurrency(Math.abs(netLoss)), "red"],
    [
      "Long Trades",
      `(${longs.length}/${trades.length}) ${((longs.length / trades.length) * 100).toFixed(2)}%`,
      undefined,
    ],
    [
      "Short Trades",
      `(${shorts.length}/${trades.length}) ${((shorts.length / trades.length) * 100).toFixed(2)}%`,
      undefined,
    ],
  ];

  const rows3: Array<[string, string, string?]> = [
    ["Trades per Week", tradesPerWeek.toFixed(2), undefined],
    ["Avg Holding Time", formatDuration(avgHoldingTime), undefined],
    [
      "Profit Factor",
      profitFactor === Infinity ? "∞" : profitFactor.toFixed(2),
      profitFactor >= 1 ? "green" : "red",
    ],
    ["Lots", totalLots.toFixed(2), undefined],
    ["Latest Trade", latestTrade ? formatDate(latestTrade) : "—", undefined],
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#1E293B]/60 rounded-lg overflow-hidden">
      {[rows, rows2, rows3].map((col, ci) => (
        <div key={ci} className={ci < 2 ? "md:border-r md:border-[#1E293B]/60" : ""}>
          {col.map(([label, value, color], ri) => (
            <div
              key={ri}
              className={`flex items-center justify-between px-4 py-2.5 ${
                ri < col.length - 1 ? "border-b border-[#1E293B]/40" : ""
              } ${ri % 2 === 0 ? "bg-[#0A0118]/30" : ""}`}
            >
              <span className="text-xs text-[#94A3B8]">{label}</span>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  color === "green"
                    ? "text-[#10B981]"
                    : color === "red"
                      ? "text-[#EF4444]"
                      : "text-white"
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
