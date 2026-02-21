import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Range Breakout EA Template | Free MT5 & MT4 Session Breakout Strategy",
  description:
    "Free Range Breakout Expert Advisor template for MetaTrader 5 & 4. Trade session or time-based range breakouts with ATR stops and volume confirmation. Build without coding.",
  alternates: { canonical: "/templates/range-breakout-ea" },
  openGraph: {
    title: "Range Breakout EA Template | Free MT5 & MT4 Session Breakout Strategy",
    description:
      "Free Range Breakout Expert Advisor template for MetaTrader 5 & 4. Trade session or time-based range breakouts with ATR stops and volume confirmation. Build without coding.",
    url: "/templates/range-breakout-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "Range Breakout EA", href: "/templates/range-breakout-ea" },
];

const faqQuestions = [
  {
    q: "What is the best session range for breakout trading?",
    a: "The Asian session (00:00-08:00 GMT) range traded at the London open is the most popular and well-tested approach. The Asian session typically produces a tight consolidation range, and the London open brings the volume and volatility needed to break out of it. Alternatively, you can use the first 4 H1 candles of any session as your range.",
  },
  {
    q: "Should I trade breakouts in both directions or only one?",
    a: "Trading both directions (buy above range high, sell below range low) is the standard approach. However, adding a trend filter (200 EMA on H4) to only trade breakouts in the trend direction can significantly improve results. In strong uptrends, only trade upside breakouts; in downtrends, only trade downside breakouts.",
  },
  {
    q: "What is the buffer/offset and why is it important?",
    a: "The buffer adds a small number of pips (typically 2-5) above the range high or below the range low before triggering the breakout entry. This filters out false breakouts where price barely touches the range boundary before reversing. Without a buffer, you get more trades but many more false signals.",
  },
  {
    q: "Which currency pairs work best for range breakout strategies?",
    a: "GBPUSD, EURUSD, and USDJPY are ideal because they have tight spreads and respond strongly to the London and New York session opens. GBPUSD is especially popular for Asian range breakouts because of the strong GBP volatility during London hours. Avoid exotic pairs with wide spreads that eat into breakout profits.",
  },
  {
    q: "How do I avoid false breakouts?",
    a: "Three proven filters: (1) Add a breakout buffer of 2-5 pips above the range boundary. (2) Require the breakout candle to close beyond the range (candle close mode), not just wick through it. (3) Set a minimum range size (e.g., 15-20 pips) — if the range is too tight, breakouts are unreliable. Volume confirmation can also help but is less reliable in forex.",
  },
];

