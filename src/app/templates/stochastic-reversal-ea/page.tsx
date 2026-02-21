import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Stochastic Reversal EA Template | Free MT5 Mean Reversion Strategy",
  description:
    "Free Stochastic reversal Expert Advisor template for MetaTrader 5. Mean reversion strategy using %K/%D crossover at overbought/oversold levels, ATR stops, and optimizable parameters. Build without coding.",
  alternates: { canonical: "/templates/stochastic-reversal-ea" },
  openGraph: {
    title: "Stochastic Reversal EA Template | Free MT5 Mean Reversion Strategy",
    description:
      "Free Stochastic reversal Expert Advisor template for MetaTrader 5. Mean reversion strategy using %K/%D crossover at overbought/oversold levels, ATR stops, and optimizable parameters. Build without coding.",
    url: "/templates/stochastic-reversal-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "Stochastic Reversal EA", href: "/templates/stochastic-reversal-ea" },
];

const faqQuestions = [
  {
    q: "What is the difference between Fast Stochastic and Slow Stochastic?",
    a: 'Fast Stochastic uses raw %K and a simple moving average of %K as %D. It is very sensitive and produces many signals, most of which are noise. Slow Stochastic applies additional smoothing (the "Slowing" parameter, typically 3) to %K, making the oscillator smoother and signals more reliable. This template uses Slow Stochastic with a slowing period of 3, which is the standard for forex trading.',
  },
  {
    q: "What timeframe works best for the Stochastic reversal strategy?",
    a: "H1 (1-hour) and H4 (4-hour) timeframes produce the most reliable overbought/oversold signals. On M15 and below, Stochastic enters overbought and oversold zones very frequently, generating excessive false signals. H4 gives fewer but much cleaner reversal signals. Start with H1 for a good balance of signal frequency and quality.",
  },
  {
    q: "Which currency pairs work best with the Stochastic strategy?",
    a: "Range-bound pairs perform best: EURGBP, AUDNZD, and EURCHF regularly oscillate between overbought and oversold levels. Avoid strongly trending pairs where Stochastic can remain overbought or oversold for extended periods. The strategy profits from price reversals at extremes, so pairs that mean-revert frequently are ideal.",
  },
  {
    q: "What win rate should I expect from this strategy?",
    a: "A well-optimized Stochastic reversal strategy typically wins 45-55% of trades. The %K/%D crossover confirmation helps filter false signals, improving the raw overbought/oversold signal quality. Profitability depends on consistent execution across many trades, with the 2:1 risk-reward ratio providing a positive edge even at the lower end of this range.",
  },
  {
    q: "Should I change the overbought/oversold levels from 80/20?",
    a: "The 80/20 levels are the industry standard and work well for most pairs and timeframes. Using more extreme levels like 90/10 gives fewer but higher-quality signals \u2014 price is genuinely overextended at those levels. Using 70/30 gives more signals but lower quality. Test 80/20 first, then try 85/15 or 90/10 if you want more selective entries.",
  },
];

