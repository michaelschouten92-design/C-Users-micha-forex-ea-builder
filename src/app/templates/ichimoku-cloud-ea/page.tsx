import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Ichimoku Cloud EA Template | Free MT5 Trend Following Strategy",
  description:
    "Free Ichimoku Cloud Expert Advisor template for MetaTrader 5. Trend following strategy with cloud breakout entries, Tenkan/Kijun crossover confirmation, ATR stops, and optimizable parameters. Build without coding.",
  alternates: { canonical: "/templates/ichimoku-cloud-ea" },
  openGraph: {
    title: "Ichimoku Cloud EA Template | Free MT5 Trend Following Strategy",
    description:
      "Free Ichimoku Cloud Expert Advisor template for MetaTrader 5. Trend following strategy with cloud breakout entries, Tenkan/Kijun crossover confirmation, ATR stops, and optimizable parameters. Build without coding.",
    url: "/templates/ichimoku-cloud-ea",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
  { name: "Ichimoku Cloud EA", href: "/templates/ichimoku-cloud-ea" },
];

const faqQuestions = [
  {
    q: "What timeframe works best for the Ichimoku Cloud strategy?",
    a: "H4 (4-hour) and D1 (daily) timeframes produce the best results with Ichimoku. The indicator was originally designed for daily charts, and the default parameters (9, 26, 52) are calibrated for that timeframe. H4 is a good compromise between signal frequency and quality. Lower timeframes like H1 can work but generate noisier signals. Avoid M15 and below \u2014 the cloud becomes unreliable.",
  },
  {
    q: "Which currency pairs work best with Ichimoku?",
    a: "Trending pairs with clear directional moves: USDJPY is the classic Ichimoku pair (the system was developed for Japanese markets), along with EURUSD, GBPUSD, and AUDUSD. The strategy catches large moves, so pairs that trend well are essential. Avoid range-bound pairs like EURGBP where cloud breakouts frequently fail.",
  },
  {
    q: "What win rate should I expect from this strategy?",
    a: "A well-optimized Ichimoku Cloud strategy typically wins 35-45% of trades. This is lower than mean reversion strategies, but winning trades are significantly larger because you hold through extended trends. The multiple confirmation layers (cloud breakout + TK crossover) filter out many false signals, improving the overall quality of entries.",
  },
  {
    q: "Should I change the default Ichimoku settings (9, 26, 52)?",
    a: "The 9/26/52 settings are the original parameters developed by Goichi Hosoda after decades of research. They work well on daily and H4 charts. Some traders use 10/30/60 for a slightly smoother cloud, or 7/22/44 for faster signals on H1. Start with the defaults and only adjust after thorough backtesting \u2014 the original settings are robust across most markets.",
  },
  {
    q: "What are the different components of Ichimoku and what do they mean?",
    a: "The Ichimoku system has five components. Tenkan-sen (Conversion Line, period 9) shows short-term momentum. Kijun-sen (Base Line, period 26) shows medium-term momentum. Senkou Span A and Senkou Span B form the Cloud (Kumo) \u2014 price above the cloud is bullish, below is bearish. Chikou Span (Lagging Span) confirms by comparing current close to the close 26 periods ago. This template uses cloud breakouts with TK crossover for a streamlined approach.",
  },
];

const parameters = [
  { name: "Tenkan Period", value: "9", type: "Ichimoku" },
  { name: "Kijun Period", value: "26", type: "Ichimoku" },
  { name: "Senkou B Period", value: "52", type: "Ichimoku" },
  { name: "Stop Loss", value: "1.5x ATR(14)", type: "ATR-based" },
  { name: "Take Profit", value: "2:1 R:R", type: "Risk-reward" },
  { name: "Session", value: "London/Asian (multiple)", type: "Timing" },
  { name: "Max Trades/Day", value: "2", type: "Risk" },
  { name: "Position Sizing", value: "1% risk per trade", type: "Risk" },
];

