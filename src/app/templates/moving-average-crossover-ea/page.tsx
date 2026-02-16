import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Moving Average Crossover EA Template | Free MT5 & MT4 Trend Strategy",
  description:
    "Free Moving Average crossover Expert Advisor template for MetaTrader 5 & 4. EMA 10/50 crossover with ATR stops, London session timing, and optimizable parameters. Build without coding.",
  alternates: { canonical: "/templates/moving-average-crossover-ea" },
  openGraph: {
    title: "Moving Average Crossover EA Template | Free MT5 & MT4 Trend Strategy",
    description:
      "Free Moving Average crossover Expert Advisor template for MetaTrader 5 & 4. EMA 10/50 crossover with ATR stops, London session timing, and optimizable parameters. Build without coding.",
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
    a: "H1 (1-hour) and H4 (4-hour) timeframes produce the best results. Lower timeframes like M15 generate too many false crossover signals, while daily charts produce very few trades. Start with H1 and test H4 if you want fewer but higher-quality signals.",
  },
  {
    q: "Which currency pairs work best for MA crossover EAs?",
    a: "Major pairs that trend well: EURUSD, GBPUSD, and USDJPY. Avoid range-bound pairs like EURGBP and exotic pairs with wide spreads. The strategy profits from sustained directional moves, so trending pairs are essential.",
  },
  {
    q: "Should I use SMA or EMA for the crossover?",
    a: "EMA (Exponential Moving Average) is recommended because it responds faster to recent price changes, catching trend changes earlier. SMA (Simple Moving Average) gives smoother but slower signals. Test both in backtesting — EMA 10/50 is a strong default.",
  },
  {
    q: "What win rate should I expect from this strategy?",
    a: "A well-optimized MA crossover typically wins 35–45% of trades. The strategy is profitable because winning trades are significantly larger than losers, using a 2:1 risk-reward ratio. You don't need to win most trades — you need winners that are bigger than losers.",
  },
  {
    q: "Can I add more indicators to improve the strategy?",
    a: "Yes. Common additions include an ADX filter (only trade when ADX > 25, confirming a trend exists) and an RSI filter (don't buy when RSI > 70, avoiding overbought entries). Keep it simple — 2–3 indicators total is the sweet spot. More indicators usually means overfitting, not better results.",
  },
];

const parameters = [
  { name: "Fast MA Period", value: "10", type: "EMA" },
  { name: "Slow MA Period", value: "50", type: "EMA" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Session", value: "London (08:00–17:00 GMT)", type: "Timing" },
  { name: "Max Trades/Day", value: "3", type: "Risk" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
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

        {/* H1 + Intro */}
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Moving Average Crossover EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The Moving Average crossover is the most popular trend-following strategy in forex
            trading. This free EA template uses a fast 10 EMA and slow 50 EMA crossover with
            ATR-based risk management, optimized for the London session. Build it in AlgoStudio
            without coding, customize the parameters, and export a production-ready MQL5 (or MQL4)
            Expert Advisor in minutes.
          </p>
        </header>

        {/* H2 – What Is a Moving Average Crossover Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            What Is a Moving Average Crossover Strategy?
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              A Moving Average crossover strategy compares two moving averages with different
              periods. The fast MA (short period, like 10) reacts quickly to recent price changes.
              The slow MA (longer period, like 50) represents the broader trend. When the fast MA
              crosses above the slow MA, it signals a potential new uptrend. When it crosses below,
              it signals a potential downtrend.
            </p>
            <p>
              This is a <strong className="text-white">trend-following</strong> approach — it
              doesn&apos;t try to predict reversals or pick tops and bottoms. Instead, it waits for
              a trend to establish itself and then rides the move. The trade-off is a lower win rate
              (35–45%), but winning trades are significantly larger than losing trades because you
              hold positions through extended trending moves.
            </p>
            <p>
              The strategy has been used by professional and retail traders for decades because of
              its simplicity and robustness. It works across all liquid markets and timeframes,
              making it an ideal starting point for anyone new to automated trading.
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
                Fast EMA (10) crosses above Slow EMA (50) during the London session
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Fast EMA (10) crosses below Slow EMA (50) during the London session
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
              The London session filter (08:00–17:00 GMT) ensures you only trade during the most
              liquid hours, when major forex pairs have the tightest spreads and strongest trends.
              ATR-based stop losses adapt automatically to current market volatility — wider stops
              in volatile conditions, tighter stops in calm markets.
            </p>
            <p>
              The strategy performs best in trending markets with clear directional moves. It
              underperforms in choppy, sideways conditions where the MAs keep crossing back and
              forth. Adding an ADX filter (only trade when ADX &gt; 25) is a common improvement to
              avoid these whipsaw periods.
            </p>
          </div>
        </section>

        {/* H2 – Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults work well on major pairs (EURUSD, GBPUSD) on H1. All parameters are
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
                Sign up for free (no credit card required) and click &ldquo;New Project&rdquo;. Name
                your project &ldquo;MA Crossover Strategy&rdquo; and open the visual builder canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add timing and indicator blocks
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag a Trading Sessions block onto the canvas and select the London session
                (08:00–17:00 GMT). Add two Moving Average blocks — set one to EMA period 10 (fast)
                and the other to EMA period 50 (slow). Connect both to the timing block.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Add trade execution and risk management
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add Place Buy and Place Sell blocks. Connect Stop Loss (set to 1.5x ATR with period
                14), Take Profit (set to 2:1 risk-reward ratio), position sizing (1% risk per
                trade), and Max Trades Per Day (3). Your entire strategy is now visible on the
                canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                EURUSD H1 with at least 2 years of historical data. Use the MT5 Strategy Tester
                optimizer to find the best MA periods — try ranges of 5–20 for the fast MA and
                30–100 for the slow MA. Demo trade for 1–3 months before going live.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – Optimization Tips */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Optimization Tips</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Test different MA period combinations
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The 10/50 EMA is a strong default, but 8/21, 10/30, and 20/50 are all worth testing.
                The key is maintaining enough separation between the fast and slow period — if
                they&apos;re too close, you get excessive crossovers and whipsaws.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Add an ADX trend filter</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The biggest weakness of MA crossover strategies is choppy, sideways markets. Adding
                an ADX block with a threshold of 25 ensures you only take trades when a real trend
                exists. This typically reduces trade count by 30–40% but significantly improves the
                win rate.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Don&apos;t over-optimize</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                If your backtest shows 90%+ win rates, you&apos;ve probably overfitted to historical
                data. A realistic MA crossover wins 35–45% of trades with a positive profit factor.
                Prefer parameter sets that produce consistent results across multiple years and
                currency pairs.
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
              href="/templates/rsi-ea-template"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              RSI EA Template
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
              href="/blog/moving-average-crossover-strategy"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              MA Crossover Guide
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link href="/product" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              No-Code EA Builder
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build the MA Crossover EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available — no credit card required."
      />

      <Footer />
    </div>
  );
}
