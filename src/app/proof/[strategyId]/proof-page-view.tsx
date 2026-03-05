"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface VerificationData {
  strategyId: string;
  snapshotHash: string | null;
  baselineMetricsHash: string | null;
  tradeChainHead: string | null;
  tradeChainLength: number | null;
  backtestTradeCount: number | null;
  liveTradeCount: number | null;
  ladderLevel: string;
  generatedAt: string;
}

interface ChainStatusData {
  strategyId: string;
  status: "PASS" | "FAIL" | "UNKNOWN";
  checkedAt: string;
  head: { lastSequence: number; lastEventHashPrefix: string } | null;
  summary: { scannedFrom: number; scannedTo: number; breaks: number } | null;
  firstBreak: {
    sequence: number;
    expectedPrevHashPrefix: string;
    actualPrevHashPrefix: string;
    eventHashPrefix: string;
  } | null;
  errorCode?: string;
}

interface ProofData {
  strategy: {
    name: string;
    description: string | null;
    strategyId: string;
    slug: string;
    ownerHandle: string | null;
    createdAt: string;
    updatedAt: string;
    currentVersion: { versionNo: number; fingerprint: string } | null;
  };
  ladder: { level: string; label: string; color: string; description: string };
  backtestHealth: {
    score: number;
    status: string;
    breakdown: Record<string, unknown> | null;
    stats: {
      profitFactor: number;
      maxDrawdownPct: number;
      sharpeRatio: number | null;
      winRate: number;
      totalTrades: number;
      expectedPayoff: number;
      recoveryFactor: number | null;
    };
  } | null;
  monteCarlo: {
    survivalRate: number;
    p5: number;
    p50: number;
    p95: number;
  } | null;
  instance: {
    eaName: string;
    symbol: string | null;
    timeframe: string | null;
    status: string;
    totalTrades: number;
    totalProfit: number;
    createdAt: string;
    lastHeartbeat: string | null;
    strategyStatus: string;
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
  liveHealth: {
    status: string;
    overallScore: number;
    returnScore: number;
    volatilityScore: number;
    drawdownScore: number;
    winRateScore: number;
    tradeFrequencyScore: number;
    driftDetected: boolean;
    primaryDriver: string | null;
    scoreTrend: string | null;
    lastUpdated: string;
  } | null;
  chain: {
    length: number;
    lastHash: string | null;
    lastVerification: string | null;
  } | null;
  equityCurve: Array<{ equity: number; balance: number; createdAt: string }>;
  liveMetrics: {
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    profitFactor: number;
  } | null;
  monitoring: {
    status: string;
    lastHeartbeat: string | null;
  } | null;
}

const HEALTH_LABEL: Record<string, { color: string; label: string }> = {
  ROBUST: { color: "#10B981", label: "Robust" },
  MODERATE: { color: "#F59E0B", label: "Moderate" },
  WEAK: { color: "#EF4444", label: "Weak" },
  INSUFFICIENT_DATA: { color: "#7C8DB0", label: "Insufficient Data" },
};

const LADDER_ICONS: Record<string, string> = {
  SUBMITTED: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  VALIDATED: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  VERIFIED:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  PROVEN:
    "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  INSTITUTIONAL:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
};

function MiniEquityCurve({ points }: { points: Array<{ equity: number }> }) {
  if (points.length < 2)
    return (
      <div className="h-32 flex items-center justify-center text-sm text-[#7C8DB0]">
        Not enough data
      </div>
    );
  const equities = points.map((p) => p.equity);
  const min = Math.min(...equities);
  const max = Math.max(...equities);
  const range = max - min || 1;
  const w = 600,
    h = 128,
    pad = 4;
  const path = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((p.equity - min) / range) * (h - 2 * pad);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const isUp = equities[equities.length - 1] >= equities[0];
  const c = isUp ? "#10B981" : "#EF4444";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${w - pad},${h} L${pad},${h} Z`} fill="url(#eqGrad)" />
      <path d={path} fill="none" stroke={c} strokeWidth="2" />
    </svg>
  );
}

function ScoreBar({
  label,
  score,
  explanation,
}: {
  label: string;
  score: number;
  explanation?: string;
}) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className="text-white font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#0A0118] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {explanation && <p className="text-[10px] text-[#7C8DB0]">{explanation}</p>}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-[#7C8DB0] mt-0.5">{sub}</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="ml-1.5 inline-flex items-center p-0.5 rounded text-[#7C8DB0] hover:text-white transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg
          className="w-3 h-3 text-[#10B981]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

export function ProofPageView({ strategyId }: { strategyId: string }) {
  const [data, setData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<ChainStatusData | null>(null);
  const verificationFetched = useRef(false);
  const chainStatusFetched = useRef(false);

  useEffect(() => {
    fetch(`/api/proof/${strategyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
    // Log view event
    fetch("/api/proof/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "proof_page_view", strategyId }),
    }).catch(() => {});
  }, [strategyId]);

  useEffect(() => {
    if (verificationFetched.current) return;
    verificationFetched.current = true;
    fetch(`/api/proof/${strategyId}/verification`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setVerification(d ?? null))
      .catch(() => null);
  }, [strategyId]);

  useEffect(() => {
    if (chainStatusFetched.current) return;
    chainStatusFetched.current = true;
    fetch(`/api/proof/chain/${strategyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setChainStatus(d ?? null))
      .catch(() => null);
  }, [strategyId]);

  const downloadVerification = useCallback(async () => {
    setDownloadError(null);
    try {
      const res = await fetch(`/api/proof/${strategyId}/verification`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${strategyId}-verification.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Failed to download verification data. Please try again.");
    }
  }, [strategyId]);

  const getShareUrl = useCallback(() => {
    const slug = data?.strategy.slug;
    return slug
      ? `${window.location.origin}/p/${slug}`
      : `${window.location.origin}/proof/${strategyId}`;
  }, [strategyId, data]);

  const copyLink = useCallback(() => {
    const url = getShareUrl();
    navigator.clipboard
      ?.writeText(url)
      ?.then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
    fetch("/api/proof/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "proof_link_copy", strategyId }),
    }).catch(() => {});
  }, [strategyId, getShareUrl]);

  const shareX = useCallback(() => {
    const url = getShareUrl();
    const text = "Verified strategy proof (hash-chain + monitoring).";
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
    fetch("/api/proof/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "share_click", strategyId, meta: { channel: "x" } }),
    }).catch(() => {});
  }, [strategyId, getShareUrl]);

  const shareDiscord = useCallback(() => {
    if (!data) return;
    const url = getShareUrl();
    const text = `**${data.strategy.name}** — ${data.ladder.label} Strategy\nHealth Score: ${data.backtestHealth?.score ?? "N/A"}/100\n${url}`;
    navigator.clipboard
      ?.writeText(text)
      ?.then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
    fetch("/api/proof/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "share_click", strategyId, meta: { channel: "discord" } }),
    }).catch(() => {});
  }, [strategyId, data, getShareUrl]);

  const shareReddit = useCallback(() => {
    const url = getShareUrl();
    window.open(
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent("Verified strategy proof page")}`,
      "_blank"
    );
    fetch("/api/proof/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "share_click", strategyId, meta: { channel: "reddit" } }),
    }).catch(() => {});
  }, [strategyId, getShareUrl]);

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

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Strategy Not Found</h1>
          <p className="text-[#7C8DB0]">This proof page may be private or does not exist.</p>
        </div>
      </div>
    );
  }

  const {
    strategy,
    ladder,
    backtestHealth,
    monteCarlo,
    instance,
    trackRecord,
    liveHealth,
    chain,
    equityCurve,
    liveMetrics,
    monitoring,
  } = data;
  const healthLabel = backtestHealth
    ? (HEALTH_LABEL[backtestHealth.status] ?? HEALTH_LABEL.INSUFFICIENT_DATA)
    : null;
  const winRate =
    trackRecord && trackRecord.totalTrades > 0
      ? ((trackRecord.winCount / trackRecord.totalTrades) * 100).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{strategy.name}</h1>
            {/* Verified by AlgoStudio badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4F46E5]/15 border border-[#4F46E5]/40 text-[#818CF8] text-xs font-semibold">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Verified by AlgoStudio
            </span>
            {/* Ladder badge */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold"
              style={{
                borderColor: `${ladder.color}40`,
                backgroundColor: `${ladder.color}15`,
                color: ladder.color,
              }}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={LADDER_ICONS[ladder.level] ?? LADDER_ICONS.SUBMITTED}
                />
              </svg>
              {ladder.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[#7C8DB0]">
            {strategy.ownerHandle && (
              <Link
                href={`/@${strategy.ownerHandle}`}
                className="text-[#A78BFA] hover:text-[#C4B5FD] transition-colors"
              >
                @{strategy.ownerHandle}
              </Link>
            )}
            <span className="font-mono text-xs text-[#7C8DB0]/60">{strategy.strategyId}</span>
            {monitoring && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  monitoring.status === "Connected"
                    ? "bg-[#10B981]/10 text-[#10B981]"
                    : monitoring.status === "Delayed"
                      ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "bg-[#7C8DB0]/10 text-[#7C8DB0]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    monitoring.status === "Connected"
                      ? "bg-[#10B981]"
                      : monitoring.status === "Delayed"
                        ? "bg-[#F59E0B]"
                        : "bg-[#7C8DB0]"
                  }`}
                />
                {monitoring.status}
              </span>
            )}
          </div>

          {strategy.description && (
            <p className="text-sm text-[#94A3B8] mt-2">{strategy.description}</p>
          )}
        </div>

        {/* SEO Intro */}
        <div className="bg-[#1A0626]/40 border border-[rgba(79,70,229,0.1)] rounded-xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-white mb-2">Verified Strategy Track Record</p>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            This page is an independently verified track record produced by AlgoStudio — a
            deterministic governance and control layer for algorithmic trading strategies. Every
            trade is recorded in a cryptographic hash-chain audit log that cannot be modified
            without detection. Strategies are continuously monitored for structural drift and
            governed through an automated lifecycle (RUN / PAUSE / STOP) based on predefined risk
            rules.
          </p>
        </div>

        {/* Share this proof */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl px-5 py-4 mb-4">
          <h2 className="text-sm font-semibold text-white mb-3">Share this proof</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-lg text-xs text-[#94A3B8] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={shareX}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-lg text-xs text-[#94A3B8] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              Share on X
            </button>
            <button
              onClick={shareReddit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-lg text-xs text-[#94A3B8] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              Share on Reddit
            </button>
            <button
              onClick={shareDiscord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-lg text-xs text-[#94A3B8] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              Share to Discord
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-[rgba(79,70,229,0.1)]">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-2">
              Why this is credible
            </p>
            <ul className="space-y-1 text-xs text-[#94A3B8]">
              <li className="flex items-start gap-2">
                <span className="text-[#10B981] mt-0.5">&#x2713;</span>
                Hash-chain audit log (tamper-evident)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10B981] mt-0.5">&#x2713;</span>
                Snapshot-bound strategy identity
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10B981] mt-0.5">&#x2713;</span>
                Monitoring + lifecycle governance (RUN / PAUSE / STOP)
              </li>
            </ul>
          </div>
        </div>

        {/* Risk Disclaimer */}
        <div className="bg-[#1A0626]/50 border border-[#F59E0B]/20 rounded-lg px-4 py-2.5 mb-6">
          <p className="text-[11px] text-[#F59E0B]/80">
            Past performance does not guarantee future results. All trading involves risk.
          </p>
        </div>

        {/* Verified Performance */}
        <section className="mb-4">
          <h2 className="text-base font-semibold text-white mb-3">Verified Performance</h2>
          {backtestHealth ? (
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Health Score</h3>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-white">{backtestHealth.score}</span>
                  <span className="text-sm text-[#7C8DB0]">/100</span>
                  {healthLabel && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${healthLabel.color}15`,
                        color: healthLabel.color,
                      }}
                    >
                      {healthLabel.label}
                    </span>
                  )}
                </div>
              </div>
              {/* 7 factor breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Profit Factor</p>
                  <p className="text-white font-medium">
                    {backtestHealth.stats.profitFactor.toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Max Drawdown</p>
                  <p className="text-white font-medium">
                    {backtestHealth.stats.maxDrawdownPct.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Win Rate</p>
                  <p className="text-white font-medium">
                    {backtestHealth.stats.winRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Sharpe Ratio</p>
                  <p className="text-white font-medium">
                    {backtestHealth.stats.sharpeRatio?.toFixed(2) ?? "---"}
                  </p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Trades</p>
                  <p className="text-white font-medium">
                    {backtestHealth.stats.totalTrades.toLocaleString()}
                  </p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Expected Payoff</p>
                  <p className="text-white font-medium">
                    ${backtestHealth.stats.expectedPayoff.toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Recovery Factor</p>
                  <p className="text-white font-medium">
                    {backtestHealth.stats.recoveryFactor?.toFixed(2) ?? "---"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#7C8DB0]">
              Not available yet — no backtest evaluation uploaded.
            </p>
          )}
        </section>

        {/* Monte Carlo Validation */}
        <section className="mb-4">
          <h2 className="text-base font-semibold text-white mb-3">Monte Carlo Validation</h2>
          {monteCarlo ? (
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                    Survival Rate
                  </p>
                  <p
                    className={`text-lg font-bold ${monteCarlo.survivalRate >= 0.7 ? "text-[#10B981]" : monteCarlo.survivalRate >= 0.5 ? "text-[#F59E0B]" : "text-[#EF4444]"}`}
                  >
                    {(monteCarlo.survivalRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                    P5 (Worst)
                  </p>
                  <p className="text-sm font-medium text-[#EF4444]">
                    {monteCarlo.p5 >= 0 ? "+" : ""}
                    {monteCarlo.p5.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                    Median
                  </p>
                  <p className="text-sm font-medium text-white">
                    {monteCarlo.p50 >= 0 ? "+" : ""}
                    {monteCarlo.p50.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                    P95 (Best)
                  </p>
                  <p className="text-sm font-medium text-[#10B981]">
                    {monteCarlo.p95 >= 0 ? "+" : ""}
                    {monteCarlo.p95.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-[#7C8DB0] mt-2">
                Based on ~1,000 randomized simulations. Survival rate = % of simulations that
                remained profitable.
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#7C8DB0]">
              Not available yet — Monte Carlo simulation has not been run.
            </p>
          )}
        </section>

        {/* Live Track Record */}
        <section className="mb-4">
          <h2 className="text-base font-semibold text-white mb-3">Live Track Record</h2>
          {trackRecord ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Stat label="Live Trades" value={trackRecord.totalTrades.toLocaleString()} />
              <Stat label="Win Rate" value={winRate ? `${winRate}%` : "---"} />
              <Stat label="Max Drawdown" value={`${trackRecord.maxDrawdownPct.toFixed(1)}%`} />
              <Stat label="Net Profit" value={`$${trackRecord.totalProfit.toFixed(2)}`} />
            </div>
          ) : (
            <p className="text-sm text-[#7C8DB0]">Not available yet — no live data connected.</p>
          )}

          {/* Equity Curve */}
          {equityCurve.length > 1 && (
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-5 mt-3">
              <h3 className="text-sm font-semibold text-white mb-3">Equity Curve</h3>
              <MiniEquityCurve points={equityCurve} />
            </div>
          )}
        </section>

        {/* Monitoring Status */}
        <section className="mb-4">
          <h2 className="text-base font-semibold text-white mb-3">Monitoring Status</h2>
          {liveHealth && liveHealth.status !== "INSUFFICIENT_DATA" ? (
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Live Health Monitor</h3>
                <span className="text-xs text-[#7C8DB0]">
                  Score: {Math.round(liveHealth.overallScore * 100)}%
                </span>
              </div>
              <div className="space-y-2">
                <ScoreBar label="Return" score={liveHealth.returnScore} />
                <ScoreBar label="Volatility" score={liveHealth.volatilityScore} />
                <ScoreBar label="Drawdown" score={liveHealth.drawdownScore} />
                <ScoreBar label="Win Rate" score={liveHealth.winRateScore} />
                <ScoreBar label="Trade Frequency" score={liveHealth.tradeFrequencyScore} />
              </div>
              {liveHealth.primaryDriver && (
                <p className="text-[10px] text-[#F59E0B] mt-2">{liveHealth.primaryDriver}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#7C8DB0]">Not available yet — no live monitoring data.</p>
          )}

          {/* Live Risk Metrics */}
          {liveMetrics && (liveMetrics.sharpeRatio !== 0 || liveMetrics.profitFactor !== 0) && (
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-5 mt-3">
              <h3 className="text-sm font-semibold text-white mb-3">Live Risk Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Sharpe</p>
                  <p className="text-white font-medium">{liveMetrics.sharpeRatio.toFixed(2)}</p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Sortino</p>
                  <p className="text-white font-medium">{liveMetrics.sortinoRatio.toFixed(2)}</p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Calmar</p>
                  <p className="text-white font-medium">{liveMetrics.calmarRatio.toFixed(2)}</p>
                </div>
                <div className="bg-[#0A0118]/50 rounded-lg p-3">
                  <p className="text-[#7C8DB0] mb-0.5">Profit Factor</p>
                  <p className="text-white font-medium">
                    {liveMetrics.profitFactor === Infinity
                      ? "\u221e"
                      : liveMetrics.profitFactor.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Track Record Verification */}
        <section className="mb-4">
          <h2 className="text-base font-semibold text-white mb-3">Track Record Verification</h2>
          {chain && chain.length > 0 ? (
            <div className="bg-[#1A0626] border border-[#10B981]/20 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-5 h-5 text-[#10B981]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-[#10B981]">Cryptographically Verified</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[#7C8DB0]">Chain Length</p>
                  <p className="text-white font-medium">{chain.length.toLocaleString()} events</p>
                </div>
                <div>
                  <p className="text-[#7C8DB0]">Latest Hash</p>
                  <p className="text-white font-mono text-[10px] break-all">
                    {chain.lastHash?.slice(0, 16)}...
                  </p>
                </div>
                <div>
                  <p className="text-[#7C8DB0]">Last Verification</p>
                  <p className="text-white font-medium">
                    {chain.lastVerification
                      ? new Date(chain.lastVerification).toLocaleDateString()
                      : "Pending"}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-[#7C8DB0] mt-2">
                Each trade is cryptographically hashed in sequence. The chain cannot be modified
                without detection.
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#7C8DB0]">
              Not available yet — no hash-chain events recorded.
            </p>
          )}

          {/* Verification Hashes */}
          {verification &&
          (verification.snapshotHash ||
            verification.baselineMetricsHash ||
            verification.tradeChainHead) ? (
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-5 mt-3">
              <h3 className="text-sm font-semibold text-white mb-3">Verification Hashes</h3>
              <div className="space-y-2 text-xs">
                {verification.snapshotHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C8DB0]">Snapshot Hash</span>
                    <span className="flex items-center text-white font-mono text-[10px]">
                      {verification.snapshotHash.slice(0, 16)}...
                      <CopyButton text={verification.snapshotHash} />
                    </span>
                  </div>
                )}
                {verification.baselineMetricsHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C8DB0]">Baseline Hash</span>
                    <span className="flex items-center text-white font-mono text-[10px]">
                      {verification.baselineMetricsHash.slice(0, 16)}...
                      <CopyButton text={verification.baselineMetricsHash} />
                    </span>
                  </div>
                )}
                {verification.tradeChainHead && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C8DB0]">Trade Chain Head</span>
                    <span className="flex items-center text-white font-mono text-[10px]">
                      {verification.tradeChainHead.slice(0, 16)}...
                      <CopyButton text={verification.tradeChainHead} />
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : verification !== null ? (
            <p className="text-sm text-[#7C8DB0] mt-3">Verification hashes not available yet.</p>
          ) : null}

          {/* Proof Chain Integrity */}
          {chainStatus && (
            <div
              className={`bg-[#1A0626] border rounded-xl p-5 mt-3 ${
                chainStatus.status === "PASS"
                  ? "border-[#10B981]/20"
                  : chainStatus.status === "FAIL"
                    ? "border-[#EF4444]/20"
                    : "border-[rgba(79,70,229,0.15)]"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {chainStatus.status === "PASS" ? (
                  <svg
                    className="w-5 h-5 text-[#10B981]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ) : chainStatus.status === "FAIL" ? (
                  <svg
                    className="w-5 h-5 text-[#EF4444]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-[#7C8DB0]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <h3
                  className={`text-sm font-semibold ${
                    chainStatus.status === "PASS"
                      ? "text-[#10B981]"
                      : chainStatus.status === "FAIL"
                        ? "text-[#EF4444]"
                        : "text-[#7C8DB0]"
                  }`}
                >
                  Proof Chain:{" "}
                  {chainStatus.status === "PASS"
                    ? "Intact"
                    : chainStatus.status === "FAIL"
                      ? "Break Detected"
                      : "Unknown"}
                </h3>
              </div>

              {chainStatus.head && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-2">
                  <div>
                    <p className="text-[#7C8DB0]">Head Sequence</p>
                    <p className="text-white font-medium">{chainStatus.head.lastSequence}</p>
                  </div>
                  <div>
                    <p className="text-[#7C8DB0]">Head Hash</p>
                    <p className="text-white font-mono text-[10px]">
                      {chainStatus.head.lastEventHashPrefix}...
                    </p>
                  </div>
                  {chainStatus.summary && (
                    <div>
                      <p className="text-[#7C8DB0]">Scanned Window</p>
                      <p className="text-white font-medium">
                        #{chainStatus.summary.scannedFrom} – #{chainStatus.summary.scannedTo}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {chainStatus.firstBreak && (
                <div className="bg-[#0A0118]/50 rounded-lg p-3 text-xs mt-2">
                  <p className="text-[#EF4444] font-medium mb-1">
                    Break at sequence #{chainStatus.firstBreak.sequence}
                  </p>
                  <div className="space-y-0.5 text-[10px]">
                    <p className="text-[#7C8DB0]">
                      Expected prev:{" "}
                      <span className="font-mono text-white">
                        {chainStatus.firstBreak.expectedPrevHashPrefix}...
                      </span>
                    </p>
                    <p className="text-[#7C8DB0]">
                      Actual prev:{" "}
                      <span className="font-mono text-white">
                        {chainStatus.firstBreak.actualPrevHashPrefix}...
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {chainStatus.errorCode && (
                <p className="text-[10px] text-[#7C8DB0] mt-2">
                  Status:{" "}
                  {chainStatus.errorCode === "NO_CHAIN"
                    ? "No proof chain recorded yet."
                    : chainStatus.errorCode === "NO_EVENTS"
                      ? "Chain head exists but no events found in scan window."
                      : "Could not verify chain integrity."}
                </p>
              )}

              {chainStatus.status === "PASS" && (
                <p className="text-[10px] text-[#7C8DB0] mt-2">
                  All events in the scan window have valid hash linkage. No tampering detected.
                </p>
              )}
            </div>
          )}

          {/* Download verification data */}
          <div className="mt-3">
            <button
              onClick={downloadVerification}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0118] border border-[rgba(79,70,229,0.2)] rounded-lg text-xs text-[#94A3B8] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download verification data (JSON)
            </button>
            {downloadError && <p className="text-xs text-[#EF4444] mt-1.5">{downloadError}</p>}
          </div>
        </section>

        {/* Lifecycle Governance */}
        <section className="mb-6">
          <h2 className="text-base font-semibold text-white mb-3">Lifecycle Governance</h2>
          <div className="bg-[#1A0626]/40 border border-[rgba(79,70,229,0.1)] rounded-xl px-5 py-4">
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This strategy is governed by AlgoStudio&apos;s automated lifecycle engine. Predefined
              risk rules can transition the strategy between RUN, PAUSE, and STOP states based on
              real-time performance. Structural drift detection monitors for deviations from
              baseline behaviour, and all state transitions are recorded in the audit log.
            </p>
            {instance && (
              <div className="flex items-center gap-3 mt-3 text-xs">
                <span className="text-[#7C8DB0]">Current phase:</span>
                <span className="text-white font-medium">{instance.strategyStatus}</span>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-[rgba(79,70,229,0.1)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-xl hover:bg-[#4338CA] transition-colors"
          >
            Prove Your Edge
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
          <p className="text-xs text-[#7C8DB0] mt-4">
            Powered by{" "}
            <Link href="/" className="text-[#A78BFA] hover:text-[#C4B5FD] transition-colors">
              AlgoStudio
            </Link>{" "}
            &mdash; the governance and control layer for algorithmic trading
          </p>
        </div>
      </div>
    </div>
  );
}
