"use client";

import Link from "next/link";
import { PLANS, formatPrice } from "@/lib/plans";
import { PricingSection } from "@/components/marketing/pricing-section";

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

const DashIcon = ({ className = "w-5 h-5 text-[#334155]" }: { className?: string }) => (
  <svg
    className={`${className} flex-shrink-0 mt-0.5`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

export default function PricingPage() {
  const proPrice = PLANS.PRO.prices?.monthly;

  const faqItems = [
    {
      q: "How much does it cost to build an MT5 Expert Advisor?",
      a: "With AlgoStudio, you can build your first EA for free. Pro starts at \u20ac39/month for unlimited projects and exports. Compare this to hiring an MQL5 developer, which typically costs \u20ac200\u2013\u20ac1,000+ per EA, plus additional fees for every change request.",
    },
    {
      q: "Do I need coding experience?",
      a: "No. AlgoStudio is a no-code MT5 bot builder. You pick a strategy template, adjust settings like risk percentage and stop loss, and export a ready-to-use .mq5 file. No MQL5 or any other programming knowledge required.",
    },
    {
      q: "Does this work with any MT5 broker?",
      a: "Yes. You export standard MQL5 source code that works with any MetaTrader 5 broker \u2014 forex, indices, commodities. Compatible with prop firms like FTMO, MyForexFunds, and others.",
    },
    {
      q: "What happens if I reach my export limit on Free?",
      a: "Your projects stay saved. You can upgrade to Pro or Elite at any time to unlock unlimited exports. No data is lost when you hit the limit.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. Cancel from your account settings at any time. No long-term contracts, no cancellation fees. Your subscription remains active until the end of the current billing period.",
    },
    {
      q: "What happens to my projects if I downgrade?",
      a: "All your projects remain saved. You just won\u2019t be able to create new projects or export beyond the Free plan limits. You can upgrade again anytime to regain full access.",
    },
    {
      q: "What payment methods do you accept?",
      a: "All major credit and debit cards (Visa, Mastercard, American Express) through Stripe. All payments are processed securely. We do not store your card details.",
    },
    {
      q: "Is there a money-back guarantee?",
      a: "We offer a 14-day refund policy. If AlgoStudio isn\u2019t right for you, contact support within 14 days of your first payment for a full refund.",
    },
    {
      q: "What is the difference between Pro and Elite?",
      a: "Pro gives you unlimited projects, exports, and access to the private Discord community. Elite adds early access to new features, prop firm configuration presets, and direct developer support.",
    },
  ];

  return (
    <div id="main-content" className="min-h-screen py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ================================================================ */}
        {/* PRICING HERO                                                     */}
        {/* ================================================================ */}
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-white mb-4 inline-block">
            AlgoStudio
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-4">
            Invest in your trading infrastructure, not in developers
          </h1>
          <p className="text-[#94A3B8] mt-4 text-lg max-w-2xl mx-auto">
            A single MQL5 developer costs {formatPrice(20000, "eur")}&ndash;
            {formatPrice(100000, "eur")}+ per EA. AlgoStudio gives you unlimited EAs from just{" "}
            {formatPrice(proPrice?.amount ?? 3900, "eur")}/month.
          </p>
        </div>

        <PricingSection showHeader={false} />

        {/* ================================================================ */}
        {/* FEATURE COMPARISON TABLE                                         */}
        {/* ================================================================ */}
        <div className="mt-20 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Detailed feature comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 px-4 text-[#64748B] font-medium">Feature</th>
                  <th className="text-center py-3 px-4 text-[#22D3EE] font-medium">Free</th>
                  <th className="text-center py-3 px-4 text-[#A78BFA] font-medium">Pro</th>
                  <th className="text-center py-3 px-4 text-[#A78BFA] font-medium">Elite</th>
                </tr>
              </thead>
              <tbody className="text-[#94A3B8]">
                {(
                  [
                    ["Projects", "1", "Unlimited", "Unlimited"],
                    ["MQL5 exports per month", "1", "Unlimited", "Unlimited"],
                    ["Strategy templates", "All 5", "All 5", "All 5"],
                    ["Visual builder", true, true, true],
                    ["Clean MQL5 source code", true, true, true],
                    ["Private Discord community", false, true, true],
                    ["Priority support", false, true, true],
                    ["Early feature access", false, false, true],
                    ["Prop firm presets", false, false, true],
                    ["Direct developer support", false, false, true],
                    ["Weekly Elite members call", false, false, true],
                  ] as [string, string | boolean, string | boolean, string | boolean][]
                ).map(([feature, free, pro, elite]) => (
                  <tr key={feature} className="border-b border-[rgba(79,70,229,0.1)]">
                    <td className="py-3 px-4 text-[#CBD5E1]">{feature}</td>
                    {[free, pro, elite].map((val, i) => (
                      <td key={i} className="py-3 px-4 text-center">
                        {typeof val === "boolean" ? (
                          val ? (
                            <CheckIcon className="w-4 h-4 text-[#22D3EE] mx-auto" />
                          ) : (
                            <DashIcon className="w-4 h-4 text-[#334155] mx-auto" />
                          )
                        ) : (
                          <span className="text-[#CBD5E1]">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================================================================ */}
        {/* ROI COMPARISON                                                   */}
        {/* ================================================================ */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            AlgoStudio vs hiring an MQL5 developer
          </h2>
          <p className="text-[#94A3B8] text-center mb-8 max-w-2xl mx-auto">
            Most MQL5 freelancers charge {formatPrice(20000, "eur")}&ndash;
            {formatPrice(100000, "eur")}+ per Expert Advisor. Every modification is an additional
            cost. With AlgoStudio, you iterate instantly.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6">
              <h3 className="text-base font-semibold text-white mb-4">MQL5 Developer</h3>
              <ul className="space-y-3 text-sm text-[#94A3B8]">
                {[
                  `${formatPrice(20000, "eur")}–${formatPrice(100000, "eur")}+ per EA`,
                  "Days to weeks delivery time",
                  "Extra cost per modification",
                  "Communication overhead",
                  "Code quality varies",
                  "No instant iteration",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.1)]">
                <p className="text-xs text-[#64748B]">
                  Typical cost for 3 EAs: {formatPrice(60000, "eur")}&ndash;
                  {formatPrice(300000, "eur")}+
                </p>
              </div>
            </div>

            <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
              <h3 className="text-base font-semibold text-white mb-4">AlgoStudio Pro</h3>
              <ul className="space-y-3 text-sm text-[#CBD5E1]">
                {[
                  `${formatPrice(proPrice?.amount ?? 3900, "eur")}/month for unlimited EAs`,
                  "Build in under 5 minutes",
                  "Instant rebuilds, no extra cost",
                  "No developer needed",
                  "Clean, consistent MQL5 output",
                  "Iterate as fast as you think",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckIcon className="w-4 h-4" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.1)]">
                <p className="text-xs text-[#22D3EE]">
                  Cost for unlimited EAs: {formatPrice(proPrice?.amount ?? 3900, "eur")}/month
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* TRUST SECTION                                                    */}
        {/* ================================================================ */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: "Cancel anytime",
                description:
                  "No long-term contracts. Cancel from your account settings whenever you want. Your subscription stays active until the end of the billing period.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                ),
              },
              {
                title: "Private Discord community",
                description:
                  "Pro and Elite members get access to a private Discord where you can share strategies, get feedback, and connect with other algorithmic traders.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                ),
              },
              {
                title: "Secure payments via Stripe",
                description:
                  "All payments processed through Stripe. We never see or store your card details. PCI-DSS compliant. Visa, Mastercard, and American Express accepted.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                ),
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-5 h-5 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {item.icon}
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* FAQ                                                              */}
        {/* ================================================================ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
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

        {/* ================================================================ */}
        {/* FOOTER CTA                                                       */}
        {/* ================================================================ */}
        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold text-white mb-4">
            Start building your Expert Advisor today
          </h2>
          <p className="text-[#94A3B8] mb-6 max-w-lg mx-auto">
            No credit card required for the free plan. Upgrade when you&apos;re ready.
          </p>
          <Link
            href="/login?mode=register"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Build Your First Bot — Free
          </Link>
          <p className="mt-4 text-[#64748B] text-sm">
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
