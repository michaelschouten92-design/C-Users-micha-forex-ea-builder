import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";

export const metadata: Metadata = {
  title: "No-Code EA Builder — Build MT5 Expert Advisors Without Coding",
  description:
    "Create MetaTrader 5 Expert Advisors without writing a single line of code. AlgoStudio's visual builder lets you design, test, and export trading bots in minutes.",
  alternates: { canonical: "/no-code-ea-builder" },
  openGraph: {
    title: "No-Code EA Builder — Build MT5 Expert Advisors Without Coding",
    description:
      "Create MetaTrader 5 Expert Advisors without writing a single line of code. Visual drag-and-drop builder for forex trading bots.",
    url: "/no-code-ea-builder",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "No-Code EA Builder", href: "/no-code-ea-builder" },
];

const faqQuestions = [
  {
    q: "Do I need any coding experience to use AlgoStudio?",
    a: "No. AlgoStudio is a fully visual tool. You build strategies by dragging and connecting blocks — no MQL5, Python, or any other programming knowledge is required.",
  },
  {
    q: "What programming language does the exported EA use?",
    a: "AlgoStudio generates clean, well-commented MQL5 code — the native language of MetaTrader 5. The code is production-ready and can be further customized in MetaEditor if desired.",
  },
  {
    q: "Can I use the generated EA for live trading?",
    a: "Yes. The exported .mq5 file is a standard MetaTrader 5 Expert Advisor. You can backtest it in the MT5 Strategy Tester and run it on any broker that supports MetaTrader 5.",
  },
  {
    q: "How long does it take to build an EA?",
    a: "Most users create their first working EA in under 5 minutes. A more complex strategy with multiple indicators and filters typically takes 10-20 minutes.",
  },
  {
    q: "Is the free plan enough to get started?",
    a: "Absolutely. The free plan includes full access to the visual builder, up to 3 projects, and 2 MQL5 exports per month. No credit card required.",
  },
];

export default function NoCodeEABuilderPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
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

        {/* Hero */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">No coding required</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Build MT5 Expert Advisors Without Writing Code
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Stop spending weeks learning MQL5. AlgoStudio lets you create professional MetaTrader 5
            Expert Advisors with a visual drag-and-drop builder. Design your strategy, configure
            risk management, and export production-ready code — all without touching a single line
            of code.
          </p>
        </header>

        {/* Traditional Coding vs AlgoStudio */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Traditional MQL5 Coding vs AlgoStudio
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 pr-4 text-[#94A3B8] font-medium"></th>
                  <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">
                    Traditional MQL5
                  </th>
                  <th className="text-left py-3 pl-4 text-[#A78BFA] font-medium">AlgoStudio</th>
                </tr>
              </thead>
              <tbody className="text-[#CBD5E1]">
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Learning curve</td>
                  <td className="py-3 px-4">Weeks to months</td>
                  <td className="py-3 pl-4">Minutes</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Coding required</td>
                  <td className="py-3 px-4">C++-like syntax</td>
                  <td className="py-3 pl-4">None</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Debugging</td>
                  <td className="py-3 px-4">Manual, error-prone</td>
                  <td className="py-3 pl-4">Visual — see your logic</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Time to first EA</td>
                  <td className="py-3 px-4">Days to weeks</td>
                  <td className="py-3 pl-4">Under 5 minutes</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Iteration speed</td>
                  <td className="py-3 px-4">Rewrite → compile → test</td>
                  <td className="py-3 pl-4">Drag, drop, export</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-[#94A3B8]">Output quality</td>
                  <td className="py-3 px-4">Depends on skill</td>
                  <td className="py-3 pl-4">Clean, optimized MQL5</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Why Traders Choose the No-Code Approach
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No Programming Knowledge Needed
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                MQL5 is a powerful but complex language based on C++. Most traders don&apos;t have
                years to spend learning compiler errors and pointer arithmetic. With AlgoStudio, you
                express your trading logic by connecting visual blocks — the same way you think
                about your strategy.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Iterate Faster Than Ever</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Want to test a different indicator? Swap a block. Need to adjust your stop loss
                logic? Click and change it. No need to search through hundreds of lines of code. In
                the time it takes to write one function in MQL5, you can test three completely
                different strategies in AlgoStudio.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Visual Strategy Design</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                See your entire strategy at a glance. Timing blocks, indicator conditions, entry
                rules, and risk management — all laid out as a clear visual flow. No more jumping
                between files and functions to understand what your EA does.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Production-Ready MQL5 Output
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                AlgoStudio generates clean, well-commented MQL5 source code that works directly in
                MetaTrader 5. The exported code includes proper error handling, indicator handles,
                and optimizable parameters — ready for backtesting and live trading.
              </p>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Create a new project",
                desc: 'Sign up for free and click "New Project". Name your strategy and open the visual builder.',
              },
              {
                step: "2",
                title: "Design your strategy visually",
                desc: "Drag timing, indicator, and trading blocks onto the canvas. Connect them to define your entry and exit logic.",
              },
              {
                step: "3",
                title: "Configure risk management",
                desc: "Set stop loss, take profit, position sizing, and daily trade limits using dedicated blocks.",
              },
              {
                step: "4",
                title: "Export and trade",
                desc: "Click Export to generate your MQL5 file. Load it into MetaTrader 5, backtest it, and go live when ready.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Explore More</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/visual-strategy-builder"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Visual Strategy Builder</h3>
              <p className="text-sm text-[#94A3B8]">
                Learn about our drag-and-drop canvas and block categories.
              </p>
            </Link>
            <Link
              href="/templates/moving-average-crossover-ea"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">MA Crossover Template</h3>
              <p className="text-sm text-[#94A3B8]">
                Start with a proven Moving Average crossover strategy.
              </p>
            </Link>
            <Link
              href="/pricing"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Pricing</h3>
              <p className="text-sm text-[#94A3B8]">
                Start free, upgrade when you need more exports and projects.
              </p>
            </Link>
            <Link
              href="/blog/how-to-build-mt5-ea-without-coding"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">Tutorial: Build Your First EA</h3>
              <p className="text-sm text-[#94A3B8]">
                Step-by-step guide from idea to working Expert Advisor.
              </p>
            </Link>
          </div>
        </section>

        <FAQSection questions={faqQuestions} />
      </article>

      <CTASection
        title="Ready to build your first EA?"
        description="Join traders who create Expert Advisors without writing code. Start for free — no credit card required."
      />
    </div>
  );
}
