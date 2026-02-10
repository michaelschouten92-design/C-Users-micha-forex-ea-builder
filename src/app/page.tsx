import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PLANS, formatPrice } from "@/lib/plans";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "AlgoStudio — Build Your First MT5 Trading Bot in 5 Minutes | No-Code EA Builder",
  description:
    "The simplest way to turn a trading idea into an MT5 bot. Pick a strategy template, adjust a few settings, export clean MQL5 code, and test in MetaTrader 5. No coding required.",
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
      "The simplest no-code builder for MetaTrader 5 Expert Advisors. Pick a strategy template, adjust a few settings, and export clean MQL5 code.",
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Do I need coding experience to use AlgoStudio?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. You pick a strategy template, adjust 3-5 settings, and export. No MQL5, Python, or any other programming knowledge required.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use the exported EA in live trading?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. You can backtest it in the MT5 Strategy Tester and run it on any broker that supports MT5.",
        },
      },
      {
        "@type": "Question",
        name: "What strategy templates are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AlgoStudio includes 6 templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, MACD Crossover, and London Session Breakout. Each produces a fully functional Expert Advisor.",
        },
      },
    ],
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
            Build your first MT5 trading bot
            <br />
            <span className="text-[#A78BFA]">in 5 minutes</span>
          </h1>

          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-10">
            Pick a strategy template, adjust a few settings, and export clean MQL5 code to
            MetaTrader 5. The simplest way to turn a trading idea into a working bot.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=register"
              className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Free
            </Link>
            <Link
              href="/help"
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

      {/* Problem */}
      <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Automation shouldn&apos;t feel like engineering
          </h2>
          <p className="text-[#94A3B8] leading-relaxed max-w-2xl mx-auto">
            Most EA builders give you a blank canvas with hundreds of options. You spend hours
            figuring out blocks, wiring logic, and debugging configurations — before you even test
            your idea. AlgoStudio takes the opposite approach: start with a working strategy, adjust
            what matters, export.
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
                Pick from 6 proven strategies: EMA Crossover, Range Breakout, RSI Reversal, and
                more. Each comes with sensible defaults that work out of the box.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Adjust 3-5 settings</h3>
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
        </div>
      </section>

      {/* Template Preview */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              6 strategy templates, ready to export
            </h2>
            <p className="text-[#94A3B8]">
              Each template produces a fully functional Expert Advisor with built-in risk
              management.
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
            Plus 3 more:{" "}
            <Link href="/templates" className="text-[#22D3EE] hover:underline">
              Trend Pullback, MACD Crossover, London Session Breakout
            </Link>
          </p>
        </div>
      </section>

      {/* Why AlgoStudio */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
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
              <h3 className="text-lg font-semibold text-white mb-2">Simple defaults that work</h3>
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
              <h3 className="text-lg font-semibold text-white mb-2">Guided customization</h3>
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
              <h3 className="text-lg font-semibold text-white mb-2">Clean MQL5 export</h3>
              <p className="text-sm text-[#94A3B8]">
                Readable, well-commented source code. Load it into MetaTrader 5, backtest in
                Strategy Tester, or edit it further. The code is yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "6", label: "Strategy templates" },
              { value: "100%", label: "Valid MQL5 output" },
              { value: "< 5 min", label: "To first export" },
              { value: "Any", label: "MT5 broker" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-[#A78BFA] mb-1">{stat.value}</div>
                <div className="text-sm text-[#94A3B8]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Do I need coding experience?",
                a: "No. You pick a strategy template, adjust 3-5 settings, and export. No MQL5 or any other programming knowledge required.",
              },
              {
                q: "What do I get with the free plan?",
                a: "Full access to all templates and the builder. 1 project and 1 MQL5 export per month. No credit card required.",
              },
              {
                q: "Can I use the exported EA in live trading?",
                a: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. Backtest it in Strategy Tester and run it on any MT5 broker.",
              },
              {
                q: "Which template should I start with?",
                a: "Start with EMA Crossover — it's the simplest template with the fewest settings. Once you're comfortable, try Range Breakout or RSI Reversal.",
              },
              {
                q: "Is the generated code editable?",
                a: "Yes. You get clean, well-commented MQL5 source code that you can open and modify in MetaEditor.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel from your account settings at any time. Your access continues until the end of your billing period.",
              },
            ].map((item, i) => (
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
      <section className="py-20 px-6">
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
                  "All 6 strategy templates",
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
                  "Trade management blocks (Pro)",
                  "Community access",
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
      <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start building. Export your first bot today.
          </h2>
          <p className="text-[#94A3B8] mb-8">
            Pick a template and export clean MQL5 code in minutes. No credit card required.
          </p>
          <Link
            href="/login?mode=register"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Start Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/templates"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Templates
                  </Link>
                </li>
                <li>
                  <Link
                    href="/features"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Learn</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Help
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:support@algo-studio.com"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    support@algo-studio.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[rgba(79,70,229,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-[#64748B]">
              &copy; {new Date().getFullYear()} AlgoStudio. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
