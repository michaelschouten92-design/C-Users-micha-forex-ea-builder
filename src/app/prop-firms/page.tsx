import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";

export const metadata: Metadata = {
  title: "Prop Firms — Strategy Monitoring for Funded Challenges | AlgoStudio",
  description:
    "Monitor and verify your algorithmic strategies for prop firm challenges. Drawdown tracking, performance verification, and strategy discipline for FTMO, E8 Markets, FundingPips, and more.",
  alternates: { canonical: "/prop-firms" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Prop Firms", href: "/prop-firms" },
];

const faqItems = [
  {
    q: "What does AlgoStudio monitor for prop firm strategies?",
    a: "AlgoStudio tracks strategy performance against validated baselines — drawdown levels, win rate, trade frequency, and profit factor. When metrics drift outside expected bounds, the platform surfaces the deviation through lifecycle signals and alerts.",
  },
  {
    q: "Does AlgoStudio place trades on my prop firm account?",
    a: "No. AlgoStudio does not place trades, manage positions, or interact with broker execution. It monitors and verifies strategy performance. Trading decisions remain with you and your strategy.",
  },
  {
    q: "Can I use AlgoStudio during a prop firm challenge?",
    a: "Yes. You can connect your strategy and monitor performance throughout both evaluation phases and funded account operation. Continuous monitoring helps you detect drawdown risk before it becomes a rule violation.",
  },
  {
    q: "How does verification help with prop firm trading?",
    a: "Verification establishes a statistical baseline for your strategy — expected drawdown, trade frequency, win rate. During live trading, AlgoStudio measures actual performance against this baseline. Deviation from validated parameters is detected and scored.",
  },
  {
    q: "Can I share my verified track record with a prop firm?",
    a: "Strategies that pass verification can generate public proof pages — independently accessible records showing validation history, live performance, and governance status. You can share these with anyone via a link.",
  },
];

function faqJsonLd(questions: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export default function PropFirmsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#09090B]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6 flex-1">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* ════════════════════════════════════════════════════════
              1. HERO
              ════════════════════════════════════════════════════════ */}
          <section className="mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-[#FAFAFA] leading-tight mb-6">
              Monitor your prop firm
              <br />
              trading strategies.
            </h1>
            <p className="text-lg text-[#A1A1AA] max-w-2xl mb-8">
              Prop firm rules require strict risk control and continuous discipline. AlgoStudio
              monitors strategy performance, detects drawdown risk, and verifies track records — so
              you know when your strategy is drifting before a rule violation occurs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-block bg-[#6366F1] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#818CF8] transition-colors text-center"
              >
                Start monitoring
              </Link>
              <Link
                href="/pricing"
                className="inline-block px-8 py-3.5 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors text-center"
              >
                See pricing
              </Link>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              2. THE PROBLEM WITH PROP FIRM ACCOUNTS
              ════════════════════════════════════════════════════════ */}
          <section className="mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA] mb-4">
              The Problem with Prop Firm Accounts
            </h2>
            <p className="text-[#A1A1AA] mb-8 max-w-2xl">
              Prop firm challenges have strict rules and narrow margins for error. Most failures
              come from problems that are detectable — if you have the right monitoring in place.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">
                  Strict drawdown limits
                </h3>
                <p className="text-sm text-[#71717A] leading-relaxed">
                  Daily and maximum drawdown rules leave no room for unmonitored risk. A single bad
                  session can end a challenge if drawdown isn&apos;t tracked in real time.
                </p>
              </div>
              <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">Unnoticed degradation</h3>
                <p className="text-sm text-[#71717A] leading-relaxed">
                  Strategies can drift from their validated parameters without triggering obvious
                  alerts. Win rate drops, trade frequency shifts, and risk exposure grows gradually.
                </p>
              </div>
              <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">
                  No reliable monitoring
                </h3>
                <p className="text-sm text-[#71717A] leading-relaxed">
                  Most traders rely on broker dashboards that show what happened — not whether the
                  strategy is still operating within validated bounds.
                </p>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              3. HOW ALGOSTUDIO HELPS
              ════════════════════════════════════════════════════════ */}
          <section className="mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA] mb-4">
              How AlgoStudio Helps
            </h2>
            <p className="text-[#A1A1AA] mb-8 max-w-2xl">
              AlgoStudio tracks strategy performance in real time, detects performance drift and
              drawdown risk, evaluates strategies using statistical analysis, and helps traders
              maintain discipline through structured governance.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Monitor",
                  desc: "Continuous measurement of live strategy performance against validated baselines. Drawdown tracking, trade frequency analysis, and risk threshold alerts.",
                },
                {
                  label: "Verify",
                  desc: "Statistical evaluation across robustness dimensions — Monte Carlo survival, profit factor stability, and drawdown consistency. Deviation detection when parameters drift.",
                },
                {
                  label: "Govern",
                  desc: "Lifecycle framework that maps strategy health to operational status. When metrics degrade beyond validated bounds, the platform surfaces the deviation for action.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6"
                >
                  <h3 className="text-base font-semibold text-[#6366F1] mb-2">{item.label}</h3>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              4. STRATEGY MONITORING
              ════════════════════════════════════════════════════════ */}
          <section className="mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA] mb-4">
              Strategy Monitoring for Prop Firms
            </h2>
            <p className="text-[#A1A1AA] mb-8 max-w-2xl">
              Prop firm environments demand continuous awareness of strategy health. AlgoStudio
              provides structured monitoring designed for the constraints of funded trading.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Continuous performance tracking",
                  desc: "Live metrics measured against your strategy's validated baseline. Performance changes are detected as they happen, not after the fact.",
                },
                {
                  title: "Drawdown monitoring",
                  desc: "Real-time drawdown measurement relative to both daily and maximum limits. Early detection of drawdown risk before it becomes a rule violation.",
                },
                {
                  title: "Risk threshold alerts",
                  desc: "Configurable thresholds for key metrics — drawdown, win rate, trade frequency. The platform surfaces deviations when parameters move outside expected bounds.",
                },
                {
                  title: "Lifecycle governance",
                  desc: "Structured framework that maps strategy health to operational decisions. When monitoring detects sustained degradation, the lifecycle status reflects the change.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6"
                >
                  <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#71717A] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              5. VERIFICATION & PROOF
              ════════════════════════════════════════════════════════ */}
          <section className="mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA] mb-4">
              Verification &amp; Proof
            </h2>
            <p className="text-[#A1A1AA] mb-8 max-w-2xl">
              Strategies that pass verification can produce public proof pages — independently
              accessible records of their validation history, live performance, and governance
              status. Traders can share verified track records with anyone.
            </p>

            <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1">Verification ladder</h3>
                <p className="text-sm text-[#71717A] leading-relaxed">
                  Strategies progress through verification levels — from initial submission through
                  baseline validation to full live monitoring. Each level requires passing specific
                  statistical thresholds.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1">Public proof pages</h3>
                <p className="text-sm text-[#71717A] leading-relaxed">
                  Verified strategies generate structured proof reports showing backtest scores,
                  Monte Carlo analysis, live metrics, and governance history. Share with prop firms,
                  investors, or the public.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1">Strategy discovery</h3>
                <p className="text-sm text-[#71717A] leading-relaxed">
                  Public strategies are listed on the{" "}
                  <Link href="/strategies" className="text-[#6366F1] hover:underline">
                    strategy discovery page
                  </Link>
                  , where anyone can browse verified track records and inspect the evidence.
                </p>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              6. STRATEGY INPUTS
              ════════════════════════════════════════════════════════ */}
          <section className="mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA] mb-4">
              How Strategies Enter AlgoStudio
            </h2>
            <p className="text-[#A1A1AA] mb-8 max-w-2xl">
              AlgoStudio accepts strategies through multiple input methods. Connect your existing
              strategy or upload trade history to begin monitoring.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">Broker connection</h3>
                <p className="text-sm text-[#71717A] leading-relaxed">
                  Connect your trading account to stream live performance data directly into
                  AlgoStudio for continuous monitoring.
                </p>
              </div>
              <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6">
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-2">Trade history upload</h3>
                <p className="text-sm text-[#71717A] leading-relaxed">
                  Upload backtest results or trade history files for statistical evaluation and
                  verification scoring.
                </p>
              </div>
              <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-[#FAFAFA]">EA Builder</h3>
                  <span className="text-[10px] font-medium text-[#71717A] border border-[rgba(255,255,255,0.06)] rounded px-1.5 py-0.5">
                    Optional
                  </span>
                </div>
                <p className="text-sm text-[#71717A] leading-relaxed">
                  Build a strategy using the built-in EA builder and export MQL5 code. This is one
                  input method — not the core of the platform.
                </p>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              FAQ (inline, design system tokens)
              ════════════════════════════════════════════════════════ */}
          <section className="mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA] mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-[#FAFAFA] font-medium text-sm list-none">
                    {item.q}
                    <svg
                      className="w-5 h-5 text-[#71717A] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
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
                  <div className="px-6 pb-4 text-sm text-[#A1A1AA] leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              DISCLAIMER
              ════════════════════════════════════════════════════════ */}
          <section className="mb-20">
            <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-amber-300/80 leading-relaxed">
                <strong>Disclaimer:</strong> AlgoStudio is not affiliated with any prop firm
                mentioned on this page. Prop firm rules and requirements may change — always verify
                current rules on each firm&apos;s official website. AlgoStudio does not guarantee
                passing any challenge. Trading involves substantial risk of loss.
              </p>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              7. FINAL CTA
              ════════════════════════════════════════════════════════ */}
          <section className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111114] p-8 sm:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA] mb-4">
              Monitor your prop firm strategies with AlgoStudio.
            </h2>
            <p className="text-[#A1A1AA] mb-8 max-w-xl mx-auto">
              Continuous performance tracking, drawdown monitoring, and verified proof of strategy
              integrity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-block bg-[#6366F1] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#818CF8] transition-colors text-center"
              >
                Start monitoring
              </Link>
              <Link
                href="/pricing"
                className="inline-block px-8 py-3.5 border border-[rgba(255,255,255,0.10)] text-[#A1A1AA] font-medium rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors text-center"
              >
                View pricing
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
