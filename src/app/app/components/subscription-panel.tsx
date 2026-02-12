"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

type SubscriptionPanelProps = {
  tier: "FREE" | "PRO" | "ELITE";
  projectCount: number;
  exportCount: number;
  hasStripeSubscription: boolean;
};

export function SubscriptionPanel({
  tier,
  projectCount,
  exportCount,
  hasStripeSubscription,
}: SubscriptionPanelProps) {
  const [loading, setLoading] = useState(false);
  const plan = PLANS[tier];

  const projectLimit = plan.limits.maxProjects;
  const exportLimit = plan.limits.maxExportsPerMonth;

  const projectPercentage = projectLimit === Infinity ? 0 : (projectCount / projectLimit) * 100;
  const exportPercentage = exportLimit === Infinity ? 0 : (exportCount / exportLimit) * 100;

  async function handleManageSubscription() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: getCsrfHeaders(),
      });
      if (!res.ok) {
        showError("Failed to open billing portal. Please try again.");
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      showError("Failed to open billing portal. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Plan Info */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">{plan.name} Plan</h3>
            {tier !== "FREE" && (
              <span
                className={`text-xs text-white px-2 py-0.5 rounded-full ${tier === "ELITE" ? "bg-[#A78BFA]" : "bg-[#4F46E5]"}`}
              >
                Active
              </span>
            )}
          </div>
          <p className="text-sm text-[#94A3B8]">
            {tier === "FREE"
              ? "Upgrade to Pro for unlimited projects, exports, and community access."
              : "You have access to all features."}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0">
          {tier === "FREE" ? (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-[#4F46E5] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              Upgrade to Pro
            </Link>
          ) : hasStripeSubscription ? (
            <button
              onClick={handleManageSubscription}
              disabled={loading}
              className="inline-flex items-center gap-2 border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-5 py-2.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading...
                </>
              ) : (
                "Manage Subscription"
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[rgba(79,70,229,0.2)]">
        {/* Projects Usage */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#94A3B8]">Projects</span>
            <span className="text-white">
              {projectCount} / {projectLimit === Infinity ? "\u221E" : projectLimit}
            </span>
          </div>
          {projectLimit !== Infinity && (
            <div className="h-2 bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  projectPercentage >= 100
                    ? "bg-[#EF4444]"
                    : projectPercentage >= 80
                      ? "bg-[#F59E0B]"
                      : "bg-[#22D3EE]"
                }`}
                style={{ width: `${Math.min(projectPercentage, 100)}%` }}
              />
            </div>
          )}
          {projectLimit !== Infinity && projectPercentage >= 80 && projectPercentage < 100 && (
            <p className="text-xs text-[#F59E0B] mt-1">
              {projectLimit - projectCount} project{projectLimit - projectCount !== 1 ? "s" : ""}{" "}
              remaining
            </p>
          )}
          {projectLimit !== Infinity && projectPercentage >= 100 && (
            <p className="text-xs text-[#EF4444] mt-1">
              Project limit reached —{" "}
              <Link href="/pricing" className="underline hover:text-white">
                upgrade
              </Link>
            </p>
          )}
          {projectLimit === Infinity && (
            <p className="text-xs text-[#22D3EE] font-medium">Unlimited</p>
          )}
        </div>

        {/* Exports Usage */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#94A3B8]">Exports this month</span>
            <span className="text-white">
              {exportCount} / {exportLimit === Infinity ? "\u221E" : exportLimit}
            </span>
          </div>
          {exportLimit !== Infinity && (
            <div className="h-2 bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  exportPercentage >= 100
                    ? "bg-[#EF4444]"
                    : exportPercentage >= 80
                      ? "bg-[#F59E0B]"
                      : "bg-[#22D3EE]"
                }`}
                style={{ width: `${Math.min(exportPercentage, 100)}%` }}
              />
            </div>
          )}
          {exportLimit !== Infinity && exportPercentage >= 80 && exportPercentage < 100 && (
            <p className="text-xs text-[#F59E0B] mt-1">
              {exportLimit - exportCount} export{exportLimit - exportCount !== 1 ? "s" : ""}{" "}
              remaining this month
            </p>
          )}
          {exportLimit !== Infinity && exportPercentage >= 100 && (
            <p className="text-xs text-[#EF4444] mt-1">
              Export limit reached —{" "}
              <Link href="/pricing" className="underline hover:text-white">
                upgrade
              </Link>
            </p>
          )}
          {exportLimit === Infinity && (
            <p className="text-xs text-[#22D3EE] font-medium">Unlimited</p>
          )}
        </div>
      </div>

      {/* Feature Highlight for Free */}
      {tier === "FREE" && (
        <div className="mt-4 p-3 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] rounded-lg">
          <p className="text-xs text-[#A78BFA]">
            <span className="font-medium">Upgrade to unlock:</span> Unlimited projects, unlimited
            exports, community access, and priority support
          </p>
        </div>
      )}
    </div>
  );
}
