import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PLANS, formatPrice } from "@/lib/plans";
import { MobileNav } from "@/components/mobile-nav";

export const metadata: Metadata = {
  title: "AlgoStudio – No-Code MT5 EA Builder | Visual EA & Strategy Builder",
  description:
    "Build and export fully functional MetaTrader 5 Expert Advisors without coding. Drag & drop visual strategy builder, powerful backtesting & free plan.",
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
      "No-code visual builder for MetaTrader 5 Expert Advisors. Build, test, and export trading bots without writing code.",
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
          text: "No. AlgoStudio is a visual drag-and-drop builder. You create strategies by connecting blocks — no MQL5, Python, or any other programming knowledge required.",
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
        name: "What indicators does AlgoStudio support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AlgoStudio supports Moving Average (SMA/EMA), RSI, MACD, Bollinger Bands, ATR, ADX, Stochastic, candlestick patterns, support/resistance zones, and range breakouts.",
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
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0D0117]/80 backdrop-blur-md border-b border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">AlgoStudio</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="text-sm text-[#94A3B8] hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=register"
              className="text-sm bg-[#4F46E5] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#6366F1] transition-colors"
            >
              Start Free
            </Link>
          </div>
          <MobileNav />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">No coding required</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Build Trading Bots
            <br />
            <span className="text-[#A78BFA]">Without Code</span>
          </h1>

          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-10">
            Create professional MetaTrader 5 Expert Advisors with our visual strategy builder.
            Design, test, and export your trading algorithms in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=register"
              className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Building Free
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
            >
              View Pricing
            </Link>
          </div>

          {/* Builder Preview Screenshot */}
          <div className="mt-16 relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-4 bg-gradient-to-r from-[#4F46E5]/20 via-[#A78BFA]/20 to-[#22D3EE]/20 blur-3xl -z-10" />

            {/* Browser mockup */}
            <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl overflow-hidden shadow-2xl shadow-[#4F46E5]/10">
              {/* Browser header */}
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

              {/* Demo screenshot */}
              <Image
                src="/demo-screenshot.png"
                alt="AlgoStudio visual strategy builder interface"
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

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything you need to automate your trading
            </h2>
            <p className="text-[#94A3B8] max-w-xl mx-auto">
              Professional tools, simplified for everyone
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
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
              <h3 className="text-lg font-semibold text-white mb-2">Visual Strategy Builder</h3>
              <p className="text-sm text-[#94A3B8]">
                Drag and drop indicators, conditions, and actions. Build complex strategies without
                touching code.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
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
              <h3 className="text-lg font-semibold text-white mb-2">One-Click Export</h3>
              <p className="text-sm text-[#94A3B8]">
                Export your strategy directly to MetaTrader 5. Get compiled EA files ready to trade.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Fast Iteration</h3>
              <p className="text-sm text-[#94A3B8]">
                Make changes instantly. Test ideas quickly without recompiling manually.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
            <p className="text-[#94A3B8]">From idea to live trading in three steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Design Your Strategy</h3>
              <p className="text-sm text-[#94A3B8]">
                Use our visual builder to define entry and exit conditions with technical
                indicators.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Configure Parameters</h3>
              <p className="text-sm text-[#94A3B8]">
                Set risk management, lot sizes, and trading hours to match your style.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Export & Trade</h3>
              <p className="text-sm text-[#94A3B8]">
                Download your EA file and load it into MetaTrader 5. Start trading.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Section 1: Build MT5 EAs Without Coding */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">
            Build MT5 Expert Advisors without coding
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              Building a MetaTrader 5 Expert Advisor traditionally requires learning MQL5 — a
              C++-based programming language that takes months to master. For most traders, this is
              an impossible barrier between their strategy ideas and live automated trading.
            </p>
            <p>
              AlgoStudio removes that barrier completely. Instead of writing hundreds of lines of
              code, you design your strategy visually by connecting blocks on a canvas. Each block
              represents a trading concept you already understand: indicators like{" "}
              <strong className="text-white">Moving Averages</strong>,{" "}
              <strong className="text-white">RSI</strong>, and{" "}
              <strong className="text-white">MACD</strong>; actions like{" "}
              <strong className="text-white">Place Buy</strong> and{" "}
              <strong className="text-white">Place Sell</strong>; and risk management tools like{" "}
              <strong className="text-white">Stop Loss</strong> and{" "}
              <strong className="text-white">Take Profit</strong>.
            </p>
            <p>
              When you&apos;re done, AlgoStudio generates clean, well-commented MQL5 source code
              that you can export directly into MetaTrader 5. The code is production-ready — with
              proper indicator handles, error handling, and clearly marked input parameters for
              optimization in the MT5 Strategy Tester.
            </p>
            <p>
              <Link href="/no-code-mt5-ea-builder" className="text-[#22D3EE] hover:underline">
                Learn more about no-code EA building &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* SEO Section 2: How the Visual Strategy Builder Works */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">
            How the visual strategy builder works
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              AlgoStudio&apos;s drag-and-drop canvas lets you build complete trading strategies
              without touching code. Every strategy is composed of five types of blocks that you
              connect to define your trading logic:
            </p>
            <ul className="space-y-3 ml-1">
              <li className="flex gap-3">
                <span className="text-[#22D3EE] font-semibold flex-shrink-0">Timing</span>
                <span>
                  — Control when your EA trades. Choose from always-on, specific trading sessions
                  (London, New York, Tokyo), custom time windows, or day-of-week filters.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#A78BFA] font-semibold flex-shrink-0">Indicators</span>
                <span>
                  — Define entry conditions using Moving Averages, RSI, MACD, Bollinger Bands, ATR,
                  ADX, Stochastic, and more. Set periods, levels, and crossover conditions visually.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#F59E0B] font-semibold flex-shrink-0">Price Action</span>
                <span>
                  — React to candlestick patterns, support/resistance zones, and range breakouts
                  without writing pattern-matching code.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#10B981] font-semibold flex-shrink-0">Trading</span>
                <span>
                  — Execute buy and sell orders and close positions. Connect these to your indicator
                  conditions to automate entries and exits.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EF4444] font-semibold flex-shrink-0">Risk</span>
                <span>
                  — Protect your capital with stop loss, take profit, trailing stops, break-even
                  rules, and daily trade limits — all configurable per block.
                </span>
              </li>
            </ul>
            <p>
              Connect the blocks on the canvas and your entire strategy is visible at a glance. No
              jumping between files, no debugging syntax errors, no guessing what your EA does.
            </p>
            <p>
              <Link href="/visual-strategy-builder" className="text-[#22D3EE] hover:underline">
                Explore the visual strategy builder &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* SEO Section 3: Who Is AlgoStudio For */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">Who is AlgoStudio for?</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Beginners exploring automated trading
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You&apos;ve heard about Expert Advisors and want to try automated trading, but
                don&apos;t know MQL5 and don&apos;t want to spend months learning to code.
                AlgoStudio lets you start with a{" "}
                <Link href="/templates" className="text-[#22D3EE] hover:underline">
                  free template
                </Link>{" "}
                and have your first EA running in under 5 minutes.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Manual traders who want to automate
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You have a profitable manual strategy but can&apos;t watch charts 24 hours a day.
                You want your rules executed consistently — without emotion, fatigue, or missed
                setups. AlgoStudio turns your existing strategy into a working EA that trades while
                you sleep.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Experienced traders testing new ideas
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You know what you want to test, but writing MQL5 from scratch for every idea is
                slow. With AlgoStudio you can prototype and export three strategies in the time it
                takes to code one. Iterate faster, backtest more, and find edges that work.
              </p>
            </div>
            <p className="text-[#94A3B8] leading-relaxed">
              <Link
                href="/automated-trading-for-beginners"
                className="text-[#22D3EE] hover:underline"
              >
                Read our beginner&apos;s guide to automated trading &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* SEO Section 4: Why Visual Beats Manual Coding */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">
            Why visual EA building beats manual coding
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              MQL5 is a powerful language, but it wasn&apos;t designed for rapid strategy
              prototyping. A simple Moving Average crossover EA requires 200+ lines of code:
              indicator buffer initialization, tick event handling, order management, error
              handling, and deinitialization. Change one condition and you risk introducing a bug
              that takes hours to find.
            </p>
            <p>
              With AlgoStudio&apos;s visual builder, the same strategy is 5 connected blocks on a
              canvas. Want to swap RSI for Stochastic? Drag a new block. Want to add an ADX trend
              filter? Connect one more block. Every change takes seconds, not hours — and the
              generated code is always syntactically correct.
            </p>
            <p>
              This isn&apos;t about dumbing down EA development. It&apos;s about removing the
              accidental complexity (syntax, compilation, debugging) so you can focus on what
              actually matters: <strong className="text-white">your trading logic</strong>. The
              exported MQL5 code is clean, readable, and fully editable in MetaEditor if you want to
              customize it further.
            </p>
            <p>
              The result: you test more ideas, iterate faster, and find profitable strategies
              sooner. That&apos;s the real edge.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Trusted by traders worldwide</h2>
            <p className="text-[#94A3B8]">
              Build strategies for the world&apos;s most popular trading platform
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { value: "10+", label: "Technical indicators" },
              { value: "100%", label: "Valid MQL5 output" },
              { value: "< 5 min", label: "To first export" },
              { value: "24/7", label: "Build anytime" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-[#A78BFA] mb-1">{stat.value}</div>
                <div className="text-sm text-[#94A3B8]">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Platform compatibility */}
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-8 text-center">
            <p className="text-sm font-medium text-[#CBD5E1] mb-4">
              Works with MetaTrader 5 on any broker
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {["Forex", "Indices", "Commodities", "Crypto CFDs", "Stocks CFDs"].map((market) => (
                <span
                  key={market}
                  className="px-4 py-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] rounded-lg text-sm text-[#CBD5E1]"
                >
                  {market}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Do I need coding experience?",
                a: "No. AlgoStudio is a visual drag-and-drop builder. You create strategies by connecting blocks — no MQL5, Python, or any other programming knowledge required.",
              },
              {
                q: "What do I get with the free plan?",
                a: "You get full access to the visual builder with 1 project and 1 MQL5 export per month. No credit card required.",
              },
              {
                q: "Can I use the exported EA in live trading?",
                a: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. You can backtest it in the MT5 Strategy Tester and run it on any broker that supports MT5.",
              },
              {
                q: "What indicators are supported?",
                a: "We support Moving Average (SMA/EMA), RSI, MACD, Bollinger Bands, ATR, ADX, Stochastic, candlestick patterns, support/resistance zones, and range breakouts. More are added regularly.",
              },
              {
                q: "Can I cancel my subscription anytime?",
                a: "Yes. You can cancel at any time from your account settings. Your access continues until the end of your billing period.",
              },
              {
                q: "Is the generated MQL5 code editable?",
                a: "Yes. You get clean, well-commented MQL5 source code that you can modify in MetaEditor if you want to customize it further.",
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
            <h2 className="text-3xl font-bold text-white mb-4">
              Choose the plan that matches your trading ambition
            </h2>
            <p className="text-[#94A3B8]">
              Build, test and deploy automated MT5 strategies — without writing code.
            </p>
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
              <p className="text-sm text-[#94A3B8] mb-4">
                Build your first automated strategy. Perfect for exploring algorithmic trading.
              </p>
              <ul className="space-y-2 text-sm text-[#CBD5E1] mb-6 flex-1">
                {[
                  "Full visual strategy builder",
                  "All trading blocks available",
                  "1 active project",
                  "1 export per month",
                  "MQL5 source code export",
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
                Get Started Free
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
              <p className="text-sm text-[#94A3B8] mb-4">
                For serious traders who want to scale. Unlimited projects, exports, and community
                access.
              </p>
              <ul className="space-y-2 text-sm text-[#CBD5E1] mb-6 flex-1">
                {[
                  "Unlimited projects",
                  "Unlimited exports",
                  "Full MQL5 source code export",
                  "All trading & risk management blocks",
                  "Community access (private trader group)",
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
                Also available yearly at {formatPrice(PLANS.PRO.prices!.yearly.amount, "eur")}/year
                — save{" "}
                {formatPrice(
                  PLANS.PRO.prices!.monthly.amount * 12 - PLANS.PRO.prices!.yearly.amount,
                  "eur"
                )}
                .
              </p>
              <Link
                href="/pricing"
                className="block w-full text-center py-2.5 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#6366F1] transition-colors hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to automate your trading?</h2>
          <p className="text-[#94A3B8] mb-8">
            Join traders who build their own Expert Advisors without writing code.
          </p>
          <Link
            href="/login?mode=register"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Start Building Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[rgba(79,70,229,0.1)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login?mode=register"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Register
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/no-code-mt5-ea-builder"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    No-Code MT5 EA Builder
                  </Link>
                </li>
                <li>
                  <Link
                    href="/visual-strategy-builder"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Visual Strategy Builder
                  </Link>
                </li>
                <li>
                  <Link
                    href="/automated-trading-for-beginners"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Automated Trading Guide
                  </Link>
                </li>
                <li>
                  <Link
                    href="/templates"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    EA Templates
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
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

            {/* Support */}
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

            {/* Community */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Community</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://whop.com/algostudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    Whop
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[rgba(79,70,229,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-[#64748B]">
              © {new Date().getFullYear()} AlgoStudio. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
