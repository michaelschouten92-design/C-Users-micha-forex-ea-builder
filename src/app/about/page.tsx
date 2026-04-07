import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { AnimateOnScroll } from "@/components/marketing/animate-on-scroll";
import { GlassCard } from "@/components/marketing/glass-card";

export const metadata: Metadata = {
  title: "About Algo Studio — Why We Built an EA Monitoring Platform",
  description:
    "Algo Studio is a monitoring and governance platform for MetaTrader 5 Expert Advisors. Continuous drift detection, backtest comparison, and verified track records. Built by traders, for traders.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Algo Studio — MT5 Strategy Monitoring Platform",
    description:
      "Continuous monitoring, drift detection, and verified track records for algorithmic trading strategies.",
  },
};

export default function AboutPage() {
  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-[#08080A]">
      <SiteNav />

      <main className="pt-32 pb-0 px-4 sm:px-6 flex-1">
        <div className="max-w-3xl mx-auto">
          {/* ── HERO ── */}
          <section>
            <AnimateOnScroll>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#A1A1AA] mb-4">
                About Algo Studio
              </p>
              <h1 className="text-[28px] md:text-[40px] font-extrabold text-[#FAFAFA] leading-tight tracking-tight">
                Backtests prove an edge existed.
                <br />
                We prove it still does.
              </h1>
            </AnimateOnScroll>

            <AnimateOnScroll>
              <div className="mt-8 space-y-5 text-[#A1A1AA] text-base leading-relaxed">
                <p>
                  A backtest tells you a strategy worked under historical conditions. It
                  doesn&apos;t tell you whether that edge survives once capital is live — when
                  spreads widen, liquidity shifts, and market regimes change.
                </p>
                <p>
                  Most platforms show you what&apos;s happening. Equity curves. Open trades. P&L.
                  But they don&apos;t measure whether your strategy still operates within the bounds
                  that justified running it.
                </p>
                <p className="text-[#FAFAFA] font-medium">
                  Algo Studio exists to close that gap: continuous monitoring that compares live
                  performance against your own statistical baseline — and acts when the two diverge.
                </p>
              </div>
            </AnimateOnScroll>
          </section>

          {/* ── WHAT WE DO ── */}
          <section className="mt-20 pt-16 border-t border-[rgba(255,255,255,0.06)]">
            <AnimateOnScroll>
              <h2 className="text-2xl md:text-[28px] font-bold text-[#FAFAFA] tracking-tight">
                Monitoring, not trading
              </h2>
              <p className="mt-4 text-[#A1A1AA] leading-relaxed">
                Algo Studio does not place trades, generate signals, or interact with broker
                execution. It monitors. It measures live behavior against validated baselines. When
                deviation is detected, it surfaces the evidence and can automatically halt trading.
              </p>
            </AnimateOnScroll>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Monitor",
                  desc: "Continuous real-time comparison of live EA performance against backtest expectations.",
                },
                {
                  label: "Detect",
                  desc: "CUSUM statistical monitoring catches persistent drift before it becomes visible drawdown.",
                },
                {
                  label: "Govern",
                  desc: "Automatic halt on degradation. Every intervention logged in a tamper-evident audit trail.",
                },
              ].map((item, i) => (
                <AnimateOnScroll key={item.label} delay={(i + 1) as 1 | 2 | 3}>
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-[#FAFAFA]">{item.label}</h3>
                    <p className="mt-2 text-sm text-[#71717A] leading-relaxed">{item.desc}</p>
                  </GlassCard>
                </AnimateOnScroll>
              ))}
            </div>
          </section>

          {/* ── EVIDENCE OVER OPINION ── */}
          <section className="mt-20 pt-16 border-t border-[rgba(255,255,255,0.06)]">
            <AnimateOnScroll>
              <h2 className="text-2xl md:text-[28px] font-bold text-[#FAFAFA] tracking-tight">
                Evidence over opinion
              </h2>
              <p className="mt-4 text-[#A1A1AA] leading-relaxed">
                Every claim about a strategy should be verifiable. Not asserted — measured. Not
                trusted — proven against data.
              </p>
            </AnimateOnScroll>

            <div className="mt-10 grid sm:grid-cols-2 gap-5">
              {[
                {
                  title: "Hash-chained proof logs",
                  desc: "Every trade and intervention is cryptographically chained. Tamper-evident by construction.",
                },
                {
                  title: "Deterministic scoring",
                  desc: "Health scores computed from defined inputs. Same data produces the same score every time.",
                },
                {
                  title: "Snapshot-bound verification",
                  desc: "Governance snapshots are bound to the exact state at measurement time. Context is preserved.",
                },
                {
                  title: "Auditable transitions",
                  desc: "Every state change is recorded, timestamped, and attributed. Nothing happens off the record.",
                },
              ].map((item) => (
                <AnimateOnScroll key={item.title}>
                  <div className="flex items-start gap-3 py-3">
                    <svg
                      className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-[#FAFAFA]">{item.title}</h3>
                      <p className="mt-1 text-sm text-[#71717A] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </section>

          {/* ── PUBLIC VERIFICATION ── */}
          <section className="mt-20 pt-16 border-t border-[rgba(255,255,255,0.06)]">
            <AnimateOnScroll>
              <h2 className="text-2xl md:text-[28px] font-bold text-[#FAFAFA] tracking-tight">
                Public, verifiable track records
              </h2>
              <p className="mt-4 text-[#A1A1AA] leading-relaxed">
                Strategies that pass verification can generate public proof pages — independently
                accessible records of validation history, live metrics, and governance decisions.
                Anyone with the link can inspect the evidence.
              </p>
            </AnimateOnScroll>

            <AnimateOnScroll className="mt-8">
              <GlassCard className="text-sm text-[#71717A]">
                Public proof is opt-in. You choose which strategies to make visible and can revoke
                access at any time. Verification data is preserved regardless of public visibility.
              </GlassCard>
            </AnimateOnScroll>
          </section>

          {/* ── CTA ── */}
          <section className="mt-20 pt-16 border-t border-[rgba(255,255,255,0.06)] pb-20">
            <AnimateOnScroll>
              <h2 className="text-2xl md:text-[28px] font-bold text-[#FAFAFA] tracking-tight mb-6">
                Start monitoring your strategies
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="inline-block px-7 py-3.5 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#818CF8] transition-all text-center text-sm btn-primary-cta"
                >
                  Monitor your first strategy free
                </Link>
                <Link
                  href="/pricing"
                  className="inline-block px-7 py-3.5 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:border-[rgba(255,255,255,0.20)] hover:text-[#FAFAFA] transition-colors text-center text-sm"
                >
                  Compare plans
                </Link>
              </div>
            </AnimateOnScroll>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
