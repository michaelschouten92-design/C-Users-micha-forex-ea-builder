import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "RSI/MACD Divergence EA Template | Free MT5 Reversal Strategy",
  description:
    "Free RSI/MACD Divergence Expert Advisor template for MetaTrader 5. Detect price-indicator divergence for reversal entries with ATR stops and swing point detection. Build without coding.",
  alternates: { canonical: "/templates/rsi-macd-divergence-ea" },
  openGraph: {
    title: "RSI/MACD Divergence EA Template | Free MT5 Reversal Strategy",
    description:
      "Free RSI/MACD Divergence Expert Advisor template for MetaTrader 5. Detect price-indicator divergence for reversal entries with ATR stops and swing point detection. Build without coding.",
    url: "/templates/rsi-macd-divergence-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "RSI/MACD Divergence EA", href: "/templates/rsi-macd-divergence-ea" },
];

const faqQuestions = [
  {
    q: "What is the difference between regular and hidden divergence?",
    a: "Regular (classic) divergence signals a potential trend reversal: price makes a higher high but the indicator makes a lower high (bearish), or price makes a lower low but the indicator makes a higher low (bullish). Hidden divergence signals trend continuation: price makes a higher low but the indicator makes a lower low (bullish), or price makes a lower high but the indicator makes a higher high (bearish). This template focuses on regular divergence for reversal detection.",
  },
  {
    q: "Should I use RSI or MACD for divergence detection?",
    a: "RSI divergence is easier to detect and produces more frequent signals, making it better for beginners. MACD divergence uses the histogram for detection, which can be more precise for identifying momentum shifts. RSI works better on H1-H4 timeframes, while MACD divergence tends to shine on H4-D1. Test both on your target pair and timeframe to see which produces cleaner signals.",
  },
  {
    q: "How many lookback bars should I use for swing detection?",
    a: "The default 20 bars works well on H1 and H4. Fewer bars (10-15) detect smaller divergence patterns with more frequent but less reliable signals. More bars (25-40) detect larger, more significant divergence patterns but produce fewer trades. The minimum swing bars setting (default 5) ensures the two swing points are far enough apart for the divergence to be meaningful.",
  },
  {
    q: "What timeframes work best for divergence trading?",
    a: "H4 and D1 produce the most reliable divergence signals because swing points are well-defined on higher timeframes. H1 works but generates more false signals. Avoid M5 and M15 where price action is noisy and divergence patterns are unreliable. Divergence is inherently a slower signal — patience with higher timeframes is rewarded.",
  },
  {
    q: "What win rate should I expect from a divergence strategy?",
    a: "A well-optimized divergence strategy typically wins 40-50% of trades. Divergence signals are good at identifying potential reversals, but the timing can be imprecise — price may continue against you before reversing. Use a 2:1 risk-reward ratio to ensure profitability even with a moderate win rate. The key edge is catching major turning points where the reward is large.",
  },
];

