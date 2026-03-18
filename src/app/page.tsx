import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "AlgoStudio — Know When Your Trading Strategy Loses Its Edge",
  description:
    "AlgoStudio monitors algorithmic trading strategies and detects when performance starts drifting from the baseline backtest. Continuous health scoring, CUSUM drift detection, and investigation tools.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AlgoStudio — Know When Your Trading Strategy Loses Its Edge",
    description:
      "Monitor strategy performance, detect edge degradation, and investigate what changed. The monitoring layer algorithmic trading has been missing.",
  },
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
      <SiteNav />

      <main id="main-content">
        {/* ════════════════════════════════════════════════════════════
            1. HERO
            ════════════════════════════════════════════════════════════ */}
        <section className="pt-32 md:pt-36 pb-12 md:pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-[28px] md:text-[36px] font-extrabold tracking-tight leading-[1.2]">
              Know when your trading strategy
              <br />
              loses its edge.
            </h1>
            <p className="mt-6 text-sm md:text-base text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
              AlgoStudio monitors algorithmic trading strategies and detects when performance starts
              drifting from the baseline backtest. Continuous health scoring. Statistical drift
              detection. No guesswork.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-6 py-3 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
              >
                Start monitoring your strategies
              </Link>
              <Link
                href="/how-it-works"
                className="px-6 py-3 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-6 text-sm text-[#71717A] text-center">
              Free plan available — no credit card required.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            2. PROBLEM — Why strategies fail silently
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-3 tracking-tight">
              Strategies don&apos;t fail overnight
            </h2>
            <p className="text-sm text-[#A1A1AA] text-center max-w-2xl mx-auto mb-8 md:mb-10">
              They degrade slowly. Win rate drifts down. Drawdowns get deeper. The edge you
              backtested quietly disappears — and most traders only notice when the damage is
              already done.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Performance drifts</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Market regimes shift. A strategy that performed well in backtesting may quietly
                  lose its edge in live conditions without any obvious signal.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Drawdowns compound</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Without continuous monitoring, small deviations accumulate. By the time drawdown
                  becomes visible on the equity curve, the underlying problem has been building for
                  weeks.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">No early warning</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Most traders discover degradation through losses — after the fact. Statistical
                  drift is detectable much earlier if you measure continuously against a known
                  baseline.
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm text-[#71717A] text-center">
              AlgoStudio provides the continuous monitoring that catches these problems early.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            3. PRODUCT OVERVIEW — Command Center
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-3 tracking-tight">
              One place to monitor all your strategies
            </h2>
            <p className="text-sm text-[#A1A1AA] text-center max-w-2xl mx-auto mb-8 md:mb-10">
              The Command Center shows every connected strategy, its current health, and whether
              performance is drifting from the baseline. At a glance, you know which strategies are
              healthy and which need attention.
            </p>

            {/* TODO: Insert Command Center dashboard screenshot here */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-8 md:p-12 text-center">
              <p className="text-sm text-[#71717A]">Dashboard screenshot — coming soon</p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                {
                  label: "Strategy health",
                  desc: "0-100 health score updated after every closed trade.",
                },
                {
                  label: "Drift detection",
                  desc: "CUSUM monitoring flags persistent performance shifts.",
                },
                {
                  label: "Warning states",
                  desc: "Strategies transition through Healthy, Warning, and Edge at Risk.",
                },
                {
                  label: "Multi-strategy",
                  desc: "Monitor all your strategies and accounts from one view.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5"
                >
                  <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">{item.label}</h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            4. HOW IT WORKS — 3 steps
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  step: "1",
                  title: "Connect your MT5 terminal",
                  desc: "Install the Monitoring EA on MetaTrader 5. It streams trade events and heartbeats to AlgoStudio automatically. No changes to your existing strategies needed.",
                },
                {
                  step: "2",
                  title: "Upload a baseline backtest",
                  desc: "Import an MT5 Strategy Tester report to define expected performance. This becomes the reference that live trading is measured against.",
                },
                {
                  step: "3",
                  title: "Monitor live vs baseline",
                  desc: "AlgoStudio compares every live trade against the baseline. Health scores, drift detection, and lifecycle signals tell you when something changes.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5"
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#18181B] border border-[rgba(255,255,255,0.10)] text-xs font-bold text-[#A1A1AA] mb-3">
                    {item.step}
                  </span>
                  <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/how-it-works"
                className="text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
              >
                Read the full explanation &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            5. DRIFT DETECTION
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-3 tracking-tight">
              Detect drift before it becomes drawdown
            </h2>
            <p className="text-sm text-[#A1A1AA] text-center max-w-2xl mx-auto mb-8 md:mb-10">
              AlgoStudio uses CUSUM statistical monitoring to detect persistent performance
              degradation. It accumulates small deviations over time and distinguishes between
              normal variance and meaningful directional shift.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[rgba(16,185,129,0.15)] bg-[#111114] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span className="text-sm font-semibold text-[#10B981]">Healthy</span>
                </div>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Live performance is within expected ranges. All tracked metrics are consistent
                  with the baseline. No action needed.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(245,158,11,0.15)] bg-[#111114] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-sm font-semibold text-[#F59E0B]">Warning</span>
                </div>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  One or more metrics are drifting from the baseline. The deviation is not yet
                  critical, but sustained drift has been detected. Worth watching.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(239,68,68,0.15)] bg-[#111114] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <span className="text-sm font-semibold text-[#EF4444]">Edge at Risk</span>
                </div>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Significant and sustained performance degradation detected. The strategy&apos;s
                  statistical edge may no longer be present. Investigation recommended.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            6. INVESTIGATION
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-3 tracking-tight">
              Understand what changed
            </h2>
            <p className="text-sm text-[#A1A1AA] text-center max-w-2xl mx-auto mb-8 md:mb-10">
              When a strategy degrades, AlgoStudio helps you investigate why. Compare live
              performance against the baseline across every dimension to pinpoint what shifted.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Baseline vs live comparison",
                  desc: "Side-by-side metrics showing how current performance compares to what the backtest predicted.",
                },
                {
                  title: "Drawdown and volatility changes",
                  desc: "Track whether drawdowns are deeper or more frequent than the baseline expected. Detect volatility regime shifts.",
                },
                {
                  title: "Trade frequency shifts",
                  desc: "Monitor whether the strategy is trading more or less often than expected. Frequency changes often signal changing market conditions.",
                },
                {
                  title: "Full trade event audit trail",
                  desc: "Every trade is recorded in a cryptographic hash chain. Review the complete history with tamper-evident integrity.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5"
                >
                  <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* TODO: Insert strategy investigation screenshot here */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-8 md:p-12 text-center mt-6">
              <p className="text-sm text-[#71717A]">Investigation view screenshot — coming soon</p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            7. VERIFIED TRACK RECORD
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight text-center">
              Verified Live Track Record
            </h2>
            <p className="mt-3 text-sm text-[#A1A1AA] text-center max-w-xl mx-auto">
              AlgoStudio monitors algorithmic trading accounts and produces verified track records
              from real trading activity.
            </p>

            <div className="mt-8 bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-[#7C8DB0]">
                <span className="text-sm font-semibold text-white">IC Markets Live</span>
                <span>IC Markets (EU) Ltd</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                    Trades
                  </p>
                  <p className="text-sm font-semibold text-[#CBD5E1]">1,247</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                    Return
                  </p>
                  <p className="text-sm font-semibold text-[#10B981]">+18.4%</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                    Max Drawdown
                  </p>
                  <p className="text-sm font-semibold text-[#CBD5E1]">6.2%</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
                    Strategies
                  </p>
                  <p className="text-sm font-semibold text-[#CBD5E1]">5</p>
                </div>
              </div>
              <div className="mt-5">
                {/* TODO: Replace with actual published track record token URL */}
                <Link
                  href="/track-record/example"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#818CF8] hover:text-white transition-colors"
                >
                  View Track Record
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            8. FINAL CTA
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">Stop flying blind.</h2>
            <p className="mt-3 text-sm text-[#A1A1AA]">
              Connect your MT5 terminal and know within days whether your strategies are performing
              as expected — or drifting.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-6 py-3 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
              >
                Start monitoring your strategies
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-3 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
              >
                See pricing
              </Link>
            </div>
            <p className="mt-6 text-sm text-[#71717A]">
              Free plan available — no credit card required.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
