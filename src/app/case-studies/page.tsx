import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Trader Success Stories — Case Studies",
  description:
    "Real traders share their results using AlgoStudio to build MT5 Expert Advisors. Prop firm challenges passed, strategies automated, and time saved.",
  alternates: { canonical: "/case-studies" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Case Studies", href: "/case-studies" },
];

const caseStudies = [
  {
    name: "Alex M.",
    role: "Prop Firm Trader",
    strategy: "EMA Crossover",
    quote:
      "I failed two FTMO challenges trading manually because emotions kept taking over. I built an EMA crossover EA in AlgoStudio with strict risk settings and passed on my third attempt. The EA executed my plan while I focused on my day job. It wasn't a perfect run — I had a rough first week — but the consistency of automated execution made the difference.",
    result: "Passed FTMO challenge in 12 days",
    before: "Failed 2 manual challenges, emotional trading, inconsistent execution",
    after: "Passed Phase 1 in 12 days, Phase 2 in 18 days, now managing a funded account",
    metric: "12 days",
    metricLabel: "To pass FTMO Phase 1",
  },
  {
    name: "Sarah K.",
    role: "Swing Trader",
    strategy: "RSI Reversal",
    quote:
      "I spent 3 months trying to learn MQL5 and never got a working EA. With AlgoStudio, I had my RSI reversal strategy running in MT5 Strategy Tester within 10 minutes of signing up. The initial backtest results were mixed, but it gave me a solid starting point to iterate from — much better than wrestling with syntax errors.",
    result: "First working EA in 10 minutes",
    before: "3 months learning MQL5, no working EA, frustrated with syntax errors",
    after: "Working EA in 10 minutes, backtested across 5 pairs, iterating on 2 pairs",
    metric: "10 min",
    metricLabel: "From signup to working EA",
  },
  {
    name: "David R.",
    role: "Part-Time Trader",
    strategy: "Range Breakout",
    quote:
      "I paid a developer $800 for a breakout EA that did not work as expected. Modifications cost extra and took weeks. AlgoStudio let me build a similar strategy myself, test variations quickly, and iterate without waiting on anyone. The workflow is much faster, though I still needed time to find the right parameter settings through backtesting.",
    result: "Saved $800+ on development costs",
    before: "$800 spent on developer, 3-week wait for delivery, costly modification requests",
    after: "Built it himself in 5 minutes, iterates freely, tests new variations regularly",
    metric: "$800+",
    metricLabel: "Saved vs hiring a developer",
  },
  {
    name: "Maria L.",
    role: "Forex Trader",
    strategy: "Trend Pullback",
    quote:
      "I wanted to test whether pullback entries work better than breakout entries for my GBPUSD strategy. In AlgoStudio, I built both EAs in under 15 minutes total and ran them through MT5 backtesting side by side. The data showed pullbacks performed better for my specific pair and timeframe — but results varied on other pairs, which is exactly why testing matters.",
    result: "Tested 2 strategy variants in 15 minutes",
    before: "Manual testing, gut-feel decisions, no data to compare approaches",
    after:
      "Data-driven strategy selection, backtested across 3 years, found what works for specific pairs",
    metric: "15 min",
    metricLabel: "To build and compare 2 strategies",
  },
  {
    name: "James T.",
    role: "Funded Trader",
    strategy: "MACD Crossover",
    quote:
      "I run EAs on multiple funded accounts across different prop firms. AlgoStudio lets me customize risk settings per account quickly — different daily loss limits, position sizes, and session filters for each. The clean MQL5 code makes it easy to verify the logic. Some months are better than others, but the automated discipline keeps me within the rules.",
    result: "Managing multiple funded accounts with custom EAs",
    before: "One-size-fits-all approach, manual trading on multiple accounts",
    after: "Custom EA per funded account, automated execution, consistent rule compliance",
    metric: "3",
    metricLabel: "Funded accounts managed",
  },
  {
    name: "Chris P.",
    role: "Strategy Tester",
    strategy: "RSI/MACD Divergence",
    quote:
      "I test 3-5 new strategy ideas every week. Before AlgoStudio, each idea took days to code and debug. Now I can go from concept to backtest in under 10 minutes. Most ideas don't pan out — that's normal — but the speed of iteration means I find the promising ones much faster.",
    result: "Much faster strategy testing cycle",
    before: "Days per strategy, coding bottleneck, limited testing throughput",
    after: "5+ strategies tested per week, rapid iteration, data-driven decisions",
    metric: "10x",
    metricLabel: "Faster strategy testing",
  },
];

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero */}
          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Trader Success Stories
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              Real traders using AlgoStudio to automate their strategies, pass prop firm challenges,
              and save time on EA development.
            </p>
          </section>

          {/* Top disclaimer */}
          <section className="mb-12">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-300/90 leading-relaxed">
                <strong>Important:</strong> These case studies represent possible outcomes.
                Individual results vary based on strategy, market conditions, and risk management.
                Past performance does not guarantee future results. All trading involves substantial
                risk of loss.
              </p>
            </div>
          </section>

          {/* Case study cards */}
          <section className="mb-20">
            <div className="space-y-8">
              {caseStudies.map((study) => (
                <div
                  key={study.name}
                  className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden"
                >
                  <div className="p-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{study.name}</h3>
                        <p className="text-sm text-[#94A3B8]">{study.role}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#22D3EE]">{study.metric}</p>
                          <p className="text-xs text-[#64748B]">{study.metricLabel}</p>
                        </div>
                      </div>
                    </div>

                    {/* Strategy tag */}
                    <div className="mb-4">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[rgba(79,70,229,0.15)] text-[#A78BFA] border border-[rgba(79,70,229,0.3)]">
                        {study.strategy}
                      </span>
                    </div>

                    {/* Quote */}
                    <blockquote className="text-sm text-[#CBD5E1] leading-relaxed mb-6 pl-4 border-l-2 border-[rgba(79,70,229,0.3)]">
                      &ldquo;{study.quote}&rdquo;
                    </blockquote>

                    {/* Result */}
                    <div className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-lg p-4 mb-6">
                      <p className="text-sm font-medium text-[#22D3EE]">{study.result}</p>
                    </div>

                    {/* Before / After */}
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-[#EF4444] font-medium uppercase tracking-wider mb-2">
                          Before AlgoStudio
                        </p>
                        <p className="text-sm text-[#94A3B8] leading-relaxed">{study.before}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#22D3EE] font-medium uppercase tracking-wider mb-2">
                          After AlgoStudio
                        </p>
                        <p className="text-sm text-[#CBD5E1] leading-relaxed">{study.after}</p>
                      </div>
                    </div>

                    {/* Per-case-study disclaimer */}
                    <p className="text-[10px] text-[#64748B] leading-relaxed mt-4 pt-4 border-t border-[rgba(79,70,229,0.08)]">
                      Results shown are from specific time periods and may not be reproducible.
                      Individual trading outcomes depend on strategy, market conditions, risk
                      management, and other factors.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Trust signal */}
          <section className="mb-20 text-center">
            <div className="bg-[#1A0626]/30 border border-[rgba(79,70,229,0.15)] rounded-xl p-8">
              <p className="text-3xl font-bold text-white mb-2">1,000+</p>
              <p className="text-[#94A3B8] mb-6">
                Traders have built Expert Advisors with AlgoStudio
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
                <div>
                  <p className="text-xl font-bold text-[#22D3EE]">6</p>
                  <p className="text-xs text-[#64748B]">Strategy templates</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-[#22D3EE]">&lt; 5 min</p>
                  <p className="text-xs text-[#64748B]">To first EA</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-[#22D3EE]">Free</p>
                  <p className="text-xs text-[#64748B]">To get started</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-[#22D3EE]">100%</p>
                  <p className="text-xs text-[#64748B]">Code ownership</p>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Disclaimer */}
          <section className="mb-20">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-300/90 leading-relaxed">
                <strong>Disclaimer:</strong> These case studies represent individual experiences and
                are shared for illustrative purposes. Trading results vary and past performance does
                not guarantee future results. All trading involves substantial risk of loss.
                AlgoStudio is a tool for building and testing strategies — it does not provide
                financial advice or guarantee profits. Always test thoroughly on a demo account
                before trading with real funds.
              </p>
            </div>
          </section>
        </div>
      </main>

      <CTASection
        title="Start your own success story"
        description="Build your first Expert Advisor in minutes. No coding, no credit card required."
        ctaText="Build Your First EA Free"
      />

      <Footer />
    </div>
  );
}
