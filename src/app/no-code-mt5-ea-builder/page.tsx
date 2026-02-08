import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "No-Code MT5 EA Builder | Build Expert Advisors Without Coding",
  description:
    "Build MetaTrader 5 Expert Advisors without coding. Design, test and export MT5 EAs using a visual drag-and-drop strategy builder. Free plan available.",
  alternates: { canonical: "/no-code-mt5-ea-builder" },
  openGraph: {
    title: "No-Code MT5 EA Builder | Build Expert Advisors Without Coding",
    description:
      "Build MetaTrader 5 Expert Advisors without coding. Design, test and export MT5 EAs using a visual drag-and-drop strategy builder. Free plan available.",
    url: "/no-code-mt5-ea-builder",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "No-Code MT5 EA Builder", href: "/no-code-mt5-ea-builder" },
];

const faqQuestions = [
  {
    q: "Do I need programming skills?",
    a: "No. AlgoStudio is a fully visual tool. You build strategies by dragging and connecting blocks on a canvas — no MQL5, Python, or any other programming knowledge is required. If you can describe your strategy in words, you can build it in AlgoStudio.",
  },
  {
    q: "Can I export my EA to MetaTrader 5?",
    a: "Yes. AlgoStudio generates standard MQL5 source code that you can export as a .mq5 file. Load it into MetaTrader 5, compile it in MetaEditor, and it's ready for backtesting and live trading on any MT5 broker.",
  },
  {
    q: "Is the exported code editable?",
    a: "Yes. The exported MQL5 code is clean, well-commented, and fully editable in MetaEditor. Input parameters are clearly marked so you can optimize them in the MT5 Strategy Tester. You own the code completely.",
  },
  {
    q: "Is this suitable for beginners?",
    a: "Absolutely. AlgoStudio was designed for traders who don't code. You can start with a free template, modify it to fit your idea, and have a working EA in under 5 minutes. Our blog also has step-by-step guides to help you get started.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan includes full access to the visual builder, up to 3 projects, and 2 MQL5 exports per month. No credit card required. Upgrade to Starter or Pro when you need more projects and exports.",
  },
];

