import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Strategy Templates | 10 Ready-to-Evaluate MT5 Expert Advisors | AlgoStudio",
  description:
    "Start with a proven template, export a working MT5 Expert Advisor, and evaluate it instantly with health scoring and Monte Carlo simulation. 10 templates including EMA Crossover, RSI Reversal, Bollinger Bands, MACD, Ichimoku Cloud, and more.",
  alternates: { canonical: "/templates" },
  openGraph: {
    title: "Strategy Templates | 10 Ready-to-Evaluate MT5 Expert Advisors | AlgoStudio",
    description:
      "Start with a proven template, export a working MT5 Expert Advisor, and evaluate it with health scoring and Monte Carlo simulation. No coding required.",
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
    a: "Yes. All 10 templates are available on the free plan. You can build, customize, and export a working Expert Advisor — no credit card required. The free plan includes 1 project and 1 export per month.",
  },
  {
    q: "Can I change the template settings?",
    a: "Absolutely. Templates are starting points with sensible defaults. You can adjust every setting — indicator periods, risk percentage, stop loss, take profit, and advanced toggles — before exporting.",
  },
  {
    q: "Do I need coding experience?",
    a: "No. You pick a template, adjust the settings you want, and export. No MQL5, Python, or any other programming knowledge required.",
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
    name: "RSI Reversal",
    type: "Mean Reversion",
    description:
      "Buy oversold, sell overbought. Drag an RSI indicator, connect buy and sell conditions, and add ATR-based stop loss and take profit nodes. Fully customizable with individual blocks.",
    href: "/templates/rsi-reversal-ea",
    color: "#22D3EE",
    basicFields: "RSI Period, OB Level, OS Level, Risk %, SL (ATR)",
    advanced: "Session filter, Trend filter",
  },
  {
    name: "Range Breakout",
    type: "Breakout",
    description:
      "Trade the breakout of a recent price range. Use the Range Breakout price action block with buy and sell conditions, ATR stop loss, and take profit nodes.",
    href: "/templates/range-breakout-ea",
    color: "#F59E0B",
    basicFields: "Range Period, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "London session filter, Cancel opposite order",
  },
  {
    name: "Trend Pullback",
    type: "Trend Following",
    description:
      "Wait for a trend (EMA direction) then enter on an RSI pullback. Set the trend EMA, RSI dip level, risk %, and ATR stop loss.",
    href: "/templates/trend-pullback-ea",
    color: "#10B981",
    basicFields: "Trend EMA, RSI Period, Dip Level, Risk %, SL (ATR)",
    advanced: "London session filter, EMA buffer",
  },
  {
    name: "MACD Crossover",
    type: "Momentum",
    description:
      "Enter on MACD signal line crossover. Drag a MACD indicator, connect buy and sell conditions, and add ATR-based risk management nodes. Clean signal cross logic.",
    href: "/templates/macd-crossover-ea",
    color: "#FB923C",
    basicFields: "Fast/Slow/Signal, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "HTF trend filter",
  },
  {
    name: "RSI/MACD Divergence",
    type: "Divergence",
    description:
      "Detect RSI or MACD divergence with price action. Enter when momentum diverges from price — a classic reversal signal. Set lookback, threshold, risk %, and ATR stop loss.",
    href: "/templates/rsi-macd-divergence-ea",
    color: "#EF4444",
    basicFields: "Indicator, Lookback, Threshold, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "Trend filter, Min divergence bars",
  },
  {
    name: "Bollinger Band Reversal",
    type: "Mean Reversion",
    description:
      "Enter when price touches the upper or lower Bollinger Band. Uses a standalone BB indicator with buy and sell conditions, ATR stop loss, and take profit nodes.",
    href: "/templates/bollinger-band-reversal-ea",
    color: "#818CF8",
    basicFields: "BB Period, BB Deviation, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "Session filter",
  },
  {
    name: "ADX Trend Strength",
    type: "Trend Following",
    description:
      "Enter when ADX confirms a strong trend via DI crossover. Uses a standalone ADX indicator with buy and sell conditions and ATR-based risk management.",
    href: "/templates/adx-trend-strength-ea",
    color: "#34D399",
    basicFields: "ADX Period, Threshold, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "Session filter",
  },
  {
    name: "Stochastic Reversal",
    type: "Mean Reversion",
    description:
      "Buy oversold, sell overbought using the Stochastic oscillator. Uses a standalone Stochastic indicator with buy and sell conditions and ATR-based risk management.",
    href: "/templates/stochastic-reversal-ea",
    color: "#F472B6",
    basicFields: "K Period, D Period, Slowing, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "Session filter",
  },
  {
    name: "Ichimoku Cloud",
    type: "Trend Following",
    description:
      "Enter on Ichimoku Cloud breakouts — buy above the cloud, sell below. Uses a standalone Ichimoku indicator with buy and sell conditions and ATR-based risk management.",
    href: "/templates/ichimoku-cloud-ea",
    color: "#FBBF24",
    basicFields: "Tenkan, Kijun, Senkou B, Risk %, SL (ATR), TP (R-multiple)",
    advanced: "Session filter",
  },
];

export default function TemplatesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "MT5 EA Builder Templates",
    description:
      "10 ready-to-export MetaTrader 5 Expert Advisor templates for the AlgoStudio EA builder. EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, MACD Crossover, Divergence, Bollinger Bands, ADX Trend, Stochastic, and Ichimoku Cloud.",
    url: `${process.env.AUTH_URL || "https://algo-studio.com"}/templates`,
  };

  return (
    <div id="main-content" className="min-h-screen pt-24 pb-16">
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
            10 strategy templates, ready to export
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Pick a template, adjust a few settings, and export a working MetaTrader 5 Expert
            Advisor. Each template includes built-in risk management with ATR-based stop loss, take
            profit based on risk-reward ratio, and proper position sizing. No coding required.
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
                    Get started &rarr;
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
                Crossover or Ichimoku Cloud. Like buying dips? Try RSI Reversal or Stochastic
                Reversal. Want session-based entries? Go with Range Breakout.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">2. Adjust a few settings</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Each template has sensible defaults for every setting. Change what you want, or
                leave the defaults — every template exports a valid EA immediately. Optional
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
                  ["RSI/MACD Divergence", "Reversals", "Moderate", "Early reversal signals"],
                  ["Bollinger Band Reversal", "Range-bound", "Simple", "Volatility-based entries"],
                  ["ADX Trend Strength", "Trending", "Simple", "Trend confirmation"],
                  ["Stochastic Reversal", "Range-bound", "Simple", "Oversold/overbought signals"],
                  ["Ichimoku Cloud", "Trending", "Moderate", "Multi-signal trend system"],
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
      </article>

      <CTASection
        title="Pick a template and evaluate your strategy"
        description="Export a working Expert Advisor, backtest it in MT5, then upload for instant health scoring and Monte Carlo validation. Free to start."
      />

      <Footer />
    </div>
  );
}
