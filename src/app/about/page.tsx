import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "About — AlgoStudio | Strategy Monitoring & Governance Platform",
  description:
    "AlgoStudio is a monitoring and governance platform for live algorithmic strategies. Continuous verification, structural deviation detection, and public proof of strategy integrity.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About AlgoStudio — Monitoring & Governance for Live Strategies",
    description:
      "Continuous monitoring, verification, and public proof for algorithmic trading strategies.",
  },
};

export default function AboutPage() {
  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-[#09090B]">
      <SiteNav />

      <main className="pt-32 pb-8 px-4 sm:px-6 flex-1">
        <div className="max-w-3xl mx-auto">
          {/* ════════════════════════════════════════════════════════
              1. HERO — Why AlgoStudio exists
              ════════════════════════════════════════════════════════ */}
          <section>
            <h1 className="text-3xl md:text-4xl font-bold text-[#FAFAFA] leading-tight">
              Why AlgoStudio Exists.
            </h1>

            <div className="mt-8 space-y-5 text-[#A1A1AA] text-base leading-relaxed">
              <p>
                Backtests establish whether a strategy has a statistical edge under historical
                conditions. They do not tell you whether that edge persists once capital is live.
              </p>
              <p>
                Live markets introduce structural change: regime shifts, liquidity variation,
                correlation breakdown, volatility clustering. The assumptions validated in your
                backtest may no longer hold within weeks of deployment.
              </p>
              <p>
                Most platforms offer dashboards and alerts. They show what is happening. They do not
                measure whether a strategy still operates within the bounds that justified running
                it in the first place.
              </p>
              <p className="text-[#FAFAFA] font-medium">
                AlgoStudio exists to close that gap — continuous monitoring that measures strategy
                integrity against its own statistical baseline.
              </p>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              2. THE CORE PROBLEM
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA]">
              The Problem With Unmonitored Strategies.
            </h2>

            <div className="mt-8 space-y-5 text-[#A1A1AA] text-base leading-relaxed">
              <p>
                A strategy can be statistically valid at deployment and gradually drift outside its
                validated parameters without triggering any alert. Drawdown increases. Win rate
                shifts. Trade frequency diverges from baseline.
              </p>
              <p>
                Without continuous measurement against a defined baseline, there is no structured
                way to know whether a strategy is still behaving as validated — or whether it has
                quietly moved into territory where its original edge no longer applies.
              </p>
              <p>
                The result is capital running on assumptions that may no longer hold, with no
                systematic process to detect the divergence.
              </p>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              3. MONITORING VS CONTROL
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA]">
              Monitoring, Not Trading.
            </h2>

            <div className="mt-8 space-y-5 text-[#A1A1AA] text-base leading-relaxed">
              <p>
                AlgoStudio does not place trades. It does not generate signals. It does not manage
                positions or interact with broker execution.
              </p>
              <p>
                It monitors. It measures live behavior against validated baselines. It scores
                strategy health across multiple dimensions. It detects structural deviation when
                parameters drift beyond expected bounds.
              </p>
              <p>
                When deviation is detected, the platform records it, scores its severity, and
                surfaces it through lifecycle governance — a structured framework that maps strategy
                health to operational status.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Monitor",
                  desc: "Continuous measurement of live strategy behavior against validated baselines.",
                },
                {
                  label: "Verify",
                  desc: "Statistical scoring across robustness dimensions. Deviation detection when parameters drift.",
                },
                {
                  label: "Govern",
                  desc: "Lifecycle framework that maps strategy health to operational decisions.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-5"
                >
                  <h3 className="text-sm font-semibold text-[#FAFAFA]">{item.label}</h3>
                  <p className="mt-2 text-sm text-[#71717A] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              4. EVIDENCE OVER OPINION
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA]">
              Evidence Over Opinion.
            </h2>

            <div className="mt-8 space-y-5 text-[#A1A1AA] text-base leading-relaxed">
              <p>
                Every claim about a strategy should be verifiable. Not asserted — measured. Not
                trusted — proven against data.
              </p>
              <p>
                AlgoStudio records verification evidence at every stage: backtest validation scores,
                Monte Carlo survival rates, live performance metrics, governance snapshots, and
                lifecycle transitions. Each record is structurally bound to the data that produced
                it.
              </p>
            </div>

            <ul className="mt-8 space-y-5">
              {[
                {
                  title: "Hash-chained proof logs",
                  desc: "Every lifecycle transition is cryptographically chained. Tamper-evident by construction.",
                },
                {
                  title: "Snapshot-bound verification",
                  desc: "Governance snapshots are bound to the exact state at the time of measurement. Context is preserved, not reconstructed.",
                },
                {
                  title: "Deterministic scoring",
                  desc: "Verification results are computed from defined inputs. Same data produces the same score every time.",
                },
                {
                  title: "Auditable transitions",
                  desc: "Every state change is recorded, timestamped, and attributed. Nothing happens off the record.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="text-[#6366F1] mt-0.5 flex-shrink-0">—</span>
                  <div>
                    <span className="text-sm font-medium text-[#FAFAFA]">{item.title}</span>
                    <p className="mt-0.5 text-sm text-[#71717A] leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ════════════════════════════════════════════════════════
              5. PUBLIC VERIFICATION
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(255,255,255,0.06)]">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA]">Public Verification.</h2>

            <div className="mt-8 space-y-5 text-[#A1A1AA] text-base leading-relaxed">
              <p>
                Strategies that pass verification can generate public proof pages — independently
                accessible records of their validation history, live performance, and governance
                status.
              </p>
              <p>
                Public proof pages are not marketing materials. They are structured verification
                reports: backtest scores, Monte Carlo analysis, live metric tracking, and the
                complete chain of governance decisions.
              </p>
              <p>
                Anyone with the link can inspect the evidence. The verification ladder shows exactly
                what has been validated and at what level — from initial submission through baseline
                validation to full live monitoring.
              </p>
            </div>

            <div className="mt-8 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6">
              <p className="text-sm text-[#71717A]">
                Public proof is opt-in. Operators choose which strategies to make visible and can
                revoke access at any time. The verification data remains in the system regardless of
                public visibility.
              </p>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              6. CLOSING CTA
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-block px-6 py-3 bg-[#6366F1] text-white font-medium rounded-lg hover:bg-[#818CF8] transition-colors text-center"
              >
                Start monitoring
              </Link>
              <Link
                href="/pricing"
                className="inline-block px-6 py-3 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors text-center"
              >
                View plans
              </Link>
            </div>

            <p className="mt-10 text-xs text-[#71717A]">
              Follow updates on{" "}
              <a
                href="https://x.com/algostudiodev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#A1A1AA] hover:underline"
              >
                @algostudiodev
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
