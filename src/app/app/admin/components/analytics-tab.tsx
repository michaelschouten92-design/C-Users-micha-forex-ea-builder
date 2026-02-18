"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface StatsData {
  signups: { date: string; count: number }[];
  webhookEventsLast24h: number;
}

interface UserData {
  email: string;
  referralCode?: string;
  referredBy?: string;
  subscription: { tier: string };
}

interface ReferralStat {
  email: string;
  referralCode: string;
  referred: number;
  paidConverted: number;
}

interface FunnelStep {
  label: string;
  count: number;
}

interface FeatureUsage {
  type: string;
  count: number;
}

// Categorize node types by color
const NODE_CATEGORY_COLORS: Record<string, string> = {
  // Indicators
  MA: "bg-blue-500",
  RSI: "bg-blue-500",
  MACD: "bg-blue-500",
  Bollinger: "bg-blue-500",
  ATR: "bg-blue-500",
  Stochastic: "bg-blue-500",
  // Entry strategies
  Buy: "bg-emerald-500",
  Sell: "bg-emerald-500",
  Entry: "bg-emerald-500",
  Signal: "bg-emerald-500",
  // Risk management
  StopLoss: "bg-red-500",
  TakeProfit: "bg-red-500",
  TrailingStop: "bg-red-500",
  // Default
  default: "bg-[#4F46E5]",
};

function getNodeColor(type: string): string {
  for (const [key, color] of Object.entries(NODE_CATEGORY_COLORS)) {
    if (key !== "default" && type.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }
  return NODE_CATEGORY_COLORS.default;
}

export function AnalyticsTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStat[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, usersRes, funnelRes, usageRes] = await Promise.all([
          apiClient.get<StatsData>("/api/admin/stats"),
          apiClient.get<{ data: UserData[] }>("/api/admin/users"),
          apiClient
            .get<{ funnel: FunnelStep[] }>("/api/admin/funnel")
            .catch(() => ({ funnel: [] })),
          apiClient
            .get<{ data: FeatureUsage[] }>("/api/admin/feature-usage")
            .catch(() => ({ data: [] })),
        ]);
        setStats(statsRes);
        setFunnel(funnelRes.funnel);
        setFeatureUsage(usageRes.data);

        // Calculate referral stats from users data
        const usersWithReferralCode = usersRes.data.filter((u) => u.referralCode);
        const referralMap: Record<string, ReferralStat> = {};

        for (const user of usersWithReferralCode) {
          referralMap[user.referralCode!] = {
            email: user.email,
            referralCode: user.referralCode!,
            referred: 0,
            paidConverted: 0,
          };
        }

        for (const user of usersRes.data) {
          if (user.referredBy && referralMap[user.referredBy]) {
            referralMap[user.referredBy].referred++;
            if (user.subscription.tier !== "FREE") {
              referralMap[user.referredBy].paidConverted++;
            }
          }
        }

        setReferralStats(
          Object.values(referralMap)
            .filter((r) => r.referred > 0)
            .sort((a, b) => b.referred - a.referred)
        );
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-[#94A3B8] py-8 text-center">Loading analytics...</div>;
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-3">Failed to load analytics data</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-[#A78BFA] hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const maxSignup = Math.max(...stats.signups.map((s) => s.count), 1);
  const maxFunnel = funnel.length > 0 ? funnel[0].count : 1;
  const maxFeature = featureUsage.length > 0 ? featureUsage[0].count : 1;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Analytics</h2>

      {/* Conversion Funnel */}
      {funnel.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-3">Conversion Funnel</h3>
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4 space-y-3">
            {funnel.map((step, i) => {
              const widthPct = Math.max(5, (step.count / maxFunnel) * 100);
              const pct =
                i === 0 ? "100%" : `${((step.count / funnel[0].count) * 100).toFixed(1)}%`;
              return (
                <div key={step.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{step.label}</span>
                    <span className="text-[#94A3B8]">
                      {step.count.toLocaleString()} ({pct})
                    </span>
                  </div>
                  <div className="w-full h-6 bg-[#0F0318] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#4F46E5] to-[#A78BFA] rounded-full transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Signup chart */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Signups (Last 30 Days)</h3>
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          {stats.signups.length === 0 ? (
            <div className="text-[#64748B] text-sm text-center py-4">No signup data</div>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {stats.signups.map((day) => {
                const heightPct = (day.count / maxSignup) * 100;
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center justify-end group relative"
                  >
                    <div
                      className="w-full bg-[#4F46E5] rounded-t hover:bg-[#A78BFA] transition-colors min-h-[2px]"
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="absolute -top-8 bg-[#0F0318] border border-[rgba(79,70,229,0.3)] px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                      {day.date}: {day.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between mt-2 text-xs text-[#64748B]">
            <span>{stats.signups[0]?.date || ""}</span>
            <span>{stats.signups[stats.signups.length - 1]?.date || ""}</span>
          </div>
        </div>
      </div>

      {/* Feature Usage Analytics */}
      {featureUsage.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-3">Feature Usage (Top Node Types)</h3>
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4 space-y-2">
            {featureUsage.slice(0, 20).map((feat) => {
              const widthPct = Math.max(3, (feat.count / maxFeature) * 100);
              return (
                <div key={feat.type} className="flex items-center gap-3">
                  <span className="text-xs text-[#94A3B8] w-36 truncate text-right font-mono">
                    {feat.type}
                  </span>
                  <div className="flex-1 h-5 bg-[#0F0318] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getNodeColor(feat.type)} rounded-full transition-all`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-white w-12 text-right">{feat.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* System health */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
            <div className="text-sm text-[#94A3B8]">Webhook Events (24h)</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.webhookEventsLast24h}</div>
          </div>
        </div>
      </div>

      {/* Referral stats */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Referral Tracking</h3>
        {referralStats.length === 0 ? (
          <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-6 text-center text-[#64748B]">
            No referrals yet
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A0626]/60 border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Referrer</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Code</th>
                  <th className="text-right px-4 py-3 text-[#94A3B8] font-medium">Referred</th>
                  <th className="text-right px-4 py-3 text-[#94A3B8] font-medium">
                    Converted to Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {referralStats.map((ref) => (
                  <tr
                    key={ref.referralCode}
                    className="border-b border-[rgba(79,70,229,0.1)] hover:bg-[rgba(79,70,229,0.05)] transition-colors"
                  >
                    <td className="px-4 py-3 text-white">{ref.email}</td>
                    <td className="px-4 py-3 text-[#A78BFA] font-mono text-xs">
                      {ref.referralCode}
                    </td>
                    <td className="px-4 py-3 text-right text-[#CBD5E1]">{ref.referred}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{ref.paidConverted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
