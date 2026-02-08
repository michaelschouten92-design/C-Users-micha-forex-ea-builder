import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Free EA Templates | Pre-Built MT5 Expert Advisor Strategies",
  description:
    "Start with free, proven Expert Advisor templates for MetaTrader 5. MA Crossover, RSI Mean Reversion, and Breakout strategies — customize and export in minutes.",
  alternates: { canonical: "/templates" },
  openGraph: {
    title: "Free EA Templates | Pre-Built MT5 Expert Advisor Strategies",
    description:
      "Start with free, proven Expert Advisor templates for MetaTrader 5. MA Crossover, RSI Mean Reversion, and Breakout strategies — customize and export in minutes.",
    url: "/templates",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
];

const faqQuestions = [
  {
    q: "Are the EA templates really free?",
    a: "Yes. All templates are available on the free plan. You can view the strategy details, build the EA in AlgoStudio's visual builder, and export it as MQL5. The free plan includes up to 3 projects and 2 exports per month — no credit card required.",
  },
  {
    q: "Can I modify the template parameters?",
    a: "Absolutely. Templates are starting points, not locked configurations. You can change every parameter — indicator periods, stop loss values, session timing, position sizing — in AlgoStudio's visual builder before exporting.",
  },
  {
    q: "Do I need coding experience to use these templates?",
    a: "No. AlgoStudio is a visual drag-and-drop builder. You replicate the template by connecting blocks on a canvas and configuring parameters through input fields. No MQL5 or any other programming knowledge required.",
  },
  {
    q: "Which template should I start with as a beginner?",
    a: "Start with the Moving Average Crossover template. It's the simplest strategy with the fewest parameters, making it easy to understand, backtest, and optimize. Once you're comfortable, try the RSI or Breakout templates.",
  },
  {
    q: "Can I combine elements from different templates?",
    a: "Yes. The visual builder lets you mix and match any blocks. For example, you could use an MA crossover entry with RSI filtering and breakout-style session timing. Templates are inspiration — your final strategy can be anything you design.",
  },
];

const templates = [
  {
    name: "Moving Average Crossover EA",
    type: "Trend Following",
    description:
      "The most popular beginner strategy. Buy when the fast EMA crosses above the slow EMA, sell on the opposite cross. Uses ATR-based stops and London session timing for high-probability trend trades.",
    href: "/templates/moving-average-crossover-ea",
    color: "#A78BFA",
    pairs: "EURUSD, GBPUSD, USDJPY",
    timeframe: "H1, H4",
  },
  {
    name: "RSI Mean Reversion EA",
    type: "Mean Reversion",
    description:
      "Buy oversold, sell overbought. RSI-based strategy with EMA trend filter to avoid false signals and London session timing for optimal liquidity. Works best in range-bound conditions.",
    href: "/templates/rsi-ea-template",
    color: "#22D3EE",
    pairs: "EURUSD, AUDUSD, EURGBP",
    timeframe: "H1",
  },
  {
    name: "Breakout EA",
    type: "Breakout",
    description:
      "Trade the Asian session range breakout at the London open. Captures the volatility surge when European markets open, with ATR-based stops and a 1.5:1 risk-reward ratio.",
    href: "/templates/breakout-ea-template",
    color: "#F59E0B",
    pairs: "EURUSD, GBPUSD",
    timeframe: "M15, M30",
  },
];

