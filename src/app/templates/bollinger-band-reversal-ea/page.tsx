import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Bollinger Band Reversal EA Template | Free MT5 Mean Reversion Strategy",
  description:
    "Free Bollinger Band reversal Expert Advisor template for MetaTrader 5. Mean reversion strategy with BB(20,2) entries, ATR stops, London session timing, and optimizable parameters. Build without coding.",
  alternates: { canonical: "/templates/bollinger-band-reversal-ea" },
  openGraph: {
    title: "Bollinger Band Reversal EA Template | Free MT5 Mean Reversion Strategy",
    description:
      "Free Bollinger Band reversal Expert Advisor template for MetaTrader 5. Mean reversion strategy with BB(20,2) entries, ATR stops, London session timing, and optimizable parameters. Build without coding.",
    url: "/templates/bollinger-band-reversal-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "BB Reversal EA", href: "/templates/bollinger-band-reversal-ea" },
];

const faqQuestions = [
  {
    q: "What timeframe works best for the Bollinger Band reversal strategy?",
    a: "H1 (1-hour) and H4 (4-hour) timeframes produce the most reliable mean reversion signals. On lower timeframes like M15, price touches the bands too frequently and many signals are noise. H4 gives fewer but higher-quality touches where price is genuinely extended. Start with H1 and move to H4 if you want fewer, cleaner trades.",
  },
  {
    q: "Which currency pairs work best for Bollinger Band mean reversion?",
    a: "Range-bound pairs like EURGBP, AUDNZD, and EURCHF work best because they naturally oscillate between support and resistance levels. Avoid strongly trending pairs like USDJPY during trend phases. The strategy profits from price returning to the mean, so pairs that consolidate more than they trend are ideal.",
  },
  {
    q: "What is the expected win rate for this strategy?",
    a: "A well-optimized Bollinger Band reversal strategy typically wins 45-55% of trades. The wins tend to be smaller than with trend-following strategies because you are targeting a return to the middle band, not riding a long move. Profitability comes from a consistent edge over many trades rather than large individual winners.",
  },
  {
    q: "Should I use the standard 20-period, 2-deviation Bollinger Band settings?",
    a: "The 20-period with 2 standard deviations is the most widely used default and a strong starting point. A wider deviation (2.5) gives fewer but more reliable signals because price has to be more extended. A tighter deviation (1.5) gives more signals but more false entries. Test 2.0 first, then try 1.5 and 2.5 in the Strategy Tester.",
  },
  {
    q: "Can I combine Bollinger Bands with other indicators?",
    a: "Yes. Adding an RSI filter is a common improvement \u2014 only buy when price touches the lower band AND RSI is below 30, confirming oversold conditions. A volume filter can also help by requiring above-average volume on the band touch. Keep total indicators to 2-3 to avoid overfitting.",
  },
];

