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
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
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
                href="/strategies"
                className="px-6 py-3 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
              >
                Explore strategies
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
                  desc: "Upload backtest reports, import trade history, or connect a live broker account.",
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
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            5. VERIFICATION LADDER
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-3 tracking-tight">
              Verification ladder
            </h2>
            <p className="text-sm text-[#A1A1AA] text-center max-w-2xl mx-auto mb-8 md:mb-10">
              Every strategy progresses through four verification levels. Each level requires more
              evidence. The result is a public proof page that anyone can inspect.
            </p>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  level: "Submitted",
                  color: "#71717A",
                  desc: "Strategy uploaded and registered. Awaiting initial evaluation.",
                  badge:
                    "bg-[rgba(113,113,122,0.10)] border-[rgba(113,113,122,0.30)] text-[#71717A]",
                },
                {
                  level: "Validated",
                  color: "#6366F1",
                  desc: "Passed backtest health scoring and Monte Carlo survival analysis.",
                  badge: "bg-[rgba(99,102,241,0.10)] border-[rgba(99,102,241,0.30)] text-[#818CF8]",
                },
                {
                  level: "Verified",
                  color: "#10B981",
                  desc: "Live trades recorded in a cryptographic hash chain. Independently auditable.",
                  badge: "bg-[rgba(16,185,129,0.10)] border-[rgba(16,185,129,0.30)] text-[#10B981]",
                },
                {
                  level: "Proven",
                  color: "#F59E0B",
                  desc: "Sustained live performance confirmed over an extended monitoring period.",
                  badge: "bg-[rgba(245,158,11,0.10)] border-[rgba(245,158,11,0.30)] text-[#F59E0B]",
                },
              ].map((item) => (
                <div
                  key={item.level}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5"
                >
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border mb-3 ${item.badge}`}
                  >
                    {item.level}
                  </span>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            6. PROOF PAGES
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-3 tracking-tight">
              Public proof pages
            </h2>
            <p className="text-sm text-[#A1A1AA] text-center max-w-2xl mx-auto mb-8 md:mb-10">
              Every verified strategy receives a public proof page — a shareable, independently
              auditable record of performance, verification level, and statistical evidence.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {/* What a proof page contains */}
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-3">
                  What a proof page shows
                </h3>
                <ul className="space-y-2.5">
                  {[
                    "Verification level and ladder progression",
                    "Backtest evaluation with health score",
                    "Monte Carlo survival analysis",
                    "Live track record with equity curve",
                    "Cryptographic hash chain integrity",
                    "Risk metrics and drift detection status",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#A1A1AA]">
                      <svg
                        className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Example proof card */}
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
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
                  <span className="ml-auto text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
                    Example
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-1">
                  Demo: Trend-Following EURUSD
                </h3>
                <p className="text-sm text-[#A1A1AA] mb-4 leading-relaxed">
                  A live proof page with backtest evaluation, Monte Carlo results, verified track
                  record, and full verification ladder.
                </p>
                <div className="mt-auto flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/p/demo"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
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
                  <Link
                    href="/strategies"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
                  >
                    Browse all strategies
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            7. WHO IT'S FOR
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#FAFAFA] text-center mb-8 md:mb-10 tracking-tight">
              Built for
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Systematic traders</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Monitor live strategies for performance drift and structural degradation.
                  Continuous health scoring tells you when conditions have changed before drawdown
                  compounds.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Strategy developers</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Validate strategy robustness with backtest health scoring and Monte Carlo stress
                  testing. Publish verifiable proof of performance instead of screenshots.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">Prop firm traders</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  Demonstrate strategy credibility to evaluators and capital allocators with
                  independently auditable proof pages and a verified track record.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            8. FINAL CTA
            ════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
              See what verified strategies look like.
            </h2>
            <p className="mt-3 text-sm text-[#A1A1AA]">
              Browse public proof pages, explore curated strategies, or start monitoring your own.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/strategies"
                className="px-6 py-3 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-sm"
              >
                Explore strategies
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-sm"
              >
                Start monitoring
              </Link>
            </div>
            <Link
              href="/pricing"
              className="inline-block mt-4 text-sm text-[#71717A] hover:text-[#A1A1AA] transition-colors"
            >
              See pricing
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
