import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "RSI Reversal EA Template | Free MT5 Mean Reversion Strategy",
  description:
    "Free RSI Reversal Expert Advisor template for MetaTrader 5. Buy oversold, sell overbought with RSI 14, ATR stops, and optional trend filter. Build without coding.",
  alternates: { canonical: "/templates/rsi-reversal-ea" },
  openGraph: {
    title: "RSI Reversal EA Template | Free MT5 Mean Reversion Strategy",
    description:
      "Free RSI Reversal Expert Advisor template for MetaTrader 5. Buy oversold, sell overbought with RSI 14, ATR stops, and optional trend filter. Build without coding.",
    url: "/templates/rsi-reversal-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "RSI Reversal EA", href: "/templates/rsi-reversal-ea" },
];

const faqQuestions = [
  {
    q: "What RSI period works best for mean reversion?",
    a: "RSI 14 is the standard and most reliable period. Shorter periods (7-10) generate more signals but more false ones. Longer periods (21-28) produce fewer but higher-quality signals. Start with 14 and only change it after thorough backtesting across multiple pairs and timeframes.",
  },
  {
    q: "Should I use 70/30 or 80/20 for overbought/oversold levels?",
    a: "70/30 is the default and produces more trades. 80/20 produces fewer but higher-probability reversal signals because the market is at a more extreme level. In trending markets, use 80/20 to avoid counter-trend entries. In ranging markets, 70/30 works well.",
  },
  {
    q: "Does the RSI Reversal strategy work in trending markets?",
    a: "It struggles in strong trends because the RSI can stay overbought or oversold for extended periods. The optional 200 EMA trend filter helps: it only takes buy signals when price is above the EMA (uptrend) and sell signals when below. This prevents you from fighting the dominant trend.",
  },
  {
    q: "What timeframe is best for RSI Reversal trading?",
    a: "M15 to H1 timeframes work best. M15 gives more frequent signals for active traders. H1 provides cleaner signals with less noise. Avoid M1 and M5 where RSI signals are unreliable due to market noise, and D1 where signals are too infrequent for most traders.",
  },
  {
    q: "What win rate should I expect from an RSI Reversal EA?",
    a: "A well-tuned RSI Reversal EA typically wins 50-60% of trades in ranging markets. The key is the risk-reward ratio: with a 1.5:1 target, even a 45% win rate is profitable. Expect lower win rates (35-40%) during trending periods, which is why the trend filter is important.",
  },
];

