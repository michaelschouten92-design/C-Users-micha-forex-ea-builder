import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { loadTrackRecord, type TrackRecordData } from "./load-track-record";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await loadTrackRecord(token);
  if (!data) return { title: "Track Record Not Found | AlgoStudio" };

  const title = `${data.account.eaName} — Verified Track Record | AlgoStudio`;
  return {
    title,
    description: `Verified live track record for ${data.account.eaName}. ${data.performance.totalTrades} trades, ${data.performance.strategyCount} strategies monitored by AlgoStudio.`,
  };
}

// ── Helpers ──

type HealthLabel = "Healthy" | "Elevated" | "Edge at Risk" | "Pending";

function deriveHealth(s: TrackRecordData["strategies"][0]): HealthLabel {
  if (s.lifecycleState === "EDGE_AT_RISK" || s.lifecycleState === "INVALIDATED")
    return "Edge at Risk";
  const snap = s.healthSnapshot;
  if (snap) {
    if (snap.status === "AT_RISK" || snap.status === "DEGRADED") return "Edge at Risk";
    if (snap.status === "WARNING" || snap.driftDetected) return "Elevated";
    if (snap.status === "HEALTHY") return "Healthy";
  }
  if (s.strategyStatus === "EDGE_DEGRADED") return "Edge at Risk";
  if (s.strategyStatus === "UNSTABLE") return "Elevated";
  return "Pending";
}

const HEALTH_COLORS: Record<HealthLabel, string> = {
  Healthy: "#10B981",
  Elevated: "#F59E0B",
  "Edge at Risk": "#EF4444",
  Pending: "#64748B",
};

function formatCurrency(v: number): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(days: number): string {
  if (days < 1) return "< 1 day";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  const remainDays = days % 30;
  if (months < 12) return remainDays > 0 ? `${months}mo ${remainDays}d` : `${months}mo`;
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  return remainMonths > 0 ? `${years}y ${remainMonths}mo` : `${years}y`;
}

// ── Page ──

