import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Strategy Templates | 5 Ready-to-Export MT5 Expert Advisors",
  description:
    "Pick a strategy template, adjust a few settings, and export a working MT5 Expert Advisor. 5 templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, and MACD Crossover.",
  alternates: { canonical: "/templates" },
  openGraph: {
    title: "Strategy Templates | 5 Ready-to-Export MT5 Expert Advisors",
    description:
      "Pick a strategy template, adjust a few settings, and export a working MT5 Expert Advisor in minutes. No coding required.",
    url: "/templates",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Templates", href: "/templates" },
];

const faqQuestions = [
  {
    q: "Are the strategy templates free?",
    a: "Yes. All 5 templates are available on the free plan. You can build, customize, and export a working Expert Advisor — no credit card required. The free plan includes 1 project and 1 export per month.",
  },
  {
    q: "Can I change the template settings?",
    a: "Absolutely. Templates are starting points with sensible defaults. You can adjust every setting — indicator periods, risk percentage, stop loss, take profit, and advanced toggles — before exporting.",
  },
  {
    q: "Do I need coding experience?",
    a: "No. You pick a template, adjust 3-5 settings, and export. No MQL5, Python, or any other programming knowledge required.",
  },
  {
    q: "Which template should I start with?",
    a: "Start with EMA Crossover — it's the simplest template with the fewest settings. Once you're comfortable with the workflow, try Range Breakout or RSI Reversal.",
  },
  {
    q: "Can I combine elements from different templates?",
    a: "Yes. The builder also has individual blocks for indicators, conditions, and actions that you can combine freely. Templates are the fastest way to start, but you can customize and extend them.",
  },
];

const templates = [
  {
    name: "Range Breakout",
    type: "Breakout",
    description:
      "Trade the breakout of a recent price range. Set the lookback period, risk %, and ATR stop loss. Optional London session filter and cancel-opposite-on-fill toggle.",
    href: "/templates/breakout-ea-template",
    color: "#F59E0B",
    basicFields: "Range Period, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "London session filter, Cancel opposite order",
  },
  {
    name: "EMA Crossover",
    type: "Trend Following",
    description:
      "Enter when the fast EMA crosses the slow EMA. Set your EMA periods, risk %, and ATR stop loss. Optional higher-timeframe trend filter and RSI confirmation.",
    href: "/templates/moving-average-crossover-ea",
    color: "#A78BFA",
    basicFields: "Fast EMA, Slow EMA, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "HTF trend filter, RSI confirmation",
  },
  {
    name: "Trend Pullback",
    type: "Trend Following",
    description:
      "Wait for a trend (EMA direction) then enter on an RSI pullback. Set the trend EMA, RSI dip level, risk %, and ATR stop loss.",
    color: "#10B981",
    basicFields: "Trend EMA, RSI Period, Dip Level, Risk %, SL (ATR)",
    advanced: "London session filter, EMA buffer",
  },
  {
    name: "RSI Reversal",
    type: "Mean Reversion",
    description:
      "Buy oversold, sell overbought. Set the RSI period, overbought/oversold levels, risk %, and ATR stop loss. Optional session filter and trend confirmation.",
    href: "/templates/rsi-ea-template",
    color: "#22D3EE",
    basicFields: "RSI Period, OB Level, OS Level, Risk %, SL (ATR)",
    advanced: "Session filter, Trend filter",
  },
  {
    name: "MACD Crossover",
    type: "Momentum",
    description:
      "Enter on MACD signal line crossover. Set the MACD parameters, risk %, and ATR stop loss. Optional higher-timeframe trend filter.",
    color: "#FB923C",
    basicFields: "Fast/Slow/Signal, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "HTF trend filter",
  },
];

