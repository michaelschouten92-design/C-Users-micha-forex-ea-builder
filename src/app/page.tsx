import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "AlgoStudio — Monitoring & Governance for Algorithmic Trading",
  description:
    "Monitor strategy performance, detect edge degradation, verify results, and prove track records. The monitoring layer algorithmic trading has been missing.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AlgoStudio — Monitoring & Governance for Algorithmic Trading",
    description:
      "Monitor strategy performance, detect edge degradation, verify results, and prove track records.",
  },
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <SiteNav />

      <main id="main-content">
        {/* ════════════════════════════════════════════════════════════
            1. HERO
            ════════════════════════════════════════════════════════════ */}
        <section className="pt-32 md:pt-36 pb-12 md:pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-[28px] md:text-[36px] font-extrabold tracking-tight leading-[1.2]">
              Monitoring &amp; governance
              <br />
              for algorithmic trading strategies.
            </h1>
            <p className="mt-6 text-sm md:text-base text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
              Know when your edge degrades. Verify performance with cryptographic proof. Share
              auditable track records.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-6 py-3 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
              >
                Start monitoring
              </Link>
              <Link
                href="/p/demo"
                className="px-6 py-3 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
              >
                View example proof
              </Link>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            2. PROBLEM
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
              The problem with live strategies
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Strategies degrade</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Market conditions change. A profitable backtest does not guarantee live
                  performance. Most traders discover edge degradation too late.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">No early warning</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Without continuous monitoring, structural drift goes undetected. By the time
                  drawdown becomes obvious, the damage is done.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  Track records are unverifiable
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Screenshots and spreadsheets prove nothing. There is no standard way to
                  independently verify that a strategy performs as claimed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            3. SOLUTION — Monitor, Verify, Prove
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
              What AlgoStudio does
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Monitor */}
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
                  Continuous health scoring of live strategies. Detect performance drift, drawdown
                  spikes, and statistical degradation before they compound.
                </p>
              </div>

              {/* Verify */}
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
                  verification. Every result is independently auditable.
                </p>
              </div>

              {/* Prove */}
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
                  Generate tamper-proof public proof pages. Share verified track records that anyone
                  can independently audit. No screenshots required.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            4. HOW IT WORKS
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
              How it works
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  step: "1",
                  title: "Connect your strategy",
                  desc: "Import trade history, connect a broker, or use the built-in EA builder to generate a strategy.",
                },
                {
                  step: "2",
                  title: "Evaluate performance",
                  desc: "Backtest health scoring and Monte Carlo stress testing surface statistical strengths and weaknesses.",
                },
                {
                  step: "3",
                  title: "Monitor continuously",
                  desc: "Live health monitoring detects drift, drawdown anomalies, and structural degradation in real time.",
                },
                {
                  step: "4",
                  title: "Share proof",
                  desc: "Publish a cryptographically verified proof page that anyone can audit independently.",
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
            <p className="mt-4 text-center text-xs text-[#71717A]">
              The EA builder is an optional tool for generating strategies. Most users connect
              existing strategies through trade uploads or broker integration.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            5. PROOF LAYER — Verification Ladder
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-3 tracking-tight">
              Public verification
            </h2>
            <p className="text-sm text-[#A1A1AA] text-center max-w-2xl mx-auto mb-8 md:mb-10">
              Every strategy progresses through a verification ladder. Each level requires more
              evidence. The result is a public proof page that anyone can inspect.
            </p>

            {/* Ladder */}
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

            {/* Example proof card */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#818CF8]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span className="text-xs font-semibold text-[#818CF8]">
                    Verified by AlgoStudio
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
                  Example
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#FAFAFA] mb-1">
                Demo: Trend-Following EURUSD
              </h3>
              <p className="text-xs text-[#71717A] mb-4">
                Public proof page with backtest evaluation, Monte Carlo results, and verification
                ladder.
              </p>
              <Link
                href="/p/demo"
                className="inline-flex items-center gap-1 text-sm text-[#6366F1] hover:text-[#818CF8] transition-colors font-medium"
              >
                View proof page
                <svg
                  className="w-3.5 h-3.5"
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
              </Link>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            6. FINAL CTA
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
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
      </main>

      <Footer />
    </div>
  );
}
