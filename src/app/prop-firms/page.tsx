import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Prop Firm EA Builder — Pass Funded Challenges",
  description:
    "Build Expert Advisors configured for prop firm challenges. Pre-set daily loss limits, drawdown protection, and risk settings for FTMO, MyForexFunds, The Funded Trader, and more.",
  alternates: { canonical: "/prop-firms" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Prop Firms", href: "/prop-firms" },
];

const propFirms = [
  {
    name: "FTMO",
    dailyLoss: "5%",
    maxDrawdown: "10%",
    profitTarget: "10% (Phase 1) / 5% (Phase 2)",
    timeLimit: "30 days per phase",
    recommended: {
      riskPerTrade: "0.5%",
      dailyCap: "3%",
      maxTrades: "2",
      strategy: "EMA Crossover or Trend Pullback",
    },
  },
  {
    name: "MyForexFunds",
    dailyLoss: "5%",
    maxDrawdown: "12%",
    profitTarget: "8%",
    timeLimit: "30 days",
    recommended: {
      riskPerTrade: "0.75%",
      dailyCap: "3.5%",
      maxTrades: "3",
      strategy: "EMA Crossover or MACD Crossover",
    },
  },
  {
    name: "The Funded Trader",
    dailyLoss: "5%",
    maxDrawdown: "10%",
    profitTarget: "10% (Phase 1) / 5% (Phase 2)",
    timeLimit: "35 days per phase",
    recommended: {
      riskPerTrade: "0.5%",
      dailyCap: "3%",
      maxTrades: "2",
      strategy: "Trend Pullback or Range Breakout",
    },
  },
  {
    name: "Funded Next",
    dailyLoss: "5%",
    maxDrawdown: "10%",
    profitTarget: "10% (Phase 1) / 5% (Phase 2)",
    timeLimit: "30 days per phase",
    recommended: {
      riskPerTrade: "0.5%",
      dailyCap: "3%",
      maxTrades: "2",
      strategy: "EMA Crossover or Trend Pullback",
    },
  },
  {
    name: "True Forex Funds",
    dailyLoss: "5%",
    maxDrawdown: "10%",
    profitTarget: "8% (Phase 1) / 5% (Phase 2)",
    timeLimit: "30 days per phase",
    recommended: {
      riskPerTrade: "0.5%",
      dailyCap: "3%",
      maxTrades: "2",
      strategy: "EMA Crossover or RSI Reversal",
    },
  },
];

const features = [
  {
    title: "Daily P&L Limits",
    description:
      "Set a hard daily loss cap in your EA. When the limit is reached, the EA stops trading for the rest of the day — preventing you from breaching the firm's daily loss rule.",
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
    title: "Maximum Drawdown Protection",
    description:
      "Built-in equity monitoring stops all trading if your account approaches the maximum drawdown limit. Configurable threshold with safety buffer.",
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
    title: "News Filter",
    description:
      "Automatically stop trading before and after high-impact news events. NFP, FOMC, and ECB decisions can cause extreme volatility that blows through stop losses.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
      />
    ),
  },
  {
    title: "Risk-Per-Trade Management",
    description:
      "Position sizing calculated from account equity and stop loss distance. Your EA automatically adjusts lot sizes to risk exactly the configured percentage per trade.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    ),
  },
];

const faqItems = [
  {
    q: "Do prop firms allow Expert Advisors?",
    a: "Most major prop firms allow EAs. FTMO, MyForexFunds, The Funded Trader, Funded Next, and True Forex Funds all permit automated trading. Always check the specific firm's rules before deploying, as some have restrictions on certain trading styles (e.g., high-frequency trading or arbitrage).",
  },
  {
    q: "What is the best strategy for prop firm challenges?",
    a: "Trend-following strategies (EMA Crossover, Trend Pullback) tend to perform best because they produce larger winning trades relative to their stop losses. Combined with strict risk management (0.5% risk per trade, daily loss cap at 3%), these strategies can reach profit targets while staying well within drawdown limits.",
  },
  {
    q: "How do I avoid blowing a prop firm challenge?",
    a: "The three most common reasons for failure are: risking too much per trade (use 0.5%), not having a daily loss cap (set it at 3%), and trading during high-impact news events (use a news filter). AlgoStudio lets you configure all three as built-in settings.",
  },
  {
    q: "Should I use the same EA for Phase 1 and Phase 2?",
    a: "Yes, but adjust the risk settings. Phase 2 typically has a lower profit target (5% vs 10%), so you can use slightly more conservative settings — lower risk per trade or fewer max trades per day. The strategy logic should remain the same.",
  },
  {
    q: "Can I use AlgoStudio EAs on funded accounts after passing?",
    a: "Yes. Once you pass the challenge, you can use the same EA on your funded account. The exported MQL5 code works identically on challenge and funded accounts. Many traders reduce risk slightly on funded accounts for more consistent long-term performance.",
  },
  {
    q: "How long does it take to build a prop firm EA?",
    a: "In AlgoStudio, you can build a prop-firm-ready EA in under 5 minutes. Choose a strategy template, configure the risk settings for your target prop firm, and export. Then backtest in the MT5 Strategy Tester before deploying on your challenge account.",
  },
];

