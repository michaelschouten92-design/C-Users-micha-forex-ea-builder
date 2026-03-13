"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLANS, formatPrice } from "@/lib/plans";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

const CheckIcon = ({ className = "w-5 h-5 text-[#22D3EE]" }: { className?: string }) => (
  <svg
    className={`${className} flex-shrink-0 mt-0.5`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

interface PricingSectionProps {
  showHeader?: boolean;
}

export function PricingSection({ showHeader = true }: PricingSectionProps) {
  const router = useRouter();
  const [interval, setBillingInterval] = useState<"monthly" | "yearly">(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem("billingInterval") as "monthly" | "yearly") || "monthly";
    }
    return "monthly";
  });
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem("billingInterval", interval);
  }, [interval]);

  const proPrice = PLANS.PRO.prices?.[interval];
  const elitePrice = PLANS.ELITE.prices?.[interval];
  const proMonthlyTotal = (PLANS.PRO.prices?.monthly.amount ?? 0) * 12;
  const proYearlyPrice = PLANS.PRO.prices?.yearly.amount ?? 0;
  const proYearlySavings = proMonthlyTotal - proYearlyPrice;
  const eliteMonthlyTotal = (PLANS.ELITE.prices?.monthly.amount ?? 0) * 12;
  const eliteYearlyPrice = PLANS.ELITE.prices?.yearly.amount ?? 0;
  const eliteYearlySavings = eliteMonthlyTotal - eliteYearlyPrice;

  async function handleSubscribe(plan: "PRO" | "ELITE") {
    setLoadingPlan(plan);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ plan, interval }),
      });

      if (res.status === 401) {
        router.push(`/login?mode=register&redirect=/pricing`);
        return;
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        showError(
          data.details ? `${data.error}: ${data.details}` : data.error || "Failed to start checkout"
        );
        setLoadingPlan(null);
      }
    } catch {
      showError("Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      {showHeader && (
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-4">Choose Your Governance Depth</h2>
          <p className="text-[#94A3B8]">
            From strategy validation to deterministic lifecycle authority. Start free, upgrade when
            your strategies go live.
          </p>
        </div>
      )}

      {/* Billing Toggle */}
      <div className="flex justify-center mt-8 mb-12">
        <div className="flex rounded-lg bg-[#0F172A] p-1">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              interval === "monthly" ? "bg-[#4F46E5] text-white" : "text-[#94A3B8] hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("yearly")}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              interval === "yearly" ? "bg-[#4F46E5] text-white" : "text-[#94A3B8] hover:text-white"
            }`}
          >
            Yearly
            <span className="ml-1.5 text-[10px] font-bold text-[#0F172A] bg-[#22D3EE] px-1.5 py-0.5 rounded-full">
              Save 15%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Free — Learn & Explore */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE]" />
            <h3 className="text-xl font-semibold text-white">Baseline</h3>
          </div>
          <p className="text-xs text-[#22D3EE] font-medium tracking-wide uppercase mt-1">
            Validate
          </p>
          <p className="mt-2 text-xs text-[#64748B]">
            Evaluate strategy viability before going live.
          </p>
          <div className="mt-4">
            <span className="text-4xl font-bold text-white">{formatPrice(0, "eur")}</span>
            <span className="text-[#94A3B8] ml-2">/ forever</span>
          </div>
          <p className="mt-3 text-white font-medium text-sm">
            Evaluate strategy viability before going live
          </p>
          <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
            Backtest scoring, risk simulation, and statistical validation. No live governance, no
            execution authority, no automatic intervention.
          </p>

          <ul className="mt-6 space-y-3 flex-1">
            {[
              "Backtest health scoring",
              "Monte Carlo risk simulation",
              "Strategy journal",
              "All features included",
              "EA builder & templates",
              "1 monitored trading account",
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-[#CBD5E1] text-sm">
                <CheckIcon />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-6 bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3">
            <p className="text-xs text-[#A78BFA]">
              <strong>Scope:</strong> Validation only. No lifecycle governance.
            </p>
          </div>

          <Link
            href="/login?mode=register&redirect=/app/onboarding?path=backtest"
            className="mt-4 w-full py-3 px-4 rounded-lg font-medium border border-[rgba(79,70,229,0.5)] text-white hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200 block text-center"
          >
            Start monitoring
          </Link>
          <p className="mt-2 text-center text-xs text-[#64748B]">No credit card required.</p>
        </div>

        {/* Pro — Build & Run (Most Popular) */}
        <div className="bg-gradient-to-b from-[#1A0626] to-[#1A0626]/80 border-2 border-[#4F46E5] rounded-xl p-8 relative flex flex-col shadow-[0_0_30px_rgba(79,70,229,0.15)]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-[#4F46E5] text-white text-xs font-medium px-4 py-1 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.4)]">
              Most Popular
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
            <h3 className="text-xl font-semibold text-white">
              <span className="sr-only">Most popular plan - </span>Control
            </h3>
          </div>
          <p className="text-xs text-[#4F46E5] font-medium tracking-wide uppercase mt-1">
            Strategy Authority
          </p>
          <p className="mt-2 text-xs text-[#64748B]">
            Deterministic lifecycle authority over live strategies.
          </p>
          <div className="mt-4">
            {proPrice ? (
              <>
                <span className="text-4xl font-bold text-white">
                  {formatPrice(proPrice.amount, "eur")}
                </span>
                <span className="text-[#94A3B8] ml-2">
                  / {interval === "monthly" ? "month" : "year"}
                </span>
                {interval === "yearly" && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.25)] rounded-full px-3 py-1">
                    <span className="text-sm text-[#64748B] line-through">
                      {formatPrice(proMonthlyTotal, "eur")}
                    </span>
                    <span className="text-sm text-[#22D3EE] font-semibold">
                      Save {formatPrice(proYearlySavings, "eur")}
                    </span>
                  </div>
                )}
                {interval === "yearly" && (
                  <p className="text-xs text-[#94A3B8] mt-1">
                    = {formatPrice(Math.round(proYearlyPrice / 12), "eur")}/month, billed annually
                  </p>
                )}
              </>
            ) : (
              <span className="text-2xl font-bold text-[#94A3B8]">Coming Soon</span>
            )}
          </div>
          <p className="mt-3 text-white font-medium text-sm">
            Deterministic lifecycle authority over live strategies
          </p>
          <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
            Execution authority (RUN/PAUSE), verified track records, continuous structural
            monitoring, and governance snapshot logging.
          </p>

          <ul className="mt-6 space-y-3 flex-1">
            {[
              "Execution Authority (RUN / PAUSE)",
              "Continuous heartbeat monitoring",
              "Structural deviation detection",
              "Verified Track Record (hash chain)",
              "Strategy Identity & versioning",
              "Governance snapshot logging",
              "Email, webhook & Telegram alerts",
              "Unlimited strategies & exports",
              "Priority support",
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-[#CBD5E1] text-sm">
                <CheckIcon />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-6 bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3">
            <p className="text-xs text-[#A78BFA]">
              <strong>Scope:</strong> Strategy-level governance with deterministic execution
              authority.
            </p>
          </div>

          <button
            onClick={() => handleSubscribe("PRO")}
            disabled={loadingPlan !== null || !proPrice}
            className="mt-4 w-full py-3.5 px-4 rounded-lg font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] text-base"
          >
            {loadingPlan === "PRO" ? "Loading..." : "Start monitoring"}
          </button>
          <p className="mt-2 text-center text-xs text-[#64748B]">Cancel anytime. No lock-in.</p>
        </div>

        {/* Elite — Protect Capital */}
        <div className="bg-[#1A0626] border border-[rgba(167,139,250,0.3)] rounded-xl p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
            <h3 className="text-xl font-semibold text-white">Authority</h3>
          </div>
          <p className="text-xs text-[#A78BFA] font-medium tracking-wide uppercase mt-1">
            Full Lifecycle Authority
          </p>
          <p className="mt-2 text-xs text-[#64748B]">
            Portfolio-level deterministic governance framework.
          </p>
          <div className="mt-4">
            {elitePrice ? (
              <>
                <span className="text-4xl font-bold text-white">
                  {formatPrice(elitePrice.amount, "eur")}
                </span>
                <span className="text-[#94A3B8] ml-2">
                  / {interval === "monthly" ? "month" : "year"}
                </span>
                {interval === "yearly" && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.25)] rounded-full px-3 py-1">
                    <span className="text-sm text-[#64748B] line-through">
                      {formatPrice(eliteMonthlyTotal, "eur")}
                    </span>
                    <span className="text-sm text-[#A78BFA] font-semibold">
                      Save {formatPrice(eliteYearlySavings, "eur")}
                    </span>
                  </div>
                )}
                {interval === "yearly" && (
                  <p className="text-xs text-[#94A3B8] mt-1">
                    = {formatPrice(Math.round(eliteYearlyPrice / 12), "eur")}/month, billed annually
                  </p>
                )}
              </>
            ) : (
              <span className="text-2xl font-bold text-[#94A3B8]">Coming Soon</span>
            )}
          </div>
          <p className="mt-3 text-white font-medium text-sm">
            Portfolio-level deterministic governance framework
          </p>
          <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
            Everything in Pro, plus full lifecycle control (RUN/PAUSE/STOP), incident escalation,
            portfolio authority aggregation, and cadence analytics.
          </p>

          <ul className="mt-6 space-y-3 flex-1">
            {[
              "Everything in Control",
              "Full lifecycle authority (RUN/PAUSE/STOP)",
              "Incident escalation framework",
              "CUSUM drift analysis",
              "Advanced cadence analytics",
              "Portfolio authority aggregation",
              "Edge degradation detection",
              "Lifecycle state transitions",
              "Embeddable proof widget",
              "1-on-1 strategy review (1/month)",
              "Direct developer channel",
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-[#CBD5E1] text-sm">
                <CheckIcon className="w-5 h-5 text-[#A78BFA]" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-6 bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.15)] rounded-lg px-4 py-3">
            <p className="text-xs text-[#A78BFA]">
              <strong>Scope:</strong> Portfolio-level deterministic governance with full lifecycle
              control.
            </p>
          </div>

          <button
            onClick={() => handleSubscribe("ELITE")}
            disabled={loadingPlan !== null || !elitePrice}
            className="mt-4 w-full py-3.5 px-4 rounded-lg font-semibold border-2 border-[#A78BFA] text-white hover:bg-[rgba(167,139,250,0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-base"
          >
            {loadingPlan === "ELITE" ? "Loading..." : "Start monitoring"}
          </button>
          <p className="mt-2 text-center text-xs text-[#64748B]">Cancel anytime. No lock-in.</p>
        </div>
      </div>

      <p className="text-center text-xs text-[#64748B] mt-6">
        All prices are in EUR and include VAT where applicable.
      </p>
    </div>
  );
}