const parameters = [
  { name: "BB Period", value: "20", type: "Bollinger Band" },
  { name: "BB Deviation", value: "2.0", type: "Bollinger Band" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Session", value: "London (08:00\u201317:00 GMT)", type: "Timing" },
  { name: "Max Trades/Day", value: "3", type: "Risk" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function BollingerBandReversalTemplatePage() {
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
            Bollinger Band Reversal EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The Bollinger Band reversal is one of the most reliable mean reversion strategies in
            forex trading. This free EA template enters when price touches the upper or lower
            Bollinger Band and targets a return to the mean. It uses BB(20,2) with ATR-based risk
            management, optimized for the London session. Build it in AlgoStudio without coding,
            customize the parameters, and export a production-ready MQL5 Expert Advisor in minutes.
          </p>
        </header>

        {/* H2 \u2013 What Is a Bollinger Band Reversal Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            What Is a Bollinger Band Reversal Strategy?
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              A Bollinger Band reversal strategy uses Bollinger Bands to identify when price has
              moved too far from its average and is likely to snap back. Bollinger Bands consist of
              three lines: a middle band (a simple moving average, typically 20 periods) and an
              upper and lower band placed 2 standard deviations away. When price touches or pierces
              the outer bands, it is statistically extended and more likely to revert toward the
              middle.
            </p>
            <p>
              This is a <strong className="text-white">mean reversion</strong> approach \u2014 it
              assumes that extreme price moves are temporary and that price will return to its
              average. The trade-off is a moderate win rate (45\u201355%) with smaller individual
              winners, because you are targeting the middle band rather than riding a trend. The
              strategy is profitable when applied to range-bound markets where price regularly
              oscillates between the bands.
            </p>
            <p>
              Bollinger Bands automatically adapt to market volatility. In volatile markets, the
              bands widen, requiring a larger move to trigger a signal. In calm markets, the bands
              narrow, capturing smaller mean reversion moves. This self-adjusting behavior makes the
              strategy robust across different market conditions without constant parameter tuning.
            </p>
          </div>
        </section>

        {/* H2 \u2013 How the Strategy Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How This EA Template Works</h2>
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 mb-6 space-y-3">
            <div>
              <span className="text-[#10B981] font-semibold text-sm">BUY SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Price touches or closes below the lower Bollinger Band during the London session
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Price touches or closes above the upper Bollinger Band during the London session
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
              The London session filter (08:00\u201317:00 GMT) ensures you trade during the most
              liquid hours when spreads are tightest and mean reversion patterns are most reliable.
              ATR-based stop losses adapt to current volatility \u2014 wider stops when the market
              is volatile, tighter stops in calm conditions.
            </p>
            <p>
              The strategy performs best in range-bound and consolidating markets where price
              regularly bounces between the bands. It underperforms during strong trending moves
              where price can ride along the upper or lower band for extended periods. Adding an ADX
              filter (only trade when ADX &lt; 25, confirming no strong trend) is a common
              improvement to avoid these &ldquo;band walking&rdquo; periods.
            </p>
          </div>
        </section>

        {/* H2 \u2013 Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults work well on range-bound pairs (EURGBP, AUDNZD) on H1. All parameters are
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

        {/* H2 \u2013 How to Build This EA */}
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
                your project &ldquo;BB Reversal Strategy&rdquo; and open the visual builder canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add timing and indicator blocks
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag a Trading Sessions block onto the canvas and select the London session
                (08:00\u201317:00 GMT). Add a Bollinger Bands block \u2014 set the period to 20 and
                deviation to 2.0. Connect it to the timing block. The BB block provides upper band,
                lower band, and middle band values automatically.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Add trade execution and risk management
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add Place Buy and Place Sell blocks. Connect a &ldquo;Price crosses below Lower
                Band&rdquo; condition to the Buy block, and &ldquo;Price crosses above Upper
                Band&rdquo; to the Sell block. Add Stop Loss (set to 1.5x ATR with period 14), Take
                Profit (set to 2:1 risk-reward ratio), position sizing (1% risk per trade), and Max
                Trades Per Day (3).
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                EURGBP H1 with at least 2 years of historical data. Use the MT5 Strategy Tester
                optimizer to find the best BB settings \u2014 try periods from 15\u201330 and
                deviations from 1.5\u20132.5. Demo trade for 1\u20133 months before going live.
              </p>
            </div>
          </div>
        </section>

        {/* H2 \u2013 Optimization Tips */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Optimization Tips</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Test different deviation levels
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The standard 2.0 deviation is a solid default, but 1.5 and 2.5 are worth testing.
                Lower deviation (1.5) generates more frequent signals with a lower win rate per
                trade. Higher deviation (2.5) triggers less often but each signal is more reliable
                because price is genuinely overextended. Match the deviation to your risk tolerance.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Add an ADX filter to avoid trends
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The biggest risk for mean reversion strategies is entering against a strong trend.
                Adding an ADX block with a threshold below 25 ensures you only take trades when the
                market is range-bound. This filters out &ldquo;band walking&rdquo; scenarios where
                price rides along the upper or lower band during strong trends.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Consider the middle band as a profit target
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Instead of a fixed risk-reward ratio, you can target the middle Bollinger Band (the
                20 SMA) as your take profit level. This is the natural mean reversion target and
                often produces a higher win rate. Test both approaches in backtesting to see which
                gives better risk-adjusted returns on your chosen pair.
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
            <span className="text-[#64748B]">&middot;</span>
            <Link
              href="/templates/rsi-reversal-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              RSI Reversal EA
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link
              href="/templates/stochastic-reversal-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Stochastic Reversal EA
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link
              href="/templates/moving-average-crossover-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              MA Crossover EA
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              No-Code EA Builder
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build the BB Reversal EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available \u2014 no credit card required."
      />

      <Footer />
    </div>
  );
}
