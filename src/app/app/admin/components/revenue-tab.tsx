"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface StatsData {
  mrr: number;
  arr: number;
  paidSubscribers: number;
  usersByTier: Record<string, number>;
  churn: number;
  cancelledCount: number;
  totalSubCount: number;
  churnRiskCount: number;
}

interface SubscriptionRow {
  email: string;
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  lastLoginAt?: string | null;
  churnRisk?: boolean;
}

export function RevenueTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, usersRes] = await Promise.all([
          apiClient.get<StatsData>("/api/admin/stats"),
          apiClient.get<{
            data: {
              email: string;
              lastLoginAt?: string | null;
              subscription: { tier: string; status: string; currentPeriodEnd?: string };
              churnRisk?: boolean;
            }[];
          }>("/api/admin/users"),
        ]);
        setStats(statsRes);
        setSubscriptions(
          usersRes.data
            .filter((u) => u.subscription)
            .map((u) => ({
              email: u.email,
              tier: u.subscription.tier,
              status: u.subscription.status,
              currentPeriodEnd: u.subscription.currentPeriodEnd || null,
              lastLoginAt: u.lastLoginAt,
              churnRisk: u.churnRisk,
            }))
        );
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-[#94A3B8] py-8 text-center">Loading revenue data...</div>;
  }

  if (!stats) {
    return <div className="text-red-400 py-8 text-center">Failed to load stats</div>;
  }

  const totalTierUsers = Object.values(stats.usersByTier).reduce((a, b) => a + b, 0) || 1;

  const STATUS_COLORS: Record<string, string> = {
    active: "text-emerald-400",
    trialing: "text-blue-400",
    past_due: "text-red-400",
    cancelled: "text-[#64748B]",
  };

  // Sort: past_due first, then trialing, then cancelled, then active
  const statusOrder: Record<string, number> = { past_due: 0, trialing: 1, cancelled: 2, active: 3 };
  const sortedSubs = [...subscriptions].sort(
    (a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Revenue Dashboard</h2>

      {/* Top cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">MRR</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            &euro;{stats.mrr.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">ARR</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            &euro;{stats.arr.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Paying Subscribers</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.paidSubscribers}</div>
        </div>
        <div className="rounded-lg border border-[rgba(79,70,229,0.2)] bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Churn Rate</div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {(stats.churn * 100).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-[#1A0626]/60 p-4">
          <div className="text-sm text-[#94A3B8]">Churn Risk</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.churnRiskCount}</div>
        </div>
      </div>

      {/* Tier breakdown bar */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Tier Breakdown</h3>
        <div className="flex h-8 rounded-lg overflow-hidden border border-[rgba(79,70,229,0.2)]">
          {(["FREE", "PRO", "ELITE"] as const).map((tier) => {
            const count = stats.usersByTier[tier] || 0;
            const pct = (count / totalTierUsers) * 100;
            if (pct === 0) return null;
            const colors: Record<string, string> = {
              FREE: "bg-[#64748B]",
              PRO: "bg-[#4F46E5]",
              ELITE: "bg-[#A78BFA]",
            };
            return (
              <div
                key={tier}
                className={`${colors[tier]} flex items-center justify-center text-xs text-white font-medium`}
                style={{ width: `${pct}%` }}
                title={`${tier}: ${count} users (${pct.toFixed(1)}%)`}
              >
                {pct > 8 && `${tier} ${count}`}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2">
          {(["FREE", "PRO", "ELITE"] as const).map((tier) => {
            const count = stats.usersByTier[tier] || 0;
            const dotColors: Record<string, string> = {
              FREE: "bg-[#64748B]",
              PRO: "bg-[#4F46E5]",
              ELITE: "bg-[#A78BFA]",
            };
            return (
              <span key={tier} className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                <span className={`w-2 h-2 rounded-full ${dotColors[tier]}`} />
                {tier}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Churn Risk Section */}
      {subscriptions.some((s) => s.churnRisk) && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-3">Churn Risk Users</h3>
          <div className="overflow-x-auto rounded-lg border border-amber-500/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A0626]/60 border-b border-amber-500/20">
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Tier</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Last Login</th>
                  <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Period End</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions
                  .filter((s) => s.churnRisk)
                  .map((sub, i) => (
                    <tr key={i} className="border-b border-amber-500/10">
                      <td className="px-4 py-3 text-white">{sub.email}</td>
                      <td className="px-4 py-3 text-[#A78BFA]">{sub.tier}</td>
                      <td className="px-4 py-3 text-[#94A3B8]">
                        {sub.lastLoginAt ? new Date(sub.lastLoginAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-[#94A3B8]">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscription lifecycle table */}
      <h3 className="text-lg font-semibold text-white mb-3">Subscription Lifecycle</h3>
      <div className="overflow-x-auto rounded-lg border border-[rgba(79,70,229,0.2)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1A0626]/60 border-b border-[rgba(79,70,229,0.2)]">
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Email</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Tier</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Status</th>
              <th className="text-left px-4 py-3 text-[#94A3B8] font-medium">Period End</th>
              <th className="text-right px-4 py-3 text-[#94A3B8] font-medium">Days Left</th>
            </tr>
          </thead>
          <tbody>
            {sortedSubs.map((sub, i) => {
              const daysLeft = sub.currentPeriodEnd
                ? Math.ceil(
                    (new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                : null;
              return (
                <tr
                  key={i}
                  className="border-b border-[rgba(79,70,229,0.1)] hover:bg-[rgba(79,70,229,0.05)] transition-colors"
                >
                  <td className="px-4 py-3 text-white">{sub.email}</td>
                  <td className="px-4 py-3 text-[#A78BFA]">{sub.tier}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_COLORS[sub.status] || "text-[#94A3B8]"}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">
                    {sub.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {daysLeft !== null ? (
                      <span
                        className={daysLeft <= 3 ? "text-red-400 font-medium" : "text-[#94A3B8]"}
                      >
                        {daysLeft}d
                      </span>
                    ) : (
                      <span className="text-[#64748B]">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