export default async function TrackRecordPage({ params }: Props) {
  const { token } = await params;
  const data = await loadTrackRecord(token);

  if (!data) notFound();

  const { account, performance, equityCurve, strategies, monthlyReturns, recentTrades } = data;

  // Equity curve bounds for SVG
  const eqValues = equityCurve.map((p) => p.equity);
  const eqMin = eqValues.length > 0 ? Math.min(...eqValues) : 0;
  const eqMax = eqValues.length > 0 ? Math.max(...eqValues) : 1;
  const eqRange = eqMax - eqMin || 1;

  return (
    <div className="min-h-screen bg-[#0A0118] text-white">
      {/* Verified header */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-2">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/" className="text-[10px] text-[#7C8DB0] hover:text-white transition-colors">
            AlgoStudio
          </Link>
          <span className="text-[10px] text-[#7C8DB0]">/</span>
          <span className="text-[10px] text-[#7C8DB0]">Track Record</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-[#818CF8] mb-1">
          Verified Live Track Record
        </p>
        <h1 className="text-lg font-semibold text-white">{account.eaName}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#7C8DB0]">
          {account.broker && <span>{account.broker}</span>}
          {account.accountNumberMasked && <span>Account {account.accountNumberMasked}</span>}
          <span className={account.status === "ONLINE" ? "text-[#10B981]" : "text-[#EF4444]"}>
            {account.status}
          </span>
          {account.lastHeartbeat && (
            <span>Last heartbeat: {formatTimeAgo(account.lastHeartbeat)}</span>
          )}
        </div>
        <p className="text-[10px] text-[#64748B] mt-1">Monitored by AlgoStudio</p>
      </div>

      {/* Metrics grid */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: "Balance",
              value: account.balance != null ? formatCurrency(account.balance) : "—",
            },
            {
              label: "Equity",
              value: account.equity != null ? formatCurrency(account.equity) : "—",
            },
            {
              label: "Total P&L",
              value: formatCurrency(performance.totalProfit),
              color: performance.totalProfit >= 0 ? "#10B981" : "#EF4444",
            },
            { label: "Trades", value: performance.totalTrades.toLocaleString() },
            { label: "Strategies", value: String(performance.strategyCount) },
            { label: "Win Rate", value: `${performance.winRate.toFixed(1)}%` },
            { label: "Profit Factor", value: performance.profitFactorDisplay },
            {
              label: "Max Drawdown",
              value: `${performance.maxDrawdownPct.toFixed(1)}%`,
              sub:
                performance.maxDrawdownAbs > 0
                  ? `(${formatCurrency(performance.maxDrawdownAbs)})`
                  : undefined,
            },
            {
              label: "Duration",
              value:
                performance.durationDays != null ? formatDuration(performance.durationDays) : "—",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg px-3 py-2.5"
            >
              <p className="text-[9px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">{m.label}</p>
              <p className="text-sm font-semibold" style={{ color: m.color ?? "#CBD5E1" }}>
                {m.value}
              </p>
              {"sub" in m && m.sub && <p className="text-[10px] text-[#64748B]">{m.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Equity curve */}
      {equityCurve.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-3">Equity Curve</p>
            {equityCurve.length === 1 ? (
              <p className="text-[11px] text-[#64748B]">
                Equity: {formatCurrency(equityCurve[0].equity)} — awaiting more data points
              </p>
            ) : (
              <>
                <svg
                  viewBox={`0 0 ${equityCurve.length} 100`}
                  className="w-full h-32"
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke="#818CF8"
                    strokeWidth="0.5"
                    points={equityCurve
                      .map((p, i) => `${i},${100 - ((p.equity - eqMin) / eqRange) * 90 - 5}`)
                      .join(" ")}
                  />
                </svg>
                <div className="flex justify-between text-[9px] text-[#64748B] mt-1">
                  <span>{new Date(equityCurve[0].createdAt).toLocaleDateString()}</span>
                  <span>
                    {new Date(equityCurve[equityCurve.length - 1].createdAt).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Monthly returns */}
      {monthlyReturns.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-3">
              Monthly Performance
            </p>
            <div className="grid grid-cols-[1fr_80px] gap-2 px-2 py-1 text-[9px] uppercase tracking-wider text-[#64748B]">
              <span>Month</span>
              <span className="text-right">Return</span>
            </div>
            {monthlyReturns.map((m) => (
              <div
                key={m.month}
                className="grid grid-cols-[1fr_80px] gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(79,70,229,0.05)] transition-colors"
              >
                <p className="text-xs text-[#CBD5E1]">{m.month}</p>
                <p
                  className={`text-xs text-right font-medium ${m.returnPct >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                >
                  {m.returnPct >= 0 ? "+" : ""}
                  {m.returnPct.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy breakdown */}
      {strategies.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-3">
              Strategies ({performance.strategyCount})
            </p>
            <div className="grid grid-cols-[1fr_80px_80px_80px_90px] gap-2 px-2 py-1 text-[9px] uppercase tracking-wider text-[#64748B]">
              <span>Strategy</span>
              <span className="text-right">P&L</span>
              <span className="text-right">Trades</span>
              <span className="text-right">Health</span>
              <span className="text-right">Status</span>
            </div>
            {strategies.map((s, i) => {
              const health = deriveHealth(s);
              return (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_80px_80px_90px] gap-2 px-2 py-2 rounded-md hover:bg-[rgba(79,70,229,0.05)] transition-colors"
                >
                  <p className="text-xs text-[#CBD5E1] truncate">
                    {s.symbol ?? "—"}
                    {s.magicNumber != null && (
                      <span className="text-[#64748B]"> · Magic {s.magicNumber}</span>
                    )}
                  </p>
                  <p
                    className={`text-xs text-right ${s.totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                  >
                    {formatCurrency(s.totalProfit)}
                  </p>
                  <p className="text-xs text-[#CBD5E1] text-right">{s.totalTrades}</p>
                  <div className="flex items-center justify-end">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-medium"
                      style={{ color: HEALTH_COLORS[health] }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: HEALTH_COLORS[health] }}
                      />
                      {health}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#7C8DB0] text-right">{s.lifecycleState ?? "—"}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent trades */}
      {recentTrades.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-3">
              Recent Trades
            </p>
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-2 py-1 text-[9px] uppercase tracking-wider text-[#64748B]">
              <span>Date</span>
              <span>Symbol</span>
              <span className="text-right">P&L</span>
            </div>
            {recentTrades.map((t, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_80px_80px] gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(79,70,229,0.05)] transition-colors"
              >
                <p className="text-[11px] text-[#CBD5E1]">
                  {new Date(t.closeTime).toLocaleDateString()}
                </p>
                <p className="text-[11px] text-[#CBD5E1]">{t.symbol}</p>
                <p
                  className={`text-[11px] text-right font-medium ${t.profit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                >
                  {formatCurrency(t.profit)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-6 pb-8 text-center">
        <p className="text-[10px] text-[#64748B]">
          Verified by{" "}
          <Link href="/" className="text-[#818CF8] hover:text-white transition-colors">
            AlgoStudio
          </Link>
        </p>
      </div>
    </div>
  );
}
