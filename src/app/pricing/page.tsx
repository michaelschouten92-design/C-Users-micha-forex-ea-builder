"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLANS, formatPrice } from "@/lib/plans";
import { getCsrfHeaders } from "@/lib/api-client";
import { showError } from "@/lib/toast";

// Helper to safely get price - returns null if Stripe not configured
function getPrice(plan: typeof PLANS.STARTER | typeof PLANS.PRO, interval: "monthly" | "yearly") {
  if (!plan.prices) return null;
  return plan.prices[interval];
}

export default function PricingPage() {
  const router = useRouter();
  const [interval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(plan: "STARTER" | "PRO") {
    setLoading(plan);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ plan, interval }),
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
        setLoading(null);
      }
    } catch {
      showError("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div id="main-content" className="min-h-screen py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="text-2xl font-bold text-white mb-4 inline-block">
            AlgoStudio
          </Link>
          <h1 className="text-4xl font-bold text-white mt-4">Simple, transparent pricing</h1>
          <p className="text-[#94A3B8] mt-2">Choose the plan that fits your trading needs</p>
        </div>

        {/* Interval Toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex rounded-lg bg-[#1E293B] p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                interval === "monthly"
                  ? "bg-[#4F46E5] text-white"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                interval === "yearly"
                  ? "bg-[#4F46E5] text-white"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-[#22D3EE]">Save 33%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8">
            <h3 className="text-xl font-semibold text-white">{PLANS.FREE.name}</h3>
            <div className="mt-4">
              <span className="text-4xl font-bold text-white">€0</span>
              <span className="text-[#94A3B8] ml-2">/forever</span>
            </div>

            <ul className="mt-6 space-y-3">
              {PLANS.FREE.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-[#CBD5E1]">
                  <svg
                    className="w-5 h-5 text-[#22D3EE]"
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

            <Link
              href="/login?mode=register"
              className="mt-8 w-full py-3 px-4 rounded-lg font-medium border border-[rgba(79,70,229,0.5)] text-white hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200 block text-center"
            >
              Get Started Free
            </Link>
          </div>

          {/* Starter Plan */}
          <div className="bg-[#1A0626] border-2 border-[#4F46E5] rounded-xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#4F46E5] text-white text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>
            <h3 className="text-xl font-semibold text-white">{PLANS.STARTER.name}</h3>
            <div className="mt-4">
              {getPrice(PLANS.STARTER, interval) ? (
                <>
                  <span className="text-4xl font-bold text-white">
                    {formatPrice(getPrice(PLANS.STARTER, interval)!.amount, "eur")}
                  </span>
                  <span className="text-[#94A3B8] ml-2">
                    /{interval === "monthly" ? "month" : "year"}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-[#94A3B8]">Coming Soon</span>
              )}
            </div>

            <ul className="mt-6 space-y-3">
              {PLANS.STARTER.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-[#CBD5E1]">
                  <svg
                    className="w-5 h-5 text-[#22D3EE]"
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

            <button
              onClick={() => handleSubscribe("STARTER")}
              disabled={loading !== null || !getPrice(PLANS.STARTER, interval)}
              className="mt-8 w-full py-3 px-4 rounded-lg font-medium bg-[#4F46E5] text-white hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
            >
              {loading === "STARTER" ? "Loading..." : "Get Started"}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8">
            <h3 className="text-xl font-semibold text-white">{PLANS.PRO.name}</h3>
            <div className="mt-4">
              {getPrice(PLANS.PRO, interval) ? (
                <>
                  <span className="text-4xl font-bold text-white">
                    {formatPrice(getPrice(PLANS.PRO, interval)!.amount, "eur")}
                  </span>
                  <span className="text-[#94A3B8] ml-2">
                    /{interval === "monthly" ? "month" : "year"}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-[#94A3B8]">Coming Soon</span>
              )}
            </div>

            <ul className="mt-6 space-y-3">
              {PLANS.PRO.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-[#CBD5E1]">
                  <svg
                    className="w-5 h-5 text-[#22D3EE]"
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

            <button
              onClick={() => handleSubscribe("PRO")}
              disabled={loading !== null || !getPrice(PLANS.PRO, interval)}
              className="mt-8 w-full py-3 px-4 rounded-lg font-medium border border-[rgba(79,70,229,0.5)] text-white hover:bg-[rgba(79,70,229,0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading === "PRO" ? "Loading..." : "Get Started"}
            </button>
          </div>
        </div>

        {/* Trial note */}
        <div className="text-center mt-8">
          <p className="text-[#94A3B8] text-sm">
            All paid plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "How does the 7-day free trial work?",
                a: "When you subscribe to Starter or Pro, you get 7 days free. You won't be charged until the trial ends. Cancel anytime during the trial and you won't pay a thing.",
              },
              {
                q: "Can I upgrade or downgrade at any time?",
                a: "Yes. You can switch between plans at any time from your account settings. When upgrading, you'll get immediate access to the new features. When downgrading, the change takes effect at the end of your current billing period.",
              },
              {
                q: "What happens when I cancel?",
                a: "You keep access to all paid features until the end of your current billing period. After that, your account reverts to the Free plan. Your projects and strategies are never deleted.",
              },
              {
                q: "Do you offer refunds?",
                a: "If you're not satisfied within the first 14 days of a paid subscription, contact us and we'll issue a full refund — no questions asked.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit and debit cards (Visa, Mastercard, American Express) through Stripe. All payments are processed securely.",
              },
              {
                q: "What counts as an export?",
                a: "Each time you download a .mq5 file from the builder, that counts as one export. Re-downloading the same version doesn't count again.",
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
