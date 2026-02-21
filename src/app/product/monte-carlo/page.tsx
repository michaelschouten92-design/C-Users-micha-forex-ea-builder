import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Monte Carlo Risk Calculator — Stress-Test Your Strategy | AlgoStudio",
  description:
    "Run 1,000 randomized simulations on your backtest results. See probability distributions, worst-case drawdowns, and risk of ruin before you trade live.",
  alternates: { canonical: "/product/monte-carlo" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Platform", href: "/product" },
  { name: "Monte Carlo Risk Calculator", href: "/product/monte-carlo" },
];

const faqItems = [
  {
    q: "What is a Monte Carlo simulation?",
    a: "A Monte Carlo simulation takes your backtest trade results and randomly reshuffles the order of trades thousands of times. Each reshuffled sequence produces a different equity curve. By analyzing all 1,000 curves together, you see the realistic range of outcomes your strategy might produce — not just the single path your backtest happened to follow.",
  },
  {
    q: "How many simulations does AlgoStudio run?",
    a: "AlgoStudio runs 1,000 randomized simulations per analysis. This is enough to produce statistically meaningful probability distributions without excessive computation time. Results are typically ready in a few seconds.",
  },
  {
    q: "What metrics does the Monte Carlo report show?",
    a: "The report shows probability distributions for maximum drawdown, final equity, risk of ruin (probability of hitting a specified loss threshold), expected return range at various confidence levels (50th, 75th, 95th percentiles), and worst-case scenarios across all simulations.",
  },
  {
    q: "Do I need to run my own backtest first?",
    a: "Yes. The Monte Carlo simulator works on backtest results. Export your EA from AlgoStudio, run it in the MT5 Strategy Tester, then upload the results to the Monte Carlo calculator. The simulator reshuffles your actual trade outcomes.",
  },
  {
    q: "Is the Monte Carlo calculator available on the Free plan?",
    a: "Yes. The Monte Carlo Risk Calculator is available on all plans, including Free. It is a core part of the AlgoStudio validation pipeline.",
  },
  {
    q: "Why not just trust my backtest results?",
    a: "A single backtest shows one specific sequence of trades. If your first 10 trades happened to be winners, the equity curve looks smooth. But if those same trades occurred in a different order, the drawdown could be much worse. Monte Carlo simulation reveals the full range of possibilities hiding inside your results.",
  },
];

export default function MonteCarloPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />

      <SiteNav />

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />

          <section className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Know what your strategy can really do
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              A single backtest shows one path. Monte Carlo simulation shows the full range of
              outcomes — best case, worst case, and everything in between. 1,000 simulations. Real
              probability distributions.
            </p>
          </section>

          {/* Why Monte Carlo matters */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Why one backtest is not enough
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">The order problem</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Your backtest shows trades in the exact order they happened. But that order is
                  just one possibility. Rearrange the same trades and the drawdown profile changes
                  completely. Monte Carlo reveals what your drawdown could have been.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">False confidence</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  A backtest with a smooth equity curve and 15% drawdown might seem safe. But Monte
                  Carlo could reveal a 95th percentile drawdown of 35%. Without simulation, you only
                  see the lucky path — not the realistic range.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Risk of ruin</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  What is the probability of losing 50% of your account? Monte Carlo quantifies this
                  directly. Set your ruin threshold and see the exact probability across all 1,000
                  simulations.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Position sizing validation
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  If your risk of ruin is too high, reduce position size and re-run. Monte Carlo
                  lets you calibrate risk per trade until the worst-case outcome is acceptable. Size
                  your positions with data, not gut feeling.
                </p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              How the simulation works
            </h2>
            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Upload your backtest results",
                  desc: "Run your exported EA in the MT5 Strategy Tester. Upload the trade history to AlgoStudio. The simulator extracts each individual trade outcome.",
                },
                {
                  step: "2",
                  title: "Trades are reshuffled 1,000 times",
                  desc: "The simulator takes your exact trade results and randomly reorders them 1,000 times. Each reordering produces a different equity curve with different drawdown characteristics.",
                },
                {
                  step: "3",
                  title: "Probability distributions are calculated",
                  desc: "Across all 1,000 equity curves, AlgoStudio calculates the distribution of maximum drawdowns, final equity values, and risk of ruin. Results are shown at multiple confidence levels.",
                },
                {
                  step: "4",
                  title: "Review your risk profile",
                  desc: "See your expected return at the 50th, 75th, and 95th percentile. Understand the worst-case drawdown. Decide if the risk profile matches your tolerance before going live.",
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-[#94A3B8]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* What the report shows */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              What the report shows you
            </h2>
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Drawdown distribution",
                    desc: "Maximum drawdown at the 50th, 75th, and 95th percentile across all simulations.",
                  },
                  {
                    title: "Expected return range",
                    desc: "Final equity distribution showing best, median, and worst outcomes.",
                  },
                  {
                    title: "Risk of ruin",
                    desc: "Probability of hitting your specified loss threshold (e.g. 50% account loss).",
                  },
                  {
                    title: "Confidence intervals",
                    desc: "Statistical bounds on performance so you know the realistic range, not just the average.",
                  },
                ].map((item) => (
                  <div key={item.title}>
                    <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-[#94A3B8]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Stress-test your strategy"
        description="Run Monte Carlo simulations on your backtest results. See the full range of outcomes before you risk real capital. Free — no credit card required."
      />

      <Footer />
    </div>
  );
}
