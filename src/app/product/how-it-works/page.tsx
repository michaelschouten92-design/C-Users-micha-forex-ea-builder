import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";

export const metadata: Metadata = {
  title: "How It Works — Strategy Monitoring Lifecycle | AlgoStudio",
  description:
    "Connect a strategy, evaluate performance, monitor continuously, and share public proof. How AlgoStudio keeps your algorithmic trading strategies accountable.",
  alternates: { canonical: "/product/how-it-works" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Platform", href: "/product" },
  { name: "How It Works", href: "/product/how-it-works" },
];

export default function HowItWorksPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How AlgoStudio Monitors and Verifies Trading Strategies",
    description:
      "Connect a strategy, evaluate performance, monitor continuously, and share verified proof.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Connect your strategy",
        text: "Upload backtest reports or install the MT5 Monitor EA to stream live trade data.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Evaluate performance",
        text: "Health scoring, Monte Carlo stress testing, and baseline creation surface statistical strengths and weaknesses.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Monitor continuously",
        text: "Live health scoring detects drift, drawdown anomalies, and edge degradation. A hash-chained trade log produces tamper-evident records. Lifecycle signals alert you when strategy health changes.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Share proof",
        text: "Publish a cryptographically verified proof page with verification ladder progression that anyone can audit independently.",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      <SiteNav />

      <main id="main-content" className="pt-24 pb-0 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* ════════════════════════════════════════════════════════════
              1. HERO
              ════════════════════════════════════════════════════════════ */}
          <section className="text-center mb-12 md:mb-16">
            <h1 className="text-[28px] md:text-[36px] font-extrabold tracking-tight leading-[1.2]">
              How AlgoStudio works
            </h1>
            <p className="mt-6 text-sm md:text-base text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
              AlgoStudio continuously evaluates whether your trading strategies remain statistically
              valid. Connect a strategy, evaluate its performance, monitor it in production, and
              share verified proof.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-6 py-3 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
              >
                Start monitoring
              </Link>
              <Link
                href="/strategies"
                className="px-6 py-3 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
              >
                View verified strategies
              </Link>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              2. STEP 1 — Connect Strategy
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                1
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
                  Connect your strategy
                </h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  Strategies enter the platform through multiple paths. Choose the method that fits
                  your workflow.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 ml-0 md:ml-12">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Install the MT5 Monitor EA
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Attach the Monitor EA to your MetaTrader 5 terminal. It streams live trade data to
                  AlgoStudio automatically — monitoring begins once connected.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Upload trade history
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Upload MT5 Strategy Tester reports or historical trade data for instant evaluation
                  and health scoring.
                </p>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              3. STEP 2 — Evaluate Performance
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                2
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
                  Evaluate performance
                </h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  Once a strategy is connected, AlgoStudio evaluates its statistical profile and
                  creates a performance baseline for ongoing comparison.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 ml-0 md:ml-12">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Health scoring</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Multi-dimensional scoring across profit factor, drawdown, trade count, expected
                  payoff, win rate, Sharpe ratio, and recovery factor. Results in a 0-100 health
                  score.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Monte Carlo simulation
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Runs randomized simulations to estimate survival probability and realistic outcome
                  ranges. Shows what to expect under varying market conditions.
                </p>
                <Link
                  href="/product/monte-carlo"
                  className="inline-block mt-3 text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
                >
                  Learn more &rarr;
                </Link>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Strategy identity</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  A permanent cryptographic identity is assigned to the strategy version, binding
                  evaluation results to a specific configuration snapshot.
                </p>
                <Link
                  href="/product/strategy-identity"
                  className="inline-block mt-3 text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
                >
                  Learn more &rarr;
                </Link>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              4. STEP 3 — Continuous Monitoring
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                3
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
                  Monitor continuously
                </h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  AlgoStudio compares live performance against the established baseline. When
                  metrics drift beyond acceptable ranges, the platform responds.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 ml-0 md:ml-12">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Live health scoring</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Returns, drawdown, win rate, trade frequency, and expectancy are tracked against
                  baseline values. Health scores update as new trades arrive.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Drift detection</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Statistical drift in key metrics is flagged before losses compound. Edge
                  degradation is detectable earlier than drawdown alone reveals.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Lifecycle governance
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Strategies operate in one of three states: running, paused, or stopped. Status
                  recommendations are based on statistical evidence, giving you clear signals to act
                  on.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Track record verification
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  A hash-chained trade log records every trade. Each entry is cryptographically
                  linked to the previous one, producing a tamper-evident record.
                </p>
                <Link
                  href="/product/track-record"
                  className="inline-block mt-3 text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
                >
                  Learn more &rarr;
                </Link>
              </div>
            </div>
            <p className="mt-4 ml-0 md:ml-12 text-xs text-[#71717A]">
              Health monitoring detects problems at the statistical level — before they become
              visible as drawdown on an equity curve.
            </p>
          </section>

          {/* ════════════════════════════════════════════════════════════
              5. STEP 4 — Public Proof
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                4
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">Share proof</h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  Verified strategies produce public proof pages that anyone can inspect. No
                  screenshots, no spreadsheets — cryptographically verifiable evidence.
                </p>
              </div>
            </div>
            <div className="ml-0 md:ml-12">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5 md:p-6 mb-6">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-4">Verification ladder</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0 sm:justify-between">
                  {[
                    {
                      level: "Submitted",
                      color: "#71717A",
                      desc: "Strategy uploaded. Awaiting evaluation.",
                    },
                    {
                      level: "Validated",
                      color: "#6366F1",
                      desc: "Passed health scoring and Monte Carlo.",
                    },
                    {
                      level: "Verified",
                      color: "#10B981",
                      desc: "Live trades cryptographically verified.",
                    },
                    {
                      level: "Proven",
                      color: "#F59E0B",
                      desc: "Sustained live performance confirmed.",
                    },
                  ].map((item, i, arr) => (
                    <div
                      key={item.level}
                      className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2 sm:flex-1"
                    >
                      <div className="flex items-center gap-2 sm:gap-0 sm:flex-col">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {i < arr.length - 1 && (
                            <div className="hidden sm:block w-16 md:w-24 h-[2px] bg-[rgba(255,255,255,0.06)] ml-1" />
                          )}
                        </div>
                        <span
                          className="text-xs font-semibold sm:mt-2"
                          style={{ color: item.color }}
                        >
                          {item.level}
                        </span>
                      </div>
                      <p className="text-xs text-[#71717A] sm:text-center leading-tight">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4">
                Each level requires more evidence. Strategies progress automatically as they
                accumulate verified trades and pass health evaluations. The result is a public proof
                page with downloadable verification data.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  href="/strategies"
                  className="text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
                >
                  Browse verified strategies &rarr;
                </Link>
                <Link
                  href="/p/demo"
                  className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                >
                  View example proof page
                </Link>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              6. LIFECYCLE SUMMARY
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5 md:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
                {[
                  { label: "Connect", color: "#6366F1" },
                  { label: "Evaluate", color: "#6366F1" },
                  { label: "Monitor", color: "#10B981" },
                  { label: "Prove", color: "#F59E0B" },
                ].map((item, i, arr) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: item.color }}>
                      {item.label}
                    </span>
                    {i < arr.length - 1 && (
                      <svg
                        className="w-4 h-4 text-[#71717A] hidden sm:block"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#71717A] text-center mt-4">
                The complete lifecycle from strategy connection to public verification.
              </p>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              7. FINAL CTA
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
                Start monitoring your strategies.
              </h2>
              <p className="mt-3 text-sm text-[#A1A1AA]">Free to start. No credit card required.</p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="px-6 py-3 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
                >
                  Start monitoring
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                >
                  See pricing
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
