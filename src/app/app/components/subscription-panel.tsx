"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError, showSuccess } from "@/lib/toast";

type SubscriptionPanelProps = {
  tier: "FREE" | "PRO" | "ELITE";
  subscriptionStatus?: string;
  projectCount: number;
  exportCount: number;
  hasStripeSubscription: boolean;
  currentPeriodEnd?: string | null;
};

export function SubscriptionPanel({
  tier,
  subscriptionStatus,
  projectCount,
  exportCount,
  hasStripeSubscription,
  currentPeriodEnd,
}: SubscriptionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"downgrade" | "cancel" | null>(null);
  const [cancelPeriodEnd, setCancelPeriodEnd] = useState<string | null>(null);
  const plan = PLANS[tier];

  const projectLimit = plan.limits.maxProjects;
  const exportLimit = plan.limits.maxExportsPerMonth;

  const projectPercentage =
    projectLimit === Infinity || projectLimit <= 0 ? 0 : (projectCount / projectLimit) * 100;
  const exportPercentage =
    exportLimit === Infinity || exportLimit <= 0 ? 0 : (exportCount / exportLimit) * 100;

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

  async function handleDowngradeToPro() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ plan: "PRO", interval: "monthly" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error || "Failed to change plan. Please try again.");
        return;
      }
      showSuccess("Plan changed to Pro", "Your account has been updated with prorated credit.");
      // Reload to reflect the new tier
      window.location.reload();
    } catch {
      showError("Failed to change plan. Please try again.");
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }

  async function handleCancelSubscription() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: getCsrfHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error || "Failed to cancel subscription. Please try again.");
        return;
      }
      const data = await res.json();
      if (data.periodEnd) {
        setCancelPeriodEnd(data.periodEnd);
      }
      showSuccess(
        "Subscription cancelled",
        `You'll keep access until ${data.periodEnd ? formatDate(data.periodEnd) : "the end of your billing period"}.`
      );
    } catch {
      showError("Failed to cancel subscription. Please try again.");
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const periodEndDisplay = cancelPeriodEnd || currentPeriodEnd;

  return (
    <>
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Plan Info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{plan.name} Plan</h3>
              {tier !== "FREE" && subscriptionStatus === "active" && (
                <span
                  className={`text-xs text-white px-2 py-0.5 rounded-full ${tier === "ELITE" ? "bg-[#A78BFA]" : "bg-[#4F46E5]"}`}
                >
                  Active
                </span>
              )}
              {tier !== "FREE" && subscriptionStatus === "trialing" && (
                <span className="text-xs text-white px-2 py-0.5 rounded-full bg-[#22D3EE]">
                  Trial
                </span>
              )}
              {tier !== "FREE" && subscriptionStatus === "past_due" && (
                <span className="text-xs text-white px-2 py-0.5 rounded-full bg-[#F59E0B]">
                  Past Due
                </span>
              )}
            </div>
            {tier !== "FREE" && subscriptionStatus === "past_due" && (
              <div className="mt-2 p-3 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg">
                <p className="text-sm text-[#F59E0B]">
                  Your payment failed. Please{" "}
                  <button
                    onClick={handleManageSubscription}
                    className="underline font-medium hover:text-white"
                  >
                    update your payment method
                  </button>{" "}
                  to keep your {plan.name} access.
                </p>
              </div>
            )}
            {cancelPeriodEnd && (
              <div className="mt-2 p-3 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg">
                <p className="text-sm text-[#F59E0B]">
                  Your subscription will end on{" "}
                  <span className="font-medium">{formatDate(cancelPeriodEnd)}</span>. You&apos;ll
                  keep full access until then.
                </p>
              </div>
            )}
            <p className="text-sm text-[#94A3B8]">
              {tier === "FREE"
                ? "Upgrade for unlimited projects, unlimited exports, and priority support."
                : tier === "PRO"
                  ? "Unlimited MQL5 exports. Upgrade to Elite for 1-on-1 strategy reviews and direct developer support."
                  : "You have access to all features including unlimited MQL5 exports."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2">
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
                Upgrade
              </Link>
            ) : (
              <>
                {tier === "PRO" && (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 bg-[#A78BFA] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#8B5CF6] transition-all duration-200 hover:shadow-[0_0_16px_rgba(167,139,250,0.3)]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                    Upgrade to Elite
                  </Link>
                )}
                {tier === "ELITE" && hasStripeSubscription && (
                  <button
                    onClick={() => setConfirmAction("downgrade")}
                    disabled={loading || !!cancelPeriodEnd}
                    className="inline-flex items-center gap-2 border border-[rgba(245,158,11,0.5)] text-[#F59E0B] px-5 py-2.5 rounded-lg font-medium hover:bg-[rgba(245,158,11,0.1)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                    Downgrade to Pro
                  </button>
                )}
                {hasStripeSubscription && !cancelPeriodEnd && (
                  <button
                    onClick={() => setConfirmAction("cancel")}
                    disabled={loading}
                    className="inline-flex items-center gap-2 border border-[rgba(239,68,68,0.4)] text-[#EF4444] px-5 py-2.5 rounded-lg font-medium hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Cancel Subscription
                  </button>
                )}
                {hasStripeSubscription && (
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
                )}
              </>
            )}
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
              <div
                className="h-2 bg-[#1E293B] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={projectCount}
                aria-valuemin={0}
                aria-valuemax={projectLimit}
                aria-label={`Projects: ${projectCount} of ${projectLimit}`}
              >
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
              <div
                className="h-2 bg-[#1E293B] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={exportCount}
                aria-valuemin={0}
                aria-valuemax={exportLimit}
                aria-label={`Exports: ${exportCount} of ${exportLimit}`}
              >
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
            {tier === "FREE" && exportLimit !== Infinity && exportPercentage < 80 && (
              <p className="text-xs text-[#64748B] mt-1">
                Free plan: 1 export per month. Resets on the 1st.
              </p>
            )}
          </div>
        </div>

        {/* Feature Highlight */}
        {tier === "FREE" && (
          <div className="mt-4 p-3 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] rounded-lg">
            <p className="text-xs text-[#A78BFA]">
              <span className="font-medium">Upgrade to unlock:</span> Unlimited projects, unlimited
              exports and priority support
            </p>
          </div>
        )}
        {tier === "PRO" && (
          <div className="mt-4 p-3 bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)] rounded-lg">
            <p className="text-xs text-[#A78BFA]">
              <span className="font-medium">Elite includes:</span> 1-on-1 strategy review sessions,
              priority feature requests, direct developer support, and weekly Elite members call
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setConfirmAction(null)}
        >
          <div
            className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmAction === "downgrade" ? (
              <>
                <h3 className="text-lg font-semibold text-white mb-3">Downgrade to Pro?</h3>
                <p className="text-sm text-[#94A3B8] mb-4">
                  You&apos;ll lose Elite features including Strategy Health Monitor, edge
                  degradation alerts, AI Strategy Optimizer, 1-on-1 strategy reviews, and the weekly
                  Elite members call. Your plan will change to Pro immediately with prorated credit
                  for unused time.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-[#CBD5E1] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors disabled:opacity-50"
                  >
                    Keep Elite
                  </button>
                  <button
                    onClick={handleDowngradeToPro}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-white bg-[#F59E0B] rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading && (
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
                    )}
                    Downgrade to Pro
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white mb-3">Cancel Subscription?</h3>
                <p className="text-sm text-[#94A3B8] mb-4">
                  Your access continues until{" "}
                  <span className="text-white font-medium">
                    {periodEndDisplay
                      ? formatDate(periodEndDisplay)
                      : "the end of your billing period"}
                  </span>
                  . After that, Free plan limits will apply (1 project, 3 exports/month). Your
                  existing projects won&apos;t be deleted.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-[#CBD5E1] border border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors disabled:opacity-50"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-white bg-[#EF4444] rounded-lg hover:bg-[#DC2626] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading && (
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
                    )}
                    Cancel Subscription
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
