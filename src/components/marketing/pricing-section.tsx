"use client";

import { useState } from "react";
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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const proPrice = PLANS.PRO.prices?.monthly;
  const elitePrice = PLANS.ELITE.prices?.monthly;
  const institutionalPrice = PLANS.INSTITUTIONAL.prices?.monthly;

  async function handleSubscribe(plan: "PRO" | "ELITE" | "INSTITUTIONAL") {
    setLoadingPlan(plan);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ plan, interval: "monthly" }),
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
          <h2 className="text-3xl font-bold text-white mb-4">
            Scale the number of monitored trading accounts
          </h2>
          <p className="text-[#94A3B8]">
            All features included on every plan. Unlimited strategies. Choose how many monitored
            trading accounts you need.
          </p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {/* Baseline — Free */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE]" />
            <h3 className="text-xl font-semibold text-white">Baseline</h3>
          </div>
          <p className="text-xs text-[#22D3EE] font-medium tracking-wide uppercase mt-1">
            Evaluate & Validate
          </p>
          <p className="mt-2 text-xs text-[#64748B]">
            Full platform access with 1 monitored trading account.
          </p>
          <div className="mt-4">
            <span className="text-4xl font-bold text-white">{formatPrice(0, "eur")}</span>
            <span className="text-[#94A3B8] ml-2">/ forever</span>
          </div>
          <p className="mt-3 text-white font-medium text-sm">
            Full access to all platform features
          </p>
          <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
            Strategy evaluation, live monitoring, governance, verified track records, and the EA
            builder — all included with 1 monitored trading account.
          </p>

          <ul className="mt-6 space-y-3 flex-1">
            {[
              "1 monitored trading account",
              "All platform features included",
              "Unlimited strategies & exports",
              "Backtest health scoring",
              "Monte Carlo risk simulation",
              "Strategy evaluation & scoring",
              "Strategy journal",
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-[#CBD5E1] text-sm">
                <CheckIcon />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-6 bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3">
            <p className="text-xs text-[#A78BFA]">
              1 monitored trading account. All features included.
            </p>
          </div>

          <Link
            href="/login?mode=register&redirect=/app/onboarding?path=backtest"
            className="mt-4 w-full py-3 px-4 rounded-lg font-medium border border-[rgba(79,70,229,0.5)] text-white hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200 block text-center"
          >
            Start free
          </Link>
          <p className="mt-2 text-center text-xs text-[#64748B]">No credit card required.</p>
        </div>

        {/* Control — Pro */}
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
            <h3 className="text-xl font-semibold text-white">Control</h3>
          </div>
          <p className="text-xs text-[#4F46E5] font-medium tracking-wide uppercase mt-1">
            Multi-Account Monitoring
          </p>
          <p className="mt-2 text-xs text-[#64748B]">
            Monitor multiple live strategies with priority support.
          </p>
          <div className="mt-4">
            {proPrice ? (
              <>
                <span className="text-4xl font-bold text-white">
                  {formatPrice(proPrice.amount, "eur")}
                </span>
                <span className="text-[#94A3B8] ml-2">/ month</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-[#94A3B8]">Coming Soon</span>
            )}
          </div>
          <p className="mt-3 text-white font-medium text-sm">Up to 3 monitored trading accounts</p>
          <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
            All platform features included. Priority support and multi-account monitoring for
            growing portfolios.
          </p>

          <ul className="mt-6 space-y-3 flex-1">
            {[
              "Up to 3 monitored trading accounts",
              "All platform features included",
              "Unlimited strategies & exports",
              "Priority support",
              "Email, webhook & Telegram alerts",
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-[#CBD5E1] text-sm">
                <CheckIcon />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-6 bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3">
            <p className="text-xs text-[#A78BFA]">
              Up to 3 monitored trading accounts. All features included.
            </p>
          </div>

          <button
            onClick={() => handleSubscribe("PRO")}
            disabled={loadingPlan !== null || !proPrice}
            className="mt-4 w-full py-3.5 px-4 rounded-lg font-semibold border border-[rgba(79,70,229,0.5)] text-white hover:bg-[rgba(79,70,229,0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-base"
          >
            {loadingPlan === "PRO" ? "Loading..." : "Start monitoring"}
          </button>
          <p className="mt-2 text-center text-xs text-[#64748B]">Cancel anytime. No lock-in.</p>
        </div>

        {/* Authority — Elite (Most Popular) */}
        <div className="bg-gradient-to-b from-[#1A0626] to-[#1A0626]/80 border-2 border-[#4F46E5] rounded-xl p-8 relative flex flex-col shadow-[0_0_30px_rgba(79,70,229,0.15)]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-[#4F46E5] text-white text-xs font-medium px-4 py-1 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.4)]">
              Most Popular
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
            <h3 className="text-xl font-semibold text-white">
              <span className="sr-only">Most popular plan - </span>Authority
            </h3>
          </div>
          <p className="text-xs text-[#A78BFA] font-medium tracking-wide uppercase mt-1">
            Portfolio-Scale Governance
          </p>
          <p className="mt-2 text-xs text-[#64748B]">
            Govern strategy portfolios at scale with dedicated support.
          </p>
          <div className="mt-4">
            {elitePrice ? (
              <>
                <span className="text-4xl font-bold text-white">
                  {formatPrice(elitePrice.amount, "eur")}
                </span>
                <span className="text-[#94A3B8] ml-2">/ month</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-[#94A3B8]">Coming Soon</span>
            )}
          </div>
          <p className="mt-3 text-white font-medium text-sm">
            Govern up to 10 monitored trading accounts
          </p>
          <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
            All platform features included. Dedicated support channel, 1-on-1 strategy reviews, and
            portfolio-scale monitoring.
          </p>

          <ul className="mt-6 space-y-3 flex-1">
            {[
              "Up to 10 monitored trading accounts",
              "All platform features included",
              "Unlimited strategies & exports",
              "Priority support",
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
              Up to 10 monitored trading accounts. All features included.
            </p>
          </div>

          <button
            onClick={() => handleSubscribe("ELITE")}
            disabled={loadingPlan !== null || !elitePrice}
            className="mt-4 w-full py-3.5 px-4 rounded-lg font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] text-base"
          >
            {loadingPlan === "ELITE" ? "Loading..." : "Start monitoring"}
          </button>
          <p className="mt-2 text-center text-xs text-[#64748B]">Cancel anytime. No lock-in.</p>
        </div>

        {/* Institutional */}
        <div className="bg-[#1A0626] border border-[rgba(245,158,11,0.25)] rounded-xl p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <h3 className="text-xl font-semibold text-white">Institutional</h3>
          </div>
          <p className="text-xs text-[#F59E0B] font-medium tracking-wide uppercase mt-1">
            Unlimited Capacity
          </p>
          <p className="mt-2 text-xs text-[#64748B]">
            Unlimited monitored trading accounts with dedicated onboarding.
          </p>
          <div className="mt-4">
            {institutionalPrice ? (
              <>
                <span className="text-4xl font-bold text-white">
                  {formatPrice(institutionalPrice.amount, "eur")}
                </span>
                <span className="text-[#94A3B8] ml-2">/ month</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-[#94A3B8]">Coming Soon</span>
            )}
          </div>
          <p className="mt-3 text-white font-medium text-sm">
            Unlimited monitored trading accounts
          </p>
          <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
            All platform features included. Custom onboarding, SLA-backed uptime, and a dedicated
            support channel.
          </p>

          <ul className="mt-6 space-y-3 flex-1">
            {[
              "Unlimited monitored trading accounts",
              "All platform features included",
              "Unlimited strategies & exports",
              "Priority support",
              "1-on-1 strategy review (1/month)",
              "Direct developer channel",
              "Custom onboarding",
              "SLA-backed uptime guarantee",
              "Dedicated support channel",
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-[#CBD5E1] text-sm">
                <CheckIcon className="w-5 h-5 text-[#F59E0B]" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-6 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] rounded-lg px-4 py-3">
            <p className="text-xs text-[#F59E0B]">
              Unlimited monitored trading accounts. All features included.
            </p>
          </div>

          <button
            onClick={() => handleSubscribe("INSTITUTIONAL")}
            disabled={loadingPlan !== null || !institutionalPrice}
            className="mt-4 w-full py-3.5 px-4 rounded-lg font-semibold border border-[rgba(245,158,11,0.4)] text-white hover:bg-[rgba(245,158,11,0.08)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-base"
          >
            {loadingPlan === "INSTITUTIONAL" ? "Loading..." : "Start monitoring"}
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
