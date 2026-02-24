"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface VerificationResult {
  level: string;
  l1: {
    chainValid: boolean;
    chainLength: number;
    checkpointsValid: boolean;
    checkpointCount: number;
    signatureValid: boolean;
    reportReproducible: boolean;
    errors: string[];
    caveats?: string[];
  };
  l2: {
    brokerEvidenceCount: number;
    matchedCount: number;
    mismatchedCount: number;
    mismatches: string[];
    digestValid: boolean;
    digestCount: number;
  } | null;
  l3: {
    notarized: boolean;
    notarizationTimestamp: string | null;
    provider: string | null;
  } | null;
  verified: boolean;
  summary: string;
}

interface ProofBundle {
  report: {
    manifest: {
      schemaVersion: string;
      reportId: string;
      instanceId: string;
      fromTimestamp: string;
      toTimestamp: string;
      fromSeqNo: number;
      toSeqNo: number;
      ledgerRootHash: string;
      signature: string;
      publicKey: string;
      generatedAt: string;
    };
    body: {
      equityCurve: { t: string; e: number; b: number; dd: number }[];
      trades: { ticket: string; symbol: string; type: string; profit: number }[];
      statistics: {
        totalTrades: number;
        winCount: number;
        lossCount: number;
        finalBalance: string;
        finalEquity: string;
        maxDrawdownPct: string;
        maxDrawdownAbs: string;
        totalProfit: string;
      };
    };
  };
  events: { seqNo: number; eventType: string }[];
  checkpoints: { seqNo: number; hmac: string; balance: string; equity: string }[];
  brokerEvidence: { brokerTicket: string; linkedTicket: string }[];
  verification: VerificationResult;
}

interface SharedBundleResponse {
  bundle: ProofBundle;
  metadata: {
    eaName: string;
    symbol: string | null;
    broker: string | null;
    createdAt: string;
    expiresAt: string | null;
    accessCount: number;
  };
}

const LEVEL_CONFIG: Record<string, { color: string; label: string; description: string }> = {
  L0_NONE: {
    color: "#EF4444",
    label: "L0 — Unverified",
    description: "Verification failed. Data integrity could not be confirmed.",
  },
  L1_LEDGER: {
    color: "#10B981",
    label: "L1 — Ledger Verified",
    description: "Hash chain, signature, and replay verified. Self-reported data is intact.",
  },
  L2_BROKER: {
    color: "#22D3EE",
    label: "L2 — Broker Corroborated",
    description: "Broker evidence matches ledger data. Third-party confirmation.",
  },
  L3_NOTARIZED: {
    color: "#A78BFA",
    label: "L3 — Notarized",
    description: "Independently timestamped and notarized by a third party.",
  },
};

