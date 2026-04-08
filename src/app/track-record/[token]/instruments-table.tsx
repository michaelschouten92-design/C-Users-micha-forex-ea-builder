"use client";

interface ClosedTrade {
  symbol: string;
  type: string;
  profit: number;
  lots: number;
}

interface InstrumentsTableProps {
  trades: ClosedTrade[];
}

export function InstrumentsTable({ trades }: InstrumentsTableProps) {
  if (trades.length === 0) {
    return <div className="text-center py-8 text-sm text-[#64748B]">No trade data available.</div>;
  }

  // Group by symbol
  const symbolMap = new Map<
    string,
    {
      trades: number;
      profit: number;
      wins: number;
      losses: number;
      lots: number;
      profitSum: number;
      lossSum: number;
    }
  >();

  for (const t of trades) {
    const s = symbolMap.get(t.symbol) ?? {
      trades: 0,
      profit: 0,
      wins: 0,
      losses: 0,
      lots: 0,
      profitSum: 0,
      lossSum: 0,
    };
    s.trades++;
    s.profit += t.profit;
    s.lots += t.lots;
    if (t.profit > 0) {
      s.wins++;
      s.profitSum += t.profit;
    } else {
      s.losses++;
      s.lossSum += t.profit;
    }
    symbolMap.set(t.symbol, s);
  }

  const instruments = [...symbolMap.entries()]
    .map(([symbol, d]) => ({
      symbol,
      ...d,
      winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0,
      avgProfit: d.wins > 0 ? d.profitSum / d.wins : 0,
      avgLoss: d.losses > 0 ? Math.abs(d.lossSum / d.losses) : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#1E293B]/60">
            {["Symbol", "Trades", "Lots", "Profit", "Win Rate", "Avg Win", "Avg Loss"].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#64748B] font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {instruments.map((inst, i) => (
            <tr
              key={inst.symbol}
              className={`border-b border-[#1E293B]/30 ${i % 2 === 0 ? "bg-[#0A0118]/20" : ""}`}
            >
              <td className="px-4 py-2.5 text-white font-semibold">{inst.symbol}</td>
              <td className="px-4 py-2.5 tabular-nums text-[#94A3B8]">{inst.trades}</td>
              <td className="px-4 py-2.5 tabular-nums text-[#94A3B8]">{inst.lots.toFixed(2)}</td>
              <td
                className={`px-4 py-2.5 tabular-nums font-semibold ${
                  inst.profit > 0
                    ? "text-[#10B981]"
                    : inst.profit < 0
                      ? "text-[#EF4444]"
                      : "text-[#64748B]"
                }`}
              >
                {inst.profit > 0 ? "+" : ""}${inst.profit.toFixed(2)}
              </td>
              <td className="px-4 py-2.5 tabular-nums text-[#94A3B8]">
                {inst.winRate.toFixed(1)}%
              </td>
              <td className="px-4 py-2.5 tabular-nums text-[#10B981]">
                ${inst.avgProfit.toFixed(2)}
              </td>
              <td className="px-4 py-2.5 tabular-nums text-[#EF4444]">
                ${inst.avgLoss.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