const parameters = [
  { name: "Indicator", value: "RSI (or MACD)", type: "Selection" },
  { name: "RSI Period", value: "14", type: "Indicator" },
  { name: "MACD Settings", value: "12/26/9", type: "Indicator" },
  { name: "Lookback Bars", value: "20", type: "Detection" },
  { name: "Min Swing Bars", value: "5", type: "Detection" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function RSIMACDDivergenceTemplatePage() {
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
            RSI/MACD Divergence EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Divergence between price and a momentum indicator is one of the most reliable reversal
            signals in technical analysis. This free EA template automatically detects bullish and
            bearish divergence using either RSI or MACD, with configurable swing point detection and
            ATR-based risk management. Best for EURUSD, GBPUSD, and USDJPY on H4 to D1 timeframes.
            Build it in AlgoStudio without coding and export a production-ready MQL5 Expert Advisor
            in minutes.
          </p>
        </header>

        {/* H2 -- What Is a Divergence Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            What Is a Divergence Trading Strategy?
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              Divergence occurs when price action and a momentum indicator move in opposite
              directions. For example, if price makes a new higher high but the RSI makes a lower
              high, this <strong className="text-white">bearish divergence</strong> suggests that
              the uptrend is losing momentum and a reversal may be imminent. Conversely, if price
              makes a lower low but the RSI makes a higher low, this{" "}
              <strong className="text-white">bullish divergence</strong> suggests the downtrend is
              weakening.
            </p>
            <p>
              Divergence works because momentum typically leads price. When an indicator stops
              confirming new price extremes, it signals that the underlying buying or selling
              pressure is fading. The move may continue for a while on pure inertia, but the
              probability of a reversal increases significantly.
            </p>
            <p>
              This is a <strong className="text-white">reversal strategy</strong> — it goes against
              the current price direction, which makes proper risk management essential. Divergence
              signals are not immediate: price can diverge for several bars before reversing. The
              template uses ATR-based stops and a fixed risk-reward ratio to manage this
              uncertainty, ensuring losses are controlled while allowing room for the reversal to
              play out.
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
                Bullish divergence detected — price makes a lower low while RSI/MACD makes a higher
                low within the lookback window
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Bearish divergence detected — price makes a higher high while RSI/MACD makes a lower
                high within the lookback window
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
              The EA scans the last N bars (default 20) for swing highs and swing lows in both price
              and the selected indicator. It then compares the two most recent swing points to
              determine if divergence exists. The minimum swing bars setting (default 5) ensures
              that the two swing points are separated by enough bars for the divergence pattern to
              be meaningful — very close swing points produce unreliable signals.
            </p>
            <p>
              When using RSI, the indicator value at each price swing point is compared directly.
              When using MACD, the histogram values at swing points are compared. Both methods are
              effective, but they detect slightly different types of momentum shifts. RSI divergence
              is more common and easier to validate visually. MACD divergence tends to signal larger
              reversals but produces fewer trades.
            </p>
          </div>
        </section>

        {/* H2 -- Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults work well on major pairs on H4 and D1 timeframes. All parameters are
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
                your project &ldquo;Divergence Strategy&rdquo; and open the visual builder canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add the RSI/MACD Divergence entry strategy block
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag an RSI/MACD Divergence entry strategy block onto the canvas. Choose RSI or MACD
                as your indicator. Set the lookback bars to 20 and minimum swing bars to 5. If using
                RSI, keep the default period of 14. If using MACD, keep the standard 12/26/9
                settings.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Configure risk management
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Set the stop loss to 1.5x ATR(14), take profit to 2:1 risk-reward, and position
                sizing to 1% risk per trade. Since divergence is a reversal strategy, having proper
                risk management is critical — not every divergence signal results in a reversal, and
                losses must be kept small relative to your account.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                EURUSD H4 or D1 with at least 3 years of historical data. Divergence strategies
                produce fewer trades, so you need a longer backtest period for meaningful results.
                Optimize lookback bars (15-30) and minimum swing bars (3-8). Demo trade for 2-3
                months before going live.
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
                Use higher timeframes for more reliable signals
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Divergence on H4 and D1 is far more reliable than on H1 or lower. Higher timeframes
                produce cleaner swing points and more meaningful divergence patterns. The trade-off
                is fewer signals — you might get 2-4 trades per month on D1 versus 8-12 on H4.
                Quality over quantity is the key principle for divergence trading.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Combine with support/resistance levels
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Divergence at a key support or resistance level is significantly more powerful than
                divergence in the middle of a range. If you see bullish divergence right at a major
                support level, the probability of reversal is much higher. You can add a session
                filter or time filter to focus on setups that coincide with significant price
                levels.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Accept lower trade frequency
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Divergence strategies inherently produce fewer trades than trend-following or
                momentum strategies. Trying to increase trade frequency by loosening the detection
                parameters (fewer lookback bars, less strict swing detection) usually degrades
                signal quality. If your backtest shows more than 1-2 trades per week on H4, your
                detection may be too sensitive and you&apos;re likely finding false divergence
                patterns.
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
        title="Build the Divergence EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available — no credit card required."
      />

      <Footer />
    </div>
  );
}
