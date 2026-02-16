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

export function AnalyticsTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, usersRes] = await Promise.all([
          apiClient.get<StatsData>("/api/admin/stats"),
          apiClient.get<{ data: UserData[] }>("/api/admin/users"),
        ]);
        setStats(statsRes);

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
        // ignore
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
    return <div className="text-red-400 py-8 text-center">Failed to load analytics</div>;
  }

  const maxSignup = Math.max(...stats.signups.map((s) => s.count), 1);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Analytics</h2>

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