function MiniEquityCurve({ points }: { points: { t: string; e: number }[] }) {
  if (points.length < 2) return null;

  const equities = points.map((p) => p.e);
  const min = Math.min(...equities);
  const max = Math.max(...equities);
  const range = max - min || 1;
  const width = 600;
  const height = 120;
  const padding = 4;

  const pathData = points
    .map((p, i) => {
      const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p.e - min) / range) * (height - 2 * padding);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const lastEquity = equities[equities.length - 1];
  const firstEquity = equities[0];
  const isPositive = lastEquity >= firstEquity;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="proofEquityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathData} L${width - padding},${height} L${padding},${height} Z`}
        fill="url(#proofEquityGrad)"
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

function CheckItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {passed ? (
        <svg
          className="w-4 h-4 text-[#10B981] flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 text-[#EF4444] flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      <span className={passed ? "text-[#CBD5E1]" : "text-[#EF4444]"}>{label}</span>
    </div>
  );
}

export function ProofViewer({
  token,
  uploadedBundle,
}: {
  token?: string;
  uploadedBundle?: ProofBundle;
}) {
  const [data, setData] = useState<SharedBundleResponse | null>(null);
  const [bundle, setBundle] = useState<ProofBundle | null>(uploadedBundle ?? null);
  const [loading, setLoading] = useState(!uploadedBundle);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (uploadedBundle || !token) return;
    (async () => {
      try {
        const res = await fetch(`/api/track-record/shared/${token}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setBundle(json.bundle);
        } else {
          const err = await res.json().catch(() => ({ error: "Failed to load" }));
          setError(err.error || "Failed to load proof bundle");
        }
      } catch {
        setError("Failed to load proof bundle");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, uploadedBundle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#7C8DB0]">
          <div className="w-5 h-5 border-2 border-[#7C8DB0] border-t-transparent rounded-full animate-spin" />
          Loading proof bundle...
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Proof Bundle Not Found</h1>
          <p className="text-[#7C8DB0] mb-4">{error || "This link may be expired or invalid."}</p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-sm rounded-xl hover:bg-[#4338CA] transition-colors"
          >
            Upload a proof bundle instead
          </Link>
        </div>
      </div>
    );
  }

  const { verification, report, events, checkpoints, brokerEvidence } = bundle;
  const levelConfig = LEVEL_CONFIG[verification.level] || LEVEL_CONFIG.L0_NONE;
  const stats = report.body.statistics;
  const winRate =
    stats.totalTrades > 0 ? ((stats.winCount / stats.totalTrades) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Proof Verification</h1>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium"
              style={{
                backgroundColor: `${levelConfig.color}15`,
                borderColor: `${levelConfig.color}25`,
                color: levelConfig.color,
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              {levelConfig.label}
            </span>
          </div>
          <p className="text-sm text-[#7C8DB0]">{levelConfig.description}</p>

          {data?.metadata && (
            <div className="flex items-center gap-3 mt-3 text-xs text-[#7C8DB0]">
              <span>{data.metadata.eaName}</span>
              {data.metadata.symbol && <span>{data.metadata.symbol}</span>}
              {data.metadata.broker && <span>@ {data.metadata.broker}</span>}
              <span>Shared {new Date(data.metadata.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Report Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Trades" value={stats.totalTrades.toString()} />
          <StatCard
            label="Win Rate"
            value={`${winRate}%`}
            sub={`${stats.winCount}W / ${stats.lossCount}L`}
          />
          <StatCard label="Final Balance" value={`$${stats.finalBalance}`} />
          <StatCard
            label="Max Drawdown"
            value={`${stats.maxDrawdownPct}%`}
            sub={`$${stats.maxDrawdownAbs}`}
          />
        </div>

        {/* Equity Curve */}
        {report.body.equityCurve.length > 0 && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Equity Curve</h3>
            <MiniEquityCurve points={report.body.equityCurve} />
          </div>
        )}

        {/* L1 Details */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-white mb-3">Level 1 — Ledger Integrity</h3>
          <div className="space-y-2">
            <CheckItem
              passed={verification.l1.chainValid}
              label={`Hash chain valid (${verification.l1.chainLength} events)`}
            />
            <CheckItem passed={verification.l1.signatureValid} label="Ed25519 signature verified" />
            <CheckItem
              passed={verification.l1.reportReproducible}
              label="Report is deterministically reproducible"
            />
            <CheckItem
              passed={verification.l1.checkpointsValid}
              label={`HMAC checkpoints valid (${verification.l1.checkpointCount} checkpoints)`}
            />
          </div>
          {verification.l1.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {verification.l1.errors.map((err, i) => (
                <p key={i} className="text-xs text-[#EF4444]">
                  {err}
                </p>
              ))}
            </div>
          )}
          {verification.l1.caveats && verification.l1.caveats.length > 0 && (
            <div className="mt-3 space-y-1">
              {verification.l1.caveats.map((caveat: string, i: number) => (
                <p key={i} className="text-xs text-[#F59E0B]">
                  {caveat}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* L2 Details */}
        {verification.l2 && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Level 2 — Broker Corroboration</h3>
            <div className="grid grid-cols-3 gap-4 text-xs mb-3">
              <div>
                <p className="text-[#7C8DB0]">Evidence</p>
                <p className="text-white font-medium">{verification.l2.brokerEvidenceCount}</p>
              </div>
              <div>
                <p className="text-[#7C8DB0]">Matched</p>
                <p className="text-[#10B981] font-medium">{verification.l2.matchedCount}</p>
              </div>
              <div>
                <p className="text-[#7C8DB0]">Mismatches</p>
                <p
                  className={`font-medium ${verification.l2.mismatchedCount > 0 ? "text-[#F59E0B]" : "text-[#10B981]"}`}
                >
                  {verification.l2.mismatchedCount}
                </p>
              </div>
            </div>
            <CheckItem
              passed={verification.l2.digestValid}
              label={`Broker digest valid (${verification.l2.digestCount} digests)`}
            />
            {verification.l2.mismatches.length > 0 && (
              <div className="mt-3 space-y-1">
                {verification.l2.mismatches.slice(0, 5).map((m, i) => (
                  <p key={i} className="text-xs text-[#F59E0B]">
                    {m}
                  </p>
                ))}
                {verification.l2.mismatches.length > 5 && (
                  <p className="text-xs text-[#7C8DB0]">
                    ...and {verification.l2.mismatches.length - 5} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* L3 Details */}
        {verification.l3 && verification.l3.notarized && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Level 3 — Notarization</h3>
            <CheckItem passed label={`Notarized by ${verification.l3.provider}`} />
            {verification.l3.notarizationTimestamp && (
              <p className="text-xs text-[#7C8DB0] mt-2">
                Timestamp: {new Date(verification.l3.notarizationTimestamp).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Trade Summary */}
        {report.body.trades.length > 0 && (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">
              Trade Summary ({report.body.trades.length} trades)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#7C8DB0] border-b border-[rgba(79,70,229,0.1)]">
                    <th className="text-left py-2 pr-4">Ticket</th>
                    <th className="text-left py-2 pr-4">Symbol</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-right py-2">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {report.body.trades.slice(0, 20).map((trade, i) => (
                    <tr key={i} className="border-b border-[rgba(79,70,229,0.05)]">
                      <td className="py-1.5 pr-4 text-[#CBD5E1] font-mono">{trade.ticket}</td>
                      <td className="py-1.5 pr-4 text-[#CBD5E1]">{trade.symbol}</td>
                      <td className="py-1.5 pr-4 text-[#CBD5E1]">{trade.type}</td>
                      <td
                        className={`py-1.5 text-right font-medium ${trade.profit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                      >
                        ${trade.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.body.trades.length > 20 && (
                <p className="text-xs text-[#7C8DB0] mt-2">
                  Showing 20 of {report.body.trades.length} trades
                </p>
              )}
            </div>
          </div>
        )}

        {/* Verification Summary */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-white mb-2">Verification Summary</h3>
          <p className="text-xs text-[#7C8DB0]">{verification.summary}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[#7C8DB0]">Report Period</p>
              <p className="text-[#CBD5E1]">
                {new Date(report.manifest.fromTimestamp).toLocaleDateString()} —{" "}
                {new Date(report.manifest.toTimestamp).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-[#7C8DB0]">Generated At</p>
              <p className="text-[#CBD5E1]">
                {new Date(report.manifest.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

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
