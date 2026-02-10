"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLANS, formatPrice } from "@/lib/plans";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

export default function PricingPage() {
  const router = useRouter();
  const [interval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  const proPrice = PLANS.PRO.prices?.[interval];
  const monthlyTotal = (PLANS.PRO.prices?.monthly.amount ?? 0) * 12;
  const yearlyPrice = PLANS.PRO.prices?.yearly.amount ?? 0;
  const yearlySavings = monthlyTotal - yearlyPrice;

  async function handleSubscribe() {
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ plan: "PRO", interval }),
      });

      if (res.status === 401) {
        router.push("/login?mode=register&redirect=/pricing");
        return;
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        showError(
          data.details ? `${data.error}: ${data.details}` : data.error || "Failed to start checkout"
        );
        setLoading(false);
      }
    } catch {
      showError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div id="main-content" className="min-h-screen py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <Link href="/" className="text-2xl font-bold text-white mb-4 inline-block">
            AlgoStudio
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-4">
            Simple pricing. No hidden complexity.
          </h1>
          <p className="text-[#94A3B8] mt-4 text-lg max-w-2xl mx-auto">
            Start free with all templates. Upgrade when you need unlimited exports.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE]" />
              <h3 className="text-xl font-semibold text-white">Free</h3>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold text-white">{formatPrice(0, "eur")}</span>
              <span className="text-[#94A3B8] ml-2">/ forever</span>
            </div>
            <p className="mt-3 text-white font-medium text-sm">
              Build and export your first MT5 bot
            </p>
            <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
              Access all 5 strategy templates, customize settings, and export a working Expert
              Advisor — free forever.
            </p>

            <ul className="mt-6 space-y-3 flex-1">
              {[
                "All 5 strategy templates",
                "Full builder access",
                "1 active project",
                "1 MQL5 export per month",
                "Clean, well-commented source code",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-[#CBD5E1] text-sm">
                  <svg
                    className="w-5 h-5 text-[#22D3EE] flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3">
              <p className="text-xs text-[#A78BFA]">
                <strong>Who it&apos;s for:</strong> Traders building their first automated strategy.
                Test the full workflow before committing.
              </p>
            </div>

            <p className="mt-4 text-xs text-[#64748B]">No credit card required.</p>

            <Link
              href="/login?mode=register"
              className="mt-4 w-full py-3 px-4 rounded-lg font-medium border border-[rgba(79,70,229,0.5)] text-white hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200 block text-center"
            >
              Start Free
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-b from-[#1A0626] to-[#1A0626]/80 border-2 border-[#4F46E5] rounded-xl p-8 relative flex flex-col shadow-[0_0_30px_rgba(79,70,229,0.15)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#4F46E5] text-white text-xs font-medium px-4 py-1 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.4)]">
                Most Popular
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
              <h3 className="text-xl font-semibold text-white">Pro</h3>
            </div>
            <div className="mt-4">
              {proPrice ? (
                <>
                  <span className="text-4xl font-bold text-white">
                    {interval === "monthly"
                      ? formatPrice(PLANS.PRO.prices?.monthly.amount ?? 0, "eur")
                      : formatPrice(yearlyPrice, "eur")}
                  </span>
                  <span className="text-[#94A3B8] ml-2">
                    / {interval === "monthly" ? "month" : "year"}
                  </span>
                  {interval === "yearly" && (
                    <div className="mt-2 inline-flex items-center gap-2 bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.25)] rounded-full px-3 py-1">
                      <span className="text-sm text-[#64748B] line-through">
                        {formatPrice(monthlyTotal, "eur")}
                      </span>
                      <span className="text-sm text-[#22D3EE] font-semibold">
                        Save {formatPrice(yearlySavings, "eur")}/year
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-2xl font-bold text-[#94A3B8]">Coming Soon</span>
              )}
            </div>
            <p className="mt-3 text-white font-medium text-sm">
              Unlimited projects, unlimited exports
            </p>
            <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
              Build as many strategies as you want. Export without limits. Access Pro-only trade
              management blocks.
            </p>

            {/* Interval Toggle */}
            <div className="flex rounded-lg bg-[#0F172A] p-1 mt-5">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  interval === "monthly"
                    ? "bg-[#4F46E5] text-white"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("yearly")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  interval === "yearly"
                    ? "bg-[#4F46E5] text-white"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                Yearly
                <span className="ml-1.5 text-[10px] font-bold text-[#0F172A] bg-[#22D3EE] px-1.5 py-0.5 rounded-full">
                  Save {formatPrice(yearlySavings, "eur")}
                </span>
              </button>
            </div>

            <ul className="mt-6 space-y-3 flex-1">
              {[
                "Unlimited projects",
                "Unlimited exports",
                "All 5 strategy templates",
                "Trade management blocks (breakeven, trailing, partial close)",
                "Community access",
                "Priority support",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-[#CBD5E1] text-sm">
                  <svg
                    className="w-5 h-5 text-[#22D3EE] flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3">
              <p className="text-xs text-[#A78BFA]">
                <strong>Who it&apos;s for:</strong> Active traders who want to build, test, and
                iterate on multiple strategies without limits.
              </p>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={loading || !proPrice}
              className="mt-4 w-full py-3.5 px-4 rounded-lg font-semibold bg-[#4F46E5] text-white hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] text-base"
            >
              {loading ? "Loading..." : "Upgrade to Pro"}
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Do I need coding experience?",
                a: "No. You pick a strategy template, adjust a few settings, and export. No programming required.",
              },
              {
                q: "Does this work with any MT5 broker?",
                a: "Yes. You export standard MQL5 source code that works with any MetaTrader 5 broker — forex, indices, commodities, crypto.",
              },
              {
                q: "What happens if I reach my export limit on Free?",
                a: "You can upgrade anytime to unlock unlimited exports. Your project stays saved.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel from your account settings at any time. No long-term contracts.",
              },
              {
                q: "What happens to my projects if I downgrade?",
                a: "Your projects remain saved. You just won't be able to export beyond the Free limits.",
              },
              {
                q: "What payment methods do you accept?",
                a: "All major credit and debit cards (Visa, Mastercard, American Express) through Stripe. All payments are processed securely.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-white font-medium text-sm list-none">
                  {item.q}
                  <svg
                    className="w-5 h-5 text-[#64748B] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-[#94A3B8] leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-[#64748B] text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-[#22D3EE] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
