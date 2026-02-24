"use client";

import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

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
      a: "Yes. You export standard MQL5 source code that works with any MetaTrader 5 broker \u2014 forex, indices, commodities. Compatible with prop firms like FTMO, E8 Markets, FundingPips, and others.",
    },
    {
      q: "What is the Strategy Health Monitor?",
      a: "The Strategy Health Monitor (Elite only) continuously compares your live trading performance against your backtest baseline. It scores 5 key metrics \u2014 return, volatility, drawdown, win rate, and trade frequency \u2014 and alerts you when your strategy\u2019s edge begins to degrade. Think of it as an early warning system for your capital.",
    },
    {
      q: "What is a Verified Track Record?",
      a: "Every trade your EA makes is recorded in a tamper-resistant hash chain. This creates a cryptographically verified history that proves your results are real \u2014 no screenshot manipulation, no cherry-picking. Pro and Elite users get a public Verified Strategy Page to share their track record with investors, prop firms, or anyone who needs proof.",
    },
    {
      q: "What is the Monte Carlo risk calculator?",
      a: "The Monte Carlo risk calculator randomizes your trade sequence across thousands of simulated scenarios to reveal the probability distribution of outcomes. Instead of relying on a single result, you see the realistic range \u2014 best case, worst case, and everything in between. Available to all users, including Free.",
    },
    {
      q: "What happens to my projects if I downgrade?",
      a: "All your projects remain saved. You just won\u2019t be able to create new projects or export beyond the Free plan limits. Your verified track records stay intact. You can upgrade again anytime to regain full access.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. Cancel from your account settings at any time. No long-term contracts, no cancellation fees. Your subscription remains active until the end of the current billing period.",
    },
    {
      q: "What payment methods do you accept?",
      a: "All major credit and debit cards (Visa, Mastercard, American Express) through Stripe. All payments are processed securely. We do not store your card details.",
    },
    {
      q: "What is 1-on-1 coaching?",
      a: "Coaching sessions are 60-minute video calls with screen sharing where you get personalized guidance on strategy building, risk management, and MT5 setup. Sessions start at \u20ac179 per session with package deals. Elite members get 1 complimentary strategy review per month.",
    },
    {
      q: "What is the difference between Pro and Elite?",
      a: "Pro gives you everything you need to build, verify, and run live strategies: unlimited exports, Strategy Identity, Verified Track Record, live monitoring, and a public Verified Strategy Page to share your proof. Elite adds capital protection: the Strategy Health Monitor with edge degradation detection, CUSUM drift analysis, advanced drawdown alerts, an embeddable proof widget, plus 1-on-1 strategy reviews (1/month) and a direct developer channel.",
    },
  ];

  return (
    <div id="main-content" className="min-h-screen flex flex-col">
      <SiteNav />
      <div className="max-w-6xl mx-auto pt-32 pb-16 px-4 flex-1">
        {/* ================================================================ */}
        {/* HERO — Outcome-based headline                                    */}
        {/* ================================================================ */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-4 leading-tight">
            Choose your level of strategy intelligence
          </h1>
          <p className="text-[#94A3B8] mt-4 text-lg max-w-2xl mx-auto">
            From first evaluation to verified, health-monitored portfolio. Every plan gives you
            strategy intelligence — choose the depth that matches your stage.
          </p>
        </div>

        {/* ================================================================ */}
        {/* DECISION HELPER                                                  */}
        {/* ================================================================ */}
        <div className="max-w-3xl mx-auto mt-8 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0D0117]/50 border border-[rgba(34,211,238,0.15)] rounded-lg px-4 py-3 text-center">
              <p className="text-xs text-[#64748B] mb-1">Testing a strategy?</p>
              <p className="text-sm font-medium text-[#22D3EE]">Start Free</p>
            </div>
            <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.3)] rounded-lg px-4 py-3 text-center ring-1 ring-[#4F46E5]/30">
              <p className="text-xs text-[#64748B] mb-1">Trading live?</p>
              <p className="text-sm font-medium text-[#A78BFA]">Go Pro</p>
            </div>
            <div className="bg-[#0D0117]/50 border border-[rgba(167,139,250,0.15)] rounded-lg px-4 py-3 text-center">
              <p className="text-xs text-[#64748B] mb-1">Protecting capital?</p>
              <p className="text-sm font-medium text-[#A78BFA]">Go Elite</p>
            </div>
          </div>
        </div>

        <PricingSection showHeader={false} />

        {/* ================================================================ */}
        {/* FEATURE COMPARISON TABLE                                         */}
        {/* ================================================================ */}
        <div className="mt-20 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Detailed feature comparison
          </h2>
          <p className="text-[#94A3B8] text-center text-sm mb-8">
            See exactly what&apos;s included in each plan
          </p>
          <div className="relative">
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
                  {/* Builder & Export */}
                  <tr className="border-b border-[rgba(79,70,229,0.05)]">
                    <td
                      className="py-2 px-4 text-[#64748B] text-xs font-semibold uppercase tracking-wider"
                      colSpan={4}
                    >
                      Builder &amp; Export
                    </td>
                  </tr>
                  {(
                    [
                      ["Visual strategy builder", true, true, true],
                      ["Strategy templates", "All 10", "All 10", "All 10"],
                      ["Active projects", "1", "Unlimited", "Unlimited"],
                      ["MQL5 exports per month", "3", "Unlimited", "Unlimited"],
                      ["Walk-forward analysis", false, true, true],
                    ] as [string, string | boolean, string | boolean, string | boolean][]
                  ).map(([feature, free, pro, elite]) => (
                    <tr key={feature as string} className="border-b border-[rgba(79,70,229,0.1)]">
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

                  {/* Analysis & Tools */}
                  <tr className="border-b border-[rgba(79,70,229,0.05)]">
                    <td
                      className="py-2 px-4 text-[#64748B] text-xs font-semibold uppercase tracking-wider pt-6"
                      colSpan={4}
                    >
                      Analysis &amp; Tools
                    </td>
                  </tr>
                  {(
                    [
                      ["Monte Carlo risk calculator", true, true, true],
                      ["Backtest health scoring", true, true, true],
                      ["Strategy journal", true, true, true],
                    ] as [string, string | boolean, string | boolean, string | boolean][]
                  ).map(([feature, free, pro, elite]) => (
                    <tr key={feature as string} className="border-b border-[rgba(79,70,229,0.1)]">
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

                  {/* Verification & Proof */}
                  <tr className="border-b border-[rgba(79,70,229,0.05)]">
                    <td
                      className="py-2 px-4 text-[#64748B] text-xs font-semibold uppercase tracking-wider pt-6"
                      colSpan={4}
                    >
                      Verification &amp; Proof
                    </td>
                  </tr>
                  {(
                    [
                      ["Strategy Identity (AS-xxxx)", false, true, true],
                      ["Strategy versioning", false, true, true],
                      ["Verified Track Record", false, true, true],
                      ["Tamper-resistant hash chain", false, true, true],
                      ["Track Record sharing link", false, true, true],
                      ["Public Verified Strategy Page", false, true, true],
                      ["Embeddable proof widget", false, false, true],
                    ] as [string, string | boolean, string | boolean, string | boolean][]
                  ).map(([feature, free, pro, elite]) => (
                    <tr key={feature as string} className="border-b border-[rgba(79,70,229,0.1)]">
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

                  {/* Live Monitoring */}
                  <tr className="border-b border-[rgba(79,70,229,0.05)]">
                    <td
                      className="py-2 px-4 text-[#64748B] text-xs font-semibold uppercase tracking-wider pt-6"
                      colSpan={4}
                    >
                      Live Monitoring
                    </td>
                  </tr>
                  {(
                    [
                      ["Live EA monitoring dashboard", false, true, true],
                      ["External EA monitoring", false, true, true],
                      ["Multi-strategy portfolio view", false, true, true],
                      ["Email & webhook alerts", false, true, true],
                      ["Telegram alerts", false, true, true],
                      ["Strategy Health Monitor", false, false, true],
                      ["Edge degradation detection", false, false, true],
                      ["CUSUM drift analysis", false, false, true],
                      ["Advanced drawdown alerts", false, false, true],
                      ["Pre-retirement warnings", false, false, true],
                    ] as [string, string | boolean, string | boolean, string | boolean][]
                  ).map(([feature, free, pro, elite]) => (
                    <tr key={feature as string} className="border-b border-[rgba(79,70,229,0.1)]">
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

                  {/* Support & Access */}
                  <tr className="border-b border-[rgba(79,70,229,0.05)]">
                    <td
                      className="py-2 px-4 text-[#64748B] text-xs font-semibold uppercase tracking-wider pt-6"
                      colSpan={4}
                    >
                      Support &amp; Access
                    </td>
                  </tr>
                  {(
                    [
                      ["Community support", true, true, true],
                      ["Priority support", false, true, true],
                      ["1-on-1 strategy review", false, false, "1/month"],
                      ["Direct developer channel", false, false, true],
                      ["Priority feature requests", false, false, true],
                    ] as [string, string | boolean, string | boolean, string | boolean][]
                  ).map(([feature, free, pro, elite]) => (
                    <tr key={feature as string} className="border-b border-[rgba(79,70,229,0.1)]">
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
            <p className="text-xs text-[#64748B] text-center mt-2 sm:hidden">
              Scroll sideways to see all plans &rarr;
            </p>
          </div>
        </div>

        {/* ================================================================ */}
        {/* ELITE VALUE PROPOSITION                                          */}
        {/* ================================================================ */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="bg-[#1A0626]/60 border border-[rgba(167,139,250,0.2)] rounded-xl p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-[rgba(167,139,250,0.15)] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Why Elite traders choose capital protection
                </h3>
                <p className="text-sm text-[#94A3B8] mt-1">
                  Every strategy has a lifespan. Market conditions change, edges erode, and what
                  worked last quarter can silently bleed your account. Elite&apos;s Health Monitor
                  compares your live performance against your backtest baseline across 5 key metrics
                  &mdash; and alerts you before a drawdown becomes a disaster.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  metric: "CUSUM drift analysis",
                  desc: "Statistically detects when your strategy's edge is shifting",
                },
                {
                  metric: "Advanced drawdown alerts",
                  desc: "Warns when drawdown exceeds historical norms (% and absolute)",
                },
                {
                  metric: "Pre-retirement warnings",
                  desc: "Alerts before automatic strategy retirement kicks in",
                },
              ].map((item) => (
                <div
                  key={item.metric}
                  className="bg-[#0D0117]/50 border border-[rgba(167,139,250,0.1)] rounded-lg px-4 py-3"
                >
                  <p className="text-sm font-medium text-[#A78BFA]">{item.metric}</p>
                  <p className="text-xs text-[#94A3B8] mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* TRUST SECTION                                                    */}
        {/* ================================================================ */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              {
                title: "Cancel anytime",
                description:
                  "No long-term contracts. Cancel from your account settings whenever you want.",
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
                title: "Secure via Stripe",
                description:
                  "All payments through Stripe. We never see your card details. PCI-DSS compliant.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                ),
              },
              {
                title: "Prop firm compatible",
                description:
                  "Standard MQL5 output. Works with FTMO, E8 Markets, FundingPips, and more.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
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
                    aria-hidden="true"
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
            Start your strategy evaluation today
          </h2>
          <p className="text-[#94A3B8] mb-6 max-w-lg mx-auto">
            No credit card required. Upload a backtest and get your Strategy Health Score in under 2
            minutes.
          </p>
          <Link
            href="/login?mode=register&redirect=/app/backtest"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Get Your Strategy Evaluated — Free
          </Link>
          <p className="mt-4 text-[#64748B] text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-[#22D3EE] hover:underline">
              Sign in
            </Link>
          </p>
          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg max-w-xl mx-auto">
            <p className="text-xs text-amber-200 leading-relaxed">
              <strong>Risk Warning:</strong> Trading in financial markets involves substantial risk
              of loss and is not suitable for every investor. Past performance does not guarantee
              future results. Always test strategies on a demo account first. AlgoStudio is a tool
              for building and testing automated trading strategies — it does not provide financial
              advice or guarantee profits. See our{" "}
              <Link href="/terms" className="underline hover:text-amber-100">
                Terms of Service
              </Link>{" "}
              for full details.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