export default function TemplatesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Expert Advisor Templates",
    description:
      "Pre-built MetaTrader 5 Expert Advisor templates. MA Crossover, RSI Mean Reversion, and Breakout strategies.",
    url: `${process.env.AUTH_URL || "https://algo-studio.com"}/templates`,
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <SiteNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
            Free Expert Advisor Templates for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Don&apos;t start from scratch. Choose a proven EA strategy template, customize the
            parameters in AlgoStudio&apos;s visual builder, and export a working MetaTrader 5 Expert
            Advisor in minutes. Each template includes pre-configured indicators, risk management
            settings, session timing, and optimizable parameters — all based on strategies that real
            traders use every day.
          </p>
        </header>

        {/* H2 – Why Start with a Template? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Why Start with an EA Template?</h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              Building an Expert Advisor from a blank canvas can feel overwhelming — which
              indicators should you use? What timeframe works best? How should you set your stop
              loss? Templates solve this by giving you a proven starting point with sensible
              defaults that you can customize.
            </p>
            <p>
              Each template in AlgoStudio is built around a well-documented trading strategy with
              proper risk management, session timing, and parameters that have been tested across
              major forex pairs. You don&apos;t need to reinvent the wheel — start with what works,
              modify it to fit your style, and backtest it with your own parameters.
            </p>
            <p>
              Templates are also the fastest way to learn how AlgoStudio works. Open a template, see
              how the blocks are connected, understand the logic, then make it your own. Most users
              go from first login to exported EA in under 5 minutes using a template.
            </p>
          </div>
        </section>

        {/* Template Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Available EA Templates</h2>
          <div className="space-y-6">
            {templates.map((template) => (
              <Link
                key={template.href}
                href={template.href}
                className="block bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)] transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: template.color }}
                  />
                  <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    {template.type}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{template.name}</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-3">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-[#64748B] mb-4">
                  <span>Pairs: {template.pairs}</span>
                  <span>Timeframe: {template.timeframe}</span>
                </div>
                <span className="text-sm text-[#A78BFA] font-medium">View Template &rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        {/* H2 – Comparison Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Which Strategy Type Is Right for You?
          </h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            Each template uses a fundamentally different approach to the market. Here&apos;s how
            they compare:
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 pr-4 text-[#94A3B8] font-medium"></th>
                  <th className="text-left py-3 px-4 text-[#A78BFA] font-medium">MA Crossover</th>
                  <th className="text-left py-3 px-4 text-[#22D3EE] font-medium">RSI Reversion</th>
                  <th className="text-left py-3 pl-4 text-[#F59E0B] font-medium">Breakout</th>
                </tr>
              </thead>
              <tbody className="text-[#CBD5E1]">
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Market condition</td>
                  <td className="py-3 px-4">Trending markets</td>
                  <td className="py-3 px-4">Range-bound markets</td>
                  <td className="py-3 pl-4">Session opens</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Win rate</td>
                  <td className="py-3 px-4">35–45%</td>
                  <td className="py-3 px-4">50–60%</td>
                  <td className="py-3 pl-4">40–50%</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Trade frequency</td>
                  <td className="py-3 px-4">Several per week</td>
                  <td className="py-3 px-4">Several per week</td>
                  <td className="py-3 pl-4">1 per day max</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Complexity</td>
                  <td className="py-3 px-4">Simple — great for beginners</td>
                  <td className="py-3 px-4">Moderate</td>
                  <td className="py-3 pl-4">Moderate</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-[#94A3B8]">Key strength</td>
                  <td className="py-3 px-4">Catches big moves</td>
                  <td className="py-3 px-4">Higher win rate</td>
                  <td className="py-3 pl-4">Clear entry rules</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            Not sure which one to choose? Start with the{" "}
            <Link
              href="/templates/moving-average-crossover-ea"
              className="text-[#22D3EE] hover:underline"
            >
              MA Crossover template
            </Link>{" "}
            — it&apos;s the simplest to understand and backtest. Once you&apos;re comfortable with
            the workflow, try the others.
          </p>
        </section>

        {/* H2 – How to Use Templates */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How to Build an EA from a Template</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                1. Choose a template that matches your style
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Pick the strategy type that fits how you think about the market. Prefer riding
                trends? Start with MA Crossover. Like buying dips? Try RSI Reversion. Want clean
                session-based entries? Go with Breakout.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                2. Review and adjust parameters
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Each template comes with sensible defaults, but you should adjust them to match your
                preferences. Change indicator periods, stop loss values, session timing, or position
                sizing — all through simple input fields in the visual builder.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                3. Export, backtest, and optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Export the EA as MQL5, load it into MetaTrader 5, and backtest on at least 1–2 years
                of historical data. Use the MT5 Strategy Tester&apos;s optimization feature to find
                the best parameter combinations. Demo trade for 1–3 months before going live.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FAQSection questions={faqQuestions} />

        {/* Internal links */}
        <section className="mb-16 mt-16">
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Home
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link href="/pricing" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Pricing
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/no-code-mt5-ea-builder"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              No-Code MT5 EA Builder
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/visual-strategy-builder"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Visual Strategy Builder
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/automated-trading-for-beginners"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Beginner Guide
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Build your own strategy or start from a template"
        description="Customize any template or design something entirely new. Free plan available — no credit card required."
      />
    </div>
  );
}
