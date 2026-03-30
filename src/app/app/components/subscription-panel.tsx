"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, TIER_DISPLAY_NAMES, type PlanTier } from "@/lib/plans";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError, showSuccess } from "@/lib/toast";

type SubscriptionPanelProps = {
  tier: PlanTier;
  subscriptionStatus?: string;
  projectCount: number;
  exportCount: number;
  monitoredAccountCount: number;
  hasStripeSubscription: boolean;
  currentPeriodEnd?: string | null;
  scheduledDowngradeTier?: string | null;
  /** Server-resolved dynamic limits from DB (overrides hardcoded PLANS) */
  effectiveLimits?: {
    maxProjects: number;
    maxExportsPerMonth: number;
  };
};

export function SubscriptionPanel({
  tier,
  subscriptionStatus,
  projectCount,
  exportCount,
  monitoredAccountCount,
  hasStripeSubscription,
  currentPeriodEnd,
  scheduledDowngradeTier,
  effectiveLimits,
}: SubscriptionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"downgrade" | "cancel" | null>(null);
  const [cancelPeriodEnd, setCancelPeriodEnd] = useState<string | null>(null);
  const [pendingDowngrade, setPendingDowngrade] = useState<string | null>(
    scheduledDowngradeTier ?? null
  );
  const plan = PLANS[tier];

  // Determine the next lower tier for downgrade
  const tierOrder: PlanTier[] = ["FREE", "PRO", "ELITE", "INSTITUTIONAL"];
  const currentIndex = tierOrder.indexOf(tier);
  const downgradeTier: PlanTier | null = currentIndex > 1 ? tierOrder[currentIndex - 1] : null;

  const projectLimit = effectiveLimits?.maxProjects ?? plan.limits.maxProjects;
  const exportLimit = effectiveLimits?.maxExportsPerMonth ?? plan.limits.maxExportsPerMonth;
  const accountLimit = plan.limits.maxMonitoredTradingAccounts;

  const projectPercentage =
    projectLimit === Infinity || projectLimit <= 0 ? 0 : (projectCount / projectLimit) * 100;
  const exportPercentage =
    exportLimit === Infinity || exportLimit <= 0 ? 0 : (exportCount / exportLimit) * 100;
  const accountPercentage =
    accountLimit === Infinity || accountLimit <= 0
      ? 0
      : (monitoredAccountCount / accountLimit) * 100;

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

  async function handleDowngrade() {
    if (!downgradeTier) return;
    const targetName = PLANS[downgradeTier].name;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ plan: downgradeTier, interval: "monthly" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error || "Failed to change plan. Please try again.");
        return;
      }
      const data = await res.json();
      if (data.scheduled) {
        setPendingDowngrade(downgradeTier);
        showSuccess(
          "Downgrade scheduled",
          `Your plan will change to ${targetName} on ${data.effectiveDate ? formatDate(data.effectiveDate) : "the end of your billing period"}. You have full ${plan.name} access until then.`
        );
      } else {
        showSuccess(`Plan changed to ${targetName}`, "Your account has been updated.");
        window.location.reload();
      }
    } catch {
      showError("Failed to change plan. Please try again.");
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }

  async function handleCancelDowngrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/cancel-downgrade", {
        method: "POST",
        headers: getCsrfHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error || "Failed to cancel downgrade. Please try again.");
        return;
      }
      setPendingDowngrade(null);
      showSuccess("Downgrade cancelled", "Your current plan will continue.");
    } catch {
      showError("Failed to cancel downgrade. Please try again.");
    } finally {
      setLoading(false);
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
      <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Plan Info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{plan.name} Plan</h3>
              {tier !== "FREE" && subscriptionStatus === "active" && (
                <span
                  className={`text-xs text-white px-2 py-0.5 rounded-full ${tier === "ELITE" ? "bg-[#818CF8]" : "bg-[#6366F1]"}`}
                >
                  Active
                </span>
              )}
              {tier !== "FREE" && subscriptionStatus === "trialing" && (
                <span className="text-xs text-white px-2 py-0.5 rounded-full bg-[#6366F1]">
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
            {pendingDowngrade && !cancelPeriodEnd && (
              <div className="mt-2 p-3 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[#F59E0B]">
                    Your plan will change to{" "}
                    <span className="font-medium">
                      {PLANS[pendingDowngrade as keyof typeof PLANS]?.name ?? pendingDowngrade}
                    </span>
                    {currentPeriodEnd && (
                      <>
                        {" "}
                        on <span className="font-medium">{formatDate(currentPeriodEnd)}</span>
                      </>
                    )}
                    . You have full {PLANS[tier].name} access until then.
                  </p>
                  <button
                    onClick={handleCancelDowngrade}
                    disabled={loading}
                    className="flex-shrink-0 text-xs text-white bg-[rgba(245,158,11,0.3)] hover:bg-[rgba(245,158,11,0.5)] px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Keep Current Plan
                  </button>
                </div>
              </div>
            )}
            <p className="text-sm text-[#A1A1AA]">
              {tier === "FREE"
                ? "All features included. Upgrade to monitor more trading accounts."
                : tier === "INSTITUTIONAL"
                  ? "Unlimited monitored trading accounts with dedicated support."
                  : `All features included with ${plan.limits.maxMonitoredTradingAccounts} monitored trading account${plan.limits.maxMonitoredTradingAccounts === 1 ? "" : "s"}. Upgrade to monitor more.`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2">
            {tier !== "INSTITUTIONAL" && (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-[#6366F1] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#818CF8] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
                {tier === "FREE" ? "Upgrade" : "Change Plan"}
              </Link>
            )}
            {tier !== "FREE" && (
              <>
                {hasStripeSubscription && !cancelPeriodEnd && (
                  <button
                    onClick={() => setConfirmAction("cancel")}
                    disabled={loading}
                    className="inline-flex items-center gap-2 border border-[rgba(239,68,68,0.4)] text-[#EF4444] px-5 py-2.5 rounded-lg font-medium hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Cancel Subscription
                  </button>
                )}
                {hasStripeSubscription && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    className="inline-flex items-center gap-2 border border-[rgba(255,255,255,0.10)] text-[#FAFAFA] px-5 py-2.5 rounded-lg font-medium hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
          {/* Projects Usage */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#A1A1AA]">Projects</span>
              <span className="text-white">
                {projectCount} / {projectLimit === Infinity ? "\u221E" : projectLimit}
              </span>
            </div>
            {projectLimit !== Infinity && (
              <div
                className="h-2 bg-[#18181B] rounded-full overflow-hidden"
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
                        : "bg-[#6366F1]"
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
              <p className="text-xs text-[#818CF8] font-medium">Unlimited</p>
            )}
          </div>

          {/* Exports Usage */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#A1A1AA]">Exports this month</span>
              <span className="text-white">
                {exportCount} / {exportLimit === Infinity ? "\u221E" : exportLimit}
              </span>
            </div>
            {exportLimit !== Infinity && (
              <div
                className="h-2 bg-[#18181B] rounded-full overflow-hidden"
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
                        : "bg-[#6366F1]"
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
              <p className="text-xs text-[#818CF8] font-medium">Unlimited</p>
            )}
          </div>

          {/* Monitored Accounts Usage */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#A1A1AA]">Monitored accounts</span>
              <span className="text-white">
                {monitoredAccountCount} / {accountLimit === Infinity ? "\u221E" : accountLimit}
              </span>
            </div>
            {accountLimit !== Infinity && (
              <div
                className="h-2 bg-[#18181B] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={monitoredAccountCount}
                aria-valuemin={0}
                aria-valuemax={accountLimit}
                aria-label={`Monitored accounts: ${monitoredAccountCount} of ${accountLimit}`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    accountPercentage >= 100
                      ? "bg-[#EF4444]"
                      : accountPercentage >= 80
                        ? "bg-[#F59E0B]"
                        : "bg-[#6366F1]"
                  }`}
                  style={{ width: `${Math.min(accountPercentage, 100)}%` }}
                />
              </div>
            )}
            {accountLimit !== Infinity && accountPercentage >= 80 && accountPercentage < 100 && (
              <p className="text-xs text-[#F59E0B] mt-1">
                {accountLimit - monitoredAccountCount} account
                {accountLimit - monitoredAccountCount !== 1 ? "s" : ""} remaining
              </p>
            )}
            {accountLimit !== Infinity && accountPercentage >= 100 && (
              <p className="text-xs text-[#EF4444] mt-1">
                Account limit reached —{" "}
                <Link href="/pricing" className="underline hover:text-white">
                  upgrade
                </Link>
              </p>
            )}
            {accountLimit === Infinity && (
              <p className="text-xs text-[#818CF8] font-medium">Unlimited</p>
            )}
          </div>
        </div>

        {/* Upgrade Hint */}
        {tier !== "INSTITUTIONAL" && (
          <div className="mt-4 p-3 bg-[rgba(99,102,241,0.10)] border border-[rgba(99,102,241,0.20)] rounded-lg">
            <p className="text-xs text-[#818CF8]">
              <span className="font-medium">Need more monitored accounts?</span>{" "}
              <Link href="/pricing" className="underline hover:text-white">
                View plans
              </Link>{" "}
              to increase your limit.
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
            className="bg-[#111114] border border-[rgba(255,255,255,0.10)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmAction === "downgrade" ? (
              <>
                <h3 className="text-lg font-semibold text-white mb-3">Downgrade Plan?</h3>
                <p className="text-sm text-[#A1A1AA] mb-4">
                  Your plan will change to{" "}
                  <span className="font-medium text-white">
                    {downgradeTier ? PLANS[downgradeTier].name : "a lower tier"}
                  </span>{" "}
                  at the end of your billing period
                  {currentPeriodEnd && <> ({formatDate(currentPeriodEnd)})</>}. You&apos;ll keep
                  full access until then. Your monitored account limit will decrease — existing
                  accounts are preserved but you won&apos;t be able to add new ones if over the new
                  limit.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-[#FAFAFA] border border-[rgba(255,255,255,0.10)] rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-50"
                  >
                    Keep Current Plan
                  </button>
                  <button
                    onClick={handleDowngrade}
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
                    Schedule Downgrade
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white mb-3">Cancel Subscription?</h3>
                <p className="text-sm text-[#A1A1AA] mb-4">
                  Your access continues until{" "}
                  <span className="text-white font-medium">
                    {periodEndDisplay
                      ? formatDate(periodEndDisplay)
                      : "the end of your billing period"}
                  </span>
                  . After that, Baseline plan limits apply (1 monitored trading account). Your
                  existing data won&apos;t be deleted.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-[#FAFAFA] border border-[rgba(255,255,255,0.10)] rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-50"
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