export default function TemplatesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "MT5 Strategy Templates",
    description:
      "5 ready-to-export MetaTrader 5 Expert Advisor templates. EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, and MACD Crossover.",
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

        {/* Header */}
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            5 strategy templates, ready to export
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Pick a template, adjust a few settings, and export a working MetaTrader 5 Expert
            Advisor. Each template includes built-in risk management with ATR-based stop loss,
            risk-reward take profit, and proper position sizing. No coding required.
          </p>
        </header>

        {/* Template Grid */}
        <section className="mb-16">
          <div className="space-y-6">
            {templates.map((template) => (
              <div
                key={template.name}
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
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
                <h2 className="text-xl font-bold text-white mb-2">{template.name}</h2>
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
                  {template.description}
                </p>
                <div className="space-y-2 text-xs text-[#64748B] mb-4">
                  <p>
                    <span className="text-[#94A3B8]">Basic:</span> {template.basicFields}
                  </p>
                  <p>
                    <span className="text-[#94A3B8]">Advanced:</span> {template.advanced}
                  </p>
                </div>
                {template.href ? (
                  <Link
                    href={template.href}
                    className="text-sm text-[#A78BFA] font-medium hover:underline"
                  >
                    View details &rarr;
                  </Link>
                ) : (
                  <Link
                    href="/login?mode=register"
                    className="text-sm text-[#A78BFA] font-medium hover:underline"
                  >
                    Use template &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* How to use */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How to build an EA from a template</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Pick a template</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Choose the strategy that matches how you trade. Prefer riding trends? Start with EMA
                Crossover. Like buying dips? Try RSI Reversal. Want session-based entries? Go with
                Range Breakout.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">2. Adjust a few settings</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Each template has 3-5 basic settings with sensible defaults. Change what you want,
                or leave the defaults — every template exports a valid EA immediately. Optional
                advanced toggles let you add filters without complexity.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                3. Export, backtest, optimize
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Export clean MQL5 code, load it into MetaTrader 5, and backtest in Strategy Tester.
                Use MT5&apos;s built-in optimization to find the best parameters. Start with a demo
                account and at least 6 months of historical data.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Which template is right for you?</h2>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 pr-4 text-[#94A3B8] font-medium"></th>
                  <th className="text-left py-3 px-3 text-[#94A3B8] font-medium">Market</th>
                  <th className="text-left py-3 px-3 text-[#94A3B8] font-medium">Complexity</th>
                  <th className="text-left py-3 pl-3 text-[#94A3B8] font-medium">Key strength</th>
                </tr>
              </thead>
              <tbody className="text-[#CBD5E1]">
                {[
                  ["Range Breakout", "Session opens", "Simple", "Clear entry rules"],
                  ["EMA Crossover", "Trending", "Simple", "Catches big moves"],
                  ["Trend Pullback", "Trending", "Moderate", "Better entries in trends"],
                  ["RSI Reversal", "Range-bound", "Simple", "Higher win rate"],
                  ["MACD Crossover", "Momentum", "Simple", "Momentum confirmation"],
                ].map(([name, market, complexity, strength]) => (
                  <tr key={name} className="border-b border-[rgba(79,70,229,0.1)]">
                    <td className="py-3 pr-4 text-white font-medium">{name}</td>
                    <td className="py-3 px-3">{market}</td>
                    <td className="py-3 px-3">{complexity}</td>
                    <td className="py-3 pl-3">{strength}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            Not sure? Start with{" "}
            <Link
              href="/templates/moving-average-crossover-ea"
              className="text-[#22D3EE] hover:underline"
            >
              EMA Crossover
            </Link>{" "}
            — it&apos;s the simplest to understand and backtest.
          </p>
        </section>

        {/* FAQ */}
        <FAQSection questions={faqQuestions} />

        {/* Internal links */}
        <section className="mb-16 mt-16">
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Home
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link href="/product" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Product
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link href="/pricing" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Pricing
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link href="/blog" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Blog
            </Link>
            <span className="text-[#64748B]">&middot;</span>
            <Link href="/faq" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              FAQ
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Start building. Export your first bot today."
        description="Pick a template, adjust a few settings, and export clean MQL5 code to MetaTrader 5."
      />
    </div>
  );
}
