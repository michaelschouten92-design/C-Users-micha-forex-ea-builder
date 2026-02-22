"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StrategyPageData {
  strategy: {
    name: string;
    description: string | null;
    strategyId: string;
    currentVersion: {
      id: string;
      versionNo: number;
      fingerprint: string;
      createdAt: string;
    } | null;
  };
  instance: {
    id: string;
    eaName: string;
    symbol: string | null;
    timeframe: string | null;
    broker: string | null;
    status: string;
    mode: string;
    balance: number | null;
    equity: number | null;
    totalTrades: number;
    totalProfit: number;
    createdAt: string;
    lastHeartbeat: string | null;
  } | null;
  trackRecord: {
    totalTrades: number;
    winCount: number;
    lossCount: number;
    totalProfit: number;
    maxDrawdownPct: number;
    balance: number;
    equity: number;
  } | null;
  health: {
    status: string;
    overallScore: number;
    returnScore: number;
    drawdownScore: number;
    winRateScore: number;
    lastUpdated: string;
  } | null;
  chain: {
    length: number;
    checkpointCount: number;
    lastCheckpoint: { hmac: string; at: string } | null;
  } | null;
  equityCurve: Array<{ equity: number; balance: number; createdAt: string }>;
  metrics: {
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    profitFactor: number;
  } | null;
  drawdownDuration: number;
  brokerVerification: {
    evidenceCount: number;
    matchedCount: number;
    mismatchedCount: number;
  } | null;
  settings: {
    showEquityCurve: boolean;
    showTradeLog: boolean;
    showHealthStatus: boolean;
  };
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "---";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const HEALTH_COLORS: Record<string, { color: string; label: string }> = {
  HEALTHY: { color: "#10B981", label: "Healthy" },
  WARNING: { color: "#F59E0B", label: "Warning" },
  DEGRADED: { color: "#EF4444", label: "Degraded" },
  INSUFFICIENT_DATA: { color: "#7C8DB0", label: "Insufficient Data" },
};