export default function IchimokuCloudTemplatePage() {
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
            Ichimoku Cloud EA Template for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            The Ichimoku Cloud (Ichimoku Kinko Hyo) is a comprehensive trend-following system
            originally developed for Japanese stock markets. This free EA template enters when price
            breaks above or below the Ichimoku Cloud, using Tenkan-sen/Kijun-sen crossover for
            confirmation. It includes ATR-based risk management and works well across multiple
            trading sessions. Build it in AlgoStudio without coding, customize the parameters, and
            export a production-ready MQL5 Expert Advisor in minutes.
          </p>
        </header>

        {/* H2 \u2013 What Is an Ichimoku Cloud Strategy? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            What Is an Ichimoku Cloud Strategy?
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              An Ichimoku Cloud strategy uses the Kumo (cloud) as a dynamic support and resistance
              zone. The cloud is formed by two lines \u2014 Senkou Span A and Senkou Span B \u2014
              projected 26 periods into the future. When price is above the cloud, the trend is
              bullish. When price is below the cloud, the trend is bearish. A breakout through the
              cloud signals a potential trend change, and the thickness of the cloud at the breakout
              point indicates the strength of the support or resistance being broken.
            </p>
            <p>
              This is a <strong className="text-white">trend-following</strong> approach that
              provides more context than a simple moving average crossover. The cloud gives you
              support/resistance, trend direction, and trend strength all in one indicator. The
              Tenkan-sen (conversion line) and Kijun-sen (base line) crossover adds a momentum
              confirmation layer, similar to a fast/slow MA crossover but adapted to the Ichimoku
              framework.
            </p>
            <p>
              The system was developed by Japanese journalist Goichi Hosoda over 30 years of
              research and published in 1968. It was originally designed for daily charts of
              Japanese equities but has proven effective across forex, commodities, and indices on
              multiple timeframes. Its multi-signal approach \u2014 combining cloud, crossover, and
              lagging confirmation \u2014 makes it one of the most complete single-indicator systems
              available.
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
                Price breaks above the Ichimoku Cloud and Tenkan-sen crosses above Kijun-sen
              </span>
            </div>
            <div>
              <span className="text-[#EF4444] font-semibold text-sm">SELL SIGNAL: </span>
              <span className="text-[#CBD5E1] text-sm">
                Price breaks below the Ichimoku Cloud and Tenkan-sen crosses below Kijun-sen
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
              Unlike most templates that focus on the London session, the Ichimoku Cloud strategy
              works well across multiple sessions including the Asian session. This is because the
              indicator was designed for Japanese markets and its parameters naturally align with
              Asian and London session dynamics. The EA can trade during both sessions, providing
              more opportunities, especially on pairs like USDJPY.
            </p>
            <p>
              The dual requirement of cloud breakout AND Tenkan/Kijun crossover creates a
              high-quality entry filter. Cloud breakouts alone can be false signals \u2014 price may
              briefly pierce the cloud and reverse. Requiring the TK crossover confirms that
              short-term momentum aligns with the breakout direction, significantly reducing false
              entries. The trade-off is a lower win rate (35\u201345%) compensated by larger winning
              trades.
            </p>
          </div>
        </section>

        {/* H2 \u2013 Parameters Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Default Parameters</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These defaults work well on trending pairs, especially USDJPY, on H4/D1. All parameters
            are exported as <code className="text-[#A78BFA]">input</code> variables so you can
            optimize them in the MT5 Strategy Tester.
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
                your project &ldquo;Ichimoku Cloud Strategy&rdquo; and open the visual builder
                canvas.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Add timing and indicator blocks
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag a Trading Sessions block onto the canvas and select the London and Asian
                sessions. Add an Ichimoku Cloud block \u2014 set Tenkan to 9, Kijun to 26, and
                Senkou B to 52. The Ichimoku block provides the cloud boundaries, Tenkan-sen, and
                Kijun-sen values automatically. Connect the Ichimoku block to the timing block.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Add trade execution and risk management
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Add Place Buy and Place Sell blocks. Connect a &ldquo;Price above Cloud AND Tenkan
                crosses above Kijun&rdquo; condition to the Buy block, and &ldquo;Price below Cloud
                AND Tenkan crosses below Kijun&rdquo; to the Sell block. Add Stop Loss (set to 1.5x
                ATR with period 14), Take Profit (set to 2:1 risk-reward ratio), position sizing (1%
                risk per trade), and Max Trades Per Day (2).
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                4. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export to generate a .mq5 file. Load it into MetaTrader 5 and backtest on
                USDJPY H4 with at least 3 years of historical data. The Ichimoku system generates
                fewer trades than faster indicators, so you need a longer backtest period for
                statistical reliability. Use the MT5 Strategy Tester optimizer to test Tenkan values
                from 7\u201312 and Kijun from 22\u201330. Demo trade for 1\u20133 months before
                going live.
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
                Respect the original parameter ratios
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Hosoda&apos;s original parameters (9, 26, 52) maintain a specific mathematical
                relationship: Kijun is roughly 3x Tenkan, and Senkou B is roughly 2x Kijun. When
                optimizing, try to maintain these ratios. For example, 7/22/44 or 10/30/60 preserve
                the proportional relationship. Breaking these ratios significantly can make the
                cloud behave unpredictably.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Use the cloud thickness as a confidence filter
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                A thin cloud is easier to break through and more likely to produce false breakouts.
                A thick cloud represents strong support or resistance, and a breakout through it is
                more significant. Consider adding a minimum cloud thickness filter \u2014 only take
                breakout signals when the cloud is at least a certain width in pips. This reduces
                false signals during transitional periods.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Consider higher timeframes for stronger signals
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Ichimoku was designed for daily charts, and its signals become increasingly reliable
                on higher timeframes. If you are getting too many false breakouts on H4, try
                switching to daily charts. You will get fewer trades but each cloud breakout carries
                more weight. Many professional Ichimoku traders use D1 for signals and H4 for entry
                timing.
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
              href="/templates/adx-trend-strength-ea"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              ADX Trend EA
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
        title="Build the Ichimoku Cloud EA in minutes"
        description="Create this strategy with AlgoStudio's visual builder. Free plan available \u2014 no credit card required."
      />

      <Footer />
    </div>
  );
}
