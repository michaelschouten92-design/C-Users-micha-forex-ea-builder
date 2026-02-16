import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Visual Trading Bot Builder for MT5 | AlgoStudio",
  description:
    "Build MT5 trading bots visually with AlgoStudio. No coding required. Pick a strategy template, customize with a visual interface, and export clean MQL5 & MQL4 code.",
  alternates: { canonical: "/visual-trading-bot-builder" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Visual Trading Bot Builder", href: "/visual-trading-bot-builder" },
];

const faqItems = [
  {
    q: "What makes AlgoStudio a 'visual' builder?",
    a: "AlgoStudio shows your strategy as a clear visual flow diagram. You see exactly how your EA works — entry logic, exit logic, risk management — without reading code.",
  },
  {
    q: "How does AlgoStudio's visual builder work?",
    a: "AlgoStudio uses pre-configured strategy blocks that you can add to a visual canvas. Unlike complex node editors with hundreds of individual blocks to wire together, AlgoStudio's blocks come with sensible defaults — so you focus on settings, not wiring.",
  },
  {
    q: "Can I build any strategy visually?",
    a: "AlgoStudio supports 5 proven strategy templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, and MACD Crossover. For unique logic, you can customize the exported MQL5/MQL4 code.",
  },
  {
    q: "What does the visual builder show me?",
    a: "You see your strategy flow, current parameter values, and which features are enabled. The visual interface gives you a clear overview of your EA's logic without code.",
  },
  {
    q: "Do I need MetaTrader 5 installed?",
    a: "You need MT5 (or MT4) to compile and run the exported EA. AlgoStudio itself runs in your browser — no installation required for building.",
  },
];

export default function VisualBotBuilderPage() {
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
              Build MT5 & MT4 trading bots visually
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              See your strategy as a clear visual flow. Adjust settings with simple controls. Export
              clean MQL5 or MQL4 code to MetaTrader. No coding required.
            </p>
            <Link
              href="/login?mode=register"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Building Free
            </Link>
          </section>

          {/* What visual means */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6">
              Visual building without the complexity
            </h2>
            <div className="space-y-6 text-[#94A3B8] leading-relaxed">
              <p>
                Most &quot;visual&quot; EA builders are actually complex node editors. They replace
                code with blocks and wires — but the complexity remains. You still need to
                understand programming concepts to connect everything correctly.
              </p>
              <p>
                AlgoStudio is different. Strategy blocks come pre-configured with sensible defaults.
                The visual builder shows you what your EA does and lets you adjust the settings that
                matter — without complex logic wiring.
              </p>
            </div>
          </section>

          {/* How the visual builder works */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">How the visual builder works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Strategy flow</h3>
                <p className="text-sm text-[#94A3B8]">
                  See your strategy as a clear diagram: entry conditions, exit conditions, and risk
                  management rules. Understand your EA at a glance.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Settings panel</h3>
                <p className="text-sm text-[#94A3B8]">
                  Adjust key parameters with simple controls. Risk percentage, stop loss multiplier,
                  take profit ratio. Optional advanced toggles for more control.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">One-click export</h3>
                <p className="text-sm text-[#94A3B8]">
                  When you&apos;re satisfied, click Export to download your .mq5 or .mq4 file. Load
                  it into MetaTrader 5, compile, and backtest.
                </p>
              </div>
            </div>
          </section>

          {/* Visual vs traditional */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">
              AlgoStudio vs traditional visual builders
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(79,70,229,0.2)]">
                    <th className="text-left py-3 px-4 text-[#64748B] font-medium">Aspect</th>
                    <th className="text-center py-3 px-4 text-[#A78BFA] font-medium">AlgoStudio</th>
                    <th className="text-center py-3 px-4 text-[#64748B] font-medium">
                      Node-based builders
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#94A3B8]">
                  {[
                    ["Interface", "Template + settings", "Nodes + wires"],
                    ["Learning curve", "Minutes", "Hours to days"],
                    ["Starting point", "Working strategy", "Empty canvas"],
                    ["Configuration", "Key settings with defaults", "Dozens of connections"],
                    ["Debugging", "Not needed", "Frequent"],
                    ["Output", "Clean MQL5/MQL4 code", "Varies"],
                  ].map(([aspect, algo, others]) => (
                    <tr key={aspect} className="border-b border-[rgba(79,70,229,0.1)]">
                      <td className="py-3 px-4 text-[#CBD5E1]">{aspect}</td>
                      <td className="py-3 px-4 text-center text-[#22D3EE]">{algo}</td>
                      <td className="py-3 px-4 text-center">{others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Templates */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">Build these strategies visually</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  name: "EMA Crossover",
                  desc: "Trend following with moving average crossovers",
                  color: "#A78BFA",
                },
                {
                  name: "RSI Reversal",
                  desc: "Mean reversion based on RSI levels",
                  color: "#22D3EE",
                },
                {
                  name: "Range Breakout",
                  desc: "Breakout trading of price ranges",
                  color: "#F59E0B",
                },
                {
                  name: "Trend Pullback",
                  desc: "Pullback entries in trending markets",
                  color: "#34D399",
                },
                {
                  name: "MACD Crossover",
                  desc: "Momentum-based MACD signal entries",
                  color: "#F472B6",
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <h3 className="text-base font-semibold text-white">{t.name}</h3>
                  </div>
                  <p className="text-sm text-[#94A3B8]">{t.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-center mt-8">
              <Link
                href="/templates"
                className="text-sm text-[#A78BFA] font-medium hover:underline"
              >
                View all templates &rarr;
              </Link>
            </p>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Build your trading bot visually"
        description="Pick a template and export clean MQL5/MQL4 code in minutes. No coding required. Free to start."
      />

      <Footer />
    </div>
  );
}
