import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Trend Pullback EA Template | Free MT5 EMA + RSI Dip Strategy",
  description:
    "Free Trend Pullback Expert Advisor template for MetaTrader 5. Enter on RSI dips in EMA-confirmed trends with ATR stops and ADX filter. Build without coding.",
  alternates: { canonical: "/templates/trend-pullback-ea" },
  openGraph: {
    title: "Trend Pullback EA Template | Free MT5 EMA + RSI Dip Strategy",
    description:
      "Free Trend Pullback Expert Advisor template for MetaTrader 5. Enter on RSI dips in EMA-confirmed trends with ATR stops and ADX filter. Build without coding.",
    url: "/templates/trend-pullback-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "Trend Pullback EA", href: "/templates/trend-pullback-ea" },
];

const faqQuestions = [
  {
    q: "How does the Trend Pullback strategy differ from MA Crossover?",
    a: "MA Crossover enters when two moving averages cross, which often happens late in the move. Trend Pullback first confirms the trend direction using a single EMA, then waits for a temporary pullback (RSI dip) to enter at a better price. This typically gives better entries and tighter stop losses, though it may miss some trends entirely if no pullback occurs.",
  },
  {
    q: "What EMA period should I use for the trend filter?",
    a: "200 EMA is the industry standard for defining the long-term trend. For faster signals on lower timeframes, 50 EMA works well. The key rule: price above the EMA = uptrend (only buy), price below = downtrend (only sell). Don't overthink the period — 50 and 200 are both well-tested.",
  },
  {
    q: "What RSI level defines a valid pullback?",
    a: "For buy entries in an uptrend, RSI dropping below 40 signals a pullback (default). For sell entries in a downtrend, RSI rising above 60 signals a pullback. These are intentionally moderate levels — you want to catch pullbacks, not wait for extreme oversold/overbought readings that may never come during a trend.",
  },
  {
    q: "Should I add an ADX filter to the strategy?",
    a: "Yes, adding ADX > 25 is highly recommended. It ensures you only trade when a genuine trend exists. Without ADX, the strategy may take trades during choppy sideways markets where the EMA direction is unreliable. The ADX filter typically reduces trades by 20-30% while improving the win rate noticeably.",
  },
  {
    q: "What timeframes and pairs work best for Trend Pullback?",
    a: "H1 and H4 timeframes on major trending pairs like EURUSD, GBPUSD, and AUDUSD. H1 provides a good balance of signal frequency and quality. D1 works for swing trading but produces very few trades. Avoid M5 and M15 where trends are noisy and pullbacks are unreliable.",
  },
];