export default function NoCodeMT5EABuilderPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <SiteNav />
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

        {/* H1 + Intro */}
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            No-Code MT5 EA Builder for Automated Trading
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            AlgoStudio is a no-code MT5 EA builder that lets you create MetaTrader 5 Expert Advisors
            without writing a single line of code. Design your strategy visually with a
            drag-and-drop canvas, configure risk management, and export production-ready MQL5 — all
            in minutes. Whether you&apos;re a beginner exploring automated trading or an experienced
            trader who wants to prototype faster, AlgoStudio turns your trading ideas into working
            EAs without the programming barrier.
          </p>
        </header>

        {/* H2 – Build MT5 Expert Advisors Without Coding */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Build MT5 Expert Advisors Without Coding
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              Most traders have strategy ideas they want to automate. The problem is execution:
              building an MT5 Expert Advisor traditionally requires learning MQL5, a C++-based
              language that takes months to master. Syntax errors, compilation issues, and debugging
              indicator buffers are daily frustrations for even intermediate programmers.
            </p>
            <p>
              This means most traders either give up, pay $500–$2,000 for a freelance developer (and
              still can&apos;t modify the result), or spend months in online courses before writing
              their first working EA. The gap between &ldquo;I have a strategy&rdquo; and &ldquo;I
              have a working EA&rdquo; is massive.
            </p>
            <p>
              AlgoStudio closes that gap. You build your EA visually — the same way you think about
              your strategy. No code, no compilation, no debugging. The result is clean MQL5 that
              works in MetaTrader 5 immediately. Automated trading without programming is no longer
              a compromise — it&apos;s the faster, safer way to build.
            </p>
          </div>
        </section>

        {/* H2 – How the Visual EA Builder Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How the Visual EA Builder Works</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Design your strategy visually
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                AlgoStudio&apos;s drag-and-drop canvas lets you build your entire strategy by
                connecting logic blocks. Start with a{" "}
                <strong className="text-white">Timing block</strong> to define when your EA trades —
                always on, during the London session, or custom hours. Then add{" "}
                <strong className="text-white">Indicator blocks</strong> for your entry conditions:
                Moving Averages (SMA/EMA), RSI, MACD, Bollinger Bands, ATR, ADX, Stochastic, and
                more. Each indicator has configurable parameters — periods, levels, crossover
                detection — all set through simple input fields, not code.
              </p>
              <p className="text-[#94A3B8] leading-relaxed mt-3">
                Connect your indicators to{" "}
                <strong className="text-white">Trade Action blocks</strong> (Place Buy, Place Sell,
                Close Position) to define what happens when your conditions are met. The visual flow
                makes your strategy logic immediately readable — no need to trace through hundreds
                of lines of MQL5 to understand what your EA does.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Configure rules and risk management
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Every professional EA needs solid risk management. AlgoStudio provides dedicated
                blocks for <strong className="text-white">Stop Loss</strong> (fixed pips or
                ATR-based), <strong className="text-white">Take Profit</strong> (fixed, risk-reward
                ratio, or ATR-based), <strong className="text-white">Position Sizing</strong> (fixed
                lots or percentage of account), and{" "}
                <strong className="text-white">Daily Trade Limits</strong>. You can also add session
                filters, trend-strength filters (ADX), and overbought/oversold filters (RSI) to
                avoid trading in unfavorable conditions.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Export clean MQL5 code</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export and AlgoStudio generates a complete, fully functional .mq5 file. The
                code includes proper <code className="text-[#A78BFA]">OnInit()</code>,{" "}
                <code className="text-[#A78BFA]">OnTick()</code>, and{" "}
                <code className="text-[#A78BFA]">OnDeinit()</code> event handlers, indicator buffer
                management, order execution logic, and error handling. Input parameters are marked
                as <code className="text-[#A78BFA]">input</code> variables so the MT5 Strategy
                Tester can optimize them automatically. Load it into MetaTrader 5, compile in
                MetaEditor, and you&apos;re ready to backtest — or trade live.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – Why Use a No-Code EA Builder Instead of Coding? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Why Use a No-Code EA Builder Instead of Coding?
          </h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            A visual EA builder for MT5 isn&apos;t about cutting corners. It&apos;s about removing
            accidental complexity so you can focus on what matters: your trading logic.
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 pr-4 text-[#94A3B8] font-medium"></th>
                  <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Coding in MQL5</th>
                  <th className="text-left py-3 pl-4 text-[#A78BFA] font-medium">AlgoStudio</th>
                </tr>
              </thead>
              <tbody className="text-[#CBD5E1]">
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Technical knowledge</td>
                  <td className="py-3 px-4">C++ experience required</td>
                  <td className="py-3 pl-4">No coding skills needed</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Development speed</td>
                  <td className="py-3 px-4">Days to weeks</td>
                  <td className="py-3 pl-4">Build in minutes</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Debugging</td>
                  <td className="py-3 px-4">Manual, error-prone</td>
                  <td className="py-3 pl-4">Visual logic — see the flow</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Iteration</td>
                  <td className="py-3 px-4">Rewrite → compile → test</td>
                  <td className="py-3 pl-4">Drag, drop, re-export</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Syntax errors</td>
                  <td className="py-3 px-4">Constant risk</td>
                  <td className="py-3 pl-4">Impossible by design</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-[#94A3B8]">Output quality</td>
                  <td className="py-3 px-4">Depends on skill level</td>
                  <td className="py-3 pl-4">Clean, optimized MQL5</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            The drag-and-drop EA builder doesn&apos;t limit what you can build — it accelerates how
            fast you can build it. You get the same production-ready MQL5 output a developer would
            write, without the weeks of development time.
          </p>
        </section>

        {/* H2 – Who Is This MT5 EA Builder For? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Who Is This MT5 EA Builder For?</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Beginner traders</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You want to try automated trading but MQL5 feels overwhelming. AlgoStudio lets you
                start with a{" "}
                <Link href="/templates" className="text-[#22D3EE] hover:underline">
                  free template
                </Link>
                , modify it visually, and have your first EA running in under 5 minutes — no
                tutorials on C++ pointers required.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Manual traders switching to automation
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You have a proven manual strategy but can&apos;t watch charts around the clock.
                Translate your existing rules into visual blocks and let the EA execute them 24/5 —
                consistently, without emotions, and without missing setups while you sleep.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Algo traders who want speed</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You know what you want to test. Writing MQL5 from scratch for every idea is slow.
                With AlgoStudio you prototype and export three strategies in the time it takes to
                code one — iterate faster, backtest more, find edges sooner.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Strategy testers and prototypers
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You want to validate ideas quickly before committing to a full development cycle.
                Build a rough version in minutes, backtest it, and only invest in polishing the
                strategies that show real promise.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – What You Can Build with AlgoStudio */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What You Can Build with AlgoStudio</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            The visual builder supports all common EA strategy types. Here are some of the most
            popular approaches traders build with AlgoStudio:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/templates/moving-average-crossover-ea"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Trend-Following EAs</h3>
              <p className="text-sm text-[#94A3B8]">
                Moving Average crossovers, ADX trend filters, and MACD momentum strategies that
                capture sustained directional moves.
              </p>
            </Link>
            <Link
              href="/templates/rsi-ea-template"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Mean-Reversion EAs</h3>
              <p className="text-sm text-[#94A3B8]">
                RSI overbought/oversold strategies, Bollinger Band bounces, and Stochastic
                crossovers that trade against extreme moves.
              </p>
            </Link>
            <Link
              href="/templates/breakout-ea-template"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Breakout EAs</h3>
              <p className="text-sm text-[#94A3B8]">
                Asian range breakouts, support/resistance breakouts, and volatility expansion
                strategies that trade momentum at session opens.
              </p>
            </Link>
            <Link
              href="/visual-strategy-builder"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Rule-Based Trading Systems</h3>
              <p className="text-sm text-[#94A3B8]">
                Combine multiple indicators, session filters, and risk rules into systematic
                strategies that execute the same way every time.
              </p>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <FAQSection questions={faqQuestions} />

        {/* Internal links */}
        <section className="mb-16 mt-16">
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Home
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link href="/pricing" className="text-[#64748B] hover:text-[#94A3B8] transition-colors">
              Pricing
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/visual-strategy-builder"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Visual Strategy Builder
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/blog/how-to-build-mt5-ea-without-coding"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Tutorial: Build Your First EA
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/templates"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              EA Templates
            </Link>
          </div>
        </section>
      </article>

      <CTASection
        title="Start building MT5 Expert Advisors without coding"
        description="Design your strategy visually, export clean MQL5, and trade. Free plan available — no credit card required."
      />
    </div>
  );
}
