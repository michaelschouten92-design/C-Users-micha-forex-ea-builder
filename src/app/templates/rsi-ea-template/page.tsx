import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "RSI EA Template — Free Mean Reversion Strategy for MT5",
  description:
    "Free RSI mean reversion Expert Advisor template for MetaTrader 5. Buy oversold, sell overbought with EMA trend filter and London session timing.",
  alternates: { canonical: "/templates/rsi-ea-template" },
  openGraph: {
    title: "RSI EA Template — Free Mean Reversion Strategy for MT5",
    description:
      "Free RSI mean reversion EA template. Pre-configured strategy with oversold/overbought levels and trend filter.",
    url: "/templates/rsi-ea-template",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "RSI EA Template", href: "/templates/rsi-ea-template" },
];

const faqQuestions = [
  {
    q: "What is a mean reversion strategy?",
    a: "Mean reversion assumes that price tends to return to its average. When RSI shows oversold conditions (below 30), it suggests price has moved too far down and is likely to bounce back up. The opposite applies for overbought conditions (above 70).",
  },
  {
    q: "Why use a trend filter with RSI?",
    a: "RSI alone can generate false signals in strong trends — price can stay oversold for a long time during a downtrend. The 50 EMA filter ensures you only buy in an uptrend (price above EMA) and only sell in a downtrend (price below EMA).",
  },
  {
    q: "What RSI period should I use?",
    a: "The default 14-period RSI works well for most timeframes. Shorter periods (7-10) generate more signals but more noise. Longer periods (21-28) are smoother but slower. Test 10, 14, and 21 in the MT5 optimizer.",
  },
  {
    q: "Can I adjust the overbought/oversold levels?",
    a: "Yes. The default 30/70 levels are standard, but 25/75 gives fewer but higher-quality signals, while 35/65 gives more signals with lower quality. Optimize these levels in backtesting.",
  },
  {
    q: "Which pairs work best for RSI strategies?",
    a: "Pairs that tend to range well: EURUSD, AUDUSD, and EURGBP. Avoid highly trending pairs like GBPJPY unless you add a strong trend filter.",
  },
];

const parameters = [
  { name: "RSI Period", value: "14", type: "Indicator" },
  { name: "Oversold Level", value: "30", type: "Entry" },
  { name: "Overbought Level", value: "70", type: "Entry" },
  { name: "Trend Filter", value: "50 EMA", type: "Filter" },
  { name: "Session", value: "London (08:00-17:00 GMT)", type: "Timing" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Max Trades/Day", value: "3", type: "Risk" },
  { name: "Position Sizing", value: "1% risk", type: "Risk" },
];

export default function RSIEATemplatePage() {
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
            RSI Mean Reversion EA Template
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            This template uses the RSI indicator to identify oversold and overbought conditions,
            combined with an EMA trend filter to avoid trading against the prevailing trend.
            Designed for the London session where liquidity is highest.
          </p>
        </header>

        {/* Strategy Explanation */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How the Strategy Works</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-4">
            The RSI (Relative Strength Index) measures the speed and magnitude of recent price
            changes on a scale from 0 to 100. When RSI drops below 30, it means the market has been
            selling aggressively and is likely oversold — a potential bounce is coming. The opposite
            applies when RSI rises above 70.
          </p>
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 mb-4 space-y-3">
            <div>
              <span className="text-[#10B981] font-semibold text-sm">BUY SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                RSI crosses below 30 AND price is above 50 EMA (uptrend confirmed)
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                RSI crosses above 70 AND price is below 50 EMA (downtrend confirmed)
              </span>
            </div>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            The EMA trend filter is critical. Without it, RSI will generate buy signals during
            strong downtrends (price keeps getting &ldquo;more oversold&rdquo;), leading to repeated
            losses. The filter ensures you only trade pullbacks within an established trend.
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
                desc: 'Sign up or log in and create a new project. Name it "RSI Mean Reversion".',
              },
              {
                step: "2",
                title: "Set up timing",
                desc: 'Add a Trading Sessions block and select "London Session" for the highest liquidity window.',
              },
              {
                step: "3",
                title: "Add RSI and EMA blocks",
                desc: "Drag an RSI block (period 14, oversold 30, overbought 70) and a Moving Average block (EMA, period 50).",
              },
              {
                step: "4",
                title: "Configure risk management",
                desc: "Add Stop Loss (1.5x ATR), Take Profit (2:1 R:R), and set position sizing to 1% risk per trade.",
              },
              {
                step: "5",
                title: "Export and backtest",
                desc: "Export MQL5, load in MetaTrader 5, and backtest on EURUSD H1 with 2+ years of data. Optimize RSI period and levels.",
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
                Trend-following strategy for trending markets.
              </p>
            </Link>
            <Link
              href="/templates/breakout-ea-template"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Breakout EA Template</h3>
              <p className="text-sm text-[#94A3B8]">Trade range breakouts at session opens.</p>
            </Link>
            <Link
              href="/blog/rsi-vs-macd-for-automated-trading"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">RSI vs MACD Comparison</h3>
              <p className="text-sm text-[#94A3B8]">Which indicator works better for EAs?</p>
            </Link>
            <Link
              href="/blog/best-indicators-for-forex-ea"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Best Indicators for EAs</h3>
              <p className="text-sm text-[#94A3B8]">
                Top 5 indicators for Expert Advisor development.
              </p>
            </Link>
          </div>
        </section>

        <FAQSection questions={faqQuestions} />
      </article>

      <CTASection
        title="Build this strategy in minutes"
        description="Create the RSI Mean Reversion EA with AlgoStudio's visual builder. Free to start."
      />
    </div>
  );
}
