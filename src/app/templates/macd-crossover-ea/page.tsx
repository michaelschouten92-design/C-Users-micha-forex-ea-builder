import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "MACD Crossover EA Template | Free MT5 & MT4 Momentum Strategy",
  description:
    "Free MACD Crossover Expert Advisor template for MetaTrader 5 & 4. Signal line cross, zero line cross, or histogram mode with ATR stops. Build without coding.",
  alternates: { canonical: "/templates/macd-crossover-ea" },
  openGraph: {
    title: "MACD Crossover EA Template | Free MT5 & MT4 Momentum Strategy",
    description:
      "Free MACD Crossover Expert Advisor template for MetaTrader 5 & 4. Signal line cross, zero line cross, or histogram mode with ATR stops. Build without coding.",
    url: "/templates/macd-crossover-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "MACD Crossover EA", href: "/templates/macd-crossover-ea" },
];

const faqQuestions = [
  {
    q: "What is the difference between Signal Cross, Zero Cross, and Histogram modes?",
    a: "Signal Cross enters when the MACD line crosses the signal line — this is the most common and earliest signal. Zero Cross enters when the MACD line crosses above or below zero, confirming a stronger trend shift but entering later. Histogram Sign Change enters when the histogram flips from negative to positive (or vice versa), which is essentially the same as Signal Cross but viewed differently. Start with Signal Cross for the most balanced approach.",
  },
  {
    q: "Should I use the standard 12/26/9 MACD settings?",
    a: "The 12/26/9 settings are the most widely used and most thoroughly backtested. They provide a good balance between signal frequency and quality on H1 and H4 charts. Some traders use 8/17/9 for faster signals or 24/52/18 for slower, more filtered signals. The standard settings are a solid starting point — only change them after extensive testing.",
  },
  {
    q: "What timeframe works best for MACD Crossover trading?",
    a: "H1 and H4 are the sweet spot. H1 provides enough signals for active traders while filtering most noise. H4 gives fewer but higher-quality momentum signals. Avoid M5 and M15 where the MACD produces too many false crossovers. D1 works for swing trading but generates very few signals per month.",
  },
  {
    q: "Can I use MACD Crossover on gold (XAUUSD)?",
    a: "Yes, XAUUSD is actually one of the best instruments for MACD because gold trends strongly and has clear momentum shifts. Use H1 or H4 timeframes with the standard 12/26/9 settings. Set a wider ATR multiplier (2.0x instead of 1.5x) because gold has higher volatility than forex pairs. Always account for gold's wider spreads in your backtesting.",
  },
  {
    q: "What win rate should I expect from a MACD Crossover EA?",
    a: "Expect 35-45% win rate with a 2:1 risk-reward ratio, similar to other momentum strategies. The MACD is a lagging indicator, so it catches trends late and gives back some profit before signaling an exit. The edge comes from riding large winning trades that significantly outsize the frequent small losses. A profit factor above 1.3 is a good target.",
  },
];