function MiniEquityCurve({ points }: { points: Array<{ equity: number; createdAt: string }> }) {
  if (points.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-[#7C8DB0]">
        Not enough data for equity curve
      </div>
    );
  }

  const equities = points.map((p) => p.equity);
  const min = Math.min(...equities);
  const max = Math.max(...equities);
  const range = max - min || 1;
  const width = 600;
  const height = 160;
  const padding = 4;

  const pathData = points
    .map((p, i) => {
      const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p.equity - min) / range) * (height - 2 * padding);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const lastEquity = equities[equities.length - 1];
  const firstEquity = equities[0];
  const isPositive = lastEquity >= firstEquity;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathData} L${width - padding},${height} L${padding},${height} Z`}
        fill="url(#equityGrad)"
      />
      <path d={pathData} fill="none" stroke={isPositive ? "#10B981" : "#EF4444"} strokeWidth="2" />
    </svg>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-[#7C8DB0] mt-0.5">{sub}</p>}
    </div>
  );
}

export function VerifiedStrategyView({ slug }: { slug: string }) {
  const [data, setData] = useState<StrategyPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/strategy/${slug}`);
        if (res.ok) {
          setData(await res.json());
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-10 bg-[#1A0626] rounded-xl w-64" />
          <div className="h-48 bg-[#1A0626] rounded-xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-[#1A0626] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Strategy Not Found</h1>
          <p className="text-[#7C8DB0]">This strategy page may be private or does not exist.</p>
        </div>
      </div>
    );
  }

  const {
    strategy,
    instance,
    trackRecord,
    health,
    chain,
    equityCurve,
    metrics,
    drawdownDuration,
    brokerVerification,
    settings,
  } = data;
  const winRate =
    trackRecord && trackRecord.totalTrades > 0
      ? ((trackRecord.winCount / trackRecord.totalTrades) * 100).toFixed(1)
      : "---";

  const chainVerified = chain && chain.length > 0;
  const healthConfig = health
    ? HEALTH_COLORS[health.status] || HEALTH_COLORS.INSUFFICIENT_DATA
    : null;

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{strategy.name}</h1>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#4F46E5]/10 border border-[#4F46E5]/20 text-xs font-mono font-medium text-[#A78BFA]">
              {strategy.strategyId}
            </span>
            {strategy.currentVersion && (
              <span className="text-xs text-[#7C8DB0] bg-[#1A0626] px-2 py-0.5 rounded">
                v{strategy.currentVersion.versionNo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Verified badge */}
            {chainVerified && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-xs font-medium text-[#10B981]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Integrity Verified
              </span>
            )}

            {/* Health status badge */}
            {settings.showHealthStatus && healthConfig && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
                style={{
                  backgroundColor: `${healthConfig.color}15`,
                  borderColor: `${healthConfig.color}25`,
                  color: healthConfig.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: healthConfig.color }}
                />
                {healthConfig.label}
                {health &&
                  health.status !== "INSUFFICIENT_DATA" &&
                  ` (${Math.round(health.overallScore * 100)}%)`}
              </span>
            )}

            {/* Broker Verified badge */}
            {brokerVerification && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
                  brokerVerification.mismatchedCount === 0
                    ? "bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]"
                    : "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                {brokerVerification.mismatchedCount === 0 ? "Broker Verified" : "Broker Mismatch"}
              </span>
            )}

            {instance && (
              <span className="text-xs text-[#7C8DB0]">
                {instance.symbol} {instance.timeframe}{" "}
                {instance.broker ? `@ ${instance.broker}` : ""}
              </span>
            )}
          </div>

          {strategy.description && (
            <p className="text-sm text-[#7C8DB0] mt-3">{strategy.description}</p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Trades" value={trackRecord?.totalTrades.toString() || "---"} />
          <StatCard label="Win Rate" value={`${winRate}%`} />
          <StatCard
            label="Max Drawdown"
            value={trackRecord ? `${trackRecord.maxDrawdownPct.toFixed(1)}%` : "---"}
          />
          <StatCard
            label="Net Profit"
            value={trackRecord ? `$${trackRecord.totalProfit.toFixed(2)}` : "---"}
          />
        </div>

        {/* Instance status */}
        {instance && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Balance"
              value={instance.balance !== null ? `$${instance.balance.toFixed(2)}` : "---"}
            />
            <StatCard
              label="Equity"
              value={instance.equity !== null ? `$${instance.equity.toFixed(2)}` : "---"}
            />
            <StatCard
              label="Status"
              value={instance.status}
              sub={
                instance.lastHeartbeat
                  ? `Last seen ${new Date(instance.lastHeartbeat).toLocaleString()}`
                  : undefined
              }
            />
            <StatCard
              label="Running Since"
              value={new Date(instance.createdAt).toLocaleDateString()}
              sub={instance.mode === "PAPER" ? "Paper Mode" : "Live Mode"}
            />
          </div>
        )}

        {/* Risk Metrics */}
        {metrics && (metrics.sharpeRatio !== 0 || metrics.sortinoRatio !== 0) && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Risk Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-[#0A0118]/50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                  Sharpe Ratio
                </p>
                <p className="text-sm font-medium text-white">{metrics.sharpeRatio.toFixed(2)}</p>
              </div>
              <div className="bg-[#0A0118]/50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                  Sortino Ratio
                </p>
                <p className="text-sm font-medium text-white">{metrics.sortinoRatio.toFixed(2)}</p>
              </div>
              <div className="bg-[#0A0118]/50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                  Calmar Ratio
                </p>
                <p className="text-sm font-medium text-white">{metrics.calmarRatio.toFixed(2)}</p>
              </div>
              <div className="bg-[#0A0118]/50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                  Profit Factor
                </p>
                <p className="text-sm font-medium text-white">
                  {metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}
                </p>
              </div>
              <div className="bg-[#0A0118]/50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                  Max DD Duration
                </p>
                <p className="text-sm font-medium text-white">{formatDuration(drawdownDuration)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Broker Verification Detail */}
        {brokerVerification && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Broker Verification</h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[#7C8DB0]">Evidence Count</p>
                <p className="text-white font-medium">{brokerVerification.evidenceCount}</p>
              </div>
              <div>
                <p className="text-[#7C8DB0]">Matched</p>
                <p className="text-[#10B981] font-medium">{brokerVerification.matchedCount}</p>
              </div>
              <div>
                <p className="text-[#7C8DB0]">Mismatches</p>
                <p
                  className={`font-medium ${brokerVerification.mismatchedCount > 0 ? "text-[#F59E0B]" : "text-[#10B981]"}`}
                >
                  {brokerVerification.mismatchedCount}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Equity Curve */}
        {settings.showEquityCurve && equityCurve.length > 0 && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Equity Curve</h3>
            <MiniEquityCurve points={equityCurve} />
          </div>
        )}

        {/* Health Score Breakdown */}
        {settings.showHealthStatus && health && health.status !== "INSUFFICIENT_DATA" && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Health Score</h3>
            <div className="space-y-2">
              {[
                { label: "Return", score: health.returnScore },
                { label: "Drawdown", score: health.drawdownScore },
                { label: "Win Rate", score: health.winRateScore },
              ].map(({ label, score }) => {
                const pct = Math.round(score * 100);
                const barColor = pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#7C8DB0]">{label}</span>
                      <span className="text-white font-medium">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#0A0118] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-[#7C8DB0] mt-3">
              Last verified: {new Date(health.lastUpdated).toLocaleString()}
            </p>
          </div>
        )}

        {/* Chain Integrity */}
        {chain && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Chain Integrity</h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[#7C8DB0]">Chain Length</p>
                <p className="text-white font-medium">{chain.length} events</p>
              </div>
              <div>
                <p className="text-[#7C8DB0]">Checkpoints</p>
                <p className="text-white font-medium">{chain.checkpointCount}</p>
              </div>
              <div>
                <p className="text-[#7C8DB0]">Last Checkpoint</p>
                <p className="text-white font-medium">
                  {chain.lastCheckpoint
                    ? new Date(chain.lastCheckpoint.at).toLocaleDateString()
                    : "None"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center pt-6 border-t border-[rgba(79,70,229,0.1)]">
          <p className="text-sm text-[#7C8DB0] mb-3">
            Powered by AlgoStudio — Build, Test, and Verify Trading Strategies
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-xl hover:bg-[#4338CA] transition-colors"
          >
            Build Your Own EA
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
