import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";

export const metadata: Metadata = {
  title: "Platform — Strategy Monitoring & Governance | AlgoStudio",
  description:
    "Monitor live strategy performance, detect edge degradation, verify results with cryptographic proof, and share auditable track records.",
  alternates: { canonical: "/product" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Platform", href: "/product" },
];

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
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
              Strategy monitoring and governance
              <br />
              for algorithmic trading.
            </h1>
            <p className="mt-6 text-sm md:text-base text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
              AlgoStudio continuously evaluates whether your strategies remain statistically valid.
              Detect degradation early, verify performance with evidence, and share auditable proof.
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
              2. THE GOVERNANCE PROBLEM
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
              Why monitoring matters
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Strategies degrade over time
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Market regimes shift. A strategy that performed well in backtesting may quietly
                  lose its edge in live conditions without any obvious signal.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Live diverges from backtests
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Slippage, spread changes, and execution differences mean live performance rarely
                  matches backtest expectations. The gap widens without continuous comparison.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Problems surface too late
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Most traders discover edge degradation through drawdown — after the damage is
                  done. Statistical drift is detectable earlier if measured continuously.
                </p>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              3. PLATFORM CAPABILITIES — Monitor, Verify, Prove
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
              What the platform does
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <div className="mb-3">
                  <svg
                    className="w-6 h-6 text-[#6366F1]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Monitor</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Continuous health scoring compares live performance against baseline metrics.
                  Detect drift in returns, drawdown, win rate, and trade frequency before losses
                  compound.
                </p>
              </div>

              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <div className="mb-3">
                  <svg
                    className="w-6 h-6 text-[#10B981]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Verify</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Backtest health scoring, Monte Carlo stress testing, and cryptographic trade chain
                  verification produce independently auditable results for every strategy.
                </p>
              </div>

              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <div className="mb-3">
                  <svg
                    className="w-6 h-6 text-[#F59E0B]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Prove</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Generate tamper-proof public proof pages with verified track records, verification
                  ladder progression, and downloadable verification data anyone can audit.
                </p>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              4. CORE PLATFORM COMPONENTS
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
              Core platform components
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Health Monitoring",
                  href: "/product/health-monitor",
                  desc: "Continuous live performance scoring against baseline metrics. Tracks returns, drawdown, win rate, trade frequency, and expectancy. Alerts on statistical drift.",
                },
                {
                  title: "Strategy Identity",
                  href: "/product/strategy-identity",
                  desc: "Permanent cryptographic identity for every strategy version. Binds backtest results to a specific configuration snapshot for auditability.",
                },
                {
                  title: "Track Record Verification",
                  href: "/product/track-record",
                  desc: "Hash-chained trade log that produces tamper-evident track records. Every trade is cryptographically linked to the previous one.",
                },
                {
                  title: "Monte Carlo Risk Simulation",
                  href: "/product/monte-carlo",
                  desc: "Runs randomized simulations on trade history to estimate survival probability and realistic outcome ranges under varying conditions.",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5 hover:border-[rgba(255,255,255,0.15)] transition-colors block"
                >
                  <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed mb-3">{item.desc}</p>
                  <span className="text-sm text-[#6366F1] font-medium">Learn more &rarr;</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              5. STRATEGY INPUT METHODS
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
              How strategies enter the platform
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Connect a trading account
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Link your broker account to import live trade data automatically. AlgoStudio
                  monitors performance continuously once connected.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Upload trade history
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Upload MT5 Strategy Tester reports or historical trade data for instant health
                  scoring and backtest evaluation.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  EA Builder
                  <span className="ml-2 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
                    Optional
                  </span>
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Generate Expert Advisors from templates if you need a strategy to monitor. The
                  builder is a supporting tool — not the core platform.
                </p>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════
              6. PUBLIC PROOF LAYER
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-3 tracking-tight">
              Public verification
            </h2>
            <p className="text-sm text-[#A1A1AA] text-center max-w-2xl mx-auto mb-8 md:mb-10">
              Strategies progress through a verification ladder. Each level requires more evidence.
              The result is a public proof page that anyone can inspect.
            </p>

            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5 md:p-6 mb-6">
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
                      <span className="text-xs font-semibold sm:mt-2" style={{ color: item.color }}>
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

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
          </section>

          {/* ════════════════════════════════════════════════════════════
              7. FINAL CTA
              ════════════════════════════════════════════════════════════ */}
          <section className="py-12 md:py-16">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
                Monitor your strategies with AlgoStudio.
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
