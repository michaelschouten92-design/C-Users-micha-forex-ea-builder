"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { LadderLevel } from "@prisma/client";

interface ProfileData {
  profile: { handle: string; memberSince: string };
  trustScore: number;
  trustBreakdown: {
    levelPoints: number;
    healthPoints: number;
    depthPoints: number;
    consistencyPoints: number;
  };
  level: LadderLevel;
  levelMeta: { label: string; color: string; description: string };
  badges: Array<{ id: string; label: string; description: string; earned: boolean }>;
  stats: { totalStrategies: number; verifiedMonths: number; totalLiveTrades: number };
  proofs: Array<{
    strategyId: string;
    slug: string;
    name: string;
    description: string | null;
    ladderLevel: LadderLevel;
    ladderMeta: { label: string; color: string };
    healthScore: number | null;
    liveTrades: number;
    symbol: string | null;
    timeframe: string | null;
  }>;
}

function TrustScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1A0626" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-[#7C8DB0] uppercase tracking-wider">Trust</span>
      </div>
    </div>
  );
}

export function TraderProfileView({ handle }: { handle: string }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profile/${handle}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
    fetch("/api/proof/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "profile_view", meta: { handle } }),
    }).catch(() => {});
  }, [handle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-3xl px-6">
          <div className="h-32 bg-[#1A0626] rounded-xl w-64 mx-auto" />
          <div className="h-48 bg-[#1A0626] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Trader Not Found</h1>
          <p className="text-[#7C8DB0]">This profile does not exist or has no public strategies.</p>
        </div>
      </div>
    );
  }

  const { profile, trustScore, level, levelMeta, badges, stats, proofs } = data;

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
          <TrustScoreRing score={trustScore} />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">@{profile.handle}</h1>
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                style={{
                  borderColor: `${levelMeta.color}40`,
                  backgroundColor: `${levelMeta.color}15`,
                  color: levelMeta.color,
                }}
              >
                {levelMeta.label}
              </span>
              <span className="text-xs text-[#7C8DB0]">
                Member since {new Date(profile.memberSince).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-[#94A3B8]">{levelMeta.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.totalStrategies}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Strategies</p>
          </div>
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.verifiedMonths}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Verified Months</p>
          </div>
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {stats.totalLiveTrades.toLocaleString()}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Live Trades</p>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {badges.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-full text-xs text-[#A78BFA] font-medium"
                title={b.description}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Proof Cards */}
        <h2 className="text-lg font-semibold text-white mb-4">Verified Strategies</h2>
        {proofs.length === 0 ? (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-8 text-center">
            <p className="text-[#7C8DB0]">No public strategies yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proofs.map((p) => (
              <Link
                key={p.strategyId}
                href={`/proof/${p.strategyId}`}
                className="block bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 hover:border-[rgba(79,70,229,0.4)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{p.name}</h3>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        style={{
                          borderColor: `${p.ladderMeta.color}40`,
                          backgroundColor: `${p.ladderMeta.color}15`,
                          color: p.ladderMeta.color,
                        }}
                      >
                        {p.ladderMeta.label}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-[#7C8DB0] mb-1">{p.description}</p>
                    )}
                    <div className="flex gap-3 text-xs text-[#94A3B8]">
                      {p.symbol && <span>{p.symbol}</span>}
                      {p.timeframe && <span>{p.timeframe}</span>}
                      {p.liveTrades > 0 && <span>{p.liveTrades} live trades</span>}
                    </div>
                  </div>
                  {p.healthScore !== null && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{p.healthScore}</p>
                      <p className="text-[10px] text-[#7C8DB0]">Health</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center pt-8 border-t border-[rgba(79,70,229,0.1)] mt-8">
          <p className="text-sm text-[#7C8DB0] mb-3">Build and prove your own trading edge</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-xl hover:bg-[#4338CA] transition-colors"
          >
            Start Building
          </Link>
        </div>
      </div>
    </div>
  );
}
