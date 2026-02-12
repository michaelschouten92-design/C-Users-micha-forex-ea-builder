import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "How It Works — Build an MT5 EA in 3 Steps | AlgoStudio",
  description:
    "Learn how AlgoStudio works: choose a strategy template, adjust a few settings, and export clean MQL5 code. Build your first MT5 Expert Advisor in under 5 minutes.",
  alternates: { canonical: "/product/how-it-works" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Product", href: "/product" },
  { name: "How It Works", href: "/product/how-it-works" },
];

export default function HowItWorksPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Build an MT5 Expert Advisor with AlgoStudio",
    description:
      "Build your first MT5 Expert Advisor in 3 simple steps using AlgoStudio. No coding required.",
    totalTime: "PT5M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Choose a strategy template",
        text: "Pick from 5 proven strategy templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, or MACD Crossover. Each comes with sensible defaults that work out of the box.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Adjust a few settings",
        text: "Set your risk percentage, stop loss multiplier, and take profit ratio. Optional advanced toggles for trend filters and session timing. Each template has sensible defaults for every setting.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Export and test in MetaTrader 5",
        text: "Click Export to download a clean .mq5 file. Open it in MetaTrader 5, compile in MetaEditor, and run it in the Strategy Tester to backtest your strategy.",
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              From trading idea to working EA in 3 steps
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              No coding. No complex configuration. AlgoStudio turns your strategy into a real
              MetaTrader 5 Expert Advisor in under 5 minutes.
            </p>
          </section>

          {/* Step 1 */}
          <section className="mb-20">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                1
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Choose a strategy template</h2>
                <p className="text-[#94A3B8] mb-6 leading-relaxed">
                  AlgoStudio starts you with a working strategy — not a blank canvas. Pick from 5
                  proven templates, each designed around a different trading approach.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    {
                      name: "EMA Crossover",
                      desc: "Trend following with moving average crossovers",
                    },
                    {
                      name: "RSI Reversal",
                      desc: "Mean reversion based on RSI overbought/oversold",
                    },
                    { name: "Range Breakout", desc: "Breakout trading of price ranges" },
                    { name: "Trend Pullback", desc: "Enter on pullbacks in trending markets" },
                    { name: "MACD Crossover", desc: "Momentum-based entries on MACD signals" },
                  ].map((t) => (
                    <div
                      key={t.name}
                      className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-lg p-4"
                    >
                      <h3 className="text-sm font-semibold text-white mb-1">{t.name}</h3>
                      <p className="text-xs text-[#94A3B8]">{t.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[#94A3B8] mt-4">
                  Every template includes sensible defaults for all parameters. You can export
                  immediately or customize first —{" "}
                  <Link href="/templates" className="text-[#A78BFA] hover:underline">
                    explore all templates
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section className="mb-20">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                2
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Adjust a few settings</h2>
                <p className="text-[#94A3B8] mb-6 leading-relaxed">
                  Each template has sensible defaults. Set your risk percentage, stop loss
                  multiplier, and take profit ratio. That&apos;s usually all you need to change.
                </p>
                <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-4">Typical settings</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Risk per trade", example: "1-2% of account balance" },
                      { label: "Stop loss", example: "ATR multiplier (e.g. 1.5x ATR)" },
                      { label: "Take profit", example: "Risk-reward ratio (e.g. 2:1)" },
                      { label: "Strategy parameters", example: "EMA periods, RSI levels, etc." },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-sm">
                        <span className="text-[#CBD5E1]">{s.label}</span>
                        <span className="text-[#64748B]">{s.example}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[#94A3B8] mt-4">
                  Want more control? Toggle advanced settings for trend filters, session timing, and
                  trailing stops. But you never have to — the defaults work.
                </p>
              </div>
            </div>
          </section>

          {/* Step 3 */}
          <section className="mb-20">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                3
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Export & test in MetaTrader 5
                </h2>
                <p className="text-[#94A3B8] mb-6 leading-relaxed">
                  Click Export to download your .mq5 file. It&apos;s a standard MetaTrader 5 Expert
                  Advisor — open it in MetaEditor, compile, and run it in the Strategy Tester.
                </p>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">What you get</h3>
                  <ul className="space-y-2 text-sm text-[#94A3B8]">
                    {[
                      "A single .mq5 file — no dependencies, no external libraries",
                      "Clean, well-commented MQL5 source code",
                      "Built-in risk management (position sizing, stop loss, take profit)",
                      "Compatible with any MT5 broker",
                      "Ready for backtesting in the MT5 Strategy Tester",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#22D3EE] mt-0.5">&#10003;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-[#94A3B8] mt-4">
                  <Link href="/product/mt5-export" className="text-[#A78BFA] hover:underline">
                    Learn more about the export process &rarr;
                  </Link>
                </p>
              </div>
            </div>
          </section>

          {/* After export */}
          <section className="mb-20 bg-[#1A0626]/30 border border-[rgba(79,70,229,0.15)] rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">What happens after export?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Backtest</h3>
                <p className="text-sm text-[#94A3B8]">
                  Load your EA in the MT5 Strategy Tester. Test it across different time periods,
                  symbols, and market conditions.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Optimize</h3>
                <p className="text-sm text-[#94A3B8]">
                  Use the MT5 optimizer to find the best parameter combinations. Then come back to
                  AlgoStudio and adjust your settings.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Demo trade</h3>
                <p className="text-sm text-[#94A3B8]">
                  Run your EA on a demo account to verify it works in real-time market conditions
                  before risking real money.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Go live</h3>
                <p className="text-sm text-[#94A3B8]">
                  When you&apos;re confident in your strategy, move it to a live account. The EA
                  works with any MT5 broker.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <CTASection
        title="Ready to build your first EA?"
        description="Pick a template and export clean MQL5 code in under 5 minutes. No credit card required."
      />

      <Footer />
    </div>
  );
}