const parameters = [
  { name: "Fast EMA Period", value: "12", type: "Indicator" },
  { name: "Slow EMA Period", value: "26", type: "Indicator" },
  { name: "Signal Period", value: "9", type: "Indicator" },
  { name: "Signal Mode", value: "Signal Cross", type: "Entry logic" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "HTF Trend Filter", value: "200 EMA on H4 (optional)", type: "Filter" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function MACDCrossoverTemplatePage() {
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
            MACD Crossover EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The MACD (Moving Average Convergence Divergence) Crossover is one of the most trusted
            momentum strategies in trading. This free EA template uses the standard 12/26/9 MACD
            with three signal modes — signal line cross, zero line cross, and histogram — combined
            with ATR-based risk management and an optional higher-timeframe trend filter. Best for
            EURUSD, GBPUSD, and XAUUSD on H1 to H4 timeframes. Build it in AlgoStudio without coding
            and export a production-ready MQL5 (or MQL4) Expert Advisor in minutes.
          </p>
        </header>

        {/* H2 -- What Is a MACD Crossover Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What Is a MACD Crossover Strategy?</h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              The MACD indicator measures the relationship between two exponential moving averages
              (by default, the 12 EMA and 26 EMA). The difference between these two EMAs forms the
              MACD line. A 9-period EMA of the MACD line forms the signal line. When the MACD line
              crosses above the signal line, it indicates that short-term momentum is turning
              bullish. When it crosses below, momentum is turning bearish.
            </p>
            <p>
              This is a <strong className="text-white">momentum-based</strong> strategy — it detects
              shifts in the speed and direction of price movement. Unlike pure trend-following
              strategies that focus on direction alone, the MACD also captures acceleration and
              deceleration of trends. A MACD crossover often signals a trend change before a simple
              moving average crossover does, because it measures the convergence and divergence of
              the underlying EMAs.
            </p>
            <p>
              Gerald Appel developed the MACD in the late 1970s, and it remains one of the most
              widely used indicators in trading. Its popularity is justified by its simplicity and
              effectiveness: the 12/26/9 default settings have been tested across decades of market
              data on virtually every tradeable instrument.
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
                MACD line crosses above the signal line (Signal Cross mode) — optionally, price must
                be above 200 EMA on H4
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                MACD line crosses below the signal line (Signal Cross mode) — optionally, price must
                be below 200 EMA on H4
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
              The template supports three distinct entry modes.{" "}
              <strong className="text-white">Signal Cross</strong> is the default and most
              responsive — it enters when the MACD line crosses the signal line.{" "}
              <strong className="text-white">Zero Cross</strong> waits for the MACD line to cross
              zero, confirming a stronger shift but entering later.{" "}
              <strong className="text-white">Histogram Sign Change</strong> enters when the
              histogram changes sign, which signals a change in the rate of momentum.
            </p>
            <p>
              The optional higher-timeframe trend filter (200 EMA on H4) ensures you only take MACD
              signals in the direction of the larger trend. This is especially valuable because the
              MACD generates frequent crossovers during consolidation periods, and the trend filter
              helps you avoid most of these false signals.
            </p>
          </div>
        </section>

        {/* H2 -- Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults use the universally recognized 12/26/9 MACD on H1. All parameters are
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
                your project &ldquo;MACD Crossover Strategy&rdquo; and open the visual builder
                canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add the MACD Crossover entry strategy block
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag a MACD Crossover entry strategy block onto the canvas. Keep the standard
                12/26/9 settings. Select your preferred signal mode — Signal Cross is recommended
                for beginners. The block handles all the crossover detection logic automatically.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Configure risk management and optional trend filter
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Set the stop loss to 1.5x ATR(14), take profit to 2:1 risk-reward, and position
                sizing to 1% risk per trade. Enable the higher-timeframe trend filter (200 EMA on
                H4) to trade only in the direction of the larger trend. This prevents most false
                signals during sideways markets.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                EURUSD H1 with at least 2 years of historical data. Try all three signal modes to
                see which works best for your pair. Optimize the MACD periods cautiously — the
                standard 12/26/9 is hard to beat. Demo trade for 1-3 months before going live.
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
                Compare all three signal modes
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Before optimizing indicator periods, test all three signal modes (Signal Cross, Zero
                Cross, Histogram) on your target pair and timeframe. The difference between modes is
                often more significant than fine-tuning the MACD periods. Signal Cross is most
                responsive, Zero Cross is most conservative.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Consider wider stops for volatile instruments
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The default 1.5x ATR stop loss works well for forex pairs. For XAUUSD (gold) and
                other volatile instruments, increase to 2.0x ATR to avoid being stopped out by
                normal volatility. The take profit should scale proportionally — if you use 2.0x ATR
                for the stop, use a 2:1 risk-reward ratio for a 4.0x ATR take profit.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Resist the urge to over-optimize MACD periods
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The 12/26/9 MACD has been the standard for over 40 years. If your backtester says
                11/23/7 is significantly better, you&apos;re likely overfitting. Small changes to
                MACD periods (like 10/26/9 or 12/28/9) may have merit, but dramatic departures from
                the standard almost always indicate curve-fitting. A strategy that only works with
                one specific parameter set is not robust.
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
              href="/templates/rsi-macd-divergence-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              RSI/MACD Divergence EA
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              No-Code EA Builder
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build the MACD Crossover EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available — no credit card required."
      />

      <Footer />
    </div>
  );
}
