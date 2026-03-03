"use client";

import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

const CheckIcon = ({ className = "w-4 h-4 text-[#22D3EE]" }: { className?: string }) => (
  <svg
    className={`${className} flex-shrink-0 mx-auto`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const DashIcon = ({ className = "w-4 h-4 text-[#334155]" }: { className?: string }) => (
  <svg
    className={`${className} flex-shrink-0 mx-auto`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

// ── Governance Matrix Data ──────────────────────────────

type CellValue = boolean | string;
type MatrixRow = [string, CellValue, CellValue, CellValue];

const GOVERNANCE_MATRIX: { category: string; rows: MatrixRow[] }[] = [
  {
    category: "Governance Scope",
    rows: [
      ["Strategy validation & backtest analysis", true, true, true],
      ["Single-strategy lifecycle governance", false, true, true],
      ["Portfolio-level deterministic governance", false, false, true],
    ],
  },
  {
    category: "Authority Depth",
    rows: [
      ["Execution Authority (RUN / PAUSE)", false, true, true],
      ["Full lifecycle authority (RUN / PAUSE / STOP)", false, false, true],
      ["Deterministic pause on structural deviation", false, true, true],
      ["Governance snapshot logging", false, true, true],
    ],
  },
  {
    category: "Monitoring Cadence",
    rows: [
      ["Manual review only", true, false, false],
      ["Continuous heartbeat monitoring", false, true, true],
      ["Advanced cadence analytics with breach detection", false, false, true],
      ["Edge degradation detection", false, false, true],
      ["CUSUM drift analysis", false, false, true],
    ],
  },
  {
    category: "Incident Handling",
    rows: [
      ["Email, webhook & Telegram alerts", false, true, true],
      ["Automatic intervention on structural deviation", false, false, true],
      ["Pre-retirement lifecycle warnings", false, false, true],
    ],
  },
  {
    category: "Portfolio Control",
    rows: [
      ["Active strategies", "1", "Unlimited", "Unlimited"],
      ["Multi-strategy portfolio view", false, true, true],
      ["Portfolio-level authority aggregation", false, false, true],
    ],
  },
  {
    category: "Proof & Audit",
    rows: [
      ["Backtest health scoring", true, true, true],
      ["Monte Carlo risk validation", true, true, true],
      ["Verified Track Record (hash chain)", false, true, true],
      ["Strategy Identity & versioning", false, true, true],
      ["Public Verified Strategy Page", false, true, true],
      ["Embeddable proof widget", false, false, true],
    ],
  },
  {
    category: "Support Level",
    rows: [
      ["Community support", true, true, true],
      ["Priority support", false, true, true],
      ["1-on-1 strategy review", false, false, "1/month"],
      ["Direct developer channel", false, false, true],
    ],
  },
];

// ── FAQ ─────────────────────────────────────────────────

const faqItems = [
  {
    q: "How does governance depth differ from feature access?",
    a: "Governance depth determines the level of deterministic authority enforced over your live strategies — not which buttons you can click. Baseline validates strategy viability. Control enforces execution authority (RUN/PAUSE) over individual strategies with continuous monitoring. Authority extends governance to the portfolio level with full lifecycle control (RUN/PAUSE/STOP), incident escalation, and cadence analytics.",
  },
  {
    q: "What is Execution Authority?",
    a: "Execution Authority is the deterministic signal that governs whether a strategy is permitted to trade. RUN means statistical boundaries are satisfied. PAUSE means a structural deviation was detected and the strategy should halt new positions. STOP means permission to run is revoked entirely. These decisions are computed from your strategy's performance against its governance baseline — not discretionary interpretation.",
  },
  {
    q: "What happens when a structural deviation is detected?",
    a: "When your strategy's live performance deviates from its statistical baseline beyond configured thresholds, the system transitions the authority signal from RUN to PAUSE. This is deterministic — it happens based on rules, not interpretation. Authority includes CUSUM drift analysis, edge degradation detection, and automatic pre-retirement warnings for deeper structural monitoring.",
  },
  {
    q: "Does this work with any MT5 broker?",
    a: "Yes. AlgoStudio exports standard MQL5 source code compatible with any MetaTrader 5 broker — forex, indices, commodities. Compatible with prop firms like FTMO, E8 Markets, FundingPips, and others.",
  },
  {
    q: "What is a Verified Track Record?",
    a: "Every trade your EA makes is recorded in a tamper-resistant hash chain. This creates a cryptographically verified history that proves your results are real — no screenshot manipulation, no cherry-picking. Control and Authority users get a public Verified Strategy Page to share their governance record with investors, prop firms, or anyone who needs proof.",
  },
  {
    q: "What happens to my strategies if I downgrade?",
    a: "All strategies remain saved and your verified track records stay intact. Active governance enforcement (execution authority, monitoring cadence, incident handling) reverts to the capabilities of your new tier. You can upgrade again anytime to restore full governance depth.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings at any time. No long-term contracts, no cancellation fees. Your subscription remains active until the end of the current billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit and debit cards (Visa, Mastercard, American Express) through Stripe. All payments are processed securely. We do not store your card details.",
  },
  {
    q: "What is the difference between Control and Authority?",
    a: "Control provides strategy-level execution authority: RUN/PAUSE governance, continuous heartbeat monitoring, edge degradation detection, verified track records, and governance snapshot logging. Authority extends this to portfolio-level deterministic governance: full RUN/PAUSE/STOP lifecycle control, incident escalation framework, CUSUM drift analysis, cadence analytics with breach detection, audit bundle export, plus 1-on-1 strategy reviews and direct developer access.",
  },
];

// ── Page ────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div id="main-content" className="min-h-screen flex flex-col">
      <SiteNav />
      <div className="max-w-6xl mx-auto pt-32 pb-16 px-4 flex-1">
        {/* ════════════════════════════════════════════════════════
            HERO
            ════════════════════════════════════════════════════════ */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-4 leading-tight">
            Choose Your Governance Depth
          </h1>
          <p className="text-[#94A3B8] mt-4 text-lg max-w-2xl mx-auto">
            From validation to full lifecycle authority.
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════
            DECISION HELPER
            ════════════════════════════════════════════════════════ */}
        <div className="max-w-3xl mx-auto mt-8 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0D0117]/50 border border-[rgba(34,211,238,0.15)] rounded-lg px-4 py-3 text-center">
              <p className="text-xs text-[#64748B] mb-1">Validating a strategy?</p>
              <p className="text-sm font-medium text-[#22D3EE]">Start with Baseline</p>
            </div>
            <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.3)] rounded-lg px-4 py-3 text-center ring-1 ring-[#4F46E5]/30">
              <p className="text-xs text-[#64748B] mb-1">Governing a live strategy?</p>
              <p className="text-sm font-medium text-[#A78BFA]">Upgrade to Control</p>
            </div>
            <div className="bg-[#0D0117]/50 border border-[rgba(167,139,250,0.15)] rounded-lg px-4 py-3 text-center">
              <p className="text-xs text-[#64748B] mb-1">Portfolio-level control?</p>
              <p className="text-sm font-medium text-[#A78BFA]">Unlock Authority</p>
            </div>
          </div>
        </div>

        <PricingSection showHeader={false} />

        {/* ════════════════════════════════════════════════════════
            GOVERNANCE MATRIX
            ════════════════════════════════════════════════════════ */}
        <div className="mt-20 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Governance Capabilities
          </h2>
          <p className="text-[#94A3B8] text-center text-sm mb-8">
            Governance capability by tier — not feature access.
          </p>

          <div className="relative">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(79,70,229,0.2)]">
                    <th className="text-left py-3 px-4 text-[#64748B] font-medium">Capability</th>
                    <th className="text-center py-3 px-4 text-[#22D3EE] font-medium">Baseline</th>
                    <th className="text-center py-3 px-4 text-[#A78BFA] font-medium">Control</th>
                    <th className="text-center py-3 px-4 text-[#A78BFA] font-medium">Authority</th>
                  </tr>
                </thead>
                <tbody className="text-[#94A3B8]">
                  {GOVERNANCE_MATRIX.map((section) => (
                    <>
                      <tr
                        key={`cat-${section.category}`}
                        className="border-b border-[rgba(79,70,229,0.05)]"
                      >
                        <td
                          className="py-2 px-4 text-[#64748B] text-xs font-semibold uppercase tracking-wider pt-6"
                          colSpan={4}
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.rows.map(([label, free, pro, elite]) => (
                        <tr key={label as string} className="border-b border-[rgba(79,70,229,0.1)]">
                          <td className="py-3 px-4 text-[#CBD5E1]">{label}</td>
                          {[free, pro, elite].map((val, i) => (
                            <td key={i} className="py-3 px-4 text-center">
                              {typeof val === "boolean" ? (
                                val ? (
                                  <CheckIcon />
                                ) : (
                                  <DashIcon />
                                )
                              ) : (
                                <span className="text-[#CBD5E1]">{val}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#64748B] text-center mt-2 sm:hidden">
              Scroll sideways to see all tiers &rarr;
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            WHAT CHANGES BETWEEN TIERS
            ════════════════════════════════════════════════════════ */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            What Changes Between Tiers?
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="bg-[#1A0626]/50 border border-[rgba(34,211,238,0.15)] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE]" />
                <h3 className="text-sm font-semibold text-white tracking-wide">BASELINE</h3>
              </div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-3">
                Validation Only
              </p>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Evaluate strategy viability before deployment. Statistical analysis, risk
                simulation, backtest scoring. No live governance, no execution authority, no
                automatic intervention.
              </p>
              <p className="mt-4 text-[10px] text-[#64748B]">
                You determine when to act. The platform does not intervene.
              </p>
            </div>

            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.25)] rounded-xl p-6 ring-1 ring-[#4F46E5]/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                <h3 className="text-sm font-semibold text-white tracking-wide">CONTROL</h3>
              </div>
              <p className="text-xs text-[#A78BFA] uppercase tracking-wider mb-3">
                Strategy-Level Authority
              </p>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Deterministic execution authority over individual live strategies. Continuous
                heartbeat monitoring, structural deviation detection, governance snapshot logging.
                The system enforces RUN or PAUSE based on statistical boundaries.
              </p>
              <p className="mt-4 text-[10px] text-[#64748B]">
                Authority is computed, not interpreted.
              </p>
            </div>

            <div className="bg-[#1A0626]/50 border border-[rgba(167,139,250,0.2)] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
                <h3 className="text-sm font-semibold text-white tracking-wide">AUTHORITY</h3>
              </div>
              <p className="text-xs text-[#A78BFA] uppercase tracking-wider mb-3">
                Full Lifecycle Authority
              </p>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Portfolio-level deterministic governance. Full lifecycle control (RUN/PAUSE/STOP),
                incident escalation, CUSUM drift analysis, cadence analytics with breach detection.
                Authority is aggregated across your entire portfolio.
              </p>
              <p className="mt-4 text-[10px] text-[#64748B]">
                This is not about dashboards. This is control over live capital.
              </p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            TRUST SIGNALS
            ════════════════════════════════════════════════════════ */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              {
                title: "Cancel anytime",
                description:
                  "No long-term contracts. Cancel from your account settings whenever you want.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                ),
              },
              {
                title: "Secure via Stripe",
                description:
                  "All payments through Stripe. We never see your card details. PCI-DSS compliant.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                ),
              },
              {
                title: "Prop firm compatible",
                description:
                  "Standard MQL5 output. Works with FTMO, E8 Markets, FundingPips, and more.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                ),
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-5 h-5 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {item.icon}
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            FAQ
            ════════════════════════════════════════════════════════ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <details
                key={i}
                className="group bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-white font-medium text-sm list-none">
                  {item.q}
                  <svg
                    className="w-5 h-5 text-[#64748B] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-[#94A3B8] leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            FOOTER CTA + INSTITUTIONAL CONTACT
            ════════════════════════════════════════════════════════ */}
        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold text-white mb-4">Establish Control</h2>
          <p className="text-[#94A3B8] mb-6 max-w-lg mx-auto">
            Start with validation. Upgrade to governance when your strategies go live.
          </p>
          <Link
            href="/register"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Establish Control
          </Link>
          <p className="mt-4 text-[#64748B] text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-[#22D3EE] hover:underline">
              Sign in
            </Link>
          </p>

          {/* Institutional contact */}
          <p className="mt-10 text-xs text-[#475569] max-w-lg mx-auto">
            For institutional deployments or managed strategy governance frameworks, contact us
            directly at{" "}
            <a href="mailto:contact@algostudio.dev" className="text-[#64748B] hover:underline">
              contact@algostudio.dev
            </a>
          </p>

          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg max-w-xl mx-auto">
            <p className="text-xs text-amber-200 leading-relaxed">
              <strong>Risk Warning:</strong> Trading in financial markets involves substantial risk
              of loss and is not suitable for every investor. Past performance does not guarantee
              future results. Always test strategies on a demo account first. AlgoStudio is a tool
              for building and testing automated trading strategies — it does not provide financial
              advice or guarantee profits. See our{" "}
              <Link href="/terms" className="underline hover:text-amber-100">
                Terms of Service
              </Link>{" "}
              for full details.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