const parameters = [
  { name: "Trend EMA Period", value: "200", type: "Indicator" },
  { name: "Pullback RSI Period", value: "14", type: "Indicator" },
  { name: "RSI Pullback Level", value: "40 (buy) / 60 (sell)", type: "Threshold" },
  { name: "Max Distance from EMA", value: "2.0%", type: "Filter" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "ADX Filter", value: "25 (optional)", type: "Filter" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function TrendPullbackTemplatePage() {
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
            Trend Pullback EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The Trend Pullback strategy combines the best of trend following and mean reversion: it
            identifies the trend direction using a 200 EMA, then enters on temporary RSI pullbacks
            for better entry prices. This free EA template includes ATR-based risk management, an
            optional ADX trend strength filter, and a max-distance-from-EMA safety check. Best for
            EURUSD, GBPUSD, and AUDUSD on H1 to D1 timeframes. Build it in AlgoStudio without coding
            and export a production-ready MQL5 Expert Advisor in minutes.
          </p>
        </header>

        {/* H2 -- What Is a Trend Pullback Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What Is a Trend Pullback Strategy?</h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              A Trend Pullback strategy follows the old trading adage: &ldquo;buy the dip in an
              uptrend, sell the rally in a downtrend.&rdquo; Instead of entering at the crossover
              (when the trend starts), it waits for the trend to establish itself and then enters on
              a temporary retracement. This gives you a better entry price and a tighter stop loss
              compared to entering at the trend signal itself.
            </p>
            <p>
              The template uses two indicators working together: the{" "}
              <strong className="text-white">200 EMA</strong> defines the trend direction (price
              above = uptrend, price below = downtrend), and the{" "}
              <strong className="text-white">RSI(14)</strong> identifies pullbacks within that
              trend. When the RSI dips below 40 in an uptrend, it signals a buying opportunity. When
              the RSI rises above 60 in a downtrend, it signals a selling opportunity.
            </p>
            <p>
              This combination is powerful because it solves the two biggest problems with simple
              trend-following: late entries (buying at the top of a move) and wide stop losses (far
              from the entry point). By waiting for a pullback, you enter closer to support in an
              uptrend or resistance in a downtrend, keeping your risk tight.
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
                Price is above 200 EMA (uptrend) and RSI(14) drops below 40 (pullback)
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Price is below 200 EMA (downtrend) and RSI(14) rises above 60 (pullback)
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
              The max distance from EMA filter (default 2%) prevents entering when price has already
              moved too far from the EMA. If EURUSD is 3% above the 200 EMA, the pullback may not be
              deep enough to offer a good entry — the market may be overextended and due for a
              larger correction, not just a pullback.
            </p>
            <p>
              The optional ADX filter (threshold 25) ensures a genuine trend exists before looking
              for pullbacks. Without it, the strategy may interpret sideways choppy price action as
              a &ldquo;trend&rdquo; simply because price is above or below the EMA. ADX measures
              trend strength regardless of direction, filtering out low-conviction setups.
            </p>
          </div>
        </section>

        {/* H2 -- Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults work well on EURUSD, GBPUSD, and AUDUSD on H1 and H4. All parameters are
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
                your project &ldquo;Trend Pullback Strategy&rdquo; and open the visual builder
                canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add the Trend Pullback entry strategy block
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag a Trend Pullback entry strategy block onto the canvas. Set the trend EMA to
                200, the RSI period to 14, and the pullback level to 40. The block automatically
                calculates the opposite pullback level (60) for sell signals. Set the max distance
                from EMA to 2%.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Configure risk management and ADX filter
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Set the stop loss to 1.5x ATR(14), take profit to 2:1 risk-reward, and position
                sizing to 1% risk per trade. Enable the ADX filter with a threshold of 25 to ensure
                you only trade when a genuine trend exists. This is optional but strongly
                recommended for better results.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                EURUSD H1 with at least 2 years of historical data. Optimize the EMA period (50,
                100, 200), RSI pullback level (35-45 for longs), and ADX threshold (20-30). Demo
                trade for 1-3 months before going live.
              </p>
            </div>
          </div>
        </section>

        {/* H2 -- Optimization Tips */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Optimization Tips</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Test multiple EMA periods for different timeframes
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The 200 EMA is ideal for H1 and H4 charts. For D1 charts, a 50 EMA may be more
                responsive. The principle is the same: longer EMAs on lower timeframes, shorter EMAs
                on higher timeframes. Test 50, 100, and 200 — the strategy should be profitable
                across a range of EMA values, not just one.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Adjust the RSI pullback depth to market conditions
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                In strong trends, pullbacks are shallow — RSI may only dip to 45 before the trend
                resumes. In weaker trends, pullbacks go deeper. A pullback level of 40 is a good
                default, but test 35-45 in your optimization. If you set it too deep (like 30), you
                may miss most pullbacks entirely.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Don&apos;t optimize too many parameters at once
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                With EMA period, RSI period, pullback level, ADX threshold, and ATR multiplier,
                there are many combinations to test. Optimize 2-3 parameters at a time and keep the
                rest at defaults. If you optimize everything simultaneously, you&apos;ll find a
                perfect backtest result that fails completely in live trading. Simplicity beats
                complexity in algorithmic trading.
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
              href="/templates/rsi-reversal-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              RSI Reversal EA
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/templates/macd-crossover-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              MACD Crossover EA
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              No-Code EA Builder
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build the Trend Pullback EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available — no credit card required."
      />

      <Footer />
    </div>
  );
}
