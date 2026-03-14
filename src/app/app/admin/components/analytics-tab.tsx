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

interface AnalyticsTabProps {
  sharedUsers: UserData[];
}

export function AnalyticsTab({ sharedUsers }: AnalyticsTabProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, usersData] = await Promise.all([
          apiClient.get<StatsData>("/api/admin/stats"),
          Promise.resolve(sharedUsers),
        ]);
        setStats(statsRes);

        // Calculate referral stats from users data
        const usersWithReferralCode = usersData.filter((u) => u.referralCode);
        const referralMap: Record<string, ReferralStat> = {};

        for (const user of usersWithReferralCode) {
          referralMap[user.referralCode!] = {
            email: user.email,
            referralCode: user.referralCode!,
            referred: 0,
            paidConverted: 0,
          };
        }

        for (const user of usersData) {
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
  }, [sharedUsers]);

  if (loading) {
    return <div className="text-[#A1A1AA] py-8 text-center">Loading analytics...</div>;
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-3">Failed to load analytics data</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-[#818CF8] hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const maxSignup = Math.max(...stats.signups.map((s) => s.count), 1);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Analytics</h2>

      {/* Signup chart */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Signups (Last 30 Days)</h3>
        <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4">
          {stats.signups.length === 0 ? (
            <div className="text-[#71717A] text-sm text-center py-4">No signup data</div>
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
                      className="w-full bg-[#6366F1] rounded-t hover:bg-[#818CF8] transition-colors min-h-[2px]"
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="absolute -top-8 bg-[#09090B] border border-[rgba(255,255,255,0.10)] px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                      {day.date}: {day.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between mt-2 text-xs text-[#71717A]">
            <span>{stats.signups[0]?.date || ""}</span>
            <span>{stats.signups[stats.signups.length - 1]?.date || ""}</span>
          </div>
        </div>
      </div>

      {/* System health */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4">
            <div className="text-sm text-[#A1A1AA]">Webhook Events (24h)</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.webhookEventsLast24h}</div>
          </div>
        </div>
      </div>

      {/* Referral stats */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Referral Tracking</h3>
        {referralStats.length === 0 ? (
          <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6 text-center text-[#71717A]">
            No referrals yet
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#111114] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Referrer</th>
                  <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Code</th>
                  <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">Referred</th>
                  <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">
                    Converted to Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {referralStats.map((ref) => (
                  <tr
                    key={ref.referralCode}
                    className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                  >
                    <td className="px-4 py-3 text-white">{ref.email}</td>
                    <td className="px-4 py-3 text-[#818CF8] font-mono text-xs">
                      {ref.referralCode}
                    </td>
                    <td className="px-4 py-3 text-right text-[#FAFAFA]">{ref.referred}</td>
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
