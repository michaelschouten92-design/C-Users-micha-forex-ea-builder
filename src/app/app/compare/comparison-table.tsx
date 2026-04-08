"use client";

interface AccountData {
  key: string;
  name: string;
  broker: string | null;
  accountNumber: string | null;
  balance: number;
  equity: number;
  totalProfit: number;
  totalTrades: number;
  openTrades: number;
  strategyCount: number;
  onlineCount: number;
  healthScore: number | null;
  driftDetected: boolean;
  mode: string;
  lastHeartbeat: string | null;
}

function formatCurrency(v: number): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type Direction = "higher" | "lower";

function bestWorstClasses(values: number[], current: number, direction: Direction): string {
  if (values.length < 2) return "";
  const best = direction === "higher" ? Math.max(...values) : Math.min(...values);
  const worst = direction === "higher" ? Math.min(...values) : Math.max(...values);
  if (current === best && best !== worst) return "text-[#10B981] font-semibold";
  if (current === worst && best !== worst) return "text-[#EF4444]";
  return "";
}

interface MetricRow {
  label: string;
  getValue: (a: AccountData) => string;
  getRaw: (a: AccountData) => number;
  direction: Direction;
  show?: (accounts: AccountData[]) => boolean;
}

const METRICS: MetricRow[] = [
  {
    label: "Balance",
    getValue: (a) => formatCurrency(a.balance),
    getRaw: (a) => a.balance,
    direction: "higher",
  },
  {
    label: "Equity",
    getValue: (a) => formatCurrency(a.equity),
    getRaw: (a) => a.equity,
    direction: "higher",
  },
  {
    label: "Total P&L",
    getValue: (a) => formatCurrency(a.totalProfit),
    getRaw: (a) => a.totalProfit,
    direction: "higher",
  },
  {
    label: "Return %",
    getValue: (a) => {
      const initial = a.balance - a.totalProfit;
      return initial > 0 ? formatPct((a.totalProfit / initial) * 100) : "—";
    },
    getRaw: (a) => {
      const initial = a.balance - a.totalProfit;
      return initial > 0 ? (a.totalProfit / initial) * 100 : 0;
    },
    direction: "higher",
  },
  {
    label: "Health Score",
    getValue: (a) => (a.healthScore !== null ? `${Math.round(a.healthScore * 100)}%` : "—"),
    getRaw: (a) => a.healthScore ?? 0,
    direction: "higher",
    show: (accounts) => accounts.some((a) => a.healthScore !== null),
  },
  {
    label: "Total Trades",
    getValue: (a) => a.totalTrades.toLocaleString(),
    getRaw: (a) => a.totalTrades,
    direction: "higher",
  },
  {
    label: "Open Positions",
    getValue: (a) => String(a.openTrades),
    getRaw: (a) => a.openTrades,
    direction: "higher",
  },
  {
    label: "Strategies",
    getValue: (a) => String(a.strategyCount),
    getRaw: (a) => a.strategyCount,
    direction: "higher",
  },
];

export function ComparisonTable({ accounts }: { accounts: AccountData[] }) {
  const visibleMetrics = METRICS.filter((m) => !m.show || m.show(accounts));

  return (
    <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.06)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.06)]">
            <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-[#64748B] font-medium w-36">
              Metric
            </th>
            {accounts.map((a) => (
              <th key={a.key} className="text-left px-4 py-3 min-w-[160px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      a.onlineCount > 0 ? "bg-[#10B981]" : "bg-[#64748B]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                    <p className="text-[10px] text-[#64748B] truncate">
                      {a.broker}
                      {a.accountNumber && ` · #${a.accountNumber.slice(-5)}`}
                    </p>
                  </div>
                </div>
                {a.driftDetected && (
                  <span className="inline-block mt-1 text-[9px] text-[#F59E0B] font-medium">
                    Drift detected
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleMetrics.map((metric, idx) => {
            const rawValues = accounts.map((a) => metric.getRaw(a));
            return (
              <tr
                key={metric.label}
                className={`border-b border-[rgba(255,255,255,0.03)] ${
                  idx % 2 === 0 ? "bg-transparent" : "bg-[rgba(255,255,255,0.01)]"
                }`}
              >
                <td className="px-4 py-2.5 text-[11px] text-[#A1A1AA] font-medium">
                  {metric.label}
                </td>
                {accounts.map((a, i) => (
                  <td
                    key={a.key}
                    className={`px-4 py-2.5 text-xs tabular-nums text-[#FAFAFA] ${bestWorstClasses(rawValues, rawValues[i], metric.direction)}`}
                  >
                    {metric.getValue(a)}
                  </td>
                ))}
              </tr>
            );
          })}
          {/* Connection status row */}
          <tr className="border-b border-[rgba(255,255,255,0.03)]">
            <td className="px-4 py-2.5 text-[11px] text-[#A1A1AA] font-medium">Last Heartbeat</td>
            {accounts.map((a) => (
              <td key={a.key} className="px-4 py-2.5 text-xs text-[#64748B]">
                {formatRelativeTime(a.lastHeartbeat)}
              </td>
            ))}
          </tr>
          {/* Mode row */}
          <tr>
            <td className="px-4 py-2.5 text-[11px] text-[#A1A1AA] font-medium">Mode</td>
            {accounts.map((a) => (
              <td key={a.key} className="px-4 py-2.5">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    a.mode === "LIVE"
                      ? "bg-[#10B981]/10 text-[#10B981]"
                      : "bg-[#F59E0B]/10 text-[#F59E0B]"
                  }`}
                >
                  {a.mode}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
