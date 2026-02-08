import type { Metadata } from "next";
import Link from "next/link";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { SiteNav } from "@/components/marketing/site-nav";

export const metadata: Metadata = {
  title: "Automated Trading for Beginners — Start Forex Trading Without Coding",
  description:
    "Learn how automated forex trading works and how to build your first Expert Advisor without coding. A beginner-friendly guide to algorithmic trading with MetaTrader 5.",
  alternates: { canonical: "/automated-trading-for-beginners" },
  openGraph: {
    title: "Automated Trading for Beginners — Start Forex Trading Without Coding",
    description:
      "A beginner-friendly guide to automated forex trading. Learn how to build Expert Advisors without coding using AlgoStudio.",
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
    a: "Yes. While you need a basic understanding of trading concepts (what a buy/sell order is, what stop loss means), you don't need coding experience or years of manual trading. AlgoStudio's visual builder makes the technical side accessible to everyone.",
  },
  {
    q: "Do I need trading experience to start?",
    a: "Some basic knowledge helps — understanding what forex is, how currency pairs work, and what indicators do. Our blog has beginner guides that cover all the basics. You can also start with a template strategy and learn by modifying it.",
  },
  {
    q: "How much money do I need to start automated trading?",
    a: "You can start building and backtesting EAs for free with AlgoStudio. For live trading, most brokers allow demo accounts with virtual money. When you're ready, you can start with as little as $100-$500, though $1,000+ is recommended for meaningful results.",
  },
  {
    q: "Can I lose money with automated trading?",
    a: "Yes — all trading involves risk. An EA follows the rules you set, but no strategy wins every trade. That's why backtesting and risk management are essential. Start on a demo account, use proper stop losses, and never risk more than 1-2% per trade.",
  },
  {
    q: "What's the difference between an EA and a trading bot?",
    a: "In the MetaTrader world, they're the same thing. An Expert Advisor (EA) is MetaTrader's name for an automated trading program. Other platforms might call them trading bots, algorithms, or algos.",
  },
  {
    q: "Do I need to keep my computer running 24/7?",
    a: "For the EA to trade, MetaTrader 5 needs to be running. Many traders use a Virtual Private Server (VPS) — a remote computer that runs 24/7. Some brokers offer free VPS hosting, or you can rent one for $10-30/month.",
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

        {/* Hero */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#A78BFA] font-medium">Beginner friendly</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            Start Automated Forex Trading Without Coding
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed">
            Automated trading uses software to execute trades based on rules you define. Instead of
            sitting at your screen all day, an Expert Advisor monitors the market and trades for you
            — 24 hours a day, 5 days a week. And thanks to modern tools, you don&apos;t need to know
            how to code to get started.
          </p>
        </header>

        {/* What is automated trading */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What Is Automated Trading?</h2>
          <p className="text-[#94A3B8] leading-relaxed mb-4">
            Automated trading (also called algorithmic trading or algo trading) means using a
            computer program to buy and sell financial instruments based on predefined rules. In the
            forex world, these programs are called{" "}
            <strong className="text-white">Expert Advisors (EAs)</strong> and run inside MetaTrader
            5.
          </p>
          <p className="text-[#94A3B8] leading-relaxed mb-4">
            An EA constantly monitors price data and technical indicators. When your conditions are
            met — for example, when a moving average crosses above another — the EA automatically
            places a trade. It also manages the trade by setting stop losses, take profits, and
            closing positions when your exit conditions are triggered.
          </p>
          <p className="text-[#94A3B8] leading-relaxed">
            Think of it as a recipe for trading: you define the ingredients (indicators), the
            instructions (entry and exit rules), and the safety measures (risk management). The EA
            follows the recipe exactly, every single time.
          </p>
        </section>

        {/* Why automate */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Why Automate Your Trading?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                title: "24/5 Market Coverage",
                desc: "The forex market never sleeps on weekdays. Your EA monitors every tick, even while you're asleep or at work.",
              },
              {
                title: "No Emotional Decisions",
                desc: "Fear and greed cause most trading losses. An EA follows the rules without hesitation, every single time.",
              },
              {
                title: "Backtest Before You Risk",
                desc: "Test your strategy on years of historical data before putting real money on the line. Know the numbers first.",
              },
              {
                title: "Consistent Execution",
                desc: "No fatigue, no bad days, no second-guessing. The same conditions always get the same response.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-5"
              >
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Getting Started Guide */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            Getting Started: From Idea to Live Trading
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Step 1: Define Your Strategy
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Start with a simple idea. For example: &ldquo;Buy when the fast moving average
                crosses above the slow one, sell when it crosses below.&rdquo; Keep it simple — the
                best beginner strategies use 1-2 indicators with clear entry and exit rules. Check
                out our{" "}
                <Link
                  href="/templates/moving-average-crossover-ea"
                  className="text-[#22D3EE] hover:underline"
                >
                  Moving Average Crossover template
                </Link>{" "}
                for a proven starting point.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Step 2: Build It Visually</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Open AlgoStudio and create a new project. Drag blocks onto the canvas — timing,
                indicators, and trade actions — and connect them to define your logic. No coding
                required. Our{" "}
                <Link href="/no-code-ea-builder" className="text-[#22D3EE] hover:underline">
                  no-code EA builder
                </Link>{" "}
                handles all the technical complexity.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Step 3: Backtest Thoroughly</h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Export your EA and load it into MetaTrader 5&apos;s Strategy Tester. Test on at
                least 1-2 years of historical data. Look at profit factor, max drawdown, and total
                trades. Don&apos;t chase perfect results — look for consistency and reasonable
                drawdowns.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Step 4: Demo First, Then Go Live
              </h3>
              <p className="text-[#94A3B8] leading-relaxed">
                Run your EA on a demo account for at least 1-3 months to verify it works in real
                market conditions. Once you&apos;re confident, start live trading with small
                position sizes. Never risk more than 1-2% of your account per trade.
              </p>
            </div>
          </div>
        </section>

        {/* Common Mistakes */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Common Beginner Mistakes to Avoid</h2>
          <div className="space-y-4">
            {[
              {
                mistake: "Skipping the backtest",
                fix: "Always backtest on at least 1 year of data before going live. No exceptions.",
              },
              {
                mistake: "No stop loss",
                fix: "Every trade needs a stop loss. One bad trade without a stop can wipe out months of profits.",
              },
              {
                mistake: "Over-complicating the strategy",
                fix: "Start with 1-2 indicators. Adding more doesn't mean better — it often means overfitting.",
              },
              {
                mistake: "Going live too quickly",
                fix: "Run on demo for at least 1 month. Backtesting is great, but live conditions are different.",
              },
              {
                mistake: "Risking too much per trade",
                fix: "Stick to 1-2% risk per trade. Even the best strategies have losing streaks.",
              },
            ].map((item) => (
              <div
                key={item.mistake}
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-5"
              >
                <p className="text-white font-semibold mb-1">{item.mistake}</p>
                <p className="text-sm text-[#94A3B8]">{item.fix}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Resources */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Helpful Resources</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/no-code-ea-builder"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">No-Code EA Builder</h3>
              <p className="text-sm text-[#94A3B8]">
                Build EAs without programming — visual drag-and-drop.
              </p>
            </Link>
            <Link
              href="/templates/moving-average-crossover-ea"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">MA Crossover Template</h3>
              <p className="text-sm text-[#94A3B8]">
                Start with a proven beginner-friendly strategy.
              </p>
            </Link>
            <Link
              href="/blog/what-is-an-expert-advisor"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">What Is an Expert Advisor?</h3>
              <p className="text-sm text-[#94A3B8]">
                Deep dive into how EAs work inside MetaTrader 5.
              </p>
            </Link>
            <Link
              href="/blog/5-mistakes-automating-trading-strategies"
              className="block p-4 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl hover:border-[rgba(79,70,229,0.4)] transition-colors"
            >
              <h3 className="text-white font-semibold mb-1">5 Automation Mistakes</h3>
              <p className="text-sm text-[#94A3B8]">
                Learn from the most common pitfalls traders face.
              </p>
            </Link>
          </div>
        </section>

        <FAQSection questions={faqQuestions} />
      </article>

      <CTASection
        title="Start your automated trading journey"
        description="Build your first Expert Advisor in minutes. Free plan available — no credit card required."
      />
    </div>
  );
}
