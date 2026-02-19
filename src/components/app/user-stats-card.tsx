"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { PLANS } from "@/lib/plans";

type UserStatsCardProps = {
  tier: "FREE" | "PRO" | "ELITE";
};

interface StatsData {
  exportsThisMonth: number;
  totalProjects: number;
  liveEAs: number;
  templatesUsed: number;
  memberSince: string | null;
}

export function UserStatsCard({ tier }: UserStatsCardProps) {
  const { data, isLoading } = useSWR<StatsData>("/api/user/stats", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const plan = PLANS[tier];
  const exportLimit = plan.limits.maxExportsPerMonth;
  const exportsUsed = data?.exportsThisMonth ?? 0;
  const exportPercentage = exportLimit === Infinity ? 0 : (exportsUsed / exportLimit) * 100;

  function formatMemberSince(dateStr: string | null): string {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  if (isLoading) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-[#1E293B] rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-3 bg-[#1E293B] rounded w-2/3 mb-2" />
              <div className="h-6 bg-[#1E293B] rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
        Your Activity
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* Exports This Month */}
        <div>
          <p className="text-xs text-[#7C8DB0] mb-1">Exports This Month</p>
          <p className="text-xl font-bold text-white">
            {exportsUsed}
            {exportLimit !== Infinity && (
              <span className="text-sm font-normal text-[#7C8DB0]"> / {exportLimit}</span>
            )}
          </p>
          {exportLimit !== Infinity && (
            <div className="mt-2">
              <div
                className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={exportsUsed}
                aria-valuemin={0}
                aria-valuemax={exportLimit}
                aria-label={`Exports: ${exportsUsed} of ${exportLimit}`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    exportPercentage >= 100
                      ? "bg-[#EF4444]"
                      : exportPercentage >= 80
                        ? "bg-[#F59E0B]"
                        : "bg-[#22D3EE]"
                  }`}
                  style={{
                    width: `${Math.min(exportPercentage, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Total Projects */}
        <div>
          <p className="text-xs text-[#7C8DB0] mb-1">Projects</p>
          <p className="text-xl font-bold text-white">{data?.totalProjects ?? 0}</p>
        </div>

        {/* Active Live EAs */}
        <div>
          <p className="text-xs text-[#7C8DB0] mb-1">Live EAs</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-white">{data?.liveEAs ?? 0}</p>
            {(data?.liveEAs ?? 0) > 0 && (
              <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
            )}
          </div>
        </div>

        {/* Templates Used */}
        <div>
          <p className="text-xs text-[#7C8DB0] mb-1">Templates</p>
          <p className="text-xl font-bold text-white">{data?.templatesUsed ?? 0}</p>
        </div>

        {/* Member Since */}
        <div>
          <p className="text-xs text-[#7C8DB0] mb-1">Member Since</p>
          <p className="text-sm font-medium text-[#CBD5E1]">
            {formatMemberSince(data?.memberSince ?? null)}
          </p>
        </div>
      </div>
    </div>
  );
}
