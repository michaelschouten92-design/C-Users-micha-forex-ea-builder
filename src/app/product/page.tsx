import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Product — The Simplest Way to Build an MT5 Expert Advisor | AlgoStudio",
  description:
    "AlgoStudio is the simplest way to build an MT5 Expert Advisor. Pick a strategy template, adjust a few settings, and export clean MQL5 code. No coding required.",
  alternates: { canonical: "/product" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Product", href: "/product" },
];

const faqItems = [
  {
    q: "Do I need coding experience to use AlgoStudio?",
    a: "No. You pick a strategy template, adjust the settings you want, and export. No MQL5, Python, or any other programming knowledge required.",
  },
  {
    q: "What strategy templates are included?",
    a: "AlgoStudio includes 5 templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, and MACD Crossover. Each produces a fully functional Expert Advisor.",
  },
  {
    q: "Can I use the exported EA in live trading?",
    a: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. Backtest it in Strategy Tester and run it on any MT5 broker.",
  },
  {
    q: "Is the generated code editable?",
    a: "Yes. You get clean, well-commented MQL5 source code that you can open and modify in MetaEditor or any text editor.",
  },
  {
    q: "What makes AlgoStudio different from other EA builders?",
    a: "Most EA builders give you a blank canvas with hundreds of options. AlgoStudio starts you with a working strategy template — you only adjust what matters. Pre-configured blocks with sensible defaults instead of complex logic wiring.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan gives you full access to all templates and the builder. 1 project and 1 MQL5 export per month. No credit card required.",
  },
  {
    q: "How long does it take to build an EA?",
    a: "Most users export their first EA in under 5 minutes. Choose a template, adjust a few settings, and export. That's it.",
  },
  {
    q: "Which brokers are supported?",
    a: "The exported EA runs on any broker that supports MetaTrader 5. The output is a standard .mq5 file — no proprietary formats.",
  },
];

