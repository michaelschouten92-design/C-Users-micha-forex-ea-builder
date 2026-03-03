import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "AlgoStudio — The Control Layer for Live Algorithmic Strategies",
  description:
    "Deterministic lifecycle governance for live algorithmic trading. Enforce RUN/PAUSE/STOP decisions, detect structural deviation, and maintain audit-grade verification.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AlgoStudio — The Control Layer for Live Algorithmic Strategies",
    description:
      "Deterministic lifecycle governance for live algorithmic trading. Enforce RUN/PAUSE/STOP decisions, detect structural deviation, and maintain audit-grade verification.",
  },
};

const NAV_LINKS = [
  { label: "Product", href: "/product" },
  { label: "Proof", href: "/verified" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
] as const;

const CTA_HREF = "/register";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-[#0D0117] text-white">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0117]/80 backdrop-blur-md border-b border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            AlgoStudio
          </Link>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#94A3B8] hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <Link
              href={CTA_HREF}
              className="text-sm font-medium px-5 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#6366F1] transition-colors"
            >
              Establish Control
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ════════════════════════════════════════════════════════════
            1. HERO
            ════════════════════════════════════════════════════════════ */}
        <section className="pt-36 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              The Control Layer for Live
              <br />
              Algorithmic Strategies.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#94A3B8] max-w-3xl mx-auto leading-relaxed">
              Backtests do not govern live capital.
              <br className="hidden md:block" />
              AlgoStudio enforces deterministic lifecycle authority when real-world performance
              diverges from validated statistical behavior.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={CTA_HREF}
                className="px-8 py-3 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#6366F1] transition-colors text-base"
              >
                Establish Control
              </Link>
              <a
                href="#governance"
                className="px-8 py-3 border border-[rgba(79,70,229,0.3)] text-[#CBD5E1] font-medium rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors text-base"
              >
                See How Governance Works
              </a>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            2. THE PROBLEM
            ════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.05)]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center">
              Backtests Do Not Control Live Risk.
            </h2>
            <div className="mt-10 space-y-6 text-[#94A3B8] text-lg leading-relaxed">
              <p>
                Backtests validate statistical behavior under historical conditions. They establish
                whether a strategy has an edge — not whether that edge persists in live markets.
              </p>
              <p>
                Live markets introduce structural deviation: regime shifts, liquidity changes,
                volatility clustering, correlation breakdowns. The assumptions your backtest
                validated may no longer hold.
              </p>
              <p>
                Most traders respond with dashboards and alerts. They watch metrics. They set
                thresholds. They receive notifications.
              </p>
              <p className="text-[#CBD5E1] font-medium">
                Alerts do not enforce discipline. They inform discretion — and discretion is what
                fails under pressure.
              </p>
              <p>
                Without lifecycle authority, live capital continues operating outside validated
                bounds. Not because the strategy is still justified, but because nothing structural
                exists to intervene.
              </p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            3. THE SOLUTION — Deterministic Lifecycle Authority
            ════════════════════════════════════════════════════════════ */}
        <section id="governance" className="py-20 px-6 bg-[#1A0626]/30 scroll-mt-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center">
              Deterministic Lifecycle Authority.
            </h2>
            <p className="mt-4 text-[#94A3B8] text-center text-lg max-w-2xl mx-auto">
              Every strategy under governance operates in one of three execution states. Transitions
              are rule-based, not discretionary.
            </p>

            <div className="mt-14 grid md:grid-cols-3 gap-6">
              {/* RUN */}
              <div className="rounded-xl border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.05)] p-7">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <span className="text-2xl font-bold text-[#10B981]">RUN</span>
                </div>
                <p className="text-sm text-[#CBD5E1] leading-relaxed">
                  Strategy operates within validated statistical boundaries. All governance
                  thresholds are satisfied. Execution is permitted.
                </p>
              </div>

              {/* PAUSE */}
              <div className="rounded-xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.05)] p-7">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <span className="text-2xl font-bold text-[#F59E0B]">PAUSE</span>
                </div>
                <p className="text-sm text-[#CBD5E1] leading-relaxed">
                  Structural deviation detected. Execution temporarily halted pending review. No new
                  positions opened until governance conditions are restored.
                </p>
              </div>

              {/* STOP */}
              <div className="rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.05)] p-7">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                  <span className="text-2xl font-bold text-[#EF4444]">STOP</span>
                </div>
                <p className="text-sm text-[#CBD5E1] leading-relaxed">
                  Strategy invalidated under deterministic rules. Permission to run is revoked.
                  Lifecycle authority requires explicit re-validation to resume.
                </p>
              </div>
            </div>

            <p className="mt-10 text-center text-[#64748B] text-sm">
              Authority is computed from statistical evidence — not discretionary interpretation.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            4. HOW IT WORKS — 3-Phase Framework
            ════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Validation &rarr; Governance &rarr; Control.
            </h2>
            <p className="text-[#94A3B8] text-center text-base mb-14 max-w-2xl mx-auto">
              Three phases. Each builds on the last. Each narrows the gap between backtest
              assumptions and live reality.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-8">
                <div className="flex items-center gap-3 mb-5">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.1)] flex items-center justify-center text-xs font-bold text-[#A78BFA]">
                    1
                  </span>
                  <h3 className="text-lg font-bold text-white">Validate</h3>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Upload backtests. Score robustness across statistical dimensions. Establish the
                  governance baseline your strategy will be measured against.
                </p>
              </div>

              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-8">
                <div className="flex items-center gap-3 mb-5">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.1)] flex items-center justify-center text-xs font-bold text-[#A78BFA]">
                    2
                  </span>
                  <h3 className="text-lg font-bold text-white">Govern</h3>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Bind live execution to validated thresholds. Monitor structural deviation in real
                  time. Log governance snapshots for every lifecycle transition.
                </p>
              </div>

              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-8">
                <div className="flex items-center gap-3 mb-5">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.1)] flex items-center justify-center text-xs font-bold text-[#A78BFA]">
                    3
                  </span>
                  <h3 className="text-lg font-bold text-white">Control</h3>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Automatically enforce lifecycle decisions when deviation occurs. RUN, PAUSE, or
                  STOP — determined by rules, not by hope.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            5. GOVERNANCE DEPTH PREVIEW
            ════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-6 bg-[#1A0626]/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">Governance Depth.</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-[rgba(34,211,238,0.15)] bg-[#0D0117]/60 p-7">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE]" />
                  <h3 className="text-base font-semibold text-white">Free</h3>
                </div>
                <p className="text-xs text-[#22D3EE] font-medium tracking-wide uppercase mt-1 mb-4">
                  Validation Only
                </p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Statistical validation, risk simulation, and backtest scoring. No live governance.
                  No execution authority. No automatic intervention.
                </p>
              </div>

              <div className="rounded-xl border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.05)] p-7 ring-1 ring-[#4F46E5]/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                  <h3 className="text-base font-semibold text-white">Pro</h3>
                </div>
                <p className="text-xs text-[#A78BFA] font-medium tracking-wide uppercase mt-1 mb-4">
                  Strategy-Level Authority
                </p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Deterministic execution authority (RUN/PAUSE) over individual live strategies.
                  Continuous heartbeat monitoring. Governance snapshot logging.
                </p>
              </div>

              <div className="rounded-xl border border-[rgba(167,139,250,0.2)] bg-[#0D0117]/60 p-7">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
                  <h3 className="text-base font-semibold text-white">Elite</h3>
                </div>
                <p className="text-xs text-[#A78BFA] font-medium tracking-wide uppercase mt-1 mb-4">
                  Full Lifecycle Authority
                </p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Portfolio-level deterministic governance. Full RUN/PAUSE/STOP lifecycle control.
                  Incident escalation. Cadence analytics. Authority aggregation.
                </p>
              </div>
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/pricing"
                className="inline-block px-8 py-3 border border-[rgba(79,70,229,0.3)] text-[#CBD5E1] font-medium rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors text-base"
              >
                Explore Governance Depth
              </Link>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            6. PROOF & AUDIT
            ════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Proof-Bound Decisions.
            </h2>
            <p className="mt-4 text-[#94A3B8] text-center text-base max-w-2xl mx-auto mb-12">
              Every governance decision is structurally recorded. Not as logs — as proof.
            </p>

            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  title: "Hash-chained proof logs",
                  desc: "Every lifecycle transition is cryptographically chained. Tamper-evident by construction.",
                },
                {
                  title: "Snapshot-bound verification",
                  desc: "Governance snapshots are bound to the exact state at the time of decision.",
                },
                {
                  title: "Deterministic replay",
                  desc: "Any authority decision can be independently verified against its inputs.",
                },
                {
                  title: "No silent lifecycle mutations",
                  desc: "Every state change is recorded, timestamped, and attributed. Nothing happens off the record.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[#0D0117]/60 p-6"
                >
                  <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            7. TARGET AUDIENCE
            ════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-6 bg-[#1A0626]/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Built for Serious Operators.
            </h2>

            <ul className="space-y-5 max-w-lg mx-auto">
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

            <p className="mt-10 text-center text-[#64748B] text-sm">
              If you treat algorithmic trading as infrastructure — you are the intended operator.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            8. FINAL CTA
            ════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.1)]">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold">
              Establish Control Before the Market
              <br className="hidden sm:block" />
              Decides for You.
            </h2>
            <p className="mt-4 text-[#94A3B8] text-lg">
              Governance is not optional when capital is live.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login?redirect=/app/live"
                className="px-8 py-3 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#6366F1] transition-colors text-base"
              >
                Enter the Command Center
              </Link>
              <Link
                href={CTA_HREF}
                className="px-8 py-3 border border-[rgba(79,70,229,0.3)] text-[#CBD5E1] font-medium rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors text-base"
              >
                Start with Validation
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
