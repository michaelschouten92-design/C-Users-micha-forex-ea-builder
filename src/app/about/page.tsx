import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "About — AlgoStudio | Deterministic Lifecycle Governance for Algorithmic Trading",
  description:
    "AlgoStudio is a deterministic lifecycle governance framework for live algorithmic strategies. Enforce RUN/PAUSE/STOP authority, detect structural deviation, and maintain audit-grade verification.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About AlgoStudio — Governance for Live Algorithmic Strategies",
    description:
      "Deterministic lifecycle governance for live algorithmic trading. Authority over execution, not dashboards over data.",
  },
};

export default function AboutPage() {
  return (
    <div id="main-content" className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="pt-32 pb-8 px-4 sm:px-6 flex-1">
        <div className="max-w-3xl mx-auto">
          {/* ════════════════════════════════════════════════════════
              1. OPENING
              ════════════════════════════════════════════════════════ */}
          <section>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Why Governance Matters in Systematic Trading.
            </h1>

            <div className="mt-8 space-y-5 text-[#94A3B8] text-base leading-relaxed">
              <p>
                Backtests validate statistical behavior under historical conditions. They establish
                whether a strategy has an edge — not whether that edge persists when capital is
                live.
              </p>
              <p>
                Live markets introduce structural deviation: regime shifts, liquidity changes,
                correlation breakdowns, volatility clustering. The assumptions your backtest
                validated may no longer hold within weeks of deployment.
              </p>
              <p>
                Most traders respond with monitoring. They watch dashboards. They set alert
                thresholds. They receive notifications when metrics cross boundaries.
              </p>
              <p>
                But monitoring informs — it does not enforce. Discipline cannot depend on emotion or
                discretionary judgment, especially under drawdown pressure.
              </p>
              <p className="text-[#CBD5E1] font-medium">
                Governance must be structural, not reactive. It must be computed from statistical
                evidence, not interpreted from visual cues.
              </p>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              2. CORE THESIS
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(79,70,229,0.08)]">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Monitoring Is Not Control.
            </h2>

            <div className="mt-8 space-y-5 text-[#94A3B8] text-base leading-relaxed">
              <p>Dashboards inform. Alerts notify. Neither enforces lifecycle authority.</p>
              <p>
                A dashboard can show you that drawdown has exceeded historical norms. An alert can
                notify you that trade frequency has diverged from baseline. But no dashboard
                intervenes. No alert enforces a state transition.
              </p>
              <p>
                Without deterministic rules binding execution to validation, live capital continues
                operating outside validated bounds — not because the strategy is still justified,
                but because nothing structural exists to intervene.
              </p>
              <p className="text-[#CBD5E1] font-medium">
                Governance must bind execution to statistical validation. The system must decide,
                not suggest.
              </p>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              3. THE FRAMEWORK
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(79,70,229,0.08)]">
            <h2 className="text-2xl md:text-3xl font-bold text-white">The AlgoStudio Framework.</h2>
            <p className="mt-3 text-[#64748B] text-sm tracking-wide">
              Validation &rarr; Governance &rarr; Control
            </p>

            <div className="mt-10 space-y-8">
              <div className="flex gap-5">
                <span className="flex-shrink-0 w-8 h-8 rounded-full border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.1)] flex items-center justify-center text-xs font-bold text-[#A78BFA]">
                  1
                </span>
                <div>
                  <h3 className="text-base font-semibold text-white">Validation</h3>
                  <p className="mt-1.5 text-sm text-[#94A3B8] leading-relaxed">
                    Establish statistical boundaries. Score robustness across dimensions. Define the
                    governance baseline your strategy will be measured against.
                  </p>
                </div>
              </div>

              <div className="flex gap-5">
                <span className="flex-shrink-0 w-8 h-8 rounded-full border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.1)] flex items-center justify-center text-xs font-bold text-[#A78BFA]">
                  2
                </span>
                <div>
                  <h3 className="text-base font-semibold text-white">Governance</h3>
                  <p className="mt-1.5 text-sm text-[#94A3B8] leading-relaxed">
                    Bind live execution to validated thresholds. Monitor structural deviation in
                    real time. Log governance snapshots for every lifecycle transition.
                  </p>
                </div>
              </div>

              <div className="flex gap-5">
                <span className="flex-shrink-0 w-8 h-8 rounded-full border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.1)] flex items-center justify-center text-xs font-bold text-[#A78BFA]">
                  3
                </span>
                <div>
                  <h3 className="text-base font-semibold text-white">Control</h3>
                  <p className="mt-1.5 text-sm text-[#94A3B8] leading-relaxed">
                    Enforce lifecycle decisions when deviation occurs. RUN, PAUSE, or STOP —
                    determined by rules, not by discretion. Every transition is deterministic and
                    auditable.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              4. PROOF & ARCHITECTURE
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(79,70,229,0.08)]">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Proof-Bound by Design.</h2>

            <p className="mt-6 text-[#94A3B8] text-base leading-relaxed">
              Governance without auditability is opinion. Every decision within AlgoStudio is
              structurally recorded — not as logs, but as proof.
            </p>

            <ul className="mt-8 space-y-5">
              {[
                {
                  title: "Hash-chained proof logs",
                  desc: "Every lifecycle transition is cryptographically chained. Tamper-evident by construction.",
                },
                {
                  title: "Snapshot-bound verification",
                  desc: "Governance snapshots are bound to the exact state at the time of decision. Context is preserved, not reconstructed.",
                },
                {
                  title: "Deterministic replay",
                  desc: "Any authority decision can be independently verified against its inputs. Same inputs, same output, every time.",
                },
                {
                  title: "No silent lifecycle mutations",
                  desc: "Every state change is recorded, timestamped, and attributed. Nothing happens off the record.",
                },
                {
                  title: "Fail-closed philosophy",
                  desc: "When the system cannot determine authority, it defaults to PAUSE — not RUN. Uncertainty halts execution, never permits it.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="text-[#A78BFA] mt-0.5 flex-shrink-0">—</span>
                  <div>
                    <span className="text-sm font-medium text-[#CBD5E1]">{item.title}</span>
                    <p className="mt-0.5 text-sm text-[#7C8DB0] leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ════════════════════════════════════════════════════════
              5. WHO IT IS BUILT FOR
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(79,70,229,0.08)]">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Built for Serious Operators.
            </h2>

            <ul className="mt-8 space-y-4">
              {[
                "Retail quants running systematic strategies",
                "Prop firm algorithmic traders",
                "Independent fund managers",
                "Strategy developers managing external capital",
              ].map((item) => (
                <li key={item} className="flex gap-4 items-start text-[#CBD5E1]">
                  <span className="text-[#A78BFA] mt-0.5 flex-shrink-0">—</span>
                  <span className="text-base">{item}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm text-[#64748B]">
              If you treat algorithmic trading as infrastructure — you are the intended operator.
            </p>
          </section>

          {/* ════════════════════════════════════════════════════════
              6. FOUNDER NOTE
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(79,70,229,0.08)]">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Why This Exists.</h2>

            <div className="mt-8 space-y-5 text-[#94A3B8] text-base leading-relaxed">
              <p>
                AlgoStudio was built after years of running third-party algorithms on live capital —
                and watching them quietly degrade without structural warning.
              </p>
              <p>
                The tools available at the time offered dashboards, alerts, and performance charts.
                They showed what was happening. None of them governed what should happen next.
              </p>
              <p>
                The realization was simple: performance without governance is fragile. A strategy
                can be statistically valid and still damage capital — because nothing enforces the
                boundary between validated behavior and live drift.
              </p>
              <p className="text-[#CBD5E1]">
                The goal was not to build another dashboard. The goal was to build structural
                control over live capital — deterministic, auditable, and fail-closed.
              </p>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              7. CLOSING + SOCIAL
              ════════════════════════════════════════════════════════ */}
          <section className="mt-16 pt-16 border-t border-[rgba(79,70,229,0.08)]">
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-block px-6 py-3 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#6366F1] transition-colors text-center"
              >
                Establish Control
              </Link>
              <Link
                href="/pricing"
                className="inline-block px-6 py-3 border border-[rgba(79,70,229,0.3)] text-[#CBD5E1] font-medium rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors text-center"
              >
                Explore Governance Depth
              </Link>
            </div>

            <p className="mt-10 text-xs text-[#475569]">
              Follow ongoing thinking on governance and systematic risk{" "}
              <a
                href="https://x.com/algostudiodev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#64748B] hover:underline"
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