const parameters = [
  { name: "K Period", value: "14", type: "Stochastic" },
  { name: "D Period", value: "3", type: "Stochastic" },
  { name: "Slowing", value: "3", type: "Stochastic" },
  { name: "OB Level", value: "80", type: "Stochastic" },
  { name: "OS Level", value: "20", type: "Stochastic" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Session", value: "London (08:00\u201317:00 GMT)", type: "Timing" },
  { name: "Max Trades/Day", value: "3", type: "Risk" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function StochasticReversalTemplatePage() {
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
            Stochastic Reversal EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The Stochastic oscillator is one of the most widely used mean reversion indicators in
            forex trading. This free EA template buys when Stochastic enters oversold territory
            (below 20) and sells when it enters overbought territory (above 80), using %K/%D line
            crossovers for confirmation. It includes ATR-based risk management optimized for the
            London session. Build it in AlgoStudio without coding, customize the parameters, and
            export a production-ready MQL5 Expert Advisor in minutes.
          </p>
        </header>

        {/* H2 \u2013 What Is a Stochastic Reversal Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            What Is a Stochastic Reversal Strategy?
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              A Stochastic reversal strategy uses the Stochastic oscillator to identify when a
              currency pair is overbought or oversold. The Stochastic measures where the current
              close is relative to the high-low range over a set period. It produces two lines: %K
              (the main line, ranging from 0 to 100) and %D (a smoothed average of %K). When %K is
              below 20, the pair is considered oversold and likely to bounce. When %K is above 80,
              it is overbought and likely to pull back.
            </p>
            <p>
              This is a <strong className="text-white">mean reversion</strong> approach \u2014 it
              bets that extreme moves are temporary and price will return to its average. The %K/%D
              crossover adds a confirmation layer: instead of entering the moment Stochastic enters
              oversold territory, you wait for %K to cross above %D, confirming that momentum is
              actually reversing. This reduces false signals and improves entry timing.
            </p>
            <p>
              The Stochastic oscillator was developed by George Lane in the 1950s and remains one of
              the most popular technical indicators today. Its strength lies in identifying the
              exact moment when momentum shifts at price extremes, giving traders a timing edge for
              reversal entries.
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
                %K crosses above %D while both are below 20 (oversold) during the London session
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                %K crosses below %D while both are above 80 (overbought) during the London session
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
              liquid hours when mean reversion patterns are most reliable and spreads are tightest.
              ATR-based stop losses adapt to current market volatility \u2014 wider stops when the
              market is volatile, tighter stops in calm conditions.
            </p>
            <p>
              The dual requirement of oversold/overbought levels AND a %K/%D crossover creates a
              more reliable entry than raw level-based signals alone. Raw &ldquo;Stochastic below
              20&rdquo; triggers would enter too early, often as price is still falling. Waiting for
              the crossover ensures momentum has actually shifted before committing capital.
            </p>
          </div>
        </section>

        {/* H2 \u2013 Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults work well on range-bound pairs on H1/H4. All parameters are exported as{" "}
            <code className="text-[#A78BFA]">input</code> variables so you can optimize them in the
            MT5 Strategy Tester.
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
                your project &ldquo;Stochastic Reversal Strategy&rdquo; and open the visual builder
                canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add timing and indicator blocks
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag a Trading Sessions block onto the canvas and select the London session
                (08:00\u201317:00 GMT). Add a Stochastic block \u2014 set K Period to 14, D Period
                to 3, and Slowing to 3. Set the overbought level to 80 and oversold level to 20.
                Connect the Stochastic block to the timing block.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Add trade execution and risk management
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add Place Buy and Place Sell blocks. Connect a &ldquo;%K crosses above %D in
                oversold zone&rdquo; condition to the Buy block, and &ldquo;%K crosses below %D in
                overbought zone&rdquo; to the Sell block. Add Stop Loss (set to 1.5x ATR with period
                14), Take Profit (set to 2:1 risk-reward ratio), position sizing (1% risk per
                trade), and Max Trades Per Day (3).
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                EURGBP H1 with at least 2 years of historical data. Use the MT5 Strategy Tester
                optimizer to find the best Stochastic settings \u2014 try K Periods from 5\u201321,
                overbought levels from 75\u201390, and oversold levels from 10\u201325. Demo trade
                for 1\u20133 months before going live.
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
                Test more extreme overbought/oversold levels
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The standard 80/20 levels are a good default, but using 85/15 or even 90/10 can
                significantly improve signal quality. More extreme levels mean price is genuinely
                overextended, making a reversal more likely. You will get fewer trades but each
                trade has a higher probability of success. Test multiple level combinations in the
                Strategy Tester.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Add an ADX filter to avoid strong trends
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The biggest risk with Stochastic reversal strategies is entering against a strong
                trend. During powerful trends, Stochastic can stay overbought or oversold for
                extended periods, producing multiple losing reversal signals. Adding an ADX block
                with a threshold below 25 ensures you only trade when the market is range-bound,
                filtering out dangerous trend-against signals.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Experiment with the slowing parameter
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The slowing parameter (default 3) controls how smooth the %K line is. A higher
                slowing value (5 or 7) produces smoother curves with fewer crossovers, giving
                cleaner but slower signals. A lower value (1 or 2) makes %K more responsive but
                noisier. Match the slowing to your timeframe \u2014 higher slowing for lower
                timeframes, lower slowing for H4 and above.
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
              href="/templates/bollinger-band-reversal-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              BB Reversal EA
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link
              href="/templates/ichimoku-cloud-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Ichimoku Cloud EA
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              No-Code EA Builder
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build the Stochastic Reversal EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available \u2014 no credit card required."
      />

      <Footer />
    </div>
  );
}
