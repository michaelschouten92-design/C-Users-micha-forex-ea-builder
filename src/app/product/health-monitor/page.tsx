import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";
import { FAQSection, faqJsonLd } from "@/components/marketing/faq-section";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Strategy Health Monitor — Protect Your EAs From Edge Degradation | AlgoStudio",
  description:
    "Continuously monitor your EAs' live performance against baseline. 5 metrics tracked. Alerts when your edge degrades, drawdowns exceed norms, or returns drift.",
  alternates: { canonical: "/product/health-monitor" },
};

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Platform", href: "/product" },
  { name: "Health Monitor", href: "/product/health-monitor" },
];

const faqItems = [
  {
    q: "What metrics does the Health Monitor track?",
    a: "The Health Monitor tracks 5 core metrics: win rate, profit factor, maximum drawdown, Sharpe ratio, and trade frequency. Each metric is compared against your established baseline to detect meaningful deviations.",
  },
  {
    q: "How often is strategy health checked?",
    a: "Health metrics are recalculated after every closed trade. The comparison against your baseline is continuous — you do not need to manually trigger a check. If a metric drifts outside normal bounds, you are alerted immediately.",
  },
  {
    q: "What triggers a health alert?",
    a: "An alert is triggered when any of the 5 tracked metrics deviates significantly from your baseline. For example, if your win rate drops from 55% to 40%, or your maximum drawdown exceeds the baseline by a configurable threshold. The system distinguishes between normal variance and meaningful degradation.",
  },
  {
    q: "What is edge degradation?",
    a: "Edge degradation is the gradual loss of a strategy's statistical advantage. Markets evolve — volatility shifts, correlations change, and patterns that once worked stop working. The Health Monitor detects this drift early, before it becomes a large drawdown.",
  },
  {
    q: "How is the baseline established?",
    a: "The baseline is set from your backtest results and initial live performance. AlgoStudio calculates the expected range for each metric based on your historical data. As your live track record grows, the baseline can be recalibrated.",
  },
  {
    q: "Which plan includes the Health Monitor?",
    a: "The Strategy Health Monitor is available exclusively on the Elite plan. It is designed for traders who are running strategies live and need continuous performance oversight.",
  },
];

export default function HealthMonitorPage() {
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
              Know the moment your edge starts to fade
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              Markets change. Strategies that worked last quarter may not work next quarter. The
              Health Monitor continuously compares live performance against your baseline and alerts
              you when something drifts.
            </p>
          </section>

          {/* The 5 metrics */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              5 metrics, continuously monitored
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors">
                <h3 className="text-lg font-semibold text-white mb-3">Win rate</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  The percentage of trades that close in profit. A sustained drop in win rate is
                  often the first sign that market conditions have shifted away from your
                  strategy&apos;s edge.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors">
                <h3 className="text-lg font-semibold text-white mb-3">Profit factor</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  The ratio of gross profits to gross losses. A profit factor below 1.0 means the
                  strategy is losing money. The monitor flags when this ratio declines toward or
                  below your baseline threshold.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors">
                <h3 className="text-lg font-semibold text-white mb-3">Maximum drawdown</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  The largest peak-to-trough decline in your equity. When live drawdown exceeds what
                  your backtest and Monte Carlo analysis predicted, the monitor alerts you
                  immediately.
                </p>
              </div>
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors">
                <h3 className="text-lg font-semibold text-white mb-3">Sharpe ratio</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Risk-adjusted return. A declining Sharpe ratio means the strategy is delivering
                  less return per unit of risk. This metric catches subtle degradation that raw
                  profit numbers might hide.
                </p>
              </div>
            </div>
            <div className="mt-8 max-w-md mx-auto">
              <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-colors">
                <h3 className="text-lg font-semibold text-white mb-3">Trade frequency</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  How often the strategy opens trades. A sudden drop in trade frequency may indicate
                  that the market conditions the strategy needs are no longer occurring. A spike may
                  indicate false signals.
                </p>
              </div>
            </div>
          </section>

          {/* How monitoring works */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              How the Health Monitor works
            </h2>
            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Baseline is established",
                  desc: "Your backtest results and initial live performance define the expected range for each metric. This is what healthy performance looks like for your specific strategy.",
                },
                {
                  step: "2",
                  title: "Every trade is measured",
                  desc: "After each closed trade, all 5 metrics are recalculated using your live results. The current values are compared against the baseline ranges.",
                },
                {
                  step: "3",
                  title: "Deviations are detected",
                  desc: "The monitor distinguishes between normal statistical variance and meaningful degradation. Short losing streaks are expected. Sustained metric drift is flagged.",
                },
                {
                  step: "4",
                  title: "Alerts are sent",
                  desc: "When a metric moves outside its expected range, you receive an alert with the specific metric, the current value, the baseline value, and the magnitude of the deviation.",
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

          {/* Edge degradation */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              What edge degradation looks like
            </h2>
            <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Gradual win rate decline",
                    desc: "Win rate drops from 58% to 48% over 3 months. Not a sudden crash — a slow fade that is easy to miss without monitoring.",
                  },
                  {
                    title: "Drawdown exceeding norms",
                    desc: "Live drawdown reaches 28% when Monte Carlo predicted 95th percentile at 22%. The strategy is experiencing worse outcomes than simulated.",
                  },
                  {
                    title: "Profit factor compression",
                    desc: "Profit factor drops from 1.8 to 1.2. Still profitable, but the margin of safety is eroding. Time to investigate before it drops below 1.0.",
                  },
                  {
                    title: "Trade frequency anomaly",
                    desc: "Strategy that averaged 12 trades per week now averages 4. The market conditions it relies on may no longer be present.",
                  },
                ].map((item) => (
                  <div key={item.title}>
                    <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-[#94A3B8]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-[#64748B] mt-4 text-center">
              Strategy Health Monitor requires{" "}
              <Link href="/pricing" className="text-[#A78BFA] hover:underline">
                Elite plan
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <FAQSection questions={faqItems} />

      <CTASection
        title="Evaluate your strategy, then protect it"
        description="Detect edge degradation early. 5 metrics continuously compared against your baseline. Start with a free evaluation and upgrade to Health Monitor when you go live."
      />

      <Footer />
    </div>
  );
}
