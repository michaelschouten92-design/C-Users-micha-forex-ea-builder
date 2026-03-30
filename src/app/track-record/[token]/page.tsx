import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { loadTrackRecord, type TrackRecordData } from "./load-track-record";
import { EquityChart } from "./equity-chart";
import { ShareActions } from "./share-actions";
import { CollapsibleSection } from "./collapsible-section";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await loadTrackRecord(token);
  if (!data) return { title: "Track Record Not Found | AlgoStudio" };

  const displayName =
    data.account.broker && data.account.accountNumberMasked
      ? `${data.account.broker} Account ${data.account.accountNumberMasked}`
      : data.account.eaName;
  const title = `${displayName} — Verified Trading Record | AlgoStudio`;
  const description = `Verified trading record for ${displayName}. ${data.performance.totalTrades} trades, ${data.performance.strategyCount} strategies monitored by AlgoStudio.`;
  return {
    title,
    description,
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
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

function formatDirection(type: string): string {
  const t = type.toUpperCase();
  if (t === "BUY" || t === "0") return "Buy";
  if (t === "SELL" || t === "1") return "Sell";
  return type;
}

function formatTradeDuration(openIso: string, closeIso: string): string {
  const diffMs = new Date(closeIso).getTime() - new Date(openIso).getTime();
  if (diffMs < 0) return "—";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

const LEDGER_LABELS: Record<string, string> = {
  TRADE_OPEN: "Trade Opened",
  TRADE_CLOSE: "Trade Closed",
  TRADE_MODIFY: "Trade Modified",
  PARTIAL_CLOSE: "Partial Close",
  SNAPSHOT: "Equity Snapshot",
  SESSION_START: "Session Started",
  SESSION_END: "Session Ended",
  CHAIN_RECOVERY: "Chain Recovery",
  CASHFLOW: "Deposit / Withdrawal",
  BROKER_EVIDENCE: "Broker Evidence",
  BROKER_HISTORY_DIGEST: "History Digest",
};

function ledgerDetail(eventType: string, payload: Record<string, unknown>): string {
  switch (eventType) {
    case "TRADE_OPEN":
      return [payload.direction, payload.symbol, payload.lots && `${payload.lots} lots`]
        .filter(Boolean)
        .join(" · ");
    case "TRADE_CLOSE":
      return [
        payload.symbol,
        payload.profit != null ? formatCurrency(payload.profit as number) : null,
        payload.closeReason,
      ]
        .filter(Boolean)
        .join(" · ");
    case "SNAPSHOT":
      return [
        payload.balance != null ? `Bal ${formatCurrency(payload.balance as number)}` : null,
        payload.equity != null ? `Eq ${formatCurrency(payload.equity as number)}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "SESSION_START":
      return [payload.broker, payload.mode].filter(Boolean).join(" · ");
    case "SESSION_END":
      return "Monitoring session ended";
    case "CASHFLOW":
      return payload.amount != null ? formatCurrency(payload.amount as number) : "—";
    default:
      return "";
  }
}

// ── Page ──

export default async function TrackRecordPage({ params }: Props) {
  const { token } = await params;
  const data = await loadTrackRecord(token);

  if (!data) notFound();

  const {
    account,
    performance,
    coverage,
    equityCurve,
    strategies,
    monthlyReturns,
    closedTrades,
    ledgerEvents,
  } = data;

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
          Verified Trading Record
        </p>
        <h1 className="text-lg font-semibold text-white">
          {account.broker && account.accountNumberMasked
            ? `${account.broker} Account ${account.accountNumberMasked}`
            : account.eaName}
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#7C8DB0]">
          <span className={account.status === "ONLINE" ? "text-[#10B981]" : "text-[#EF4444]"}>
            {account.status}
          </span>
          {coverage.firstHeartbeatAt && (
            <span>
              Monitoring active since:{" "}
              <span className="text-[#CBD5E1]">
                {new Date(coverage.firstHeartbeatAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </span>
          )}
          {account.lastHeartbeat && (
            <span>Last update: {new Date(account.lastHeartbeat).toLocaleString()}</span>
          )}
        </div>
        <div className="mt-3">
          <ShareActions />
        </div>
      </div>

      {/* Verification explainer */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-[#818CF8] mb-1">
            Independently Monitored Track Record
          </p>
          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            This trading record is independently monitored and verified by AlgoStudio. All
            performance data is derived from immutable, proof-chained trade events captured directly
            from a live trading account. Results are aggregated across all linked strategy
            instances.
          </p>
          {(coverage.firstHeartbeatAt || coverage.lastHeartbeatAt) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-[#7C8DB0]">
              {coverage.firstHeartbeatAt && (
                <span>
                  Monitoring since{" "}
                  <span className="text-[#CBD5E1]">
                    {new Date(coverage.firstHeartbeatAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
              )}
              {coverage.lastHeartbeatAt && (
                <span>
                  Last verified{" "}
                  <span className="text-[#CBD5E1]">{formatTimeAgo(coverage.lastHeartbeatAt)}</span>
                </span>
              )}
              {performance.strategyCount > 0 && (
                <span>
                  <span className="text-[#CBD5E1]">{performance.strategyCount}</span>{" "}
                  {performance.strategyCount === 1 ? "strategy" : "strategies"} linked
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Initializing notice */}
      {performance.totalTrades === 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-2">
          <div className="bg-[#1A0626] border border-[rgba(245,158,11,0.2)] rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-[#F59E0B] mb-1">Collecting data</p>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              Live monitoring is active. Trade statistics will populate automatically as positions
              are opened and closed on this account.
            </p>
          </div>
        </div>
      )}

      {/* Hero metrics — the numbers that matter most */}
      {performance.totalTrades > 0 && (
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-4 text-center">
              <p className="text-[9px] uppercase tracking-wider text-[#7C8DB0] mb-1">Total P&L</p>
              <p
                className="text-2xl sm:text-3xl font-bold tabular-nums"
                style={{ color: performance.totalProfit >= 0 ? "#10B981" : "#EF4444" }}
              >
                {formatCurrency(performance.totalProfit)}
              </p>
            </div>
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-4 text-center">
              <p className="text-[9px] uppercase tracking-wider text-[#7C8DB0] mb-1">Win Rate</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums text-[#CBD5E1]">
                {performance.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-4 text-center">
              <p className="text-[9px] uppercase tracking-wider text-[#7C8DB0] mb-1">
                Max Drawdown
              </p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums text-[#CBD5E1]">
                {performance.maxDrawdownPct.toFixed(1)}%
              </p>
              {performance.maxDrawdownAbs > 0 && (
                <p className="text-[10px] text-[#64748B] mt-0.5">
                  ({formatCurrency(performance.maxDrawdownAbs)})
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Secondary metrics */}
      <div className="max-w-4xl mx-auto px-6 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            {
              label: "Balance",
              value: account.balance != null ? formatCurrency(account.balance) : "—",
            },
            {
              label: "Equity",
              value: account.equity != null ? formatCurrency(account.equity) : "—",
            },
            { label: "Trades", value: performance.totalTrades.toLocaleString() },
            {
              label: "Profit Factor",
              value: performance.totalTrades > 0 ? performance.profitFactorDisplay : "—",
            },
            {
              label: "Duration",
              value:
                performance.durationDays != null ? formatDuration(performance.durationDays) : "—",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg px-3 py-2"
            >
              <p className="text-[9px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">{m.label}</p>
              <p className="text-sm font-semibold text-[#CBD5E1]">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA for visitors */}
      <div className="max-w-4xl mx-auto px-6 pb-4">
        <Link
          href="/pricing"
          className="block text-center py-2 text-[11px] text-[#818CF8] hover:text-white transition-colors"
        >
          Monitor your own trading account with AlgoStudio &rarr;
        </Link>
      </div>

      {/* Equity curve */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Equity Curve</p>
          <p className="text-[10px] text-[#64748B] mb-3">
            Live account equity captured from broker heartbeats.
          </p>
          {equityCurve.length === 0 ? (
            <p className="text-[11px] text-[#64748B]">
              Awaiting first equity snapshot from the live account.
            </p>
          ) : equityCurve.length <= 1 ? (
            <p className="text-[11px] text-[#64748B]">
              Current equity: {equityCurve[0] ? formatCurrency(equityCurve[0].equity) : "—"} — chart
              requires at least two data points.
            </p>
          ) : (
            <EquityChart data={equityCurve} />
          )}
        </div>
      </div>

      {/* Monthly returns */}
      {monthlyReturns.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-3">
              Monthly Performance
            </p>
            <div className="grid grid-cols-[80px_1fr_60px] gap-2 px-2 py-1 text-[9px] uppercase tracking-wider text-[#64748B]">
              <span>Month</span>
              <span />
              <span className="text-right">Return</span>
            </div>
            {(() => {
              const maxAbs = Math.max(...monthlyReturns.map((m) => Math.abs(m.returnPct)), 1);
              return monthlyReturns.map((m) => {
                const barWidth = Math.min(100, (Math.abs(m.returnPct) / maxAbs) * 100);
                const barColor = m.returnPct >= 0 ? "#10B981" : "#EF4444";
                return (
                  <div
                    key={m.month}
                    className="grid grid-cols-[80px_1fr_60px] gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(79,70,229,0.05)] transition-colors items-center"
                  >
                    <p className="text-xs text-[#CBD5E1]">{m.month}</p>
                    <div className="h-3 rounded-full overflow-hidden bg-[rgba(255,255,255,0.03)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidth}%`, backgroundColor: barColor, opacity: 0.6 }}
                      />
                    </div>
                    <p
                      className={`text-xs text-right font-medium tabular-nums ${m.returnPct >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                    >
                      {m.returnPct >= 0 ? "+" : ""}
                      {m.returnPct.toFixed(2)}%
                    </p>
                  </div>
                );
              });
            })()}
            {/* Total return */}
            {monthlyReturns.length > 1 && (
              <div className="grid grid-cols-[80px_1fr_60px] gap-2 px-2 pt-2 mt-1 border-t border-[rgba(79,70,229,0.1)]">
                <p className="text-xs text-[#7C8DB0] font-medium">Total</p>
                <span />
                <p
                  className={`text-xs text-right font-semibold tabular-nums ${
                    monthlyReturns.reduce((sum, m) => sum + m.returnPct, 0) >= 0
                      ? "text-[#10B981]"
                      : "text-[#EF4444]"
                  }`}
                >
                  {monthlyReturns.reduce((sum, m) => sum + m.returnPct, 0) >= 0 ? "+" : ""}
                  {monthlyReturns.reduce((sum, m) => sum + m.returnPct, 0).toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Strategy breakdown */}
      {strategies.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <p className="text-[10px] text-[#64748B] mb-3">
              Monitored strategy instances linked to this public track record.
            </p>
            <CollapsibleSection label="strategies" count={strategies.length}>
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
                        <span className="text-[#64748B]"> · Strategy ID {s.magicNumber}</span>
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
                        {health === "Pending" ? "Initializing" : health}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#7C8DB0] text-right">
                      {s.lifecycleState === "DRAFT"
                        ? "Monitoring setup"
                        : (s.lifecycleState ?? "—")}
                    </p>
                  </div>
                );
              })}
            </CollapsibleSection>
          </div>
        </div>
      )}

      {/* Closed trades */}
      {closedTrades.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
              Closed Trades
            </p>
            <p className="text-[10px] text-[#64748B] mb-3">
              {closedTrades.length >= 200
                ? `Showing most recent 200 of ${performance.totalTrades} trades`
                : `${closedTrades.length} ${closedTrades.length === 1 ? "trade" : "trades"}`}
            </p>
            <CollapsibleSection label="trades" count={closedTrades.length}>
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[100px_70px_50px_50px_70px_70px_70px_60px] gap-2 px-2 py-1 text-[9px] uppercase tracking-wider text-[#64748B]">
                    <span>Closed</span>
                    <span>Symbol</span>
                    <span>Side</span>
                    <span className="text-right">Lots</span>
                    <span className="text-right">Open</span>
                    <span className="text-right">Close</span>
                    <span className="text-right">P&L</span>
                    <span className="text-right">Duration</span>
                  </div>
                  {closedTrades.map((t, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[100px_70px_50px_50px_70px_70px_70px_60px] gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(79,70,229,0.05)] transition-colors"
                    >
                      <p className="text-[10px] text-[#CBD5E1]">
                        {new Date(t.closeTime).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-[#CBD5E1] font-medium truncate">{t.symbol}</p>
                      <p
                        className={`text-[10px] ${formatDirection(t.type) === "Buy" ? "text-[#10B981]" : "text-[#EF4444]"}`}
                      >
                        {formatDirection(t.type)}
                      </p>
                      <p className="text-[10px] text-[#CBD5E1] text-right">{t.lots.toFixed(2)}</p>
                      <p className="text-[10px] text-[#CBD5E1] text-right">
                        {t.openPrice.toFixed(t.openPrice >= 100 ? 2 : 5)}
                      </p>
                      <p className="text-[10px] text-[#CBD5E1] text-right">
                        {t.closePrice != null
                          ? t.closePrice.toFixed(t.closePrice >= 100 ? 2 : 5)
                          : "—"}
                      </p>
                      <p
                        className={`text-[10px] text-right font-medium ${t.profit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                      >
                        {formatCurrency(t.profit)}
                      </p>
                      <p className="text-[10px] text-[#7C8DB0] text-right">
                        {formatTradeDuration(t.openTime, t.closeTime)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )}

      {/* Verification layer */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-2">
            Verification Layer
          </p>
          <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-2">
            This page is generated from monitored event data. All figures are derived from the
            following independently captured sources:
          </p>
          <ul className="space-y-1 text-[11px] text-[#94A3B8]">
            <li className="flex items-start gap-2">
              <span className="text-[#818CF8] mt-px">&#8226;</span>
              <span>Every trade is recorded the moment it happens — no edits possible</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#818CF8] mt-px">&#8226;</span>
              <span>Account balance verified directly from the broker at regular intervals</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#818CF8] mt-px">&#8226;</span>
              <span>Each strategy is independently monitored for performance and health</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#818CF8] mt-px">&#8226;</span>
              <span>
                All data is append-only — nothing can be deleted or modified after the fact
              </span>
            </li>
          </ul>
          {coverage.lastHeartbeatAt && (
            <p className="text-[10px] text-[#64748B] mt-2">
              Last verification event: {new Date(coverage.lastHeartbeatAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Verification ledger */}
      {ledgerEvents.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
              Verification Ledger
            </p>
            <p className="text-[10px] text-[#64748B] mb-3">
              Recent monitored events recorded by the AlgoStudio monitoring layer.
            </p>
            <CollapsibleSection label="events" count={ledgerEvents.length}>
              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="grid grid-cols-[120px_120px_70px_1fr] gap-2 px-2 py-1 text-[9px] uppercase tracking-wider text-[#64748B]">
                    <span>Timestamp</span>
                    <span>Event</span>
                    <span>Scope</span>
                    <span>Details</span>
                  </div>
                  {ledgerEvents.map((e, i) => {
                    const scope =
                      typeof e.payload.symbol === "string" && e.payload.symbol
                        ? e.payload.symbol
                        : "Account";
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[120px_120px_70px_1fr] gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(79,70,229,0.05)] transition-colors"
                      >
                        <p className="text-[10px] text-[#CBD5E1]">
                          {new Date(e.timestamp).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-[#818CF8] font-medium">
                          {LEDGER_LABELS[e.eventType] ?? e.eventType}
                        </p>
                        <p className="text-[10px] text-[#CBD5E1] truncate">{scope}</p>
                        <p className="text-[10px] text-[#7C8DB0] truncate">
                          {ledgerDetail(e.eventType, e.payload) || (
                            <span className="text-[#475569]">seq #{e.seqNo}</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-6 pb-8 text-center">
        <Link href="/" className="text-[10px] text-[#818CF8] hover:text-white transition-colors">
          AlgoStudio
        </Link>
        <ShareActions />
      </div>
    </div>
  );
}
