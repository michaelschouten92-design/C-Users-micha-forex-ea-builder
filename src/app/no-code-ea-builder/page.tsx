import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "No-Code EA Builder | Create Expert Advisors Without Programming",
  description:
    "Build fully functional Expert Advisors without coding. AlgoStudio's no-code EA builder lets you design, configure, and export MQL5 trading bots visually. Free plan available.",
  alternates: { canonical: "/no-code-ea-builder" },
  openGraph: {
    title: "No-Code EA Builder | Create Expert Advisors Without Programming",
    description:
      "Build fully functional Expert Advisors without coding. AlgoStudio's no-code EA builder lets you design, configure, and export MQL5 trading bots visually. Free plan available.",
    url: "/no-code-ea-builder",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "No-Code EA Builder", href: "/no-code-ea-builder" },
];

const faqQuestions = [
  {
    q: "Do I need any coding experience to build an EA?",
    a: "No. AlgoStudio is a fully visual tool. You build strategies by dragging and connecting blocks on a canvas — no MQL5, Python, or any other programming knowledge is required. If you can describe your strategy in words, you can build it in AlgoStudio.",
  },
  {
    q: "What programming language does the exported EA use?",
    a: "AlgoStudio generates clean, well-commented MQL5 code — the native language of MetaTrader 5. The code is production-ready with proper event handlers, indicator management, and clearly marked input parameters for optimization.",
  },
  {
    q: "How long does it take to build an EA without coding?",
    a: "Most users create their first working EA in under 5 minutes using a template. Building a custom strategy with multiple indicators and risk management typically takes 10–20 minutes. Compare that to days or weeks of MQL5 development.",
  },
  {
    q: "Can I modify the generated code afterwards?",
    a: "Yes. The exported MQL5 source code is fully editable in MetaEditor. Input parameters are clearly marked, the code is well-structured and commented, and you own it completely. No black boxes or encrypted files.",
  },
  {
    q: "Is the free plan enough to get started?",
    a: "Absolutely. The free plan includes full access to the visual builder, up to 3 projects, and 2 MQL5 exports per month. No credit card required. Upgrade to Starter or Pro when you need more projects and exports.",
  },
];

