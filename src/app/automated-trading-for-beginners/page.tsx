import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Automated Trading for Beginners | Start Without Coding",
  description:
    "Learn how automated forex trading works and build your first MetaTrader 5 Expert Advisor without coding. A step-by-step beginner guide to algorithmic trading.",
  alternates: { canonical: "/automated-trading-for-beginners" },
  openGraph: {
    title: "Automated Trading for Beginners | Start Without Coding",
    description:
      "Learn how automated forex trading works and build your first MetaTrader 5 Expert Advisor without coding. A step-by-step beginner guide to algorithmic trading.",
    url: "/automated-trading-for-beginners",
  },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Automated Trading for Beginners", href: "/automated-trading-for-beginners" },
];

const faqQuestions = [
  {
    q: "Is automated trading suitable for complete beginners?",
    a: "Yes. You need a basic understanding of trading concepts — what a buy/sell order is, what stop loss means — but you don't need coding experience or years of manual trading. AlgoStudio's visual builder makes the technical side accessible to everyone.",
  },
  {
    q: "How much money do I need to start automated trading?",
    a: "You can build and backtest EAs for free with AlgoStudio. For live trading, most brokers offer demo accounts with virtual money. When you're ready for real capital, you can start with as little as $100–$500, though $1,000+ is recommended for meaningful results.",
  },
  {
    q: "Can I lose money with automated trading?",
    a: "Yes — all trading involves risk. An EA follows the rules you set, but no strategy wins every trade. That's why backtesting and risk management are essential. Start on a demo account, use proper stop losses, and never risk more than 1–2% per trade.",
  },
  {
    q: "What is the difference between an EA and a trading bot?",
    a: "In the MetaTrader world, they're the same thing. An Expert Advisor (EA) is MetaTrader's name for an automated trading program. Other platforms call them trading bots, algorithms, or algos — but the concept is identical.",
  },
  {
    q: "Do I need to keep my computer running 24/7?",
    a: "For the EA to trade, MetaTrader 5 needs to be running. Many traders use a Virtual Private Server (VPS) — a remote computer that runs 24/7. Some brokers offer free VPS hosting, or you can rent one for $10–30/month.",
  },
];