export default function PropFirmsPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          {/* Hero */}
          <section className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
              <span className="text-xs text-[#A78BFA] font-medium">
                Built-in prop firm compliance settings
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Build EAs That Pass
              <br />
              <span className="text-[#A78BFA]">Prop Firm Challenges</span>
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              Configure your Expert Advisor with the exact risk settings, drawdown limits, and daily
              loss caps required by top prop firms. Built-in compliance, not afterthought settings.
            </p>
            <Link
              href="/login?mode=register"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Building Your Prop Firm EA
            </Link>
          </section>

          {/* Supported prop firms */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Configured for Top Prop Firms
            </h2>
            <p className="text-[#94A3B8] text-center mb-10 max-w-2xl mx-auto">
              Each prop firm has unique rules. Here are the challenge requirements and our
              recommended EA settings for each.
            </p>

            <div className="space-y-6">
              {propFirms.map((firm) => (
                <div
                  key={firm.name}
                  className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl overflow-hidden"
                >
                  <div className="p-6 sm:p-8">
                    <h3 className="text-xl font-bold text-white mb-6">{firm.name}</h3>

                    {/* Rules */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-[#0D0117]/50 rounded-lg p-3">
                        <p className="text-xs text-[#64748B] mb-1">Daily Loss Limit</p>
                        <p className="text-sm font-semibold text-[#EF4444]">{firm.dailyLoss}</p>
                      </div>
                      <div className="bg-[#0D0117]/50 rounded-lg p-3">
                        <p className="text-xs text-[#64748B] mb-1">Max Drawdown</p>
                        <p className="text-sm font-semibold text-[#EF4444]">{firm.maxDrawdown}</p>
                      </div>
                      <div className="bg-[#0D0117]/50 rounded-lg p-3">
                        <p className="text-xs text-[#64748B] mb-1">Profit Target</p>
                        <p className="text-sm font-semibold text-[#22D3EE]">{firm.profitTarget}</p>
                      </div>
                      <div className="bg-[#0D0117]/50 rounded-lg p-3">
                        <p className="text-xs text-[#64748B] mb-1">Time Limit</p>
                        <p className="text-sm font-semibold text-[#94A3B8]">{firm.timeLimit}</p>
                      </div>
                    </div>

                    {/* Recommended settings */}
                    <div className="border-t border-[rgba(79,70,229,0.1)] pt-6">
                      <p className="text-xs text-[#A78BFA] font-medium uppercase tracking-wider mb-3">
                        Recommended AlgoStudio Settings
                      </p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-[#64748B]">Risk Per Trade</p>
                          <p className="text-sm text-[#CBD5E1] font-medium">
                            {firm.recommended.riskPerTrade}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#64748B]">Daily Loss Cap</p>
                          <p className="text-sm text-[#CBD5E1] font-medium">
                            {firm.recommended.dailyCap}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#64748B]">Max Open Trades</p>
                          <p className="text-sm text-[#CBD5E1] font-medium">
                            {firm.recommended.maxTrades}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#64748B]">Best Strategy</p>
                          <p className="text-sm text-[#CBD5E1] font-medium">
                            {firm.recommended.strategy}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Use template button */}
                    <div className="mt-6">
                      <Link
                        href="/login?mode=register"
                        className="text-sm text-[#A78BFA] font-medium hover:underline"
                      >
                        Use Template for {firm.name} &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Feature highlights */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Built-In Prop Firm Safety Features
            </h2>
            <p className="text-[#94A3B8] text-center mb-10 max-w-2xl mx-auto">
              Every AlgoStudio EA includes these prop-firm-critical features. No manual coding or
              add-ons required.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6"
                >
                  <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-5 h-5 text-[#A78BFA]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {feature.icon}
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-10 text-center">
              Build Your Prop Firm EA in 3 Steps
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  1
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">Choose a Strategy</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Pick from 6 proven templates. EMA Crossover and Trend Pullback are the most
                  popular for prop firm challenges.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  2
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">Set Prop Firm Risk Rules</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Configure risk per trade, daily loss cap, max drawdown, and session filters to
                  match your prop firm&apos;s rules.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  3
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">Export &amp; Backtest</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Export clean MQL5 code, backtest in MT5 Strategy Tester with the prop firm
                  constraints, and deploy when ready.
                </p>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="mb-10">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-300/90 leading-relaxed">
                <strong>Disclaimer:</strong> AlgoStudio is not affiliated with any prop firm
                mentioned on this page. Prop firm rules and requirements may change — always verify
                the current rules on each firm&apos;s official website before starting a challenge.
                AlgoStudio does not guarantee passing any challenge. Trading involves substantial
                risk of loss. Always backtest thoroughly before deploying on a live challenge
                account.
              </p>
            </div>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Start Building Your Prop Firm EA"
        description="Configure risk settings for any prop firm in minutes. Free to start, no credit card required."
        ctaText="Build Your EA Free"
      />

      <Footer />
    </div>
  );
}
