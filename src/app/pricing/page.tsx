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
            Choose the plan that matches your trading ambition
          </h1>
          <p className="text-[#94A3B8] mt-4 text-lg max-w-2xl mx-auto">
            Build, test and deploy automated MT5 strategies — without writing code.
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
            <p className="mt-4 text-[#94A3B8] text-sm leading-relaxed">
              Build your first automated strategy. Perfect if you want to explore algorithmic
              trading and test the builder.
            </p>

            <ul className="mt-6 space-y-3 flex-1">
              {[
                "Full visual strategy builder",
                "All trading blocks available",
                "1 active project",
                "1 export per month",
                "MQL5 source code export",
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

            <p className="mt-6 text-xs text-[#64748B]">
              Start building your first EA today — no credit card required.
            </p>

            <Link
              href="/login?mode=register"
              className="mt-4 w-full py-3 px-4 rounded-lg font-medium border border-[rgba(79,70,229,0.5)] text-white hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200 block text-center"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-[#1A0626] border-2 border-[#4F46E5] rounded-xl p-8 relative flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#4F46E5] text-white text-xs font-medium px-3 py-1 rounded-full">
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
                    <div className="mt-1">
                      <span className="text-sm text-[#64748B] line-through">
                        {formatPrice(monthlyTotal, "eur")}
                      </span>
                      <span className="text-sm text-[#22D3EE] ml-2 font-medium">
                        Save {formatPrice(yearlySavings, "eur")} — 2 months free
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-2xl font-bold text-[#94A3B8]">Coming Soon</span>
              )}
            </div>
            <p className="mt-4 text-[#94A3B8] text-sm leading-relaxed">
              For serious traders who want to scale. Unlock the full power of AlgoStudio and build
              as many automated systems as you want.
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
                  -2 mo
                </span>
              </button>
            </div>

            <ul className="mt-6 space-y-3 flex-1">
              {[
                "Unlimited projects",
                "Unlimited exports",
                "Full MQL5 source code export",
                "All trading & risk management blocks",
                "Community access (private trader group)",
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

            <p className="mt-6 text-xs text-[#64748B]">
              Deploy unlimited automated trading systems and iterate without limits.
            </p>

            <button
              onClick={handleSubscribe}
              disabled={loading || !proPrice}
              className="mt-4 w-full py-3 px-4 rounded-lg font-medium bg-[#4F46E5] text-white hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
            >
              {loading ? "Loading..." : "Upgrade to Pro"}
            </button>
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-8">Built for traders who want control</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", text: "No coding required" },
              {
                icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                text: "Works with any MT5 broker",
              },
              {
                icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                text: "Clean, ready-to-run MQL5 code",
              },
              { icon: "M13 10V3L4 14h7v7l9-11h-7z", text: "Fast idea-to-execution workflow" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-3 p-4">
                <div className="w-12 h-12 rounded-full bg-[rgba(79,70,229,0.15)] flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[#22D3EE]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={item.icon}
                    />
                  </svg>
                </div>
                <span className="text-sm text-[#CBD5E1] text-center">{item.text}</span>
              </div>
            ))}
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
                a: "No. AlgoStudio is fully visual. You build your strategy using blocks — no programming required.",
              },
              {
                q: "Does this work with any MT5 broker?",
                a: "Yes. You export standard MQL5 source code that works with any MetaTrader 5 broker.",
              },
              {
                q: "What happens if I reach my export limit on Free?",
                a: "You can upgrade anytime to unlock unlimited exports and continue building.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. You can cancel your subscription at any time. No long-term contracts.",
              },
              {
                q: "What happens to my projects if I downgrade?",
                a: "Your projects remain saved. You just won't be able to export beyond the Free limits.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit and debit cards (Visa, Mastercard, American Express) through Stripe. All payments are processed securely.",
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
