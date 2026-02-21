import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Breakout EA Template | Free Asian Range Breakout Strategy for MT5",
  description:
    "Free breakout Expert Advisor template for MetaTrader 5. Trade the Asian session range breakout at the London open with ATR stops and 1.5:1 R:R. Build a production-ready MQL5 Expert Advisor. No coding required.",
  alternates: { canonical: "/templates/breakout-ea-template" },
  openGraph: {
    title: "Breakout EA Template | Free Asian Range Breakout Strategy for MT5",
    description:
      "Free breakout Expert Advisor template for MetaTrader 5. Trade the Asian session range breakout at the London open with ATR stops and 1.5:1 R:R. Build a production-ready MQL5 Expert Advisor. No coding required.",
    url: "/templates/breakout-ea-template",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "Breakout EA Template", href: "/templates/breakout-ea-template" },
];

const faqQuestions = [
  {
    q: "What is the Asian range in forex trading?",
    a: "The Asian range is the price range formed during the Tokyo trading session (approximately 00:00–08:00 GMT). During this quiet session, price typically consolidates in a narrow range. When the London session opens, increased volume often causes a breakout from this range.",
  },
  {
    q: "Why is the Asian range breakout a popular strategy?",
    a: "It's one of the most well-documented patterns in forex. The transition from low-volatility (Asia) to high-volatility (London) creates predictable breakout opportunities. The tight Asian range provides clear entry levels and natural stop loss placement.",
  },
  {
    q: "How do you handle false breakouts?",
    a: "False breakouts are inevitable. The ATR-based stop loss placed inside the Asian range limits losses on false breaks. The 1.5:1 risk-reward ratio means you only need to win about 40% of breakouts to be profitable. Range size filters (20–80 pips) also help avoid low-conviction setups.",
  },
  {
    q: "Can I use this strategy on pairs other than EURUSD?",
    a: "Yes, but results vary. GBPUSD and EURUSD work best because they're most active during the London session. USDJPY can also work but tends to be more active during Tokyo. Always backtest on each pair individually before trading live.",
  },
  {
    q: "What timeframe should I use for breakout trading?",
    a: "M15 (15-minute) or M30 (30-minute) work best for this strategy. These timeframes give enough granularity to catch the initial breakout candle while filtering out the noise of smaller timeframes like M1 or M5.",
  },
];

const parameters = [
  { name: "Range Session", value: "Asian (00:00–08:00 GMT)", type: "Timing" },
  { name: "Breakout Session", value: "London Open (08:00–12:00 GMT)", type: "Timing" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "1.5:1 R:R", type: "Risk-reward" },
  { name: "Min Range Size", value: "20 pips", type: "Filter" },
  { name: "Max Range Size", value: "80 pips", type: "Filter" },
  { name: "Max Trades/Day", value: "1", type: "Risk" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function BreakoutEATemplatePage() {
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
            Breakout EA Template — Asian Range Breakout for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Trade the Asian session range breakout at the London open — one of the most reliable and
            well-documented patterns in forex. This free EA template identifies the overnight
            consolidation range, waits for price to break out when European traders enter the
            market, and enters with ATR-based risk management. Build it in AlgoStudio without coding
            and export a production-ready MQL5 Expert Advisor.
          </p>
        </header>

        {/* H2 – What Is Breakout Trading? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            What Is Asian Range Breakout Trading?
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              During the Asian session (Tokyo, approximately 00:00–08:00 GMT), the forex market is
              relatively quiet. Price consolidates in a narrow range as trading volume is lower than
              during the European and US sessions. This consolidation creates a clearly defined high
              and low — the Asian range.
            </p>
            <p>
              When the London session opens at 08:00 GMT, European traders and institutions enter
              the market. Volume surges, and price often breaks out of the Asian range with
              conviction. The breakout strategy captures this volatility expansion by entering a
              trade when price moves above the Asian high (buy) or below the Asian low (sell).
            </p>
            <p>
              This strategy is popular because it offers{" "}
              <strong className="text-white">clear entry levels</strong> (the range high and low),{" "}
              <strong className="text-white">natural stop loss placement</strong> (inside the
              range), and a <strong className="text-white">predictable timing window</strong> (the
              London open). You always know where to enter, where to place your stop, and when to
              look for setups.
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
                Price breaks above the Asian range high after 08:00 GMT
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Price breaks below the Asian range low after 08:00 GMT
              </span>
            </div>
            <div>
              <span className="text-[#F59E0B] font-semibold text-sm">FILTERS: </span>
              <span className="text-[#CBD5E1] text-sm">
                Asian range must be 20–80 pips (too narrow = no conviction, too wide = stop too far)
              </span>
            </div>
            <div>
              <span className="text-[#A78BFA] font-semibold text-sm">EXIT: </span>
              <span className="text-[#CBD5E1] text-sm">
                Stop loss at 1.5x ATR(14) inside the range, take profit at 1.5:1 R:R
              </span>
            </div>
          </div>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              The strategy limits to one trade per day. Once the breakout is traded (win or loss),
              the EA waits for the next Asian session to form a new range. This prevents overtrading
              and keeps risk exposure predictable — you never have more than one position open from
              this strategy.
            </p>
            <p>
              The range size filter is important. If the Asian range is too narrow (under 20 pips),
              there isn&apos;t enough consolidation for a meaningful breakout. If it&apos;s too wide
              (over 80 pips), the stop loss would be too far away and the risk-reward ratio
              deteriorates. The 20–80 pip range captures the sweet spot for most major pairs.
            </p>
          </div>
        </section>

        {/* H2 – Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            Optimized for EURUSD and GBPUSD on M15/M30 timeframes. All parameters are exported as{" "}
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
                Sign up for free and create a new project. Name it &ldquo;Asian Range
                Breakout&rdquo; and open the visual builder canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Set up the range detection
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add a Range Breakout block and configure it for the Asian session (00:00–08:00 GMT).
                Set the minimum range to 20 pips and maximum to 80 pips. This block automatically
                tracks the session high and low and triggers when price breaks out.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">3. Set the breakout window</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add a Custom Times block for the London open window (08:00–12:00 GMT). This limits
                breakout entries to the first 4 hours of London — the period with the highest
                probability of genuine breakouts rather than false breaks.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Add risk management and export
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add Stop Loss (1.5x ATR placed inside the Asian range), Take Profit at 1.5:1 R:R,
                position sizing at 1% risk, and Max Trades Per Day set to 1. Export the MQL5 file,
                backtest on EURUSD M15 with 2+ years of data, and optimize the range filters and
                timing parameters.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – When Breakout Strategies Work Best */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            When Breakout Strategies Work Best — and When They Don&apos;t
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Works well when</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The Asian session has a tight, well-defined range (30–60 pips on EURUSD). Major
                economic releases are scheduled during the London session. The market has been
                consolidating overnight and institutional volume pushes price decisively through the
                range boundary.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Struggles when</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                The Asian session was already volatile (wide range &gt; 80 pips). It&apos;s a
                low-volume day (bank holidays, between Christmas and New Year). The range is
                extremely tight (&lt; 20 pips), which often means the market is in a dead zone with
                no institutional interest. The range size filter catches most of these scenarios.
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
              MA Crossover Template
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
              href="/blog/from-trading-idea-to-automated-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              From Idea to EA
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              No-Code EA Builder
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build the Breakout EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available — no credit card required."
      />

      <Footer />
    </div>
  );
}
