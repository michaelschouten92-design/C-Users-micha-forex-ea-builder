import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";

export const metadata: Metadata = {
  title: "Visual Strategy Builder — Drag-and-Drop EA Builder for MT5",
  description:
    "Design MetaTrader 5 Expert Advisors with a drag-and-drop canvas. Connect indicator blocks, timing conditions, and trade actions — no coding needed.",
  alternates: { canonical: "/visual-strategy-builder" },
  openGraph: {
    title: "Visual Strategy Builder — Drag-and-Drop EA Builder for MT5",
    description:
      "Design MetaTrader 5 Expert Advisors with a drag-and-drop canvas. Connect blocks to build complete trading strategies visually.",
    url: "/visual-strategy-builder",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Visual Strategy Builder", href: "/visual-strategy-builder" },
];

const faqQuestions = [
  {
    q: "What indicators are available in the visual builder?",
    a: "AlgoStudio supports Moving Average (SMA/EMA), RSI, MACD, Bollinger Bands, ATR, ADX, Stochastic, candlestick patterns, support/resistance zones, and range breakouts. More indicators are added regularly.",
  },
  {
    q: "Can I combine multiple conditions for entry and exit?",
    a: "Yes. You can connect multiple indicator blocks and timing blocks to create complex strategies. For example, combine a Moving Average crossover with an RSI filter and session timing — all by connecting blocks on the canvas.",
  },
  {
    q: "Does the visual builder support risk management?",
    a: "Absolutely. Dedicated blocks for Stop Loss (fixed pips or ATR-based), Take Profit (fixed pips, risk-reward ratio, or ATR-based), position sizing (fixed lots or risk percentage), and daily trade limits are all available.",
  },
  {
    q: "Can I edit the generated MQL5 code?",
    a: "Yes. AlgoStudio exports clean, well-commented MQL5 source code. You can open it in MetaEditor and make further customizations if needed. The code includes clearly marked input parameters for MT5 optimization.",
  },
  {
    q: "How is this different from other EA builders?",
    a: "AlgoStudio focuses specifically on MetaTrader 5 with a clean visual interface. The generated MQL5 code is production-quality — not a black box. You get full source code you can inspect, modify, and trust.",
  },
];

const blockCategories = [
  {
    name: "Timing",
    description: "Control when your EA is active",
    blocks: ["Always", "Trading Sessions", "Custom Times", "Day of Week"],
    color: "#22D3EE",
  },
  {
    name: "Indicators",
    description: "Define conditions using technical analysis",
    blocks: ["Moving Average", "RSI", "MACD", "Bollinger Bands", "ATR", "ADX", "Stochastic"],
    color: "#A78BFA",
  },
  {
    name: "Price Action",
    description: "React to candlestick patterns and price levels",
    blocks: ["Candlestick Patterns", "Support/Resistance", "Range Breakout"],
    color: "#F59E0B",
  },
  {
    name: "Trading",
    description: "Execute and manage trades",
    blocks: ["Place Buy", "Place Sell", "Close Position"],
    color: "#10B981",
  },
  {
    name: "Trade Management",
    description: "Protect your capital with risk rules",
    blocks: ["Stop Loss", "Take Profit", "Trailing Stop", "Break Even", "Max Trades Per Day"],
    color: "#EF4444",
  },
];

export default function VisualStrategyBuilderPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
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

        {/* Hero */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">Drag & drop</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Drag-and-Drop Strategy Builder for MetaTrader 5
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            AlgoStudio&apos;s visual canvas lets you design complete Expert Advisor strategies by
            connecting blocks. Choose from indicators, timing conditions, trade actions, and risk
            management — all without writing code. See your entire strategy logic at a glance.
          </p>
        </header>

        {/* Block Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Building Blocks for Any Strategy</h2>
          <p className="text-[#94A3B8] mb-8 leading-relaxed">
            Every strategy is built from five categories of blocks. Drag them onto the canvas and
            connect them to define your trading logic.
          </p>
          <div className="space-y-6">
            {blockCategories.map((cat) => (
              <div
                key={cat.name}
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="text-lg font-semibold text-white">{cat.name}</h3>
                </div>
                <p className="text-sm text-[#94A3B8] mb-3">{cat.description}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.blocks.map((block) => (
                    <span
                      key={block}
                      className="px-3 py-1 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] rounded-lg text-xs text-[#CBD5E1]"
                    >
                      {block}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Advantages */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Why Visual Beats Code</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Build Strategies in Minutes, Not Days
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Writing a proper EA in MQL5 takes days or weeks — handling indicator buffers, tick
                events, order management, and error handling. With the visual builder, you focus on
                your strategy logic while AlgoStudio handles the technical complexity.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Syntax Errors, Ever</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Forgotten semicolons, mismatched brackets, wrong function signatures — these are
                problems of the past. The visual builder only allows valid connections, so your
                generated code is always syntactically correct and ready to compile.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">See the Full Picture</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                In code, understanding an EA means reading through hundreds of lines across multiple
                functions. In the visual builder, your entire strategy is visible on one canvas —
                timing, conditions, entries, exits, and risk management at a glance.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Rapid Experimentation</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Want to swap RSI for Stochastic? Add an ADX filter? Change from fixed stop loss to
                ATR-based? Each change takes seconds — drag a new block, connect it, and re-export.
                Test more ideas in one afternoon than you could code in a week.
              </p>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Start Building</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/no-code-ea-builder"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">No-Code EA Builder</h3>
              <p className="text-sm text-[#94A3B8]">
                Learn how no-code compares to traditional MQL5 development.
              </p>
            </Link>
            <Link
              href="/templates"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">EA Templates</h3>
              <p className="text-sm text-[#94A3B8]">
                Start with a proven strategy template and customize it.
              </p>
            </Link>
            <Link
              href="/templates/moving-average-crossover-ea"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">MA Crossover Template</h3>
              <p className="text-sm text-[#94A3B8]">
                Classic trend-following strategy with customizable parameters.
              </p>
            </Link>
            <Link
              href="/templates/rsi-ea-template"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">RSI EA Template</h3>
              <p className="text-sm text-[#94A3B8]">
                Mean reversion strategy using RSI overbought/oversold levels.
              </p>
            </Link>
            <Link
              href="/templates/breakout-ea-template"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Breakout EA Template</h3>
              <p className="text-sm text-[#94A3B8]">
                Trade Asian range breakouts at the London open.
              </p>
            </Link>
            <Link
              href="/pricing"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Pricing</h3>
              <p className="text-sm text-[#94A3B8]">
                Start free with 3 projects and 2 exports per month.
              </p>
            </Link>
          </div>
        </section>

        <FAQSection questions={faqQuestions} />
      </article>

      <CTASection
        title="Design your strategy visually"
        description="Start building Expert Advisors with the drag-and-drop canvas. Free to start, no credit card required."
      />
    </div>
  );
}