const parameters = [
  { name: "Range Type", value: "Custom Time (Asian)", type: "Session" },
  { name: "Range Start", value: "00:00 GMT", type: "Timing" },
  { name: "Range End", value: "08:00 GMT", type: "Timing" },
  { name: "Breakout Buffer", value: "2 pips", type: "Filter" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Cancel Opposite", value: "Yes", type: "Order management" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function RangeBreakoutTemplatePage() {
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
            Range Breakout EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The Range Breakout strategy trades the break of a defined price range — typically the
            Asian session consolidation broken at the London or New York open. This free EA template
            uses customizable time-based ranges with a breakout buffer, ATR-based risk management,
            and optional volume confirmation. Best for GBPUSD, EURUSD, and USDJPY on H1 to H4
            timeframes. Build it in AlgoStudio without coding and export a production-ready MQL5 (or
            MQL4) Expert Advisor in minutes.
          </p>
        </header>

        {/* H2 -- What Is a Range Breakout Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What Is a Range Breakout Strategy?</h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              A Range Breakout strategy identifies a period of price consolidation (the range) and
              then enters a trade when price breaks decisively above or below that range. The logic
              is simple: consolidation represents indecision, and a breakout signals that one side
              (buyers or sellers) has won. The strategy aims to catch the momentum that follows this
              resolution.
            </p>
            <p>
              The most common approach is the{" "}
              <strong className="text-white">Asian session breakout</strong> — measuring the high
              and low of the quiet Asian trading hours (00:00-08:00 GMT) and then trading the
              breakout when the London session opens with its higher volume and volatility. This is
              a well-documented edge in forex because Asian sessions consistently produce tighter
              ranges that European and American sessions then break.
            </p>
            <p>
              Range Breakout strategies have clear, rule-based entries that make them ideal for
              automation. The entry is objective (price crosses a defined level), the stop loss is
              logical (opposite side of the range or ATR-based), and the take profit follows a fixed
              risk-reward ratio. This makes the strategy easy to backtest, optimize, and trust.
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
                Price closes above the range high + 2 pip buffer after the Asian session ends
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Price closes below the range low - 2 pip buffer after the Asian session ends
              </span>
            </div>
            <div>
              <span className="text-[#F59E0B] font-semibold text-sm">EXIT: </span>
              <span className="text-[#CBD5E1] text-sm">
                Stop loss at 1.5x ATR(14) or take profit at 2:1 risk-reward ratio. Cancel opposite
                pending order on fill.
              </span>
            </div>
          </div>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              The template calculates the high and low of the Asian session (00:00-08:00 GMT by
              default) and places pending orders above and below the range. When one order triggers,
              the opposite is automatically cancelled. This &ldquo;cancel opposite on fill&rdquo;
              feature prevents being whipsawed into two opposing positions.
            </p>
            <p>
              The breakout buffer (default 2 pips) ensures you don&apos;t enter on marginal breaks
              where price barely touches the range boundary. Combined with the candle-close
              confirmation mode, this filters out most false breakouts caused by spread widening or
              brief price spikes.
            </p>
          </div>
        </section>

        {/* H2 -- Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults are optimized for the Asian-to-London breakout on GBPUSD and EURUSD. All
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
                your project &ldquo;Range Breakout Strategy&rdquo; and open the visual builder
                canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add the Range Breakout block
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag a Range Breakout price action block onto the canvas. Set the range method to
                &ldquo;Custom Time&rdquo; with start hour 00:00 and end hour 08:00 (Asian session).
                Connect it to Buy and Sell condition nodes, then add Stop Loss and Take Profit
                nodes. Set the breakout buffer to 2 pips for confirmed breakouts.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Configure risk management and filters
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Set the stop loss to 1.5x ATR(14), take profit to 2:1 risk-reward, and position
                sizing to 1% risk per trade. Enable &ldquo;Cancel Opposite&rdquo; to remove the
                unfilled pending order when one side triggers. Optionally set minimum range size (15
                pips) to avoid trading on days with unusually tight ranges.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                GBPUSD H1 with at least 2 years of historical data. Optimize the range timing (try
                22:00-06:00 and 23:00-07:00 as alternatives), buffer size (1-5 pips), and minimum
                range size. Demo trade for 1-3 months before going live.
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
                Match range timing to your broker&apos;s server time
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The Asian session timing depends on your broker&apos;s server timezone. Some brokers
                use GMT, others GMT+2 or GMT+3. Verify the correct offset so your range actually
                captures the low-volatility Asian hours. An incorrect time offset can completely
                invalidate the strategy.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Set a minimum range size filter
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Very tight ranges (under 10-15 pips) produce unreliable breakouts because a small
                range can be broken by normal noise. Setting a minimum range of 15-20 pips ensures
                you only trade when there was meaningful consolidation. Similarly, avoid very wide
                ranges (over 60-80 pips) where the stop loss becomes too large.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Beware of curve-fitting the time window
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                If your optimizer finds that a range of 01:17-07:43 is the best window, you have
                overfitted. Stick to round hour boundaries that correspond to real market sessions.
                The Asian session (00:00-08:00 GMT) works because of a real structural reason — not
                because of a statistical artifact in your backtest data.
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
        title="Build the Range Breakout EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available — no credit card required."
      />

      <Footer />
    </div>
  );
}
