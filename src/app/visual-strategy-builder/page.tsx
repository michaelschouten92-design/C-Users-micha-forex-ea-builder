import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Visual Strategy Builder | Drag-and-Drop EA Builder for MT5",
  description:
    "Build MetaTrader 5 Expert Advisors with a visual drag-and-drop strategy builder. Connect indicator blocks, set risk rules, and export clean MQL5 code — no programming needed.",
  alternates: { canonical: "/visual-strategy-builder" },
  openGraph: {
    title: "Visual Strategy Builder | Drag-and-Drop EA Builder for MT5",
    description:
      "Build MetaTrader 5 Expert Advisors with a visual drag-and-drop strategy builder. Connect indicator blocks, set risk rules, and export clean MQL5 code — no programming needed.",
    url: "/visual-strategy-builder",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Visual Strategy Builder", href: "/visual-strategy-builder" },
];

const faqQuestions = [
  {
    q: "What indicators are available in the visual strategy builder?",
    a: "AlgoStudio supports Moving Average (SMA/EMA), RSI, MACD, Bollinger Bands, ATR, ADX, Stochastic, candlestick patterns, support/resistance zones, and range breakouts. More indicators are added regularly based on user feedback.",
  },
  {
    q: "Can I combine multiple indicators in one strategy?",
    a: "Yes. The drag-and-drop canvas lets you connect as many indicator blocks as you need. For example, you can combine a Moving Average crossover with an RSI overbought/oversold filter and a London session timing block — all by dragging and connecting blocks visually.",
  },
  {
    q: "Does the visual builder support risk management?",
    a: "Absolutely. Dedicated blocks for Stop Loss (fixed pips or ATR-based), Take Profit (fixed pips, risk-reward ratio, or ATR-based), position sizing (fixed lots or risk percentage), trailing stops, break even, and daily trade limits are all available.",
  },
  {
    q: "Is the exported MQL5 code editable?",
    a: "Yes. AlgoStudio exports clean, well-commented MQL5 source code with clearly marked input parameters. You can open it in MetaEditor and make further customizations. The code is yours — no black boxes or encrypted files.",
  },
  {
    q: "How is this different from other EA builders?",
    a: "AlgoStudio focuses exclusively on MetaTrader 5 and generates production-quality MQL5 source code. Unlike wizard-style builders that force you through linear steps, the visual canvas lets you design your strategy the way you think about it — as a flow of connected logic blocks.",
  },
];