export default function ProductPage() {
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

          {/* Hero */}
          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              The Simplest Way to Build an MT5 Expert Advisor
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
              AlgoStudio lets you turn a trading idea into a working MetaTrader 5 bot — without
              writing a single line of code. Pick a template, adjust a few settings, export clean
              MQL5.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login?mode=register"
                className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
              >
                Start Free
              </Link>
              <Link
                href="/product/how-it-works"
                className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                See How It Works
              </Link>
            </div>
          </section>

          {/* Why AlgoStudio */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Why traders choose AlgoStudio
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-12">
              Most EA builders give you a blank canvas with hundreds of blocks and wires. You spend
              hours figuring out logic flows — before you even test your idea. AlgoStudio takes the
              opposite approach.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Fast</h3>
                <p className="text-sm text-[#94A3B8]">
                  Export your first EA in under 5 minutes. No learning curve, no tutorials needed.
                  Pick a template and go.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Simple</h3>
                <p className="text-sm text-[#94A3B8]">
                  Sensible defaults for every strategy. No 50-field forms, no complex logic wiring.
                  Only the controls that matter.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Clean output</h3>
                <p className="text-sm text-[#94A3B8]">
                  Readable, well-commented MQL5 source code. Load it in MetaTrader 5, backtest it,
                  edit it. The code is yours.
                </p>
              </div>
            </div>
          </section>

          {/* Templates */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              5 strategy templates, ready to export
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-10">
              Each template produces a fully functional Expert Advisor with ATR-based stop loss,
              take profit based on risk-reward ratio, and proper position sizing — all
              pre-configured.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  name: "EMA Crossover",
                  type: "Trend Following",
                  color: "#A78BFA",
                  desc: "Enter when fast EMA crosses slow EMA. Set your EMA periods, risk %, and ATR stop loss.",
                },
                {
                  name: "RSI Reversal",
                  type: "Mean Reversion",
                  color: "#22D3EE",
                  desc: "Buy oversold, sell overbought. Set RSI period, OB/OS levels, and risk %.",
                },
                {
                  name: "Range Breakout",
                  type: "Breakout",
                  color: "#F59E0B",
                  desc: "Trade the breakout of a recent price range. Set the lookback period, risk %, and ATR stop loss.",
                },
                {
                  name: "Trend Pullback",
                  type: "Trend Following",
                  color: "#34D399",
                  desc: "Wait for a pullback in a trending market. Uses EMA for trend + RSI for entry timing.",
                },
                {
                  name: "MACD Crossover",
                  type: "Momentum",
                  color: "#F472B6",
                  desc: "Enter on MACD signal line crossover. Configurable fast/slow EMA and signal periods.",
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                      {t.type}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t.name}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-center mt-8">
              <Link
                href="/templates"
                className="text-sm text-[#A78BFA] font-medium hover:underline"
              >
                View template details &rarr;
              </Link>
            </p>
          </section>

          {/* Visual Builder */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              A visual builder designed for clarity
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-10">
              No tangled node graphs or hundreds of configuration options. AlgoStudio shows you
              exactly what your EA does — and only the settings you can change.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">What you see</h3>
                <ul className="space-y-3 text-sm text-[#94A3B8]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] mt-0.5">&#10003;</span>
                    Your strategy flow as a clear visual diagram
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] mt-0.5">&#10003;</span>
                    Settings panel with only the parameters that matter
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#22D3EE] mt-0.5">&#10003;</span>
                    Real-time preview of your strategy logic
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">What you don&apos;t need</h3>
                <ul className="space-y-3 text-sm text-[#94A3B8]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] mt-0.5">&#10007;</span>
                    No complex logic programming
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] mt-0.5">&#10007;</span>
                    No tangled node graphs
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] mt-0.5">&#10007;</span>
                    No 50-field configuration forms
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Export */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Export clean MQL5 code
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-10">
              One click, one file. You get a standard .mq5 Expert Advisor that compiles in
              MetaEditor and runs on any MT5 broker.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Standard .mq5 format",
                  desc: "Compatible with every MT5 broker. No proprietary formats or plugins required.",
                },
                {
                  title: "Well-commented code",
                  desc: "Every section is explained. Understand what the code does, modify it if you want.",
                },
                {
                  title: "Built-in risk management",
                  desc: "ATR-based stop loss, take profit based on risk-reward ratio, and percentage-based position sizing.",
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
            <p className="text-center mt-8">
              <Link
                href="/product/mt5-export"
                className="text-sm text-[#A78BFA] font-medium hover:underline"
              >
                Learn more about the export process &rarr;
              </Link>
            </p>
          </section>

          {/* Who is it for */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Built for traders, not developers
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-10">
              AlgoStudio is designed for people who trade — and want to automate their strategies
              without learning to code.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  title: "Forex traders",
                  desc: "You have a strategy that works manually. Now you want to automate it and backtest it properly in MT5.",
                },
                {
                  title: "Algo-curious beginners",
                  desc: "You've heard about algorithmic trading but don't know MQL5. AlgoStudio removes the coding barrier entirely.",
                },
                {
                  title: "Strategy testers",
                  desc: "You want to quickly test variations of a strategy. Export, backtest, adjust, repeat — in minutes, not days.",
                },
                {
                  title: "Experienced traders",
                  desc: "You know what you want but don't want to spend hours in MetaEditor. Get a working EA fast, then customize the code.",
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

          {/* Comparison */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              How AlgoStudio compares
            </h2>
            <p className="text-[#94A3B8] text-center max-w-2xl mx-auto mb-10">
              AlgoStudio isn&apos;t trying to be the most powerful EA builder. It&apos;s trying to
              be the simplest one that still produces real, working Expert Advisors.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(79,70,229,0.2)]">
                    <th className="text-left py-3 px-4 text-[#64748B] font-medium">Feature</th>
                    <th className="text-center py-3 px-4 text-[#A78BFA] font-medium">AlgoStudio</th>
                    <th className="text-center py-3 px-4 text-[#64748B] font-medium">
                      Complex EA Builders
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#94A3B8]">
                  {[
                    ["Time to first EA", "< 5 minutes", "Hours to days"],
                    ["Coding required", "None", "Often required"],
                    ["Starting point", "Working templates", "Blank canvas"],
                    ["Settings per strategy", "Key settings with defaults", "50+ fields"],
                    ["Output format", "Clean MQL5", "Varies"],
                    ["Risk management", "Built-in", "Manual setup"],
                    ["Free tier", "Yes", "Rarely"],
                  ].map(([feature, algo, others]) => (
                    <tr key={feature} className="border-b border-[rgba(79,70,229,0.1)]">
                      <td className="py-3 px-4 text-[#CBD5E1]">{feature}</td>
                      <td className="py-3 px-4 text-center text-[#22D3EE]">{algo}</td>
                      <td className="py-3 px-4 text-center">{others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-center mt-8">
              <Link
                href="/compare/algostudio-vs-complex-ea-builders"
                className="text-sm text-[#A78BFA] font-medium hover:underline"
              >
                See full comparison &rarr;
              </Link>
            </p>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Start building your Expert Advisor today"
        description="Pick a template, adjust a few settings, and export clean MQL5 code. No credit card required."
      />

      <Footer />
    </div>
  );
}
