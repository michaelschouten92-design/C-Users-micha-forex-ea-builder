import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { PricingSection } from "@/components/marketing/pricing-section";

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
      "Edge degradation alerts",
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
      q: "Is my strategy logic stored on your servers?",
      a: "Strategy code is generated client-side in your browser and is never transmitted to our servers. When you export an EA, the .mq5 file is yours — it runs independently on any MT5 platform with zero dependency on AlgoStudio. Backtest data you upload is stored securely for analysis but your proprietary logic remains local.",
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
      q: "Does AlgoStudio guarantee profits?",
      a: "No. AlgoStudio is a strategy validation and monitoring platform — it helps you determine whether a strategy has a measurable edge before you risk real capital. No tool, strategy, or system can guarantee trading profits. Always validate thoroughly and test on a demo account first.",
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
      {/* S1: HERO                                                         */}
      {/* ================================================================ */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">
              Strategy Validation &amp; Monitoring Platform
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Build and validate MT5 trading strategies
            <br />
            <span className="text-[#A78BFA]">before you risk real capital.</span>
          </h1>

          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
            No-code EA builder. Monte Carlo stress testing. Verified track records anyone can audit.
            Live monitoring that alerts you when your edge degrades. One platform, from backtest to
            live.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10 text-sm text-[#CBD5E1]">
            {["No-code EA builder", "Monte Carlo validated", "Verified track records"].map(
              (badge) => (
                <div key={badge} className="flex items-center gap-2">
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
                  {badge}
                </div>
              )
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=register&redirect=/app/backtest"
              className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Building — Free
            </Link>
            <Link
              href="/product"
              className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
            >
              Watch 2-Min Demo
            </Link>
          </div>

          <p className="mt-6 text-xs text-[#64748B]">
            Free forever to start &middot; No credit card required &middot; Your exported EA code is
            yours
          </p>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S2: PERSONA SELECTOR                                             */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Built for traders who take strategy seriously.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Prop Firm Traders",
                accent: "#22D3EE",
                description:
                  "You need to prove your edge to get funded — and keep proving it to stay funded. AlgoStudio gives you verified track records, Monte Carlo validation, and health monitoring so you pass evaluations with strategies you actually trust.",
                link: "/product/track-record",
                linkText: "See Verified Track Record",
              },
              {
                title: "EA Developers",
                accent: "#A78BFA",
                description:
                  "You build strategies in MQL5, but validating them is tedious and inconsistent. Upload any backtest for instant health scoring, stress test with Monte Carlo, and monitor live performance — all without leaving your workflow.",
                link: "/product",
                linkText: "See the Platform",
              },
              {
                title: "Systematic Traders",
                accent: "#10B981",
                description:
                  "You know a single backtest proves nothing. You need multi-dimensional validation, objective scoring, and continuous monitoring to know when market regimes shift and your edge starts to fade.",
                link: "/product/how-it-works",
                linkText: "See How It Works",
              },
            ].map((persona) => (
              <div
                key={persona.title}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: persona.accent }}
                  />
                  <h3 className="text-base font-semibold text-white">{persona.title}</h3>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">{persona.description}</p>
                <Link
                  href={persona.link}
                  className="text-sm font-medium hover:underline"
                  style={{ color: persona.accent }}
                >
                  {persona.linkText} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S3: PROBLEM                                                      */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            You backtested it. It looked great.
            <br />
            Then you went live.
          </h2>

          <div className="space-y-6 text-[#94A3B8] leading-relaxed">
            <p>
              The equity curve was beautiful. Profit factor above 2. Win rate over 60%. You ran it
              through the Strategy Tester, saw the numbers, and felt confident. So you went live —
              and within three weeks the drawdown was deeper than anything in the backtest. The
              strategy that looked unbreakable started bleeding.
            </p>
            <p>
              This happens because a single backtest on a single dataset is not validation.
              It&apos;s a snapshot. It doesn&apos;t tell you if those results survive randomized
              trade sequences, changing spreads, or regime shifts. It doesn&apos;t tell you when the
              edge starts fading. And once you&apos;re live, there&apos;s no objective system
              watching for the signals that matter.
            </p>
            <p>
              AlgoStudio exists because traders deserve better than guessing. Build your strategy,
              stress-test it under realistic conditions, prove its performance with a record no one
              can dispute, and monitor it continuously so you know the moment something changes.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S4: CORE WORKFLOW — 3 Phases                                     */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              From backtest to verified live performance. Three phases.
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Most traders build strategies. Professionals validate, verify, and monitor them.
            </p>
          </div>

          {/* Phase 1: Build & Validate */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#A78BFA]/20 border border-[#A78BFA]/30">
                  <span className="text-sm font-bold text-[#A78BFA]">1</span>
                </div>
                <p className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase">
                  Build &amp; Validate
                </p>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Build your EA, then know if it actually works.
              </h3>
              <p className="text-[#94A3B8] leading-relaxed mb-6">
                Use the visual builder to create your strategy — or upload an existing backtest. Get
                an instant 0-100 health score across 7 dimensions, AI-powered weakness analysis, and
                one-click Monte Carlo stress testing with 1,000 simulations.
              </p>
              <ul className="space-y-2">
                {[
                  "No-code visual builder with 6 proven templates",
                  "Instant health score: ROBUST / MODERATE / WEAK",
                  "Monte Carlo survival probability before going live",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#CBD5E1]">
                    <svg
                      className="w-4 h-4 text-[#A78BFA] flex-shrink-0 mt-0.5"
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

            {/* Health Score Circle Visual */}
            <div className="bg-[#0D0117] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-semibold text-white">Strategy Health Score</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    EMA Trend &middot; EURUSD &middot; H1
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <span className="text-xs text-[#22C55E] font-medium">ROBUST</span>
                </div>
              </div>
              <div className="flex justify-center mb-6">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="#1A0626" strokeWidth="8" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#22C55E"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${83 * 2.64} ${100 * 2.64}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">83</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Profit Factor", score: 88, value: "1.87" },
                  { name: "Max Drawdown", score: 76, value: "18.2%" },
                  { name: "Win Rate", score: 72, value: "62.4%" },
                  { name: "Total Trades", score: 90, value: "847" },
                  { name: "Sharpe Ratio", score: 85, value: "1.42" },
                ].map((metric) => (
                  <div key={metric.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#94A3B8]">{metric.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#64748B]">{metric.value}</span>
                        <span className="text-xs font-mono text-[#CBD5E1] w-8 text-right">
                          {metric.score}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#1A0626] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${metric.score}%`,
                          backgroundColor:
                            metric.score >= 80
                              ? "#22C55E"
                              : metric.score >= 60
                                ? "#F59E0B"
                                : "#EF4444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-[rgba(79,70,229,0.1)]">
                <p className="text-xs text-[#64748B] text-center">
                  Example visualization. Actual scores from your strategy data.
                </p>
              </div>
            </div>
          </div>

          {/* Phase 2: Verify */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            {/* Verified Strategy Card (left on desktop) */}
            <div className="order-2 md:order-1 bg-[#0D0117] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden">
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
                  <span className="text-xs text-[#22C55E] font-medium">Verified</span>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {[
                    { label: "Win Rate", value: "62.4%" },
                    { label: "Profit Factor", value: "1.87" },
                    { label: "Sharpe Ratio", value: "1.42" },
                    { label: "Sortino Ratio", value: "2.18" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-xs text-[#64748B] mb-1">{stat.label}</p>
                      <p className="text-lg font-semibold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-3 bg-[#1A0626]/50 border-t border-[rgba(79,70,229,0.1)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#64748B]">
                    Chain verified &middot; 847 events &middot; 142 days live
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span className="text-xs text-[#10B981] font-medium">Broker Verified</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#10B981]/20 border border-[#10B981]/30">
                  <span className="text-sm font-bold text-[#10B981]">2</span>
                </div>
                <p className="text-xs text-[#10B981] font-medium tracking-wider uppercase">
                  Verify
                </p>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Prove your performance. Not just screenshot it.
              </h3>
              <p className="text-[#94A3B8] leading-relaxed mb-6">
                Every trade your EA makes is automatically recorded in a cryptographic hash chain.
                You can&apos;t delete trades, can&apos;t cherry-pick results, and anyone can
                independently verify the record. Risk-adjusted metrics like Sharpe, Sortino, and
                Calmar ratios are computed automatically.
              </p>
              <ul className="space-y-2">
                {[
                  "Immutable trade record — no edits, no deletions",
                  "Third-party verifiable proof bundles",
                  "Risk-adjusted metrics computed automatically",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#CBD5E1]">
                    <svg
                      className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5"
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
          </div>

          {/* Phase 3: Monitor & Protect */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#22D3EE]/20 border border-[#22D3EE]/30">
                  <span className="text-sm font-bold text-[#22D3EE]">3</span>
                </div>
                <p className="text-xs text-[#22D3EE] font-medium tracking-wider uppercase">
                  Monitor &amp; Protect
                </p>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Know when your edge is fading — before the drawdown tells you.
              </h3>
              <p className="text-[#94A3B8] leading-relaxed mb-6">
                Every strategy has a lifespan. Market regimes change, correlations shift, and edges
                erode. The Health Monitor continuously compares your live trading against your
                validated baseline — and alerts you before a drawdown becomes a disaster.
              </p>
              <ul className="space-y-2">
                {[
                  "Return drift and drawdown threshold alerts",
                  "Win rate and trade frequency monitoring",
                  "Volatility regime change detection",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#CBD5E1]">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
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

            {/* Health Monitor Visual */}
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
                        className="h-full rounded-full"
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
      {/* S5: TRACK RECORD PROOF                                           */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Trading performance you can prove. Not just screenshot.
          </h2>
          <p className="text-[#94A3B8] max-w-2xl mx-auto mb-6 leading-relaxed">
            Screenshots can be faked. Statements can be edited. A Verified Track Record can&apos;t.
            Every trade is immutably recorded — you can&apos;t delete trades, can&apos;t cherry-pick
            results, and third parties can independently verify the entire record.
          </p>
          <p className="text-[#94A3B8] max-w-2xl mx-auto mb-8 leading-relaxed">
            Whether you&apos;re applying to a prop firm, showing investors, or simply holding
            yourself accountable — your track record speaks for itself.
          </p>
          <Link
            href="/product/track-record"
            className="text-sm font-medium text-[#A78BFA] hover:underline"
          >
            See a Sample Track Record &rarr;
          </Link>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S6: FEATURE GRID                                                 */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">What you get.</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Visual Strategy Builder",
                description:
                  "No-code builder with 6 proven templates. Customize parameters, export clean MQL5 source code. From idea to executable EA in minutes.",
                accent: "#EC4899",
              },
              {
                title: "Strategy Health Score",
                description:
                  "Upload your MT5 report and get an instant 0-100 score across 7 weighted dimensions. Know immediately if your strategy is ROBUST, MODERATE, or WEAK.",
                accent: "#22D3EE",
              },
              {
                title: "Monte Carlo Simulation",
                description:
                  "One-click stress test. 1,000 randomized simulations of your trade sequence. See survival probability and realistic outcome ranges — not just the best case.",
                accent: "#F59E0B",
              },
              {
                title: "Verified Track Record",
                description:
                  "Automatic, zero-config trade recording with cryptographic verification. Shareable proof bundles anyone can independently audit.",
                accent: "#10B981",
              },
              {
                title: "Live Monitoring",
                description:
                  "Continuously compares live performance against your validated baseline across 5 metrics. See exactly how your strategy is performing in production.",
                accent: "#A78BFA",
              },
              {
                title: "Edge Degradation Alerts",
                description:
                  "Alerts you when returns drift, drawdowns exceed norms, win rates drop, or trade frequency changes. Know when to intervene before it's too late.",
                accent: "#EF4444",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: feature.accent }}
                  />
                  <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S7: TRUST & SECURITY                                             */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Built for traders who trust no one.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: "Your code is yours.",
                description:
                  "Every EA you export is standalone MQL5 source code. It runs on any MT5 broker with zero dependency on AlgoStudio. Cancel your subscription — your EAs keep working. No lock-in, no kill switch.",
              },
              {
                title: "Your strategies stay private.",
                description:
                  "Strategy code is generated client-side in your browser. Your proprietary logic is never transmitted to our servers. Backtest data is stored securely for analysis. Telemetry is opt-in only.",
              },
              {
                title: "Built by traders.",
                description:
                  "AlgoStudio was built because we needed it ourselves. Every feature exists because a real trader needed to solve a real problem — not because a product manager thought it would look good on a feature list.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
              >
                <h3 className="text-base font-semibold text-white mb-3">{card.title}</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* S8: PRICING                                                      */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm text-[#94A3B8]">
              <span className="text-white font-medium">Free</span> — Build &amp; export unlimited
              EAs. <span className="text-white font-medium">Pro from &euro;39/mo</span> — Full
              validation &amp; monitoring.
            </p>
          </div>
          <PricingSection />
        </div>
      </section>

      {/* ================================================================ */}
      {/* S9: FAQ                                                          */}
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

      {/* ================================================================ */}
      {/* S10: FINAL CTA                                                   */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Your next strategy deserves more than a backtest and a prayer.
          </h2>
          <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto">
            Free forever for strategy building and export. Validation and monitoring available on
            Pro.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link
              href="/login?mode=register&redirect=/app/backtest"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Building — Free
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-[#A78BFA] hover:underline">
              See Pricing &rarr;
            </Link>
          </div>

          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-200 leading-relaxed">
              <strong>Risk Warning:</strong> Trading in financial markets involves substantial risk
              of loss and is not suitable for every investor. Past performance does not guarantee
              future results. Always test strategies on a demo account first. AlgoStudio is a
              strategy validation and monitoring platform — it does not provide financial advice or
              guarantee profits. See our{" "}
              <Link href="/terms" className="underline hover:text-amber-100">
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