export default function NoCodeEABuilderPage() {
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
            No-Code EA Builder — Create Expert Advisors Without Programming
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            AlgoStudio is a no-code EA builder that lets you create fully functional Expert Advisors
            without writing a single line of code. Design your trading strategy visually on a
            drag-and-drop canvas, configure indicators and risk management through simple input
            fields, and export production-ready MQL5 code for MetaTrader 5. No programming
            background needed — if you understand your strategy, you can build your EA.
          </p>
        </header>

        {/* H2 – The Problem with Traditional EA Development */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            The Problem with Traditional EA Development
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              Every trader who wants to automate their strategy faces the same problem: building an
              Expert Advisor requires programming skills that most traders don&apos;t have. MQL5 is
              a C++-based language with steep learning curves around indicator buffer management,
              tick event handling, order execution, and error recovery. Learning it properly takes
              months.
            </p>
            <p>
              The alternatives aren&apos;t much better. Hiring a freelance MQL5 developer costs
              $500–$2,000 per EA, takes weeks of back-and-forth, and leaves you with code you
              can&apos;t modify yourself. Online courses help, but by the time you&apos;re competent
              enough to write a reliable EA, you&apos;ve spent more time learning to code than
              actually trading.
            </p>
            <p>
              A no-code EA builder eliminates this entire bottleneck. Instead of learning a
              programming language, you express your strategy visually — the same way you already
              think about it. The builder handles all the technical complexity and generates clean
              MQL5 that works in MetaTrader 5 immediately.
            </p>
          </div>
        </section>

        {/* H2 – How the No-Code EA Builder Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How the No-Code EA Builder Works</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Design your strategy on a visual canvas
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                AlgoStudio&apos;s drag-and-drop canvas lets you build your entire EA by connecting
                logic blocks. Start with a <strong className="text-white">Timing block</strong> to
                define when your EA trades — always on, during the London or New York session, or
                custom hours. Add <strong className="text-white">Indicator blocks</strong> for your
                entry conditions: Moving Averages (SMA/EMA), RSI, MACD, Bollinger Bands, ATR, ADX,
                Stochastic, and more. Each indicator has configurable parameters — periods, levels,
                crossover detection — set through simple input fields, not code.
              </p>
              <p className="text-[#94A3B8] leading-relaxed mt-3">
                Connect your conditions to{" "}
                <strong className="text-white">Trade Action blocks</strong> (Place Buy, Place Sell,
                Close Position) and add{" "}
                <strong className="text-white">Trade Management blocks</strong> for Stop Loss, Take
                Profit, Trailing Stop, Break Even, and daily trade limits. Your entire strategy is
                visible on one canvas — no jumping between files or functions.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Configure everything without code
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Every parameter in your EA is configurable through visual input fields. Set your RSI
                period to 14, your overbought level to 70, your stop loss to 50 pips or 1.5x ATR —
                all by typing numbers into fields, not by editing source code. Position sizing can
                be fixed lots or a percentage of your account balance. Session filters,
                trend-strength filters, and daily trade limits are all available as dedicated blocks
                you can add with one click.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Export clean MQL5 for MetaTrader 5
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export and AlgoStudio generates a complete .mq5 file with proper{" "}
                <code className="text-[#A78BFA]">OnInit()</code>,{" "}
                <code className="text-[#A78BFA]">OnTick()</code>, and{" "}
                <code className="text-[#A78BFA]">OnDeinit()</code> event handlers, indicator buffer
                management, order execution logic, and error handling. All configurable values are
                marked as <code className="text-[#A78BFA]">input</code> parameters so the MT5
                Strategy Tester can optimize them automatically. Load the file into MetaTrader 5,
                compile in MetaEditor, and you&apos;re ready to backtest — or trade live.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – No-Code EA Builder vs Coding vs Hiring a Developer */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            No-Code EA Builder vs Coding vs Hiring a Developer
          </h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            There are three ways to get an Expert Advisor. Here&apos;s how they compare:
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 pr-4 text-[#94A3B8] font-medium"></th>
                  <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">
                    Code it yourself
                  </th>
                  <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">
                    Hire a developer
                  </th>
                  <th className="text-left py-3 pl-4 text-[#A78BFA] font-medium">AlgoStudio</th>
                </tr>
              </thead>
              <tbody className="text-[#CBD5E1]">
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Skills needed</td>
                  <td className="py-3 px-4">MQL5 / C++ knowledge</td>
                  <td className="py-3 px-4">Clear brief writing</td>
                  <td className="py-3 pl-4">None — fully visual</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Cost</td>
                  <td className="py-3 px-4">Free (your time)</td>
                  <td className="py-3 px-4">$500–$2,000 per EA</td>
                  <td className="py-3 pl-4">Free plan available</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Time to first EA</td>
                  <td className="py-3 px-4">Days to weeks</td>
                  <td className="py-3 px-4">1–4 weeks</td>
                  <td className="py-3 pl-4">Under 5 minutes</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Modify later</td>
                  <td className="py-3 px-4">Yes (if you can code)</td>
                  <td className="py-3 px-4">Pay for changes</td>
                  <td className="py-3 pl-4">Visual + code editable</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Iteration speed</td>
                  <td className="py-3 px-4">Hours per change</td>
                  <td className="py-3 px-4">Days per revision</td>
                  <td className="py-3 pl-4">Seconds — reconnect and re-export</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-[#94A3B8]">Code ownership</td>
                  <td className="py-3 px-4">Full ownership</td>
                  <td className="py-3 px-4">Varies by contract</td>
                  <td className="py-3 pl-4">Full ownership — clean MQL5</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            The no-code approach gives you the speed of a visual builder with the output quality of
            a professional developer. You own the generated code completely and can modify it in
            MetaEditor whenever you want.
          </p>
        </section>

        {/* H2 – Who Is the No-Code EA Builder For? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Who Is the No-Code EA Builder For?</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Traders with strategy ideas but no coding skills
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You know exactly what your strategy should do — buy when RSI is oversold and the
                trend is up, sell when the opposite happens. But you can&apos;t translate that into
                MQL5 code. AlgoStudio lets you build that exact logic visually and export it as a
                working EA.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Manual traders ready to automate
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You have a proven manual strategy but can&apos;t watch charts around the clock. You
                want your rules executed consistently — no emotions, no fatigue, no missed setups at
                3 AM. The no-code builder lets you translate your existing rules into a working EA
                that trades 24/5.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Traders who previously hired developers
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You&apos;ve paid $500+ for an EA and waited weeks for delivery, only to realize you
                need changes that cost extra. With AlgoStudio you build it yourself in minutes, and
                every modification is instant. No more waiting, no more invoices for small tweaks.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Rapid prototypers and strategy testers
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You want to test 10 strategy variations this week. Writing MQL5 for each one is
                impossibly slow. With the no-code builder you can prototype, export, and backtest
                three strategies in the time it takes to code one — find what works faster.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – What You Can Build Without Coding */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What You Can Build Without Coding</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            The no-code EA builder supports all common strategy types. Here are popular approaches
            traders build with AlgoStudio — each available as a free template to get started:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/templates/moving-average-crossover-ea"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Trend-Following EAs</h3>
              <p className="text-sm text-[#94A3B8]">
                Moving Average crossovers, ADX trend filters, and MACD momentum strategies that ride
                sustained directional moves.
              </p>
            </Link>
            <Link
              href="/templates/rsi-ea-template"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Mean-Reversion EAs</h3>
              <p className="text-sm text-[#94A3B8]">
                RSI overbought/oversold strategies, Bollinger Band bounces, and Stochastic
                crossovers that trade against extreme price moves.
              </p>
            </Link>
            <Link
              href="/templates/breakout-ea-template"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Breakout EAs</h3>
              <p className="text-sm text-[#94A3B8]">
                Asian range breakouts, support/resistance breakouts, and volatility expansion
                strategies that capture momentum at session opens.
              </p>
            </Link>
            <Link
              href="/visual-strategy-builder"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Multi-Indicator Systems</h3>
              <p className="text-sm text-[#94A3B8]">
                Combine multiple indicators, session filters, and risk rules into systematic
                strategies that execute consistently every time.
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
              href="/no-code-mt5-ea-builder"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              No-Code MT5 EA Builder
            </Link>
            <span className="text-[#64748B]">·</span>
            <Link
              href="/automated-trading-for-beginners"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Automated Trading for Beginners
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
        title="Build your Expert Advisor without coding"
        description="Design your strategy visually, export clean MQL5, and start trading. Free plan available — no credit card required."
      />
    </div>
  );
}
