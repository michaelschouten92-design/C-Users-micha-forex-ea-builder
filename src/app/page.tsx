import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PLANS, formatPrice } from "@/lib/plans";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "AlgoStudio — Build Your MT5 Expert Advisor. No Coding Required.",
  description:
    "The simplest way to build an MT5 Expert Advisor. Pick a strategy template, adjust a few settings, and export clean MQL5 code. No coding required. Free to start.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/app");
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AlgoStudio",
    description:
      "The simplest way to build an MT5 Expert Advisor. Pick a strategy template, adjust a few settings, and export clean MQL5 code. No coding required.",
    url: "https://algo-studio.com",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "39",
      priceCurrency: "EUR",
      offerCount: 2,
    },
  };

  const faqItems = [
    {
      q: "Do I need coding experience to use AlgoStudio?",
      a: "No. You pick a strategy template, adjust 3-5 settings, and export. No MQL5, Python, or any other programming knowledge required.",
    },
    {
      q: "What do I get with the free plan?",
      a: "Full access to all templates and the visual builder. 1 project and 1 MQL5 export per month. No credit card required.",
    },
    {
      q: "Can I use the exported EA in live trading?",
      a: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. Backtest it in Strategy Tester and run it on any MT5 broker.",
    },
    {
      q: "What strategy templates are available?",
      a: "AlgoStudio includes 5 templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, and MACD Crossover. Each produces a fully functional Expert Advisor with built-in risk management.",
    },
    {
      q: "Is the generated MQL5 code editable?",
      a: "Yes. You get clean, well-commented MQL5 source code that you can open and modify in MetaEditor or any text editor.",
    },
    {
      q: "How is AlgoStudio different from other EA builders?",
      a: "Most EA builders give you a blank canvas with hundreds of options. AlgoStudio starts you with a working strategy template — you only adjust what matters. No drag-and-drop wiring, no block programming, no 50-field forms.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div id="main-content" className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <SiteNav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">No coding required</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Build your MT5 Expert Advisor.
            <br />
            <span className="text-[#A78BFA]">No coding required.</span>
          </h1>

          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-10">
            The simplest way to turn a trading idea into a working MT5 bot. Pick a strategy
            template, adjust a few settings, and export clean MQL5 code.
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

          {/* Builder Preview */}
          <div className="mt-16 relative overflow-hidden">
            <div className="absolute inset-4 bg-gradient-to-r from-[#4F46E5]/20 via-[#A78BFA]/20 to-[#22D3EE]/20 blur-3xl -z-10" />
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl overflow-hidden shadow-2xl shadow-[#4F46E5]/10">
              <div className="bg-[#0D0117] px-4 py-3 flex items-center gap-2 border-b border-[rgba(79,70,229,0.2)]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#22C55E]/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-[#1A0626] rounded-md px-3 py-1 text-xs text-[#64748B] max-w-xs mx-auto">
                    algo-studio.com/builder
                  </div>
                </div>
              </div>
              <Image
                src="/demo-screenshot.png"
                alt="AlgoStudio strategy builder — pick a template, adjust settings, export MQL5"
                width={3830}
                height={1820}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="w-full"
                quality={85}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Positioning Statement */}
      <section className="py-16 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl md:text-2xl text-[#CBD5E1] font-medium leading-relaxed">
            AlgoStudio is built for traders who want to automate — not for developers who want
            another IDE. Start with a working template, adjust what matters, export.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Most EA builders weren&apos;t made for traders
          </h2>
          <p className="text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
            They give you a blank canvas with hundreds of blocks, nodes, and wires. You spend hours
            figuring out logic flows and debugging configurations — before you even test your idea.
            AlgoStudio takes the opposite approach: start with a working strategy, adjust what
            matters, export.
          </p>
        </div>
      </section>

      {/* Solution + Templates */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Start with a working strategy, not a blank canvas
            </h2>
            <p className="text-[#94A3B8]">
              Every template produces a fully functional Expert Advisor with built-in risk
              management. Adjust what matters, skip the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Range Breakout",
                type: "Breakout",
                description:
                  "Trade the breakout of a recent price range. Set the lookback period, risk %, and ATR stop loss. Optional London session filter.",
                color: "#F59E0B",
              },
              {
                name: "EMA Crossover",
                type: "Trend Following",
                description:
                  "Enter when fast EMA crosses slow EMA. Set your EMA periods, risk %, and ATR stop loss. Optional higher-timeframe trend filter.",
                color: "#A78BFA",
              },
              {
                name: "RSI Reversal",
                type: "Mean Reversion",
                description:
                  "Buy oversold, sell overbought. Set RSI period, OB/OS levels, and risk %. Optional session filter and trend confirmation.",
                color: "#22D3EE",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                    {t.type}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t.name}</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">{t.description}</p>
                <Link
                  href="/login?mode=register"
                  className="text-sm text-[#A78BFA] font-medium hover:underline"
                >
                  Use template &rarr;
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-sm text-[#94A3B8]">
            Plus 2 more:{" "}
            <Link href="/templates" className="text-[#22D3EE] hover:underline">
              Trend Pullback and MACD Crossover
            </Link>
          </p>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
            <p className="text-[#94A3B8]">From idea to running bot in three steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Choose a template</h3>
              <p className="text-sm text-[#94A3B8]">
                Pick from 5 proven strategies: EMA Crossover, Range Breakout, RSI Reversal, and
                more. Each comes with sensible defaults that work out of the box.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Adjust a few settings</h3>
              <p className="text-sm text-[#94A3B8]">
                Set your risk percentage, stop loss, and take profit. Optional advanced toggles for
                trend filters and session timing. No 50-field forms.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Export & test in MT5</h3>
              <p className="text-sm text-[#94A3B8]">
                Download clean MQL5 code. Load it into MetaTrader 5 Strategy Tester. Backtest,
                optimize, and go live when you&apos;re ready.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/product/how-it-works"
              className="text-sm text-[#A78BFA] font-medium hover:underline"
            >
              Learn more about how it works &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why traders choose AlgoStudio</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Templates that work instantly
              </h3>
              <p className="text-sm text-[#94A3B8]">
                Every template exports a valid EA immediately. ATR-based stop loss, risk-reward take
                profit, and proper position sizing — all pre-configured.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Only the settings that matter
              </h3>
              <p className="text-sm text-[#94A3B8]">
                3-5 basic settings per template. Optional advanced toggles when you want more
                control. No blank canvas, no guesswork.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-[#A78BFA]"
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
              <h3 className="text-lg font-semibold text-white mb-2">Clean, readable MQL5 code</h3>
              <p className="text-sm text-[#94A3B8]">
                Readable, well-commented source code. Load it into MetaTrader 5, backtest in
                Strategy Tester, or edit it further. The code is yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Snapshot */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">How AlgoStudio compares</h2>
          </div>

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
                  ["Settings per strategy", "3-5 basic", "50+ fields"],
                  ["Output format", "Clean MQL5", "Varies"],
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

          <div className="text-center mt-8">
            <Link
              href="/compare/algostudio-vs-complex-ea-builders"
              className="text-sm text-[#A78BFA] font-medium hover:underline"
            >
              See full comparison &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <details
                key={i}
                className="group bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-white font-medium text-sm list-none">
                  {item.q}
                  <svg
                    className="w-5 h-5 text-[#64748B] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-[#94A3B8] leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Simple pricing</h2>
            <p className="text-[#94A3B8]">Start free. Upgrade when you need unlimited exports.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                <h3 className="text-lg font-semibold text-white">Free</h3>
              </div>
              <div className="mt-2 mb-3">
                <span className="text-3xl font-bold text-white">{formatPrice(0, "eur")}</span>
                <span className="text-[#94A3B8] ml-2 text-sm">/ forever</span>
              </div>
              <p className="text-sm text-[#94A3B8] mb-4">Build and export your first MT5 bot.</p>
              <ul className="space-y-2 text-sm text-[#CBD5E1] mb-6 flex-1">
                {[
                  "All 5 strategy templates",
                  "Full builder access",
                  "1 project",
                  "1 export per month",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#64748B] mb-3">No credit card required.</p>
              <Link
                href="/login?mode=register"
                className="block w-full text-center py-2.5 border border-[rgba(79,70,229,0.5)] text-white rounded-lg text-sm font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                Start Free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-[#1A0626] border-2 border-[#4F46E5] rounded-xl p-6 relative flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#4F46E5] text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                <h3 className="text-lg font-semibold text-white">Pro</h3>
              </div>
              <div className="mt-2 mb-3">
                <span className="text-3xl font-bold text-white">
                  {formatPrice(PLANS.PRO.prices!.monthly.amount, "eur")}
                </span>
                <span className="text-[#94A3B8] ml-2 text-sm">/ month</span>
              </div>
              <p className="text-sm text-[#94A3B8] mb-4">Unlimited projects, unlimited exports.</p>
              <ul className="space-y-2 text-sm text-[#CBD5E1] mb-6 flex-1">
                {[
                  "Unlimited projects",
                  "Unlimited exports",
                  "All strategy templates",
                  "Priority support",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#64748B] mb-3">
                Also available at {formatPrice(PLANS.PRO.prices!.yearly.amount, "eur")}/year.
              </p>
              <Link
                href="/pricing"
                className="block w-full text-center py-2.5 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#6366F1] transition-colors"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start building your Expert Advisor today
          </h2>
          <p className="text-[#94A3B8] mb-8">
            Pick a template, adjust a few settings, and export clean MQL5 code. No credit card
            required.
          </p>
          <Link
            href="/login?mode=register"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Start Free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
