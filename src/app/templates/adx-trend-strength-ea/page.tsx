import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "ADX Trend Strength EA Template | Free MT5 Trend Following Strategy",
  description:
    "Free ADX trend strength Expert Advisor template for MetaTrader 5. Trend following strategy with ADX(14) DI crossover, ATR stops, London session timing, and optimizable parameters. Build without coding.",
  alternates: { canonical: "/templates/adx-trend-strength-ea" },
  openGraph: {
    title: "ADX Trend Strength EA Template | Free MT5 Trend Following Strategy",
    description:
      "Free ADX trend strength Expert Advisor template for MetaTrader 5. Trend following strategy with ADX(14) DI crossover, ATR stops, London session timing, and optimizable parameters. Build without coding.",
    url: "/templates/adx-trend-strength-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "ADX Trend EA", href: "/templates/adx-trend-strength-ea" },
];

const faqQuestions = [
  {
    q: "What ADX threshold should I use?",
    a: "An ADX value of 25 is the standard threshold for confirming a strong trend. Below 25, the market is considered range-bound or in a weak trend. Some traders use 20 for earlier entries or 30 for higher-confidence signals. Start with 25 and test 20 and 30 in the Strategy Tester to see which works best on your chosen pair.",
  },
  {
    q: "What timeframe works best for the ADX trend strategy?",
    a: "H1 (1-hour) and H4 (4-hour) timeframes produce the best results. ADX on lower timeframes like M15 generates noisy readings that switch rapidly between trending and ranging states. H4 gives smoother, more reliable trend readings. Start with H1 for more trade opportunities and test H4 for higher-quality signals.",
  },
  {
    q: "Which currency pairs work best with the ADX strategy?",
    a: "Trending major pairs: EURUSD, GBPUSD, and USDJPY. These pairs have strong institutional participation that creates sustained directional moves. Avoid range-bound pairs like EURGBP where ADX rarely exceeds 25 for extended periods. Cross pairs like GBPJPY also trend well but have wider spreads.",
  },
  {
    q: "What win rate should I expect from this strategy?",
    a: "A well-optimized ADX trend strategy typically wins 40-50% of trades. Like most trend-following systems, profitability comes from winning trades being significantly larger than losers. The 2:1 risk-reward ratio means you can be profitable even with a 40% win rate. The ADX filter helps avoid the worst whipsaw trades.",
  },
  {
    q: "What is the difference between ADX, DI+, and DI-?",
    a: "ADX measures trend strength regardless of direction \u2014 it tells you HOW STRONG the trend is, not which direction. DI+ (positive directional indicator) measures upward movement strength. DI- (negative directional indicator) measures downward movement strength. When DI+ crosses above DI- with ADX > 25, it signals a confirmed uptrend. When DI- crosses above DI+ with ADX > 25, it signals a confirmed downtrend.",
  },
];