export default function AutomatedTradingForBeginnersPage() {
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
            Automated Trading for Beginners — Start Without Coding
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Automated trading uses software — called Expert Advisors (EAs) in MetaTrader 5 — to
            execute trades based on rules you define. Instead of watching charts for hours, your EA
            monitors the market 24 hours a day, 5 days a week, and trades when your conditions are
            met. This guide explains how automated forex trading works, how to get started step by
            step, and how to build your first EA without writing a single line of code.
          </p>
        </header>

        {/* H2 – What Is Automated Forex Trading? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What Is Automated Forex Trading?</h2>
          <div className="space-y-4 text-[#94A3B8] leading-relaxed">
            <p>
              Automated trading (also called algorithmic trading or algo trading) means using a
              computer program to buy and sell financial instruments based on predefined rules. In
              the forex world, these programs are called{" "}
              <strong className="text-white">Expert Advisors (EAs)</strong> and run inside
              MetaTrader 5 — the most widely used retail trading platform.
            </p>
            <p>
              An EA constantly monitors price data and technical indicators. When your conditions
              are met — for example, when a moving average crosses above another and RSI is below 70
              — the EA automatically places a trade. It also manages the position by setting stop
              losses, take profits, and closing the trade when your exit conditions trigger.
            </p>
            <p>
              Think of it as a recipe for trading: you define the ingredients (indicators and price
              conditions), the instructions (entry and exit rules), and the safety measures (risk
              management). The EA follows the recipe exactly, every single time — no emotions, no
              hesitation, no missed trades because you were asleep.
            </p>
          </div>
        </section>

        {/* H2 – How to Start Automated Trading Step by Step */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            How to Start Automated Trading Step by Step
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Step 1: Define a simple strategy
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Start with a clear, simple idea. For example: &ldquo;Buy when the 10-period EMA
                crosses above the 50-period EMA, sell when it crosses below. Use a 50-pip stop loss
                and 100-pip take profit.&rdquo; The best beginner strategies use 1–2 indicators with
                unambiguous entry and exit rules. Avoid the temptation to add five indicators right
                away — simplicity is your friend when starting out. Our{" "}
                <Link
                  href="/templates/moving-average-crossover-ea"
                  className="text-[#22D3EE] hover:underline"
                >
                  Moving Average Crossover template
                </Link>{" "}
                is a proven starting point for beginners.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Step 2: Build your EA visually
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Open AlgoStudio and create a new project. Drag blocks onto the canvas — timing
                conditions, indicators, trade actions, and risk management rules — and connect them
                to define your logic. No coding is required. The{" "}
                <Link href="/visual-strategy-builder" className="text-[#22D3EE] hover:underline">
                  visual strategy builder
                </Link>{" "}
                handles all the technical complexity: indicator buffers, order execution, event
                handling, and error recovery are generated automatically. You focus on <em>what</em>{" "}
                your strategy should do, not <em>how</em> to code it.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Step 3: Backtest on historical data
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Export your EA as a .mq5 file and load it into MetaTrader 5&apos;s built-in Strategy
                Tester. Test on at least 1–2 years of historical data across the currency pairs you
                plan to trade. Look at profit factor (above 1.3 is promising), maximum drawdown
                (lower is better), and total number of trades (more trades = more statistical
                significance). Don&apos;t chase perfect backtest results — look for consistency and
                manageable drawdowns.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Step 4: Demo first, then go live
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Run your EA on a demo account for at least 1–3 months. Backtesting uses historical
                data, but live markets have slippage, spread widening, and different liquidity
                conditions. A demo account lets you verify that your EA performs in real-time
                conditions before risking real capital. Once confident, start live trading with
                small position sizes and never risk more than 1–2% of your account per trade.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – Automated Trading vs Manual Trading */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Automated Trading vs Manual Trading
          </h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            Both approaches have their place, but automated trading solves several problems that
            manual traders face daily:
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(79,70,229,0.2)]">
                  <th className="text-left py-3 pr-4 text-[#94A3B8] font-medium"></th>
                  <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Manual Trading</th>
                  <th className="text-left py-3 pl-4 text-[#A78BFA] font-medium">
                    Automated Trading (EA)
                  </th>
                </tr>
              </thead>
              <tbody className="text-[#CBD5E1]">
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Market coverage</td>
                  <td className="py-3 px-4">Limited to screen time</td>
                  <td className="py-3 pl-4">24/5 — never misses a setup</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Emotions</td>
                  <td className="py-3 px-4">Fear, greed, revenge trading</td>
                  <td className="py-3 pl-4">Executes rules without emotion</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Execution speed</td>
                  <td className="py-3 px-4">Seconds (manual click)</td>
                  <td className="py-3 pl-4">Milliseconds (automatic)</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Consistency</td>
                  <td className="py-3 px-4">Varies with mood and fatigue</td>
                  <td className="py-3 pl-4">Same rules, every time</td>
                </tr>
                <tr className="border-b border-[rgba(79,70,229,0.1)]">
                  <td className="py-3 pr-4 text-[#94A3B8]">Backtesting</td>
                  <td className="py-3 px-4">Tedious, manual chart scrolling</td>
                  <td className="py-3 pl-4">Automated over years of data</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-[#94A3B8]">Scalability</td>
                  <td className="py-3 px-4">One pair at a time</td>
                  <td className="py-3 pl-4">Run multiple EAs on multiple pairs</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            The biggest advantage for beginners is backtesting. Manual traders can only guess
            whether their strategy works. With an EA, you can test it on years of historical data in
            minutes and make data-driven decisions before risking real money.
          </p>
        </section>

        {/* H2 – Who Should Start with Automated Trading? */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Who Should Start with Automated Trading?
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Beginners curious about trading
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You&apos;ve heard about forex trading and want to try it, but don&apos;t know where
                to start. Automated trading gives you a structured approach: define clear rules,
                backtest them, and let the data tell you if your idea has merit — instead of
                guessing with real money.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Manual traders who want consistency
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You have a strategy that works when you follow the rules — but you don&apos;t always
                follow the rules. Fear, greed, or fatigue cause you to skip setups or exit too
                early. An EA removes that human element and executes your strategy exactly as
                designed, 24/5.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                People with limited screen time
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You have a day job and can&apos;t watch charts for 8 hours. Automated trading lets
                your EA monitor the market around the clock. You set it up once, and it works while
                you work, sleep, or spend time with your family.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Data-driven decision makers</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                You don&apos;t trust gut feelings — you want numbers. Automated trading lets you
                backtest strategies on years of data, measure profit factors and drawdowns, and make
                decisions based on statistical evidence rather than hope.
              </p>
            </div>
          </div>
        </section>

        {/* H2 – Beginner-Friendly Strategies to Automate */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Beginner-Friendly Strategies to Automate
          </h2>
          <p className="text-[#94A3B8] leading-relaxed mb-6">
            These are proven strategy types that work well as a first automated trading system.
            Start simple, backtest thoroughly, and add complexity only when the data supports it:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/templates/moving-average-crossover-ea"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Moving Average Crossover</h3>
              <p className="text-sm text-[#94A3B8]">
                The classic beginner strategy. Buy when a fast MA crosses above a slow MA, sell on
                the opposite cross. Simple, proven, and easy to understand.
              </p>
            </Link>
            <Link
              href="/templates/rsi-ea-template"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">RSI Mean Reversion</h3>
              <p className="text-sm text-[#94A3B8]">
                Buy when RSI drops below 30 (oversold), sell when it rises above 70 (overbought).
                Works well in ranging markets with clear boundaries.
              </p>
            </Link>
            <Link
              href="/templates/breakout-ea-template"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Session Breakout</h3>
              <p className="text-sm text-[#94A3B8]">
                Trade the breakout of the Asian session range at the London open. Captures the
                volatility surge when European markets wake up.
              </p>
            </Link>
            <Link
              href="/no-code-mt5-ea-builder"
              className="block p-5 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-2">Build Your Own</h3>
              <p className="text-sm text-[#94A3B8]">
                Have your own idea? Use AlgoStudio&apos;s no-code EA builder to turn any strategy
                concept into a working MetaTrader 5 Expert Advisor.
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
              href="/visual-strategy-builder"
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              Visual Strategy Builder
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
        title="Build your first Expert Advisor in minutes"
        description="No coding required. Design your strategy visually, export clean MQL5, and start backtesting. Free plan available."
      />
    </div>
  );
}
