import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Moving Average Crossover EA Template — Free MT5 Strategy",
  description:
    "Free Moving Average crossover Expert Advisor template for MetaTrader 5. Pre-configured with 10/50 EMA crossover, ATR-based stops, and London session timing.",
  alternates: { canonical: "/templates/moving-average-crossover-ea" },
  openGraph: {
    title: "Moving Average Crossover EA Template — Free MT5 Strategy",
    description:
      "Free MA crossover EA template. Pre-configured trend-following strategy ready to customize and export.",
    url: "/templates/moving-average-crossover-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "MA Crossover EA", href: "/templates/moving-average-crossover-ea" },
];

const faqQuestions = [
  {
    q: "What timeframe works best for the MA crossover strategy?",
    a: "H1 (1-hour) and H4 (4-hour) timeframes produce the best results. Lower timeframes generate too many false signals, while daily charts produce very few trades.",
  },
  {
    q: "Which currency pairs work best?",
    a: "Major pairs that trend well: EURUSD, GBPUSD, and USDJPY. Avoid range-bound pairs like EURGBP and exotic pairs with wide spreads.",
  },
  {
    q: "Should I use SMA or EMA?",
    a: "EMA (Exponential Moving Average) is recommended for crossover strategies because it responds faster to price changes. SMA gives smoother but slower signals.",
  },
  {
    q: "What win rate should I expect?",
    a: "A well-optimized MA crossover typically wins 35-45% of trades. The strategy is profitable because winning trades are larger than losers (using 1:2 risk-reward).",
  },
  {
    q: "Can I add more indicators to this template?",
    a: "Yes. Common additions include an ADX filter (only trade when ADX > 25) and RSI filter (don't buy when RSI > 70). Keep it simple — 2-3 indicators total is the sweet spot.",
  },
];

const parameters = [
  { name: "Fast MA Period", value: "10", type: "EMA" },
  { name: "Slow MA Period", value: "50", type: "EMA" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Session", value: "London (08:00-17:00 GMT)", type: "Timing" },
  { name: "Max Trades/Day", value: "3", type: "Risk" },
  { name: "Position Sizing", value: "1% risk", type: "Risk" },
];

export default function MovingAverageCrossoverTemplatePage() {
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
            Moving Average Crossover EA Template
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The Moving Average crossover is the most popular trend-following strategy in forex. This
            template uses a fast 10 EMA and slow 50 EMA crossover with ATR-based risk management,
            optimized for the London session.
          </p>
        </header>

        {/* Strategy Explanation */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How the Strategy Works</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-4">
            The Moving Average crossover identifies trend changes by comparing two moving averages
            with different periods. When the fast MA (which reacts quickly to price) crosses above
            the slow MA (which shows the longer-term trend), it signals that a new uptrend may be
            starting.
          </p>
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 mb-4 space-y-3">
            <div>
              <span className="text-[#10B981] font-semibold text-sm">BUY SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Fast EMA (10) crosses above Slow EMA (50)
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Fast EMA (10) crosses below Slow EMA (50)
              </span>
            </div>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            The strategy performs best in trending markets with clear directional moves. It
            underperforms in choppy, sideways conditions — adding an ADX filter can help avoid these
            periods.
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
                desc: 'Sign up or log in and click "New Project". Name it "MA Crossover Strategy".',
              },
              {
                step: "2",
                title: "Add a Trading Sessions block",
                desc: 'Drag a Trading Sessions block and select "London Session" (08:00-17:00 GMT).',
              },
              {
                step: "3",
                title: "Add two Moving Average blocks",
                desc: "Set one to EMA period 10 (fast) and the other to EMA period 50 (slow). Connect both to the timing block.",
              },
              {
                step: "4",
                title: "Add trade execution and risk management",
                desc: "Add Place Buy and Place Sell blocks. Connect Stop Loss (1.5x ATR) and Take Profit (2:1 R:R) blocks.",
              },
              {
                step: "5",
                title: "Export, backtest, and optimize",
                desc: "Export to MQL5, backtest on EURUSD H1 with 2+ years of data. Optimize MA periods in the MT5 Strategy Tester.",
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
              href="/templates/rsi-ea-template"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">RSI EA Template</h3>
              <p className="text-sm text-[#94A3B8]">
                Mean reversion strategy for range-bound markets.
              </p>
            </Link>
            <Link
              href="/templates/breakout-ea-template"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Breakout EA Template</h3>
              <p className="text-sm text-[#94A3B8]">
                Trade Asian range breakouts at the London open.
              </p>
            </Link>
            <Link
              href="/blog/moving-average-crossover-strategy"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">MA Crossover Deep Dive</h3>
              <p className="text-sm text-[#94A3B8]">
                Full guide on building and optimizing MA strategies.
              </p>
            </Link>
            <Link
              href="/blog/best-indicators-for-forex-ea"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Best Indicators for EAs</h3>
              <p className="text-sm text-[#94A3B8]">
                Which indicators to add for better performance.
              </p>
            </Link>
          </div>
        </section>

        <FAQSection questions={faqQuestions} />
      </article>

      <CTASection
        title="Build this strategy in minutes"
        description="Create the MA Crossover EA with AlgoStudio's visual builder. Free to start."
      />
    </div>
  );
}