const parameters = [
  { name: "ADX Period", value: "14", type: "ADX" },
  { name: "ADX Threshold", value: "25", type: "ADX" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Session", value: "London (08:00\u201317:00 GMT)", type: "Timing" },
  { name: "Max Trades/Day", value: "3", type: "Risk" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function ADXTrendStrengthTemplatePage() {
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
            ADX Trend Strength EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The ADX (Average Directional Index) is one of the most respected trend-strength
            indicators in technical analysis. This free EA template uses ADX to confirm strong
            trends and enters on DI+/DI- crossovers, ensuring you only trade when the market is
            truly trending. It includes ATR-based risk management optimized for the London session.
            Build it in AlgoStudio without coding, customize the parameters, and export a
            production-ready MQL5 Expert Advisor in minutes.
          </p>
        </header>

        {/* H2 \u2013 What Is an ADX Trend Strength Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            What Is an ADX Trend Strength Strategy?
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              An ADX trend strength strategy uses the Average Directional Index to measure how
              strong a trend is before entering a trade. The ADX line ranges from 0 to 100. Values
              below 25 indicate a weak or non-existent trend (range-bound market). Values above 25
              indicate a strong trend worth trading. The strategy combines ADX with the DI+ and DI-
              lines to determine trend direction \u2014 DI+ above DI- signals an uptrend, and DI-
              above DI+ signals a downtrend.
            </p>
            <p>
              This is a <strong className="text-white">trend-following</strong> approach that solves
              one of the biggest problems in automated trading: entering during choppy,
              directionless markets. By requiring ADX to exceed a threshold before taking any trade,
              the strategy naturally avoids the whipsaw periods that destroy most trend-following
              systems. The trade-off is fewer trades overall, but significantly higher quality
              entries.
            </p>
            <p>
              The ADX indicator was developed by J. Welles Wilder Jr. in 1978 and remains one of the
              most widely used tools among professional traders. It works across all liquid markets
              and timeframes, making it a reliable foundation for any trend-following EA.
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
                DI+ crosses above DI- while ADX is above 25 during the London session
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                DI- crosses above DI+ while ADX is above 25 during the London session
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
              The London session filter (08:00\u201317:00 GMT) ensures you only trade during the
              most liquid hours, when major forex pairs have the tightest spreads and trends are
              most reliable. ATR-based stop losses adapt automatically to current market volatility
              \u2014 wider stops in volatile conditions, tighter stops in calm markets.
            </p>
            <p>
              The dual requirement of ADX above the threshold AND a DI crossover creates a
              high-quality entry filter. Many false signals are eliminated because the strategy
              ignores DI crossovers when ADX is below 25, meaning the market has no directional
              conviction. This produces fewer trades but each entry has a higher probability of
              success.
            </p>
          </div>
        </section>

        {/* H2 \u2013 Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults work well on trending pairs (EURUSD, GBPUSD, USDJPY) on H1. All
            parameters are exported as <code className="text-[#A78BFA]">input</code> variables so
            you can optimize them in the MT5 Strategy Tester.
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
                your project &ldquo;ADX Trend Strategy&rdquo; and open the visual builder canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add timing and indicator blocks
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag a Trading Sessions block onto the canvas and select the London session
                (08:00\u201317:00 GMT). Add an ADX block \u2014 set the period to 14 and the
                threshold to 25. The ADX block provides the ADX line, DI+, and DI- values
                automatically. Connect the ADX block to the timing block.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Add trade execution and risk management
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add Place Buy and Place Sell blocks. Connect a &ldquo;DI+ crosses above DI- AND ADX
                &gt; 25&rdquo; condition to the Buy block, and &ldquo;DI- crosses above DI+ AND ADX
                &gt; 25&rdquo; to the Sell block. Add Stop Loss (set to 1.5x ATR with period 14),
                Take Profit (set to 2:1 risk-reward ratio), position sizing (1% risk per trade), and
                Max Trades Per Day (3).
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                EURUSD H1 with at least 2 years of historical data. Use the MT5 Strategy Tester
                optimizer to find the best ADX settings \u2014 try periods from 10\u201320 and
                thresholds from 20\u201335. Demo trade for 1\u20133 months before going live.
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
                Adjust the ADX threshold for your market
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The standard threshold of 25 works well across most pairs, but highly volatile pairs
                like GBPJPY may produce better results with a higher threshold of 30. Less volatile
                pairs may benefit from a lower threshold of 20. The key is to ensure the threshold
                filters out enough noise without eliminating valid trends.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Combine with a Moving Average for direction confirmation
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                ADX tells you trend strength but the DI crossover can sometimes lag. Adding a simple
                Moving Average (e.g., 50 EMA) as a directional filter \u2014 only take buy signals
                when price is above the 50 EMA and sell signals when below \u2014 can improve entry
                timing and reduce false signals during trend transitions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Watch for ADX turning points
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                An ADX above 25 and rising indicates a strengthening trend, which is the best time
                to enter. An ADX above 25 but falling indicates the trend is weakening, and new
                entries are riskier. Consider adding an ADX slope filter \u2014 only trade when ADX
                is both above the threshold and rising \u2014 for higher-quality signals.
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
              href="/templates/moving-average-crossover-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              MA Crossover EA
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link
              href="/templates/ichimoku-cloud-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Ichimoku Cloud EA
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link
              href="/templates/bollinger-band-reversal-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              BB Reversal EA
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              No-Code EA Builder
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build the ADX Trend EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available \u2014 no credit card required."
      />

      <Footer />
    </div>
  );
}