const parameters = [
  { name: "RSI Period", value: "14", type: "Indicator" },
  { name: "Overbought Level", value: "70", type: "Threshold" },
  { name: "Oversold Level", value: "30", type: "Threshold" },
  { name: "Stop Loss", value: "1.2x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "1.5:1 R:R", type: "Risk-reward" },
  { name: "Trend Filter (EMA)", value: "200 (optional)", type: "Filter" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function RSIReversalTemplatePage() {
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
            RSI Reversal EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The RSI Reversal is a classic mean reversion strategy that buys when the market is
            oversold and sells when it is overbought. This free EA template uses RSI(14) with
            standard 70/30 levels, ATR-based risk management, and an optional 200 EMA trend filter.
            Best for ranging markets on EURUSD, GBPUSD, and AUDNZD across M15 to H1 timeframes.
            Build it in AlgoStudio without coding, customize the parameters, and export a
            production-ready MQL5 Expert Advisor in minutes.
          </p>
        </header>

        {/* H2 -- What Is an RSI Reversal Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What Is an RSI Reversal Strategy?</h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              The Relative Strength Index (RSI) measures the speed and magnitude of recent price
              changes on a scale from 0 to 100. When the RSI drops below the oversold level (default
              30), it signals that sellers may be exhausted and a bounce is likely. When it rises
              above the overbought level (default 70), it signals that buyers may be exhausted and a
              pullback is probable.
            </p>
            <p>
              This is a <strong className="text-white">mean reversion</strong> approach — it assumes
              that prices tend to return to their average after reaching extremes. Unlike
              trend-following strategies that ride momentum, RSI Reversal trades against short-term
              extremes, profiting when price snaps back toward the mean. The trade-off is that the
              strategy can lose in strong trends where the RSI stays at extreme levels for extended
              periods.
            </p>
            <p>
              Mean reversion with RSI has been used by traders for decades and works particularly
              well in range-bound forex pairs where price oscillates between support and resistance
              levels. Adding a trend filter (like a 200 EMA) ensures you only trade reversals in the
              direction of the larger trend, significantly improving the strategy&apos;s robustness.
            </p>
          </div>
        </section>

        {/* H2 -- How the Strategy Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How This EA Template Works</h2>
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 mb-6 space-y-3">
            <div>
              <span className="text-[#10B981] font-semibold text-sm">BUY SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                RSI(14) crosses below 30 (oversold) — optionally, price must be above 200 EMA
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                RSI(14) crosses above 70 (overbought) — optionally, price must be below 200 EMA
              </span>
            </div>
            <div>
              <span className="text-[#F59E0B] font-semibold text-sm">EXIT: </span>
              <span className="text-[#CBD5E1] text-sm">
                Stop loss at 1.2x ATR(14) or take profit at 1.5:1 risk-reward ratio
              </span>
            </div>
          </div>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              The ATR-based stop loss adapts to current volatility — wider stops in volatile
              conditions, tighter stops in calm markets. A 1.2x ATR multiplier is tighter than
              trend-following strategies because mean reversion trades aim for quicker, smaller
              moves back to the mean rather than extended trend rides.
            </p>
            <p>
              The optional 200 EMA trend filter is highly recommended. Without it, the strategy will
              take counter-trend trades in strong trends, leading to painful drawdowns. With the
              filter enabled, you only buy in uptrends and only sell in downtrends, ensuring you
              trade reversals that align with the dominant market direction.
            </p>
          </div>
        </section>

        {/* H2 -- Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults work well on EURUSD, GBPUSD, and AUDNZD on M15 to H1. All parameters are
            exported as <code className="text-[#A78BFA]">input</code> variables so you can optimize
            them in the MT5 Strategy Tester.
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

        {/* H2 -- How to Build This EA */}
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
                Sign up for free (no credit card required) and click &ldquo;New Project&rdquo;. Name
                your project &ldquo;RSI Reversal Strategy&rdquo; and open the visual builder canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add the RSI indicator block
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag an RSI indicator block onto the canvas and set the period to 14, overbought
                level to 70, and oversold level to 30. Connect it to Buy and Sell condition nodes,
                then add Stop Loss and Take Profit nodes. These are the standard settings used by
                most professional traders.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Configure risk management and optional filters
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Set the stop loss to 1.2x ATR(14), take profit to 1.5:1 risk-reward, and position
                sizing to 1% risk per trade. Enable the trend filter with a 200 EMA to avoid
                counter-trend entries. Optionally add a session filter to trade only during London
                or New York hours for the most liquid conditions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                EURUSD M30 or H1 with at least 2 years of historical data. Use the MT5 Strategy
                Tester optimizer to test RSI periods from 7 to 21, and overbought/oversold levels
                from 65/35 to 80/20. Demo trade for 1-3 months before going live.
              </p>
            </div>
          </div>
        </section>

        {/* H2 -- Optimization Tips */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Optimization Tips</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Focus on range-bound pairs</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Mean reversion works best on pairs that oscillate within ranges rather than trending
                strongly. EURUSD, GBPUSD, and AUDNZD are solid choices. Avoid strongly trending
                pairs or test during known ranging periods. The strategy naturally underperforms
                during strong directional moves.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Always use the trend filter</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Trading RSI reversals without a trend filter is the most common mistake. A 200 EMA
                filter prevents buying in downtrends and selling in uptrends. This single addition
                typically cuts drawdown by 30-50% while only slightly reducing the number of trades.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Watch for overfitting on RSI levels
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                If your backtested RSI levels are very specific (like 67.3 / 32.7), you&apos;ve
                almost certainly overfitted. Stick to round numbers: 70/30, 75/25, or 80/20. A
                robust RSI Reversal strategy should work across a range of similar settings, not
                just one precise combination. If small parameter changes cause large performance
                swings, the strategy is fragile.
              </p>
            </div>
          </div>
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
              MA Crossover EA
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/templates/range-breakout-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Range Breakout EA
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/templates/trend-pullback-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Trend Pullback EA
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              No-Code EA Builder
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build the RSI Reversal EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available — no credit card required."
      />

      <Footer />
    </div>
  );
}
