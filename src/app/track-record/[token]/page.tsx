import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { loadTrackRecord, type TrackRecordData } from "./load-track-record";
import { EquityChart } from "./equity-chart";
import { ShareActions } from "./share-actions";
import { TrackRecordClient } from "./track-record-client";
import { TradingDisclaimerBanner } from "@/components/marketing/trading-disclaimer-banner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ token: string }>;
}

// Noindex: share tokens are per-trader credentials, not public content.
// Each URL contains a unique token and would pollute Google's index with
// thousands of near-duplicate pages. Link recipients reach the page directly;
// no SERP discovery is intended.
const ROBOTS_NOINDEX = { index: false, follow: false } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await loadTrackRecord(token);
  if (!data) return { title: "Track Record Not Found | Algo Studio", robots: ROBOTS_NOINDEX };

  const displayName =
    data.account.broker && data.account.accountNumberMasked
      ? `${data.account.broker} Account ${data.account.accountNumberMasked}`
      : data.account.eaName;
  const title = `${displayName} — Verified Trading Record | Algo Studio`;
  const description = `Verified trading record for ${displayName}. ${data.performance.totalTrades} trades, ${data.performance.strategyCount} strategies monitored by Algo Studio.`;
  return {
    title,
    description,
    robots: ROBOTS_NOINDEX,
    twitter: { card: "summary_large_image", title, description },
  };
}

// ── Helpers ──

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

  const { account, performance, coverage, equityCurve, monthlyReturns, closedTrades } = data;

  const displayName =
    account.broker && account.accountNumberMasked
      ? `${account.broker} · ${account.accountNumberMasked}`
      : account.eaName;

  const statusColor =
    account.status === "ONLINE" ? "#10B981" : account.status === "ERROR" ? "#EF4444" : "#64748B";
  const statusLabel =
    account.status === "ONLINE" ? "Online" : account.status === "ERROR" ? "Error" : "Idle";

  // Growth % (TWR)
  const growthPct =
    equityCurve.length >= 2
      ? ((equityCurve[equityCurve.length - 1].equity - equityCurve[0].equity) /
          equityCurve[0].equity) *
        100
      : 0;

  // Current drawdown
  const currentDD = (() => {
    if (equityCurve.length < 2) return 0;
    let peak = 0;
    for (const p of equityCurve) {
      if (p.equity > peak) peak = p.equity;
    }
    const current = equityCurve[equityCurve.length - 1].equity;
    return peak > 0 ? ((peak - current) / peak) * 100 : 0;
  })();

  // Unrealized P&L
  const unrealized =
    account.equity != null && account.balance != null ? account.equity - account.balance : 0;

  return (
    <div className="min-h-screen bg-[#0B0E11]">
      <TradingDisclaimerBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{
                  backgroundColor: `${statusColor}15`,
                  color: statusColor,
                }}
              >
                {statusLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
              {account.broker && <span>{account.broker}</span>}
              {account.lastHeartbeat && (
                <>
                  <span className="text-[#334155]">|</span>
                  <span>Last update: {formatTimeAgo(account.lastHeartbeat)}</span>
                </>
              )}
              {performance.durationDays != null && (
                <>
                  <span className="text-[#334155]">|</span>
                  <span>Monitoring: {formatDuration(performance.durationDays)}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#4F46E5]/10 border border-[#4F46E5]/20 text-[10px] font-medium text-[#818CF8]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Verified by Algo Studio
            </span>
            <ShareActions />
          </div>
        </div>

        {/* ── 4 Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Balance */}
          <div className="rounded-lg bg-[#131722] border border-[#1E293B]/50 p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-medium">
                Balance
              </p>
              <div className="w-7 h-7 rounded bg-[#818CF8]/10 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-[#818CF8]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xl font-bold text-white tabular-nums mb-1">
              {formatCurrency(account.balance ?? 0)}
            </p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#64748B]">Unrealized:</span>
              <span className={unrealized >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}>
                {formatCurrency(unrealized)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] mt-0.5">
              <span className="text-[#64748B]">Equity:</span>
              <span className="text-white">{formatCurrency(account.equity ?? 0)}</span>
            </div>
          </div>

          {/* Total Profit */}
          <div className="rounded-lg bg-[#131722] border border-[#1E293B]/50 p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-medium">
                Total Profit
              </p>
              <div className="w-7 h-7 rounded bg-[#10B981]/10 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-[#10B981]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <p
              className={`text-xl font-bold tabular-nums mb-1 ${performance.totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
            >
              {performance.totalProfit >= 0 ? "+" : ""}
              {formatCurrency(performance.totalProfit)}
            </p>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-[#64748B]">Growth</span>
              <span className={growthPct >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}>
                {growthPct >= 0 ? "+" : ""}
                {growthPct.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="rounded-lg bg-[#131722] border border-[#1E293B]/50 p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-medium">
                Max Drawdown
              </p>
              <div className="w-7 h-7 rounded bg-[#EF4444]/10 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-[#EF4444]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xl font-bold text-[#EF4444] tabular-nums mb-1">
              {performance.maxDrawdownPct.toFixed(2)}%
            </p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#64748B]">Current:</span>
              <span className={currentDD > 0 ? "text-[#EF4444]" : "text-[#10B981]"}>
                {currentDD.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Duration */}
          <div className="rounded-lg bg-[#131722] border border-[#1E293B]/50 p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-medium">
                Duration
              </p>
              <div className="w-7 h-7 rounded bg-[#F59E0B]/10 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-[#F59E0B]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xl font-bold text-white mb-1">
              {performance.durationDays != null ? formatDuration(performance.durationDays) : "—"}
            </p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#64748B]">Since:</span>
              <span className="text-[#94A3B8]">
                {coverage.firstHeartbeatAt
                  ? new Date(coverage.firstHeartbeatAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tabs + Content (client component) ── */}
        <TrackRecordClient
          closedTrades={closedTrades}
          durationDays={performance.durationDays}
          equityCurve={equityCurve}
          monthlyReturns={monthlyReturns}
        />

        {/* ── Verified badge ── */}
        <div className="mt-6 rounded-lg bg-[#131722] border border-[#1E293B]/50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-4 h-4 text-[#818CF8]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Verified Trading Record</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                This track record is verified through Algo Studio&apos;s immutable proof chain. All
                trades are recorded via broker heartbeats and cryptographically linked to prevent
                tampering. Data sources include live equity snapshots, trade confirmations, and
                health monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-[10px] text-[#475569]">
          <Link href="/" className="hover:text-[#94A3B8] transition-colors">
            Monitored by Algo Studio
          </Link>
          <ShareActions />
        </div>
      </div>
    </div>
  );
}