export default function VisualStrategyBuilderPage() {
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
            Visual Strategy Builder for MetaTrader 5 Expert Advisors
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            AlgoStudio&apos;s visual strategy builder lets you design complete MetaTrader 5 Expert
            Advisors by dragging and connecting logic blocks on a canvas. Pick indicators, define
            entry and exit conditions, configure risk management, and export production-ready MQL5
            code — all without writing a single line of code. Whether you&apos;re prototyping a new
            idea or building a full trading system, the drag-and-drop EA builder turns hours of
            coding into minutes of visual design.
          </p>
        </header>

        {/* H2 – Design Trading Strategies Visually */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Design Trading Strategies Visually — No Coding Required
          </h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              Building a MetaTrader 5 Expert Advisor traditionally means writing hundreds of lines
              of MQL5 — a C++-based language with steep learning curves around indicator buffers,
              tick event handling, order management, and error recovery. For most traders, the
              technical barrier between &ldquo;I have a strategy idea&rdquo; and &ldquo;I have a
              working EA&rdquo; is simply too high.
            </p>
            <p>
              Wizard-style builders that walk you through linear steps don&apos;t solve the core
              problem either. Real strategies aren&apos;t linear — they&apos;re flows of connected
              conditions and actions. You need to see how timing, indicators, entries, exits, and
              risk management all connect. That requires a canvas, not a form.
            </p>
            <p>
              AlgoStudio&apos;s visual strategy builder gives you that canvas. You build your EA the
              same way you think about your strategy: as a flow of logic blocks connected by clear
              relationships. No code, no syntax errors, no compilation issues. Just your trading
              idea, translated into a visual design that generates clean MQL5 automatically.
            </p>
          </div>
        </section>

        {/* H2 – How the Drag-and-Drop Strategy Builder Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            How the Drag-and-Drop Strategy Builder Works
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Choose your building blocks</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Every strategy starts with blocks from five categories.{" "}
                <strong className="text-white">Timing blocks</strong> control when your EA is active
                — always on, during specific trading sessions (London, New York, Asian), or custom
                hours. <strong className="text-white">Indicator blocks</strong> define your entry
                conditions: Moving Averages (SMA/EMA), RSI, MACD, Bollinger Bands, ATR, ADX,
                Stochastic, and more — each with configurable parameters like periods, levels, and
                crossover detection. <strong className="text-white">Price Action blocks</strong> add
                candlestick patterns, support/resistance levels, and range breakouts.{" "}
                <strong className="text-white">Trade Action blocks</strong> execute orders (Place
                Buy, Place Sell, Close Position), and{" "}
                <strong className="text-white">Trade Management blocks</strong> handle Stop Loss,
                Take Profit, Trailing Stop, Break Even, and daily trade limits.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Connect blocks to define your logic
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Drag blocks onto the canvas and connect them to build your strategy flow. Connect a
                Timing block to an Indicator block, then to a Trade Action — and you have a complete
                entry rule. Add a Trade Management block to set your stop loss and take profit. The
                visual connections make your entire strategy logic readable at a glance — no need to
                trace through hundreds of lines of MQL5 code to understand what your EA does. If
                something doesn&apos;t look right, you can see it immediately.
              </p>
              <p className="text-[#94A3B8] leading-relaxed mt-3">
                Want to add an RSI filter to avoid buying in overbought conditions? Drag an RSI
                block, set the level to 70, and connect it between your indicator and trade action.
                Want to restrict trading to the London session? Add a Timing block. Every change is
                instant and visual.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Export and run in MetaTrader 5
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Click Export and AlgoStudio generates a complete .mq5 file with proper{" "}
                <code className="text-[#A78BFA]">OnInit()</code>,{" "}
                <code className="text-[#A78BFA]">OnTick()</code>, and{" "}
                <code className="text-[#A78BFA]">OnDeinit()</code> event handlers, indicator buffer
                management, order execution logic, and error handling. Input parameters are marked
                as <code className="text-[#A78BFA]">input</code> variables so the MT5 Strategy
                Tester can optimize them automatically. Load the file into MetaTrader 5, compile in
                MetaEditor, and you&apos;re ready to backtest or trade live.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – Visual Strategy Builder vs Traditional MQL5 Coding */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Visual Strategy Builder vs Traditional MQL5 Coding
          </h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            A drag-and-drop EA builder doesn&apos;t mean less capable — it means less accidental
            complexity. Here&apos;s how the visual approach compares to writing MQL5 by hand:
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 pr-4 text-[#94A3B8] font-medium"></th>
                  <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Coding in MQL5</th>
                  <th className="text-left py-3 pl-4 text-[#A78BFA] font-medium">
                    AlgoStudio Visual Builder
                  </th>
                </tr>
              </thead>
              <tbody className="text-[#CBD5E1]">
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Strategy design</td>
                  <td className="py-3 px-4">Write code line by line</td>
                  <td className="py-3 pl-4">Drag, connect, done</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Development time</td>
                  <td className="py-3 px-4">Days to weeks per EA</td>
                  <td className="py-3 pl-4">Minutes to hours</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Readability</td>
                  <td className="py-3 px-4">Hundreds of lines of code</td>
                  <td className="py-3 pl-4">Full strategy visible on one canvas</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Iteration speed</td>
                  <td className="py-3 px-4">Edit → compile → debug → repeat</td>
                  <td className="py-3 pl-4">Reconnect blocks and re-export</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Syntax errors</td>
                  <td className="py-3 px-4">Constant risk</td>
                  <td className="py-3 pl-4">Impossible — blocks only allow valid connections</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-[#94A3B8]">Output</td>
                  <td className="py-3 px-4">Quality depends on developer skill</td>
                  <td className="py-3 pl-4">Clean, optimized MQL5 every time</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            The visual builder doesn&apos;t limit what you can build. You get the same
            production-ready MQL5 output that an experienced MQL5 developer would write — without
            the development time, debugging sessions, or syntax frustrations.
          </p>
        </section>

        {/* H2 – Who Is the Visual Strategy Builder For? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Who Is the Visual Strategy Builder For?
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Traders who think visually</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You draw on charts, sketch strategy ideas on paper, and think in flows — not in
                code. The visual canvas matches how you already reason about trading. Drag your
                conditions, connect them to actions, and see the entire logic at once.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Beginners new to automated trading
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You want to try EA trading but MQL5 feels overwhelming. Start with one of our{" "}
                <Link href="/templates" className="text-[#22D3EE] hover:underline">
                  free templates
                </Link>
                , open it in the visual builder, and see exactly how a working strategy is
                structured. Modify it, learn by doing, and export your first EA in under 5 minutes.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Experienced traders who want speed
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You know exactly what you want to test. Writing MQL5 from scratch for every new idea
                is slow. With the visual builder you can prototype and export three strategies in
                the time it takes to code one — iterate faster, backtest more, and find edges
                sooner.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Strategy testers and researchers
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You want to validate ideas before committing to a full development cycle. Build a
                rough version in minutes, export it, backtest it in MT5&apos;s Strategy Tester, and
                only invest time polishing the strategies that show real promise.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – What You Can Build */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Strategies You Can Build with the Visual Builder
          </h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            The drag-and-drop canvas supports all common EA strategy types. Here are some of the
            most popular approaches traders build with AlgoStudio:
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
                strategies that trade momentum at session opens.
              </p>
            </Link>
            <Link
              href="/no-code-mt5-ea-builder"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Multi-Condition Systems</h3>
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
        title="Design your trading strategy visually"
        description="Build MetaTrader 5 Expert Advisors with drag-and-drop blocks. Free plan available — no credit card required."
      />
    </div>
  );
}
