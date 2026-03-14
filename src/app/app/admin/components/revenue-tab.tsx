"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { TIERS, TIER_LABELS, TIER_DOT_COLORS } from "../admin-constants";

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

interface RevenueSnapshot {
  date: string;
  mrr: number;
  arr: number;
  paidCount: number;
  freeCount: number;
  proCount: number;
  eliteCount: number;
  churnRate: number;
}

interface SharedUserData {
  email: string;
  lastLoginAt?: string | null;
  subscription: { tier: string; status: string; currentPeriodEnd?: string };
  churnRisk?: boolean;
}

interface RevenueTabProps {
  sharedUsers?: SharedUserData[];
}

function MRRChart({ snapshots }: { snapshots: RevenueSnapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-[#A1A1AA] text-sm">
        Not enough data for chart (run daily cron to collect data)
      </div>
    );
  }

  const mrrs = snapshots.map((s) => s.mrr);
  const minMrr = Math.min(...mrrs);
  const maxMrr = Math.max(...mrrs);
  const range = maxMrr - minMrr || 1;

  const width = 600;
  const height = 140;
  const padding = 4;

  const points = snapshots.map((s, i) => {
    const x = padding + (i / (snapshots.length - 1)) * (width - padding * 2);
    const y = height - padding - ((s.mrr - minMrr) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const isPositive = mrrs[mrrs.length - 1] >= mrrs[0];

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${padding},${height - padding} ${points.join(" ")} ${width - padding},${height - padding}`}
          fill="url(#mrrGrad)"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={isPositive ? "#10B981" : "#EF4444"}
          strokeWidth="2"
        />
      </svg>
      <div className="flex justify-between text-xs text-[#A1A1AA] mt-1 px-1">
        <span>{new Date(snapshots[0].date).toLocaleDateString()}</span>
        <span>
          &euro;{minMrr.toLocaleString()} - &euro;{maxMrr.toLocaleString()}
        </span>
        <span>{new Date(snapshots[snapshots.length - 1].date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export function RevenueTab({ sharedUsers }: RevenueTabProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<RevenueSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const fetches: [Promise<StatsData>, Promise<{ data: RevenueSnapshot[] }>] = [
          apiClient.get<StatsData>("/api/admin/stats"),
          apiClient.get<{ data: RevenueSnapshot[] }>("/api/admin/revenue-history"),
        ];

        const usersPromise = sharedUsers
          ? Promise.resolve(sharedUsers)
          : apiClient.get<{ data: SharedUserData[] }>("/api/admin/users").then((res) => res.data);

        const [statsRes, historyRes, usersData] = await Promise.all([...fetches, usersPromise]);

        setStats(statsRes);
        setRevenueHistory(historyRes.data);
        setSubscriptions(
          usersData
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
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [sharedUsers]);

  if (loading) {
    return <div className="text-[#A1A1AA] py-8 text-center">Loading revenue data...</div>;
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-3">Failed to load revenue data</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-[#818CF8] hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalTierUsers = Object.values(stats.usersByTier).reduce((a, b) => a + b, 0) || 1;

  const STATUS_COLORS: Record<string, string> = {
    active: "text-emerald-400",
    trialing: "text-blue-400",
    past_due: "text-red-400",
    cancelled: "text-[#71717A]",
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
        <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4">
          <div className="text-sm text-[#A1A1AA]">MRR</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            &euro;{stats.mrr.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4">
          <div className="text-sm text-[#A1A1AA]">ARR</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            &euro;{stats.arr.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4">
          <div className="text-sm text-[#A1A1AA]">Paying Subscribers</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.paidSubscribers}</div>
        </div>
        <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4">
          <div className="text-sm text-[#A1A1AA]">Churn Rate</div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {(stats.churn * 100).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-[#111114] p-4">
          <div className="text-sm text-[#A1A1AA]">Churn Risk</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.churnRiskCount}</div>
        </div>
      </div>

      {/* MRR Trend Chart */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">MRR Trend</h3>
        <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4">
          <MRRChart snapshots={revenueHistory} />
        </div>
      </div>

      {/* Tier breakdown bar */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Tier Breakdown</h3>
        <div className="flex h-8 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)]">
          {TIERS.map((tier) => {
            const count = stats.usersByTier[tier] || 0;
            const pct = (count / totalTierUsers) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={tier}
                className={`${TIER_DOT_COLORS[tier]} flex items-center justify-center text-xs text-white font-medium`}
                style={{ width: `${pct}%` }}
                title={`${TIER_LABELS[tier]}: ${count} users (${pct.toFixed(1)}%)`}
              >
                {pct > 8 && `${TIER_LABELS[tier]} ${count}`}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2">
          {TIERS.map((tier) => {
            const count = stats.usersByTier[tier] || 0;
            return (
              <span key={tier} className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                <span className={`w-2 h-2 rounded-full ${TIER_DOT_COLORS[tier]}`} />
                {TIER_LABELS[tier]}: {count}
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
                <tr className="bg-[#111114] border-b border-amber-500/20">
                  <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Tier</th>
                  <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Last Login</th>
                  <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Period End</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions
                  .filter((s) => s.churnRisk)
                  .map((sub, i) => (
                    <tr key={i} className="border-b border-amber-500/10">
                      <td className="px-4 py-3 text-white">{sub.email}</td>
                      <td className="px-4 py-3 text-[#818CF8]">{sub.tier}</td>
                      <td className="px-4 py-3 text-[#A1A1AA]">
                        {sub.lastLoginAt ? new Date(sub.lastLoginAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-[#A1A1AA]">
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
      <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#111114] border-b border-[rgba(255,255,255,0.06)]">
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Email</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Tier</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Status</th>
              <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Period End</th>
              <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">Days Left</th>
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
                  className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <td className="px-4 py-3 text-white">{sub.email}</td>
                  <td className="px-4 py-3 text-[#818CF8]">{sub.tier}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_COLORS[sub.status] || "text-[#A1A1AA]"}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA]">
                    {sub.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {daysLeft !== null ? (
                      <span
                        className={daysLeft <= 3 ? "text-red-400 font-medium" : "text-[#A1A1AA]"}
                      >
                        {daysLeft}d
                      </span>
                    ) : (
                      <span className="text-[#71717A]">-</span>
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
