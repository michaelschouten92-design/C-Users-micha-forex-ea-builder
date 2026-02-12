import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Trading Strategy Templates for MT5 | AlgoStudio",
  description:
    "5 ready-to-use trading strategy templates for MetaTrader 5. EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, and MACD Crossover. Export clean MQL5 code.",
  alternates: { canonical: "/trading-strategy-templates-mt5" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Trading Strategy Templates", href: "/trading-strategy-templates-mt5" },
];

const faqItems = [
  {
    q: "What are strategy templates?",
    a: "Strategy templates are pre-built trading strategies that you can customize and export as MT5 Expert Advisors. Each template includes entry/exit logic, risk management, and sensible default settings.",
  },
  {
    q: "Can I customize the templates?",
    a: "Yes. Each template has adjustable settings (risk %, stop loss, take profit, strategy parameters) with sensible defaults. You can also toggle advanced features like trend filters and session timing.",
  },
  {
    q: "Are the templates profitable?",
    a: "Templates provide a starting point for backtesting — not guaranteed profits. Use the MT5 Strategy Tester to backtest across different markets and time periods before live trading.",
  },
  {
    q: "Which template should I start with?",
    a: "Start with EMA Crossover — it's the simplest template with the fewest settings. Once you're comfortable, try Range Breakout or RSI Reversal for different trading approaches.",
  },
  {
    q: "Can I use templates on any currency pair?",
    a: "Yes. The exported EA runs on any symbol available in your MT5 broker. Templates work across forex pairs, indices, commodities, and other MT5-supported instruments.",
  },
  {
    q: "Do templates include risk management?",
    a: "Yes. Every template includes ATR-based stop loss, configurable take profit ratios, and percentage-based position sizing. Risk management is built-in, not an afterthought.",
  },
];

export default function StrategyTemplatesPage() {
  const templates = [
    {
      name: "EMA Crossover",
      type: "Trend Following",
      color: "#A78BFA",
      description:
        "Enter when a fast EMA crosses above or below a slow EMA. A classic trend-following strategy that captures directional moves.",
      settings: [
        "Fast EMA period",
        "Slow EMA period",
        "Risk per trade (%)",
        "ATR stop loss multiplier",
        "Take profit ratio",
      ],
      advanced: ["Higher-timeframe trend filter", "Trailing stop"],
    },
    {
      name: "RSI Reversal",
      type: "Mean Reversion",
      color: "#22D3EE",
      description:
        "Buy when RSI drops below oversold levels, sell when it rises above overbought levels. Catches reversals at extremes.",
      settings: [
        "RSI period",
        "Overbought level",
        "Oversold level",
        "Risk per trade (%)",
        "ATR stop loss multiplier",
      ],
      advanced: ["EMA trend confirmation", "Session filter"],
    },
    {
      name: "Range Breakout",
      type: "Breakout",
      color: "#F59E0B",
      description:
        "Identify a price range and trade the breakout when price moves beyond it. Effective in markets that alternate between ranging and trending.",
      settings: [
        "Lookback period",
        "Risk per trade (%)",
        "ATR stop loss multiplier",
        "Take profit ratio",
      ],
      advanced: ["London session filter", "Volume confirmation"],
    },
    {
      name: "Trend Pullback",
      type: "Trend Following",
      color: "#34D399",
      description:
        "Wait for a pullback in a trending market, then enter in the trend direction. Combines EMA trend detection with RSI timing.",
      settings: [
        "EMA period",
        "RSI period",
        "Pullback RSI level",
        "Risk per trade (%)",
        "ATR stop loss multiplier",
      ],
      advanced: ["Higher-timeframe confirmation", "Trailing stop"],
    },
    {
      name: "MACD Crossover",
      type: "Momentum",
      color: "#F472B6",
      description:
        "Enter when the MACD line crosses the signal line. Captures momentum shifts using the classic MACD indicator configuration.",
      settings: [
        "Fast EMA period",
        "Slow EMA period",
        "Signal period",
        "Risk per trade (%)",
        "ATR stop loss multiplier",
      ],
      advanced: ["Zero-line filter", "Trend filter"],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Trading Strategy Templates for MetaTrader 5
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              5 ready-to-use strategy templates. Each one produces a fully functional Expert Advisor
              with built-in risk management. Pick a template, adjust settings, export MQL5 code.
            </p>
            <Link
              href="/login?mode=register"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Building Free
            </Link>
          </section>

          {/* All templates */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-10 text-center">
              All strategy templates
            </h2>
            <div className="space-y-8">
              {templates.map((t) => (
                <div
                  key={t.name}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 md:p-8"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                      {t.type}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{t.name}</h3>
                  <p className="text-[#94A3B8] mb-6 leading-relaxed">{t.description}</p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Basic settings</h4>
                      <ul className="space-y-1.5">
                        {t.settings.map((s) => (
                          <li key={s} className="flex items-center gap-2 text-sm text-[#94A3B8]">
                            <span className="text-[#22D3EE]">&#8226;</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Advanced options</h4>
                      <ul className="space-y-1.5">
                        {t.advanced.map((a) => (
                          <li key={a} className="flex items-center gap-2 text-sm text-[#94A3B8]">
                            <span className="text-[#64748B]">&#8226;</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* What every template includes */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              What every template includes
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Entry & exit logic",
                  desc: "Complete strategy logic with entry conditions, exit conditions, and optional signal confirmation.",
                },
                {
                  title: "Risk management",
                  desc: "ATR-based stop loss, configurable take profit, and percentage-based position sizing.",
                },
                {
                  title: "Sensible defaults",
                  desc: "Every parameter has a default value that works. Export immediately or customize first.",
                },
                {
                  title: "Clean MQL5 output",
                  desc: "Well-commented source code that compiles in MetaEditor and runs on any MT5 broker.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8]">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How to use */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              How to use a template
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Pick a template</h3>
                <p className="text-sm text-[#94A3B8]">
                  Choose the strategy that matches your trading approach. Not sure? Start with EMA
                  Crossover.
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Adjust settings</h3>
                <p className="text-sm text-[#94A3B8]">
                  Set your risk %, stop loss, and take profit. Toggle advanced options if you want
                  more control.
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Export & backtest</h3>
                <p className="text-sm text-[#94A3B8]">
                  Download your .mq5 file. Open it in MetaTrader 5 and backtest in the Strategy
                  Tester.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Start with a template today"
        description="Pick a strategy, adjust settings, export MQL5 code. Free — no credit card required."
      />

      <Footer />
    </div>
  );
}
