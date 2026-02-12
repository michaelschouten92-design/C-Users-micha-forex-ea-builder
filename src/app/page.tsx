import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { PricingSection } from "@/components/marketing/pricing-section";

export const metadata: Metadata = {
  title: "MT5 Bot Builder — No-Code Expert Advisor | AlgoStudio",
  description:
    "Build MT5 Expert Advisors without coding. Pick a strategy template, customize risk management, and export clean MQL5 code. Free to start. Works with any broker.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MT5 Bot Builder — No-Code Expert Advisor | AlgoStudio",
    description:
      "Turn trading ideas into live MT5 bots in minutes. No-code EA builder with proven strategy templates and clean MQL5 export.",
  },
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
      "No-code MT5 Expert Advisor builder. Pick a strategy template, customize parameters, and export clean MQL5 code for MetaTrader 5.",
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
    featureList: [
      "No-code MT5 bot builder",
      "Strategy templates (EMA crossover, RSI, MACD, breakout, pullback)",
      "Clean MQL5 code export",
      "Built-in risk management",
      "Works with any MT5 broker",
      "Backtesting ready",
    ],
  };

  const faqItems = [
    {
      q: "What is an MT5 Expert Advisor?",
      a: "An Expert Advisor (EA) is an automated trading program that runs inside MetaTrader 5. It monitors the market, analyzes price data, and executes trades according to predefined rules — without manual intervention. AlgoStudio lets you build fully functional EAs without writing a single line of MQL5 code.",
    },
    {
      q: "Do I need to know MQL5 or any programming language?",
      a: "No. AlgoStudio is a no-code MT5 bot builder. You pick a strategy template, adjust settings like risk percentage, stop loss, and take profit, and export a ready-to-use .mq5 file. No MQL5, Python, or any other programming knowledge required.",
    },
    {
      q: "Is AlgoStudio suitable for beginners?",
      a: "Yes. AlgoStudio was designed specifically for traders who have strategy ideas but lack coding skills. Every template comes with sensible defaults and built-in risk management, so you can build and test your first EA in minutes.",
    },
    {
      q: "Can I use AlgoStudio with any MT5 broker?",
      a: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. It works with any MT5-compatible broker — ICMarkets, Pepperstone, FTMO, or any other. Just load the file into your MetaTrader 5 platform.",
    },
    {
      q: "Does AlgoStudio guarantee trading profits?",
      a: "No. AlgoStudio is a tool for building and testing automated trading strategies. No trading tool, bot, or strategy can guarantee profits. All trading involves risk. Always backtest thoroughly in MT5 Strategy Tester before using any EA with real funds.",
    },
    {
      q: "How is AlgoStudio different from other bot builders?",
      a: "Most EA builders give you a blank canvas with hundreds of blocks and nodes. You spend hours building logic from scratch. AlgoStudio starts you with proven strategy templates — you only adjust what matters. Plus, you get clean, readable MQL5 source code that you own and can modify freely.",
    },
    {
      q: "Can I edit the generated MQL5 code?",
      a: "Yes. You get clean, well-commented MQL5 source code. Open it in MetaEditor or any text editor to customize further. The code is yours — no lock-in, no black box.",
    },
    {
      q: "What strategy templates are available?",
      a: "AlgoStudio includes 5 templates: EMA Crossover, RSI Reversal, Range Breakout, Trend Pullback, and MACD Crossover. Each produces a fully functional Expert Advisor with built-in risk management, stop loss, and take profit logic.",
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

      {/* ================================================================ */}
      {/* HERO SECTION                                                      */}
      {/* ================================================================ */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">
              No-code MT5 Expert Advisor builder
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Turn trading ideas into
            <br />
            <span className="text-[#A78BFA]">live MT5 bots in minutes</span>
          </h1>

          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-8">
            Stop struggling with MQL5 code or paying developers. Pick a proven strategy template,
            customize your risk settings, and export a clean Expert Advisor — ready for backtesting
            or live trading.
          </p>

          {/* Benefit highlights */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10 text-sm text-[#CBD5E1]">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
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
              No coding required
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
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
              Clean MQL5 code you own
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#22D3EE] flex-shrink-0"
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
              Works with any MT5 broker
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=register"
              className="w-full sm:w-auto bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Build Your First Bot — Free
            </Link>
            <Link
              href="/product/how-it-works"
              className="w-full sm:w-auto border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] px-8 py-3.5 rounded-lg font-medium hover:bg-[rgba(79,70,229,0.1)] transition-colors"
            >
              See How It Works
            </Link>
          </div>

          {/* Emotional hook */}
          <p className="mt-6 text-xs text-[#64748B]">
            No credit card required. Build, test, and export your first EA in under 5 minutes.
          </p>

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
                alt="AlgoStudio visual strategy builder — Range Breakout entry connected to Stoploss to Breakeven trade management block"
                width={1918}
                height={907}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="w-full"
                quality={100}
                unoptimized
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PROBLEM SECTION                                                   */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              You have a trading strategy. Building the bot shouldn&apos;t be the hard part.
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Thousands of traders have profitable ideas but never automate them. Here&apos;s why:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "MQL5 is complex",
                description:
                  "Learning MQL5 takes months. Syntax errors, compilation issues, and runtime bugs turn a simple strategy into weeks of frustration.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                ),
              },
              {
                title: "Developers are expensive",
                description:
                  "Hiring an MQL5 freelancer costs $200-$1,000+ per EA. Every change request means more time and money.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ),
              },
              {
                title: "Slow strategy testing",
                description:
                  "Without automation, you can&apos;t backtest properly. Manual testing means missed opportunities and unreliable results.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ),
              },
              {
                title: "Emotional trading",
                description:
                  "Without a bot executing your rules, emotions take over. Fear and greed override the strategy you know works.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                ),
              },
              {
                title: "Overcomplicated tools",
                description:
                  "Most EA builders give you a blank canvas with hundreds of blocks and wires. You spend hours on the tool instead of testing your idea.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                ),
              },
              {
                title: "Black-box bots",
                description:
                  "Pre-made bots don&apos;t show you the logic. You can&apos;t verify, adjust, or trust what you can&apos;t see.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                ),
              },
            ].map((pain) => (
              <div
                key={pain.title}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6"
              >
                <div className="w-10 h-10 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-[#94A3B8]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {pain.icon}
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{pain.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{pain.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SOLUTION SECTION — How it works                                   */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-4">
              From idea to running MT5 bot in 3 steps
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              AlgoStudio replaces weeks of MQL5 coding with a simple 3-step process. Choose a proven
              template, customize your parameters, and export clean code.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Choose a strategy template</h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Pick from 5 proven strategies: EMA Crossover, RSI Reversal, Range Breakout, Trend
                Pullback, or MACD Crossover. Each comes with sensible defaults that work out of the
                box.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Customize your parameters</h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Set your risk percentage, stop loss method, and take profit targets. Toggle optional
                filters for trading sessions and trend confirmation. No 50-field forms — only the
                settings that matter.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4F46E5] rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Export clean MQL5 &amp; test
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Download your .mq5 file with clean, commented source code. Load it into MetaTrader 5
                Strategy Tester, backtest across any timeframe, optimize parameters, and go live
                when ready.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/login?mode=register"
              className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
            >
              Start Building — Free
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* STRATEGY TEMPLATES                                                */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Proven strategy templates, ready to customize
            </h2>
            <p className="text-[#94A3B8]">
              Every template produces a fully functional Expert Advisor with built-in risk
              management. Adjust what matters, skip the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
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
              {
                name: "Range Breakout",
                type: "Breakout",
                description:
                  "Trade the breakout of a recent price range. Set the lookback period, risk %, and ATR stop loss. Optional London session filter.",
                color: "#F59E0B",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6"
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
                  Use this template &rarr;
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

      {/* ================================================================ */}
      {/* FEATURES SECTION                                                  */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything you need to build, test, and deploy MT5 trading bots
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Strategy templates that work instantly",
                description:
                  "Every template exports a valid Expert Advisor immediately. ATR-based stop loss, risk-reward take profit, and proper position sizing — all pre-configured.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                ),
              },
              {
                title: "Built-in risk management",
                description:
                  "Control your exposure with risk percentage sizing, ATR or fixed stop loss, take profit ratios, and maximum daily loss limits. Professional risk controls without the complexity.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                ),
              },
              {
                title: "Clean, readable MQL5 export",
                description:
                  "Get well-structured, commented MQL5 source code. Open it in MetaEditor, review the logic, modify it further, or hand it to a developer. The code is yours — no black box.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                ),
              },
              {
                title: "Backtesting ready",
                description:
                  "Every exported EA works directly in MT5 Strategy Tester. Backtest across multiple timeframes and currency pairs. Optimize parameters with MT5's built-in optimization engine.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                ),
              },
              {
                title: "No-code visual interface",
                description:
                  "Build your trading bot with a visual interface. No programming, no drag-and-drop wiring, no block coding. Just clear settings organized by function — entry, exit, risk, timing.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                ),
              },
              {
                title: "Works with any MT5 broker",
                description:
                  "The generated code is standard MQL5 that runs on any MetaTrader 5 platform. Compatible with forex brokers, prop firms, and CFD providers worldwide.",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ),
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-[#A78BFA]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* USE CASES                                                         */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Built for traders who want to automate
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                title: "Forex traders",
                description:
                  "Automate your forex strategy across any currency pair. Set session filters for London, New York, or Tokyo. Let your bot execute trades 24/5 while you focus on analysis.",
                color: "#A78BFA",
              },
              {
                title: "Prop firm traders",
                description:
                  "Build EAs that respect prop firm rules. Set maximum daily loss limits, risk-per-trade caps, and position limits. Test your strategy with MT5 before deploying on funded accounts.",
                color: "#22D3EE",
              },
              {
                title: "Strategy testers",
                description:
                  "Rapidly test trading hypotheses. Build an EA in minutes, backtest across 10 years of data, analyze results, adjust parameters, and repeat. No coding bottleneck between idea and data.",
                color: "#F59E0B",
              },
              {
                title: "Non-programmer traders",
                description:
                  "You know what works in the market but can&apos;t write MQL5. AlgoStudio bridges that gap — your strategy knowledge, our code generation. Full control without the coding barrier.",
                color: "#22C55E",
              },
            ].map((useCase) => (
              <div
                key={useCase.title}
                className="bg-[#0D0117]/50 border border-[rgba(79,70,229,0.1)] rounded-xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: useCase.color }}
                  />
                  <h3 className="text-base font-semibold text-white">{useCase.title}</h3>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* DIFFERENTIATION / COMPARISON                                      */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              How AlgoStudio compares to alternatives
            </h2>
            <p className="text-[#94A3B8]">
              There are other ways to build trading bots. Here&apos;s why traders choose AlgoStudio.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 px-4 text-[#64748B] font-medium"></th>
                  <th className="text-center py-3 px-4 text-[#A78BFA] font-medium">AlgoStudio</th>
                  <th className="text-center py-3 px-4 text-[#64748B] font-medium">
                    MQL5 Developer
                  </th>
                  <th className="text-center py-3 px-4 text-[#64748B] font-medium">
                    Complex EA Builders
                  </th>
                </tr>
              </thead>
              <tbody className="text-[#94A3B8]">
                {[
                  ["Time to first EA", "< 5 minutes", "Days to weeks", "Hours to days"],
                  ["Cost", "Free to start", "$200-$1,000+", "$50-$300/mo"],
                  ["Coding required", "None", "You explain, they code", "Often required"],
                  ["Code transparency", "Full source code", "Depends on dev", "Usually yes"],
                  ["Customizable", "Visual controls", "Through developer", "Complex interface"],
                  ["Iteration speed", "Instant rebuild", "Days per change", "Hours per change"],
                ].map(([feature, algo, dev, complex]) => (
                  <tr key={feature} className="border-b border-[rgba(79,70,229,0.1)]">
                    <td className="py-3 px-4 text-[#CBD5E1] font-medium">{feature}</td>
                    <td className="py-3 px-4 text-center text-[#22D3EE]">{algo}</td>
                    <td className="py-3 px-4 text-center">{dev}</td>
                    <td className="py-3 px-4 text-center">{complex}</td>
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

      {/* ================================================================ */}
      {/* FAQ SECTION                                                       */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
            <p className="text-[#94A3B8]">
              Everything you need to know about building MT5 Expert Advisors with AlgoStudio.
            </p>
          </div>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <details
                key={i}
                className="group bg-[#0D0117]/50 border border-[rgba(79,70,229,0.15)] rounded-xl overflow-hidden"
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

      {/* ================================================================ */}
      {/* PRICING                                                           */}
      {/* ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <PricingSection />
        </div>
      </section>

      {/* ================================================================ */}
      {/* FINAL CTA                                                         */}
      {/* ================================================================ */}
      <section className="py-20 px-6 bg-[#1A0626]/30 border-y border-[rgba(79,70,229,0.1)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Your strategy deserves to run on autopilot
          </h2>
          <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto">
            Stop trading manually or waiting on developers. Build your MT5 Expert Advisor in
            minutes, backtest it with real data, and deploy with confidence.
          </p>
          <Link
            href="/login?mode=register"
            className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
          >
            Build Your First Bot — Free
          </Link>
          <p className="mt-4 text-xs text-[#64748B]">
            No credit card required. Free plan includes all templates.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
