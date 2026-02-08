import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "RSI EA Template | Free Mean Reversion Strategy for MetaTrader 5",
  description:
    "Free RSI mean reversion Expert Advisor template for MT5. Buy oversold, sell overbought with EMA trend filter, London session timing, and ATR-based risk management.",
  alternates: { canonical: "/templates/rsi-ea-template" },
  openGraph: {
    title: "RSI EA Template | Free Mean Reversion Strategy for MetaTrader 5",
    description:
      "Free RSI mean reversion Expert Advisor template for MT5. Buy oversold, sell overbought with EMA trend filter, London session timing, and ATR-based risk management.",
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
    a: "Mean reversion assumes that price tends to return to its average after extreme moves. When RSI shows oversold conditions (below 30), it suggests price has moved too far down and is likely to bounce back. The opposite applies for overbought conditions (above 70).",
  },
  {
    q: "Why use a trend filter with RSI?",
    a: "RSI alone generates false signals in strong trends — price can stay oversold for a long time during a downtrend. The 50 EMA filter ensures you only buy in an uptrend (price above EMA) and only sell in a downtrend (price below EMA), dramatically reducing false signals.",
  },
  {
    q: "What RSI period should I use?",
    a: "The default 14-period RSI works well for most timeframes. Shorter periods (7–10) generate more signals but more noise. Longer periods (21–28) are smoother but slower. Test 10, 14, and 21 in the MT5 optimizer to find what works best for your pair and timeframe.",
  },
  {
    q: "Can I adjust the overbought/oversold levels?",
    a: "Yes. The default 30/70 levels are standard. Using 25/75 gives fewer but higher-quality signals, while 35/65 gives more signals with lower quality. Optimize these levels alongside the RSI period in backtesting.",
  },
  {
    q: "Which currency pairs work best for RSI strategies?",
    a: "Pairs that tend to range well: EURUSD, AUDUSD, and EURGBP. Avoid highly trending pairs like GBPJPY unless you have a strong trend filter. The RSI strategy thrives when price oscillates between support and resistance levels.",
  },
];

