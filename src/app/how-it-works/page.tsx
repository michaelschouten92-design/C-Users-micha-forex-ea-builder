import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";

export const metadata: Metadata = {
  title: "How It Works — Strategy Monitoring & Governance | AlgoStudio",
  description:
    "Connect your MT5 account, establish a baseline, and let AlgoStudio monitor your strategies for drift, degradation, and anomalies. Continuous health scoring with CUSUM drift detection.",
  alternates: { canonical: "/how-it-works" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "How It Works", href: "/how-it-works" },
];

export default function HowItWorksPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How AlgoStudio Monitors and Verifies Trading Strategies",
    description:
      "Connect your MT5 account, establish a performance baseline, monitor live health, detect drift, and share verified proof.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Connect MT5",
        text: "Install the Monitor EA on your MetaTrader 5 terminal. It streams live trade events and heartbeats to AlgoStudio automatically.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Strategies are discovered",
        text: "Strategies are automatically detected from trading activity, grouped by symbol and magic number.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Establish a baseline",
        text: "Upload a backtest report to create the performance reference. All future live performance is compared against this baseline.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Monitor health continuously",
        text: "Live health scoring compares returns, volatility, drawdown, win rate, and trade frequency against the baseline. Scores update as trades arrive.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Detect drift",
        text: "CUSUM statistical monitoring detects persistent performance degradation before losses compound.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Investigate and act",
        text: "When drift or degradation is detected, the platform surfaces warnings and enables deeper investigation into what changed.",
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

          {/* ══════════════════════════════════════════════════════
              HERO
              ══════════════════════════════════════════════════════ */}
          <section className="text-center mb-12 md:mb-16">
            <h1 className="text-[28px] md:text-[36px] font-extrabold tracking-tight leading-[1.2]">
              How AlgoStudio works
            </h1>
            <p className="mt-6 text-sm md:text-base text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
              AlgoStudio monitors algorithmic trading strategies and detects when their performance
              starts drifting from expected behavior. Connect your MT5 account, establish a
              baseline, and let continuous health scoring do the rest.
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

          {/* ══════════════════════════════════════════════════════
              STEP 1 — Connect MT5
              ══════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                1
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">Connect MT5</h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  Install the Monitor EA on your MetaTrader 5 terminal. It runs alongside your
                  trading strategies and streams trade events and heartbeats to AlgoStudio in real
                  time. No changes to your existing EAs are needed.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 ml-0 md:ml-12">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Trade events</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Every trade open, close, and modification is captured and sent to AlgoStudio. The
                  Monitor EA detects activity across all strategies running on the terminal.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Heartbeats</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Periodic heartbeats confirm the terminal is online and the connection is active.
                  AlgoStudio alerts you if your terminal goes offline unexpectedly.
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              STEP 2 — Strategy Discovery
              ══════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                2
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
                  Strategies are discovered automatically
                </h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  As trades arrive, AlgoStudio groups them by symbol and magic number. Each unique
                  combination becomes a strategy instance with its own identity, health score, and
                  lifecycle state. You do not need to configure strategies manually.
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              STEP 3 — Baseline Backtest
              ══════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                3
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
                  Establish a baseline
                </h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  Upload a backtest report from the MT5 Strategy Tester. AlgoStudio evaluates the
                  backtest and creates a performance baseline — the statistical reference for what
                  healthy performance looks like for this strategy.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 ml-0 md:ml-12">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Health scoring</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  The backtest is scored across multiple dimensions including profit factor,
                  drawdown, expected payoff, win rate, Sharpe ratio, and recovery factor. The result
                  is a 0-100 health score.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Monte Carlo simulation
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  1,000 randomized simulations estimate survival probability and realistic outcome
                  ranges. This reveals the full risk profile hiding behind a single backtest path.
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              STEP 4 — Health Monitoring
              ══════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                4
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
                  Monitor health continuously
                </h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  AlgoStudio compares live performance against the baseline after every closed
                  trade. Health scores update continuously. When metrics drift outside expected
                  ranges, the platform responds.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 ml-0 md:ml-12 mb-4">
              {[
                {
                  metric: "Return",
                  desc: "Net profit compared to baseline expectations. Detects when the strategy is underperforming its historical norms.",
                },
                {
                  metric: "Volatility",
                  desc: "Equity curve roughness relative to baseline. Rising volatility may signal changing market conditions.",
                },
                {
                  metric: "Drawdown",
                  desc: "Peak-to-trough decline compared to baseline and Monte Carlo predictions. Flags when drawdown exceeds expected bounds.",
                },
                {
                  metric: "Win rate",
                  desc: "Percentage of winning trades. A sustained drop in win rate is often the first sign of edge degradation.",
                },
                {
                  metric: "Trade frequency",
                  desc: "How often trades are placed. A sudden drop may mean market conditions have shifted. A spike may indicate false signals.",
                },
              ].map((item) => (
                <div
                  key={item.metric}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5"
                >
                  <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">{item.metric}</h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="ml-0 md:ml-12 text-xs text-[#71717A]">
              Health monitoring detects problems at the statistical level — before they become
              visible as drawdown on an equity curve.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════════
              STEP 5 — Drift Detection
              ══════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                5
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">Detect drift</h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  AlgoStudio uses CUSUM (cumulative sum) statistical monitoring to detect persistent
                  performance degradation. Unlike simple threshold alerts, CUSUM distinguishes
                  between normal variance and meaningful directional shift.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 ml-0 md:ml-12">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Early detection</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  CUSUM accumulates small deviations over time. A gradual decline that would take
                  weeks to notice through drawdown alone is flagged much earlier through cumulative
                  drift.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Fewer false alarms</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Short losing streaks are normal. CUSUM is designed to ignore temporary variance
                  and only signal when there is evidence of a sustained directional change in
                  performance.
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              STEP 6 — Investigation & Alerts
              ══════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="flex items-start gap-4 md:gap-5 mb-6">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] flex-shrink-0 mt-0.5">
                6
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
                  Investigate and act
                </h2>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed max-w-2xl">
                  When drift or degradation is detected, AlgoStudio surfaces warnings and provides
                  tools to understand what changed. Lifecycle governance helps you decide whether to
                  keep running, pause, or stop a strategy.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 ml-0 md:ml-12">
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
                  linked to the previous one, producing a tamper-evident record that anyone can
                  verify independently.
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              LIFECYCLE SUMMARY
              ══════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5 md:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
                {[
                  { label: "Connect", color: "#6366F1" },
                  { label: "Discover", color: "#6366F1" },
                  { label: "Baseline", color: "#6366F1" },
                  { label: "Monitor", color: "#10B981" },
                  { label: "Detect", color: "#F59E0B" },
                  { label: "Act", color: "#EF4444" },
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
                The complete lifecycle from strategy connection to governance.
              </p>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              FINAL CTA
              ══════════════════════════════════════════════════════ */}
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
