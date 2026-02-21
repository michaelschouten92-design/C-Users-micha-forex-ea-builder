import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { PricingSection } from "@/components/marketing/pricing-section";

export const metadata: Metadata = {
  title: "AlgoStudio — Strategy Validation Platform for Algorithmic Traders",
  description:
    "Know if your trading strategy actually works before risking capital. Build, verify, and monitor automated trading strategies with immutable track records and health monitoring.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AlgoStudio — Strategy Validation Platform",
    description:
      "Know if your trading strategy actually works. Build, verify, and monitor with immutable track records.",
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
      "Strategy Validation Platform for algorithmic traders. Build, verify, and monitor automated trading strategies.",
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
      "No-code strategy builder for MT5",
      "Monte Carlo risk calculator",
      "Verified Track Record with immutable hash chain",
      "Strategy Identity and versioning",
      "Strategy Health Monitor",
      "Live EA monitoring dashboard",
    ],
  };

  const faqItems = [
    {
      q: "What is strategy validation?",
      a: "Strategy validation is the process of objectively determining whether a trading strategy has a real edge \u2014 before you risk capital. AlgoStudio combines Monte Carlo risk analysis, verified track records, and live health monitoring to give you a complete picture of strategy viability.",
    },
    {
      q: "Do I need coding experience?",
      a: "No. AlgoStudio is a no-code platform. You pick a strategy template, adjust settings like risk percentage and stop loss, and export a ready-to-use .mq5 file. No MQL5, Python, or any other programming knowledge required.",
    },
    {
      q: "What is a Verified Track Record?",
      a: "Every trade your EA makes is recorded in a tamper-resistant hash chain — similar to how blockchain works. This creates cryptographically verified performance history that proves your results are real. No manipulation, no cherry-picking.",
    },
    {
      q: "What is the Strategy Health Monitor?",
      a: "The Strategy Health Monitor continuously compares your live trading performance against your backtest baseline across 5 key metrics. It alerts you when your strategy's edge begins to degrade — before a drawdown becomes a disaster.",
    },
    {
      q: "Does this work with any MT5 broker?",
      a: "Yes. You export standard MQL5 source code that works with any MetaTrader 5 broker. Compatible with prop firms like FTMO, E8 Markets, and FundingPips.",
    },
    {
      q: "Does AlgoStudio guarantee profits?",
      a: "No. AlgoStudio is a validation platform — it helps you determine whether a strategy has a measurable edge. No tool, strategy, or system can guarantee trading profits. Always validate thoroughly before deploying with real capital.",
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
      {/* HERO — Core problem + Category creation                          */}
      {/* ================================================================ */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">Strategy Validation Platform</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Know if your trading strategy
            <br />
            <span className="text-[#A78BFA]">actually works</span>
          </h1>

          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
            Most traders deploy strategies based on hope. AlgoStudio lets you build, validate, and
            monitor automated strategies with objective proof — before you risk real capital.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10 text-sm text-[#CBD5E1]">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
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
              Monte Carlo validated
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
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
              Immutable track record
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
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
              Live health monitoring
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=register"
              className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Validating — Free
            </Link>
            <Link
              href="/product"
              className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
            >
              See the Platform
            </Link>
          </div>

          <p className="mt-6 text-xs text-[#64748B]">
            No credit card required. Build and validate your first strategy in minutes.
          </p>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HIGH-TRUST PROOF — Build → Verify → Monitor                      */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              From idea to validated strategy in three stages
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Every AlgoStudio strategy goes through a validation pipeline. Each stage builds
              confidence before you commit capital.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Build */}
            <div className="relative">
              <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-8 h-full">
                <div className="w-10 h-10 bg-[#4F46E5]/20 border border-[#4F46E5]/30 rounded-lg flex items-center justify-center mb-5">
                  <span className="text-sm font-bold text-[#A78BFA]">1</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Build</h3>
                <p className="text-xs text-[#22D3EE] font-medium tracking-wider uppercase mb-3">
                  Strategy Construction
                </p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Pick a proven strategy template. Customize risk parameters. Export clean MQL5
                  code. No coding required — go from idea to executable strategy in minutes.
                </p>
                <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.1)]">
                  <ul className="space-y-1.5 text-xs text-[#64748B]">
                    <li>6 strategy templates</li>
                    <li>Visual builder</li>
                    <li>Clean source code export</li>
                  </ul>
                </div>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-center text-[#4F46E5]">
                <svg
                  className="w-6 h-6 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>

            {/* Verify */}
            <div className="relative">
              <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-8 h-full">
                <div className="w-10 h-10 bg-[#4F46E5]/20 border border-[#4F46E5]/30 rounded-lg flex items-center justify-center mb-5">
                  <span className="text-sm font-bold text-[#A78BFA]">2</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Verify</h3>
                <p className="text-xs text-[#22D3EE] font-medium tracking-wider uppercase mb-3">
                  Strategy Validation
                </p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Export to MT5 Strategy Tester. Run Monte Carlo simulations to stress-test edge
                  durability. Analyze risk profiles before you trade.
                </p>
                <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.1)]">
                  <ul className="space-y-1.5 text-xs text-[#64748B]">
                    <li>MT5 Strategy Tester export</li>
                    <li>Monte Carlo risk calculator</li>
                    <li>Optimization-ready parameters</li>
                  </ul>
                </div>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-center text-[#4F46E5]">
                <svg
                  className="w-6 h-6 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>

            {/* Monitor */}
            <div>
              <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-8 h-full">
                <div className="w-10 h-10 bg-[#4F46E5]/20 border border-[#4F46E5]/30 rounded-lg flex items-center justify-center mb-5">
                  <span className="text-sm font-bold text-[#A78BFA]">3</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Monitor</h3>
                <p className="text-xs text-[#22D3EE] font-medium tracking-wider uppercase mb-3">
                  Performance Tracking
                </p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Deploy with a verified track record. Monitor live performance against your
                  backtest baseline. Get alerts when your strategy&apos;s edge begins to degrade.
                </p>
                <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.1)]">
                  <ul className="space-y-1.5 text-xs text-[#64748B]">
                    <li>Verified Track Record</li>
                    <li>Strategy Health Monitor</li>
                    <li>Edge degradation alerts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PROBLEM — Why traders fail                                       */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Most traders never know if their strategy has an edge
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              They backtest once, see a profit, and deploy. Then the market shifts and the drawdowns
              start. AlgoStudio exists to break this cycle.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                problem: "One test is not validation",
                description:
                  "A single test on cherry-picked data proves nothing. Without Monte Carlo simulation, you don't know if your results were skill or luck.",
              },
              {
                problem: "No proof your results are real",
                description:
                  "Screenshots can be faked. Without a tamper-resistant record, there's no way to verify that performance numbers are genuine.",
              },
              {
                problem: "Strategies degrade silently",
                description:
                  "Markets change. An edge that worked last year can erode over months. Without monitoring, you only notice when the drawdown is already deep.",
              },
              {
                problem: "No identity for your strategy",
                description:
                  "Which version of your strategy is running? What parameters changed? Without versioning, you can't track what's actually deployed.",
              },
            ].map((item) => (
              <div
                key={item.problem}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6"
              >
                <h3 className="text-sm font-semibold text-white mb-2">{item.problem}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PLATFORM MODULES — What AlgoStudio includes                      */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              One platform. Complete strategy lifecycle.
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Every module works together. Build a strategy, validate it under stress, deploy with a
              verified identity, and monitor its health in production.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Strategy Builder",
                description:
                  "No-code visual builder with 6 proven templates. Customize risk parameters, export clean MQL5 source code. From idea to executable strategy in minutes.",
                accent: "#A78BFA",
              },
              {
                title: "Monte Carlo Risk Calculator",
                description:
                  "Run 1,000 randomized simulations of your trade sequence. See the probability distribution of outcomes \u2014 not just the best case, but the realistic range.",
                accent: "#22D3EE",
              },
              {
                title: "AI Strategy Generator",
                description:
                  "Describe your trading idea in plain language. The AI generates a complete strategy configuration that you can fine-tune in the visual builder.",
                accent: "#F59E0B",
              },
              {
                title: "Verified Track Record",
                description:
                  "Every trade is recorded in a tamper-resistant hash chain. Cryptographically verified performance that can be independently audited. Proof, not promises.",
                accent: "#10B981",
              },
              {
                title: "Strategy Identity",
                description:
                  "Each strategy gets a permanent ID and version history. Track exactly what's deployed, what changed, and when. Full auditability across your portfolio.",
                accent: "#EC4899",
              },
              {
                title: "Health Monitor",
                description:
                  "Continuously compares live performance against your backtest baseline across 5 metrics. Alerts you when returns drift, drawdowns exceed norms, or your edge degrades.",
                accent: "#EF4444",
              },
            ].map((module) => (
              <div
                key={module.title}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: module.accent }}
                  />
                  <h3 className="text-base font-semibold text-white">{module.title}</h3>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{module.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* VERIFIED STRATEGY PROOF CARD                                     */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Proof, not promises</h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Every strategy on AlgoStudio can produce a verifiable proof of performance. This is
              what a validated strategy looks like.
            </p>
          </div>

          {/* Simulated Verified Strategy Card */}
          <div className="max-w-lg mx-auto bg-[#0D0117] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(79,70,229,0.1)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#4F46E5]/20 border border-[#4F46E5]/30 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">EMA Trend Strategy</p>
                  <p className="text-xs text-[#64748B] font-mono">AS-7f3a2b1c</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span className="text-xs text-[#22C55E] font-medium">Healthy</span>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Win Rate</p>
                  <p className="text-lg font-semibold text-white">62.4%</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Profit Factor</p>
                  <p className="text-lg font-semibold text-white">1.87</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Max Drawdown</p>
                  <p className="text-lg font-semibold text-white">8.2%</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-[#1A0626]/50 border-t border-[rgba(79,70,229,0.1)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5 text-[#22D3EE]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <span className="text-xs text-[#64748B]">Chain verified &middot; 847 events</span>
              </div>
              <span className="text-xs text-[#64748B]">v3 &middot; 142 days live</span>
            </div>
          </div>

          <p className="text-center text-xs text-[#64748B] mt-4">
            Example visualization. Actual data from your strategies.
          </p>
        </div>
      </section>

      {/* ================================================================ */}
      {/* STRATEGY HEALTH — Protect capital                                */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase mb-3">
                Strategy Health Monitor
              </p>
              <h2 className="text-3xl font-bold text-white mb-4">Know when your edge is fading</h2>
              <p className="text-[#94A3B8] leading-relaxed mb-6">
                Every strategy has a lifespan. Market regimes change, correlations shift, and edges
                erode. The Health Monitor continuously compares your live trading against your
                validated baseline — and alerts you before a drawdown becomes a disaster.
              </p>
              <ul className="space-y-3">
                {[
                  "Return drift detection",
                  "Drawdown threshold alerts",
                  "Win rate degradation tracking",
                  "Trade frequency monitoring",
                  "Volatility regime analysis",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#CBD5E1]">
                    <svg
                      className="w-4 h-4 text-[#A78BFA] flex-shrink-0"
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
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Health Score Visual */}
            <div className="bg-[#0D0117] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-semibold text-white">Health Assessment</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span className="text-xs text-[#22C55E] font-medium">Healthy</span>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { name: "Return", score: 82, color: "#22C55E" },
                  { name: "Volatility", score: 75, color: "#22C55E" },
                  { name: "Drawdown", score: 91, color: "#22C55E" },
                  { name: "Win Rate", score: 68, color: "#F59E0B" },
                  { name: "Trade Frequency", score: 85, color: "#22C55E" },
                ].map((metric) => (
                  <div key={metric.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#94A3B8]">{metric.name}</span>
                      <span className="text-xs font-mono text-[#CBD5E1]">{metric.score}/100</span>
                    </div>
                    <div className="h-1.5 bg-[#1A0626] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${metric.score}%`, backgroundColor: metric.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-[rgba(79,70,229,0.1)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#64748B]">Overall Score</span>
                  <span className="text-sm font-semibold text-white">80.2 / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW IT WORKS — Simple 4-step                                     */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              From trading idea to validated, monitored strategy. No coding required at any step.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                step: "1",
                title: "Choose a strategy template",
                description:
                  "Pick from 6 proven strategies: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, MACD Crossover, or RSI/MACD Divergence.",
              },
              {
                step: "2",
                title: "Customize and export",
                description:
                  "Set your risk parameters, stop loss, and take profit. Export clean MQL5 source code that you own and can modify.",
              },
              {
                step: "3",
                title: "Validate with data",
                description:
                  "Test in MT5 Strategy Tester. Run Monte Carlo simulations to stress-test your edge. Analyze risk profiles before going live.",
              },
              {
                step: "4",
                title: "Deploy and monitor",
                description:
                  "Go live with a verified track record. Monitor strategy health with live performance tracking. Get alerts when performance drifts.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6 flex gap-4"
              >
                <div className="w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/login?mode=register"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Validating — Free
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* BUILDER PREVIEW                                                  */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Simplicity at the surface. Power underneath.
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              A visual interface that makes strategy building intuitive. No wiring, no logic gates,
              no blank canvas. Just the parameters that matter.
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div className="absolute inset-4 bg-gradient-to-r from-[#4F46E5]/20 via-[#A78BFA]/20 to-[#22D3EE]/20 blur-3xl -z-10" />
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl overflow-hidden shadow-2xl shadow-[#4F46E5]/10">
              <div className="bg-[#0D0117] px-4 py-3 flex items-center gap-2 border-b border-[rgba(79,70,229,0.2)]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#22C55E]/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-[#1A0626] rounded-md px-3 py-1 text-xs text-[#64748B] max-w-xs mx-auto">
                    algo-studio.com/builder
                  </div>
                </div>
              </div>
              <Image
                src="/demo-screenshot.png"
                alt="AlgoStudio visual strategy builder — drag-and-drop interface for building automated trading strategies"
                width={1918}
                height={907}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="w-full"
                quality={75}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PRICING                                                          */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <PricingSection />
        </div>
      </section>

      {/* ================================================================ */}
      {/* FAQ                                                              */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
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

      {/* ================================================================ */}
      {/* FINAL CTA                                                        */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Stop guessing. Start validating.</h2>
          <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto">
            Build your strategy, validate it with data, and deploy with confidence. Know if it works
            before you risk a single dollar.
          </p>
          <Link
            href="/login?mode=register"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Start Validating — Free
          </Link>
          <p className="mt-4 text-xs text-[#64748B]">
            No credit card required. Build and validate your first strategy in minutes.
          </p>

          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-300/90 leading-relaxed">
              <strong>Risk Warning:</strong> Trading in financial markets involves substantial risk
              of loss and is not suitable for every investor. Past performance does not guarantee
              future results. Always test strategies on a demo account first. AlgoStudio is a
              strategy validation platform — it does not provide financial advice or guarantee
              profits. See our{" "}
              <Link href="/terms" className="underline hover:text-amber-200">
                Terms of Service
              </Link>{" "}
              for full details.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
