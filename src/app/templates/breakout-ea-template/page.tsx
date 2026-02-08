import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Breakout EA Template — Free Asian Range Breakout Strategy for MT5",
  description:
    "Free breakout Expert Advisor template for MetaTrader 5. Trade the Asian session range breakout at the London open with ATR-based stops and 1.5:1 risk-reward.",
  alternates: { canonical: "/templates/breakout-ea-template" },
  openGraph: {
    title: "Breakout EA Template — Free Asian Range Breakout Strategy for MT5",
    description:
      "Free breakout EA template. Trade Asian range breakouts with ATR-based risk management.",
    url: "/templates/breakout-ea-template",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "Breakout EA Template", href: "/templates/breakout-ea-template" },
];

const faqQuestions = [
  {
    q: "What is the Asian range?",
    a: "The Asian range is the price range formed during the Tokyo trading session (approximately 00:00-08:00 GMT). During this quiet session, price typically consolidates in a narrow range. When the London session opens, increased volume often causes a breakout from this range.",
  },
  {
    q: "Why trade the Asian range breakout?",
    a: "It's one of the most well-documented patterns in forex. The transition from low-volatility (Asia) to high-volatility (London) creates predictable breakout opportunities. The tight Asian range provides clear stop loss levels.",
  },
  {
    q: "What if the breakout is a false breakout?",
    a: "False breakouts happen. The ATR-based stop loss is placed inside the Asian range to protect you. The 1.5:1 risk-reward ratio means you only need to win about 40% of trades to be profitable.",
  },
  {
    q: "Can I use this on pairs other than EURUSD?",
    a: "Yes, but results vary. GBPUSD and EURUSD work best because they're most active during the London session. USDJPY can also work but is more active during Tokyo. Always backtest on each pair individually.",
  },
  {
    q: "What timeframe should I use?",
    a: "M15 (15-minute) or M30 (30-minute) work best for this strategy. These timeframes give enough granularity to catch the breakout while filtering out noise.",
  },
];

const parameters = [
  { name: "Range Session", value: "Asian (00:00-08:00 GMT)", type: "Timing" },
  { name: "Breakout Session", value: "London Open (08:00-12:00 GMT)", type: "Timing" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "1.5:1 R:R", type: "Risk-reward" },
  { name: "Min Range Size", value: "20 pips", type: "Filter" },
  { name: "Max Range Size", value: "80 pips", type: "Filter" },
  { name: "Max Trades/Day", value: "1", type: "Risk" },
  { name: "Position Sizing", value: "1% risk", type: "Risk" },
];

export default function BreakoutEATemplatePage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <SiteNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqQuestions)) }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#10B981] font-medium">FREE TEMPLATE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Breakout EA Template
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Trade the Asian session range breakout at the London open — one of the most reliable
            patterns in forex. This template identifies the overnight consolidation range and enters
            when price breaks out with momentum at the start of the London session.
          </p>
        </header>

        {/* Strategy Explanation */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How the Strategy Works</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-4">
            During the Asian session (Tokyo), the forex market is relatively quiet. Price
            consolidates in a narrow range as volume is lower. When the London session opens at
            08:00 GMT, European traders enter the market and volume surges. This often pushes price
            out of the Asian range, creating a breakout.
          </p>
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 mb-4 space-y-3">
            <div>
              <span className="text-[#10B981] font-semibold text-sm">BUY SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Price breaks above the Asian range high after 08:00 GMT
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Price breaks below the Asian range low after 08:00 GMT
              </span>
            </div>
            <div>
              <span className="text-[#F59E0B] font-semibold text-sm">FILTER: </span>
              <span className="text-[#CBD5E1] text-sm">
                Only trade if range is between 20-80 pips (too narrow = no conviction, too wide =
                stop too far)
              </span>
            </div>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            The strategy limits to one trade per day. Once the breakout is traded (win or loss), the
            EA waits for the next Asian session to form a new range.
          </p>
        </section>

        {/* Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 pr-4 text-[#94A3B8] font-medium">Parameter</th>
                  <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Value</th>
                  <th className="text-left py-3 pl-4 text-[#94A3B8] font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="text-[#CBD5E1]">
                {parameters.map((param) => (
                  <tr key={param.name} className="border-b border-[rgba(79,70,229,0.1)]">
                    <td className="py-3 pr-4 font-medium">{param.name}</td>
                    <td className="py-3 px-4 text-[#A78BFA]">{param.value}</td>
                    <td className="py-3 pl-4 text-[#64748B]">{param.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How to Use */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How to Use This Template</h2>
          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Create a new project in AlgoStudio",
                desc: 'Sign up or log in and create a new project. Name it "Asian Range Breakout".',
              },
              {
                step: "2",
                title: "Set up the range detection",
                desc: "Add a Range Breakout block and configure it for the Asian session (00:00-08:00 GMT). Set min range to 20 pips and max to 80 pips.",
              },
              {
                step: "3",
                title: "Set the breakout window",
                desc: "Add a Custom Times block for the London open window (08:00-12:00 GMT). This limits breakout entries to the first 4 hours of London.",
              },
              {
                step: "4",
                title: "Configure risk management",
                desc: "Add Stop Loss (1.5x ATR) placed inside the Asian range, Take Profit at 1.5:1 R:R, and set Max Trades Per Day to 1.",
              },
              {
                step: "5",
                title: "Export and backtest",
                desc: "Export to MQL5, backtest on EURUSD M15 with 2+ years of data. Optimize range filters and timing in the MT5 Strategy Tester.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Related */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Related Resources</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/templates/moving-average-crossover-ea"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">MA Crossover Template</h3>
              <p className="text-sm text-[#94A3B8]">
                Trend-following with moving average crossovers.
              </p>
            </Link>
            <Link
              href="/templates/rsi-ea-template"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">RSI EA Template</h3>
              <p className="text-sm text-[#94A3B8]">Mean reversion with RSI overbought/oversold.</p>
            </Link>
            <Link
              href="/blog/forex-trading-sessions-explained"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Trading Sessions Guide</h3>
              <p className="text-sm text-[#94A3B8]">
                Understand session timing for better EA performance.
              </p>
            </Link>
            <Link
              href="/blog/from-trading-idea-to-automated-ea"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">From Idea to EA</h3>
              <p className="text-sm text-[#94A3B8]">
                Complete workflow for building and deploying EAs.
              </p>
            </Link>
          </div>
        </section>

        <FAQSection questions={faqQuestions} />
      </article>

      <CTASection
        title="Build this strategy in minutes"
        description="Create the Breakout EA with AlgoStudio's visual builder. Free to start."
      />
    </div>
  );
}