const parameters = [
  { name: "RSI Period", value: "14", type: "Indicator" },
  { name: "Oversold Level", value: "30", type: "Entry" },
  { name: "Overbought Level", value: "70", type: "Entry" },
  { name: "Trend Filter", value: "50 EMA", type: "Filter" },
  { name: "Session", value: "London (08:00–17:00 GMT)", type: "Timing" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Max Trades/Day", value: "3", type: "Risk" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
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

        {/* H1 + Intro */}
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            RSI Mean Reversion EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            This free EA template uses the RSI indicator to identify oversold and overbought
            conditions, combined with an EMA trend filter to avoid false signals. Designed for the
            London session where liquidity is highest, the strategy buys when the market is oversold
            in an uptrend and sells when overbought in a downtrend. Build it in AlgoStudio without
            coding and export a production-ready MQL5 Expert Advisor.
          </p>
        </header>

        {/* H2 – What Is RSI Mean Reversion? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            What Is RSI Mean Reversion Trading?
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              The RSI (Relative Strength Index) measures the speed and magnitude of recent price
              changes on a scale from 0 to 100. When RSI drops below 30, it means the market has
              been selling aggressively and is likely oversold — a potential bounce is coming. When
              RSI rises above 70, the market is overbought and likely due for a pullback.
            </p>
            <p>
              Mean reversion trading capitalizes on these extremes. Instead of following the trend
              like an MA crossover strategy, it bets that price will snap back toward its average
              after an extreme move. This approach tends to have a{" "}
              <strong className="text-white">higher win rate</strong> (50–60%) than trend-following
              strategies, but each individual winning trade is typically smaller.
            </p>
            <p>
              The critical ingredient is the trend filter. Without it, RSI will generate buy signals
              during strong downtrends (price keeps getting &ldquo;more oversold&rdquo;), leading to
              repeated losses. The 50 EMA filter ensures you only trade pullbacks within an
              established trend — buying oversold bounces in uptrends and selling overbought
              reversals in downtrends.
            </p>
          </div>
        </section>

        {/* H2 – How the Strategy Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How This EA Template Works</h2>
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 mb-6 space-y-3">
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
            <div>
              <span className="text-[#F59E0B] font-semibold text-sm">EXIT: </span>
              <span className="text-[#CBD5E1] text-sm">
                Stop loss at 1.5x ATR(14) or take profit at 2:1 risk-reward ratio
              </span>
            </div>
          </div>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              The London session filter restricts trading to 08:00–17:00 GMT, when major pairs have
              the tightest spreads and highest liquidity. The combination of RSI extremes, trend
              confirmation, and session timing creates high-probability setups with clearly defined
              risk.
            </p>
            <p>
              Unlike trend-following strategies that hold through extended moves, RSI mean reversion
              typically captures shorter pullback-to-mean moves. Trades are usually shorter in
              duration, which means more frequent entries and exits but with a higher win rate.
            </p>
          </div>
        </section>

        {/* H2 – Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults are optimized for EURUSD H1. All parameters are exported as{" "}
            <code className="text-[#A78BFA]">input</code> variables for MT5 Strategy Tester
            optimization.
          </p>
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

        {/* H2 – How to Build This EA */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            How to Build This EA Without Coding
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                1. Create a new project in AlgoStudio
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Sign up for free and create a new project. Name it &ldquo;RSI Mean Reversion&rdquo;
                and open the visual builder canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Set up timing and indicators
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add a Trading Sessions block and select the London session. Drag an RSI block
                (period 14, oversold 30, overbought 70) and a Moving Average block (EMA, period 50)
                as the trend filter. Connect them to define your entry conditions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Add trade execution and risk management
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add Place Buy and Place Sell blocks connected to your conditions. Add Stop Loss
                (1.5x ATR), Take Profit (2:1 R:R), position sizing (1% risk per trade), and Max
                Trades Per Day (3).
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Export the MQL5 file and backtest on EURUSD H1 with 2+ years of data. Optimize RSI
                period (test 10, 14, 21), oversold/overbought levels (test 25/75, 30/70, 35/65), and
                EMA period (test 30, 50, 100). Demo trade for 1–3 months before going live.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – RSI vs MA Crossover */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            RSI Mean Reversion vs MA Crossover: When to Use Which
          </h2>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 pr-4 text-[#94A3B8] font-medium"></th>
                  <th className="text-left py-3 px-4 text-[#22D3EE] font-medium">RSI Reversion</th>
                  <th className="text-left py-3 pl-4 text-[#A78BFA] font-medium">MA Crossover</th>
                </tr>
              </thead>
              <tbody className="text-[#CBD5E1]">
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Best market</td>
                  <td className="py-3 px-4">Range-bound / choppy</td>
                  <td className="py-3 pl-4">Trending / directional</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Win rate</td>
                  <td className="py-3 px-4">50–60%</td>
                  <td className="py-3 pl-4">35–45%</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Trade duration</td>
                  <td className="py-3 px-4">Shorter (hours)</td>
                  <td className="py-3 pl-4">Longer (hours to days)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-[#94A3B8]">Best for</td>
                  <td className="py-3 px-4">Traders who prefer high win rates</td>
                  <td className="py-3 pl-4">Traders who prefer big winners</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            Many traders run both strategies simultaneously on different pairs — RSI on range-bound
            pairs like EURGBP, and MA crossover on trending pairs like GBPUSD. AlgoStudio lets you
            build and export multiple EAs on the free plan.
          </p>
        </section>

        {/* FAQ */}
        <FAQSection questions={faqQuestions} />

        {/* Internal links */}
        <section className="mb-16 mt-16">
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/templates"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              All Templates
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/templates/moving-average-crossover-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              MA Crossover Template
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/templates/breakout-ea-template"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Breakout EA Template
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/blog/rsi-vs-macd-for-automated-trading"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              RSI vs MACD
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/no-code-mt5-ea-builder"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              No-Code EA Builder
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build the RSI Mean Reversion EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available — no credit card required."
      />
    </div>
  );
}
