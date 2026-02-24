import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { PricingSection } from "@/components/marketing/pricing-section";
import { CTASection } from "@/components/marketing/cta-section";
import { LifecycleDemo } from "@/components/marketing/lifecycle-demo";

export const metadata: Metadata = {
  title: "AlgoStudio — Build, Validate & Monitor MT5 Trading Strategies",
  description:
    "Build no-code MT5 Expert Advisors, validate with Monte Carlo simulation, prove performance with verified track records, and monitor live edge degradation. Start free.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AlgoStudio — Build & Validate MT5 Trading Strategies",
    description:
      "Build no-code MT5 Expert Advisors, validate with Monte Carlo simulation, prove performance with verified track records, and monitor live edge degradation. Start free.",
  },
};

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/app");
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AlgoStudio",
    description:
      "Build no-code MT5 Expert Advisors, validate strategies with Monte Carlo simulation, prove performance with verified track records, and monitor live edge degradation.",
    url: "https://algo-studio.com",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "79",
      priceCurrency: "EUR",
      offerCount: 3,
    },
    featureList: [
      "No-code visual strategy builder for MT5",
      "Strategy Health Score with 7-dimension scoring",
      "One-click Monte Carlo validation",
      "Verified Track Record with immutable hash chain",
      "Live strategy monitoring dashboard",
      "Strategy Lifecycle management (NEW → PROVING → PROVEN → RETIRED)",
    ],
  };

  const faqItems = [
    {
      q: "Do I need to know MQL5 to use AlgoStudio?",
      a: "No. AlgoStudio includes a no-code visual builder with proven templates. Pick a template, adjust risk parameters, and export a ready-to-use .mq5 file. If you already code in MQL5, you can upload any backtest report for analysis instead.",
    },
    {
      q: "Does AlgoStudio work with prop firms like FTMO?",
      a: "Yes. The exported EA runs on any MT5 broker, including prop firm platforms like FTMO, E8 Markets, and FundingPips. The Verified Track Record feature also helps you document provable performance for prop firm applications and evaluations.",
    },
    {
      q: "What is a Strategy Health Score?",
      a: "A 0-100 composite score that rates your strategy across 7 weighted dimensions: profit factor, max drawdown, trade count, expected payoff, win rate, Sharpe ratio, and recovery factor. Scores above 80 are ROBUST, 60-79 are MODERATE, and below 60 are WEAK. It gives you an instant, objective read on whether a strategy is worth deploying.",
    },
    {
      q: "How does Monte Carlo validation work?",
      a: "Monte Carlo validation runs 1,000 randomized simulations of your trade sequence — shuffling trade order, varying slippage, and stress-testing under different conditions. It tells you the survival probability and realistic range of outcomes, not just the single best-case backtest. If your strategy can't survive randomized conditions, it's unlikely to survive live markets.",
    },
    {
      q: "Can I use the exported EA without a subscription?",
      a: "Yes. Every EA you build and export is yours permanently — no subscription required to run it. The free plan lets you build and export unlimited EAs. Pro features like Monte Carlo validation, Verified Track Record, and live monitoring require a subscription, but your exported code never stops working.",
    },
    {
      q: "What is a Verified Track Record?",
      a: "A cryptographic proof of your live trading performance. Every trade is recorded in an immutable hash chain that can't be altered or cherry-picked. You can share proof bundles that anyone can independently verify — making it useful for prop firm applications, investor presentations, or simply proving to yourself that your edge is real.",
    },
    {
      q: "What is the Strategy Lifecycle?",
      a: "Every strategy in AlgoStudio follows a lifecycle: NEW (collecting initial data), PROVING (building track record with health monitoring), PROVEN (5 consecutive healthy evaluations — edge verified), and RETIRED (edge degraded, auto-retired to protect capital). This gives you a clear, objective framework for when to trust, scale, or stop a strategy.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div id="main-content" className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <SiteNav />

      {/* ================================================================ */}
      {/* S1: HERO — Asymmetric, animated                                  */}
      {/* ================================================================ */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left column — Copy + CTA */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Know if your strategy works{" "}
              <span className="text-[#A78BFA]">before you go live.</span>
            </h1>

            <p className="text-lg text-[#94A3B8] mb-8 max-w-lg">
              Build, stress-test, verify, and monitor MT5 strategies. From backtest to proven edge.
            </p>

            {/* Trust badges */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-8 text-sm text-[#CBD5E1]">
              {["Monte Carlo validated", "Verified track records", "Live health monitoring"].map(
                (badge) => (
                  <div key={badge} className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {badge}
                  </div>
                )
              )}
            </div>

            {/* Single CTA */}
            <Link
              href="/login?mode=register&redirect=/app/backtest"
              className="inline-block w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)] text-center"
            >
              Start Free — Upload a Backtest
            </Link>

            <p className="mt-4 text-xs text-[#64748B]">
              Free forever to start. No credit card. Your exported EA code is yours.
            </p>
          </div>

          {/* Right column — Animated Health Score */}
          <div className="flex justify-center">
            <div className="bg-[#0D0117] border border-[rgba(79,70,229,0.15)] rounded-xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-semibold text-white">Strategy Health Score</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    EMA Trend &middot; EURUSD &middot; H1
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-xs text-[#10B981] font-medium">ROBUST</span>
                </div>
              </div>

              {/* Animated circle */}
              <div className="flex justify-center mb-6">
                <div className="relative w-28 h-28 animate-health-glow">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="42" stroke="#1A0626" strokeWidth="8" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#10B981"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${83 * 2.64} ${100 * 2.64}`}
                      strokeLinecap="round"
                      className="animate-score-fill"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">83</span>
                    <span className="text-[10px] text-[#64748B] uppercase tracking-wider">
                      /100
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric bars with staggered animation */}
              <div className="space-y-3">
                {[
                  { name: "Profit Factor", score: 88 },
                  { name: "Max Drawdown", score: 76 },
                  { name: "Win Rate", score: 72 },
                  { name: "Total Trades", score: 90 },
                  { name: "Sharpe Ratio", score: 85 },
                ].map((metric, i) => (
                  <div key={metric.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#94A3B8]">{metric.name}</span>
                      <span className="text-xs font-mono text-[#CBD5E1]">{metric.score}</span>
                    </div>
                    <div className="h-1.5 bg-[#1A0626] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full animate-bar-fill stagger-${i + 1}`}
                        style={{
                          width: `${metric.score}%`,
                          backgroundColor:
                            metric.score >= 80
                              ? "#10B981"
                              : metric.score >= 60
                                ? "#F59E0B"
                                : "#EF4444",
                          animationFillMode: "backwards",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S2: SOCIAL PROOF STRIP — Compact numbers                         */}
      {/* ================================================================ */}
      <section className="py-8 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
            {[
              { number: "12,400+", label: "Strategies Analyzed" },
              { number: "1,000+", label: "Simulations per Validation" },
              { number: "2.1M+", label: "Trades Verified" },
              { number: "847+", label: "Verified Track Records" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`text-center py-2 ${
                  i < 3 ? "md:border-r md:border-[rgba(34,211,238,0.15)]" : ""
                }`}
              >
                <p className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight">
                  {stat.number}
                </p>
                <p className="text-xs text-[#64748B] uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S3: LIFECYCLE SHOWCASE — The differentiator                       */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Every strategy has a lifecycle.{" "}
              <span className="text-[#A78BFA]">We track it for you.</span>
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              From first deployment to proven edge — or retirement. AlgoStudio manages every phase
              so you always know where your strategy stands.
            </p>
          </div>

          <LifecycleDemo />
        </div>
      </section>

      {/* ================================================================ */}
      {/* S4: PRODUCT PREVIEW — Interactive dashboard mock                  */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#0D0117]/60 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left — Copy */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Your strategy <span className="text-[#22D3EE]">command center.</span>
            </h2>
            <ul className="space-y-4 mb-8">
              {[
                {
                  title: "Health score dimensions",
                  desc: "7 weighted metrics give you an instant read on strategy quality.",
                },
                {
                  title: "CUSUM drift detection",
                  desc: "Statistical change-point detection catches edge degradation early.",
                },
                {
                  title: "Verified hash chain",
                  desc: "Every trade is cryptographically recorded. No edits, no deletions.",
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-[#22D3EE] flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/login?mode=register&redirect=/app/backtest"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Free — Upload a Backtest
            </Link>
          </div>

          {/* Right — Dashboard mock */}
          <div className="bg-[#0D0117] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden">
            {/* Top bar */}
            <div className="px-6 py-4 border-b border-[rgba(79,70,229,0.1)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    EMA Trend <span className="text-[#64748B] font-normal">| EURUSD H1</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#6366F1] bg-[rgba(99,102,241,0.15)] px-2.5 py-1 rounded-full border border-[rgba(99,102,241,0.3)]">
                  PROVING
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-xs text-[#10B981]">Online</span>
                </div>
              </div>
            </div>

            {/* Health circle + metrics */}
            <div className="p-6">
              <div className="flex justify-center mb-6">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="42" stroke="#1A0626" strokeWidth="8" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#F59E0B"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${78 * 2.64} ${100 * 2.64}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-white">78</span>
                    <span className="text-[9px] text-[#F59E0B] uppercase tracking-wider font-medium">
                      Warning
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric bars with shimmer */}
              <div className="space-y-3">
                {[
                  { name: "Return", score: 72, warn: false },
                  { name: "Volatility", score: 61, warn: false },
                  { name: "Drawdown", score: 85, warn: false },
                  { name: "Win Rate", score: 58, warn: true },
                  { name: "Trade Freq", score: 82, warn: false },
                ].map((metric) => (
                  <div key={metric.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#94A3B8]">{metric.name}</span>
                      <span className="text-xs font-mono text-[#CBD5E1]">{metric.score}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1A0626] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bar-shimmer ${metric.warn ? "animate-pulse" : ""}`}
                        style={{
                          width: `${metric.score}%`,
                          backgroundColor: metric.warn
                            ? "#F59E0B"
                            : metric.score >= 80
                              ? "#10B981"
                              : metric.score >= 60
                                ? "#F59E0B"
                                : "#EF4444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom stats */}
            <div className="px-6 py-3 bg-[#1A0626]/50 border-t border-[rgba(79,70,229,0.1)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[#64748B]">
                  47 trades sampled &middot; 23-day window &middot; Score trend: stable
                </span>
                {/* Mini sparkline */}
                <svg className="w-16 h-4" viewBox="0 0 64 16" aria-hidden="true">
                  <polyline
                    points="0,12 8,10 16,11 24,8 32,9 40,7 48,6 56,7 64,5"
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S5: TRUST STRIP — Compact, no-card layout                        */}
      {/* ================================================================ */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">Built for traders who trust no one.</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                title: "Your code is yours.",
                desc: "Standalone MQL5, zero dependency.",
                icon: (
                  <svg
                    className="w-8 h-8 text-[#22D3EE]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                ),
              },
              {
                title: "Strategy logic stays local.",
                desc: "Client-side generation, never transmitted.",
                icon: (
                  <svg
                    className="w-8 h-8 text-[#22D3EE]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                ),
              },
              {
                title: "Track records can\u2019t be faked.",
                desc: "Cryptographic hash chain, third-party verifiable.",
                icon: (
                  <svg
                    className="w-8 h-8 text-[#22D3EE]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ),
              },
              {
                title: "Broker-verified trades.",
                desc: "Cross-matched against broker execution data.",
                icon: (
                  <svg
                    className="w-8 h-8 text-[#22D3EE]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="text-center group transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex justify-center mb-3">{item.icon}</div>
                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-[#94A3B8]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S6: PRICING — Existing component, reframed                       */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-white mb-3">
              Start free. Upgrade when your strategy proves itself.
            </h2>
            <p className="text-sm text-[#94A3B8]">
              <span className="text-white font-medium">Free</span> — Build &amp; export unlimited
              EAs. <span className="text-white font-medium">Pro from &euro;39/mo</span> — Full
              validation &amp; monitoring.
            </p>
          </div>
          <PricingSection showHeader={false} />
        </div>
      </section>

      {/* ================================================================ */}
      {/* S7: FAQ + FINAL CTA — Combined close                             */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <details
                key={i}
                className="group bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden"
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
      </section>

      {/* Final CTA */}
      <CTASection
        title="Your next strategy deserves more than a backtest and a prayer."
        description="Free forever for strategy building and export. Validation and monitoring available on Pro."
        ctaText="Start Free — Upload a Backtest"
      />

      <Footer />
    </div>
  );
}
