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
        <section className="pt-32 md:pt-40 pb-16 md:pb-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-[28px] md:text-[42px] font-extrabold tracking-tight leading-[1.15]">
              Know when your trading strategy
              <br />
              loses its edge.
            </h1>
            <p className="mt-6 text-sm md:text-[17px] text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
              AlgoStudio monitors algorithmic trading strategies and detects when performance starts
              drifting from the baseline backtest. Continuous health scoring. Statistical drift
              detection. No guesswork.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-7 py-3.5 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
              >
                Start monitoring your strategies
              </Link>
              <Link
                href="/how-it-works"
                className="px-7 py-3.5 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-sm text-[#52525B]">
              Free plan available — no credit card required.
            </p>
          </div>

          {/* ── Command Center Product Visual ── */}
          <div className="max-w-5xl mx-auto mt-16 md:mt-20 relative">
            {/* Ambient glow */}
            <div className="absolute -inset-8 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />
            <div className="relative rounded-xl border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[#0F0A1A] to-[#09090B] p-[1px] shadow-[0_4px_80px_rgba(99,102,241,0.08)]">
              <div className="rounded-[11px] bg-[#0A0118] overflow-hidden">
                {/* Title bar */}
                <div className="px-6 pt-5 pb-4 border-b border-[#1E293B]/40">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-3">
                      <span className="text-lg font-bold text-[#F1F5F9]">Command Center</span>
                      <span className="text-xs text-[#64748B] font-medium tabular-nums">
                        9 instances monitored
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-50" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]" />
                      </span>
                      <span className="text-[10px] text-[#525B6B] font-medium">Live</span>
                    </div>
                  </div>
                </div>

                {/* System State Board */}
                <div className="px-6 py-5">
                  <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium mb-3">
                    System State
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Execution */}
                    <div className="rounded-md bg-[rgba(15,10,26,0.5)] border border-[#1E293B]/40 px-4 py-3.5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#10B981] opacity-50" />
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-2">
                        Execution
                      </p>
                      <p className="text-xl font-bold font-mono tabular-nums leading-none text-[#10B981]">
                        RUNNING
                      </p>
                    </div>
                    {/* Online */}
                    <div className="rounded-md bg-[rgba(15,10,26,0.5)] border border-[#1E293B]/40 px-4 py-3.5">
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-2">
                        Online
                      </p>
                      <p className="text-xl font-bold font-mono tabular-nums leading-none text-[#CBD5E1]">
                        9/9
                      </p>
                    </div>
                    {/* Halted */}
                    <div className="rounded-md bg-[rgba(15,10,26,0.5)] border border-[#1E293B]/40 px-4 py-3.5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#F59E0B] opacity-50" />
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-2">
                        Halted
                      </p>
                      <p className="text-xl font-bold font-mono tabular-nums leading-none text-[#F59E0B]">
                        1
                      </p>
                    </div>
                    {/* Drift */}
                    <div className="rounded-md bg-[rgba(15,10,26,0.5)] border border-[#1E293B]/40 px-4 py-3.5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#EF4444] opacity-50" />
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-2">
                        Edge Drift
                      </p>
                      <p className="text-xl font-bold font-mono tabular-nums leading-none text-[#EF4444]">
                        1
                      </p>
                    </div>
                  </div>
                </div>

                {/* Alert strip */}
                <div className="mx-6 mb-5 rounded-lg px-4 py-3 border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <svg
                        className="w-3.5 h-3.5 text-[#F59E0B] shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-[9px] uppercase tracking-[0.15em] text-[#EF4444] font-bold">
                        Edge Drift Detected
                      </span>
                      <span className="text-xs text-[#94A3B8] font-medium">
                        EURUSD Grid Strategy
                      </span>
                      <span className="text-xs text-[#64748B]">Losing edge</span>
                    </div>
                    <span className="text-xs text-[#64748B] hidden sm:block">Link baseline ›</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            2. PROBLEM — Why strategies fail silently
            ════════════════════════════════════════════════════════════ */}
        <section className="py-16 md:py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] text-center mb-3 tracking-tight">
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
            3. HOW IT WORKS — 3 steps
            ════════════════════════════════════════════════════════════ */}
        <section className="py-16 md:py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
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
            5. DRIFT DETECTION — with alert panel visual
            ════════════════════════════════════════════════════════════ */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
              {/* LEFT: Copy */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#6366F1] font-semibold mb-4">
                  Anomaly Detection
                </p>
                <h2 className="text-2xl md:text-[28px] font-bold text-[#FAFAFA] tracking-tight leading-tight mb-4">
                  Detect edge drift before it becomes drawdown
                </h2>
                <p className="text-sm text-[#A1A1AA] leading-relaxed mb-8">
                  AlgoStudio uses CUSUM statistical monitoring to detect persistent performance
                  degradation. It accumulates small deviations over time and distinguishes between
                  normal variance and meaningful directional shift.
                </p>
                <div className="space-y-3">
                  {[
                    {
                      color: "#10B981",
                      label: "Healthy",
                      desc: "Performance within expected baseline ranges.",
                    },
                    {
                      color: "#F59E0B",
                      label: "Warning",
                      desc: "Sustained drift detected. Worth monitoring.",
                    },
                    {
                      color: "#EF4444",
                      label: "Edge at Risk",
                      desc: "Significant degradation. Investigation recommended.",
                    },
                  ].map((s) => (
                    <div key={s.label} className="flex items-start gap-3">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div>
                        <span className="text-sm font-semibold" style={{ color: s.color }}>
                          {s.label}
                        </span>
                        <span className="text-sm text-[#71717A] ml-2">{s.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Edge Drift Visual (based on screenshot 2) */}
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0A0118] overflow-hidden shadow-[0_4px_60px_rgba(239,68,68,0.06)]">
                {/* Alerts header */}
                <div className="px-5 pt-4 pb-3 border-b border-[#1E293B]/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      <span className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-bold">
                        Alerts
                      </span>
                      <span className="text-xs font-bold text-[#F59E0B] tabular-nums">4</span>
                    </div>
                    <span className="text-[10px] text-[#475569] font-medium">Health ›</span>
                  </div>
                </div>

                {/* Alert rows */}
                <div className="divide-y divide-[#1E293B]/30">
                  <div className="px-5 py-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <svg
                        className="w-3 h-3 text-[#F59E0B] shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-[13px] font-semibold text-[#EF4444]">
                        Edge drift detected
                      </span>
                      <span className="text-[10px] text-[#475569] ml-auto">30s ago ›</span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      EURUSD Grid Strategy <span className="text-[#64748B]">· Losing edge</span>
                    </p>
                  </div>
                  <div className="px-5 py-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <svg
                        className="w-3 h-3 text-[#F59E0B] shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-[13px] font-semibold text-[#F59E0B]">
                        Baseline drift
                      </span>
                      <span className="text-[10px] text-[#475569] ml-auto">5m ago</span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      USDJPY Grid Strategy{" "}
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#1E293B] text-[#94A3B8]">
                        Demo
                      </span>{" "}
                      <span className="text-[#64748B]">· Statistical deviation</span>
                    </p>
                  </div>
                  <div className="px-5 py-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <svg
                        className="w-3 h-3 text-[#F59E0B] shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-[13px] font-semibold text-[#EF4444]">
                        Risk threshold breached
                      </span>
                      <span className="text-[10px] text-[#475569] ml-auto">18m ago</span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      USDJPY Grid Strategy{" "}
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#1E293B] text-[#94A3B8]">
                        Demo
                      </span>
                    </p>
                  </div>
                </div>

                {/* Featured drift card */}
                <div className="mx-4 my-4 rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)] p-4">
                  <p className="text-[9px] uppercase tracking-[0.15em] text-[#EF4444] font-bold mb-2.5">
                    Edge Drift Detected
                  </p>
                  <p className="text-base font-bold text-[#F1F5F9] mb-3">EURUSD Grid Master</p>
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <span className="text-xs text-[#64748B]">Max DD</span>
                      <span className="text-sm font-semibold text-[#CBD5E1] ml-1.5">3.12%</span>
                    </div>
                    <div>
                      <span className="text-xs text-[#64748B]">Deviation</span>
                      <span className="text-sm font-bold text-[#EF4444] ml-1.5">+82%</span>
                    </div>
                    <span className="text-xs text-[#64748B] border border-[#1E293B] rounded px-2 py-0.5">
                      Link baseline
                    </span>
                  </div>
                  <div className="rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3 py-2 text-center">
                    <span className="text-xs font-semibold text-[#F59E0B]">
                      Halted by AlgoStudio
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            6. GOVERNANCE — Govern live strategies
            ════════════════════════════════════════════════════════════ */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
              {/* LEFT: Account Health Visual (based on screenshot 3) */}
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0A0118] overflow-hidden shadow-[0_4px_60px_rgba(99,102,241,0.06)] order-2 md:order-1">
                {/* Account header */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span className="text-sm font-bold text-[#F1F5F9]">Online</span>
                    <span className="text-sm text-[#64748B]">Demo</span>
                  </div>
                  <p className="text-xs text-[#64748B]">IC Markets (EU) Ltd · #52780353</p>
                </div>

                {/* Balance / Equity */}
                <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-[rgba(15,10,26,0.5)] border border-[#1E293B]/40 px-3.5 py-3">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-1.5">
                      Balance
                    </p>
                    <p className="text-lg font-bold font-mono tabular-nums text-[#CBD5E1]">
                      $100,131
                    </p>
                  </div>
                  <div className="rounded-md bg-[rgba(15,10,26,0.5)] border border-[#1E293B]/40 px-3.5 py-3">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-1.5">
                      Equity
                    </p>
                    <p className="text-lg font-bold font-mono tabular-nums text-[#CBD5E1]">
                      $100,131
                    </p>
                  </div>
                </div>

                {/* Edge drift alert */}
                <div className="mx-5 mb-4 rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)] p-4">
                  <p className="text-[9px] uppercase tracking-[0.15em] text-[#EF4444] font-bold mb-2">
                    Edge Drift Detected
                  </p>
                  <p className="text-sm font-bold text-[#F1F5F9] mb-2">↓ EURUSD Grid Master</p>
                  <div className="flex items-center gap-4 text-xs mb-3">
                    <span className="text-[#64748B]">
                      Max DD <span className="text-[#CBD5E1] font-semibold">3.12%</span>
                    </span>
                    <span className="text-[#EF4444] font-bold">+82%</span>
                    <span className="text-[#64748B] border border-[#1E293B] rounded px-2 py-0.5">
                      Link baseline
                    </span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-[#94A3B8] mb-3">
                    <li>■ Edge drift detected by AlgoStudio..</li>
                    <li>■ Erosion Factor effect decrease</li>
                    <li>■ Win Rate 7.1% vs 12.4% baseline</li>
                    <li>■ Recovery Time 4.2x slower</li>
                  </ul>
                  <div className="rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3 py-2 text-center">
                    <span className="text-xs font-semibold text-[#F59E0B]">
                      Halted by AlgoStudio
                    </span>
                  </div>
                </div>

                {/* Strategy Health */}
                <div className="mx-5 mb-5">
                  <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium mb-2.5">
                    Strategy Health
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Halted", color: "#EF4444", count: "1" },
                      { label: "Attention", color: "#F59E0B", count: "2" },
                      { label: "Healthy", color: "#10B981", count: "6" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-md border px-3 py-2.5 text-center"
                        style={{ borderColor: `${s.color}20`, backgroundColor: `${s.color}08` }}
                      >
                        <p
                          className="text-lg font-bold font-mono tabular-nums leading-none mb-1"
                          style={{ color: s.color }}
                        >
                          {s.count}
                        </p>
                        <p
                          className="text-[9px] uppercase tracking-wider"
                          style={{ color: `${s.color}99` }}
                        >
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT: Copy */}
              <div className="order-1 md:order-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#6366F1] font-semibold mb-4">
                  Strategy Governance
                </p>
                <h2 className="text-2xl md:text-[28px] font-bold text-[#FAFAFA] tracking-tight leading-tight mb-4">
                  Govern live strategies with automatic intervention
                </h2>
                <p className="text-sm text-[#A1A1AA] leading-relaxed mb-8">
                  When AlgoStudio detects that a strategy&apos;s edge is degrading beyond acceptable
                  thresholds, it can automatically halt trading to prevent further damage. Every
                  intervention is logged, explainable, and reversible.
                </p>
                <div className="space-y-4">
                  {[
                    {
                      title: "Automatic halt on drift",
                      desc: "Strategies are paused when statistical degradation exceeds configured thresholds.",
                    },
                    {
                      title: "Full investigation context",
                      desc: "Every halt includes the specific metrics that triggered it — win rate, drawdown, recovery time.",
                    },
                    {
                      title: "Per-strategy health visibility",
                      desc: "See the health state of every strategy in one view. Halted, Attention, Healthy — at a glance.",
                    },
                    {
                      title: "Tamper-evident audit trail",
                      desc: "Every trade and intervention is recorded in a cryptographic hash chain with verifiable integrity.",
                    },
                  ].map((item) => (
                    <div key={item.title}>
                      <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1">{item.title}</h3>
                      <p className="text-sm text-[#71717A] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            7. VERIFIED TRACK RECORD
            ════════════════════════════════════════════════════════════ */}
        <section className="py-16 md:py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA] tracking-tight text-center">
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
        <section className="py-20 md:py-28 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA] tracking-tight">
              Stop flying blind.
            </h2>
            <p className="mt-4 text-sm md:text-base text-[#A1A1AA]">
              Connect your MT5 terminal and know within days whether your strategies are performing
              as expected — or drifting.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-7 py-3.5 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
              >
                Start monitoring your strategies
              </Link>
              <Link
                href="/pricing"
                className="px-7 py-3.5 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
              >
                See pricing
              </Link>
            </div>
            <p className="mt-5 text-sm text-[#52525B]">
              Free plan available — no credit card required.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
