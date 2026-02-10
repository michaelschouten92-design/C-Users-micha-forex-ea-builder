import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Help — Export to MT5 in 3 Steps",
  description:
    "Learn how to build an MT5 Expert Advisor with AlgoStudio in 3 simple steps: pick a template, export MQL5 code, and run in MetaTrader 5 Strategy Tester.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help — Export to MT5 in 3 Steps | AlgoStudio",
    description:
      "Build a template, export MQL5, load in MT5 and run Strategy Tester. Step-by-step guide.",
  },
};

const steps = [
  {
    number: "1",
    title: "Build from a template",
    description:
      "Sign in and create a new project. Choose a strategy template like EMA Crossover or Range Breakout. The template comes pre-configured with sensible defaults — risk percentage, ATR-based stop loss, and a take profit ratio. Adjust the basic settings if you want, or leave them as-is.",
    tip: "Each template has an Advanced section with optional toggles (like HTF trend filter or session filter). You can ignore these to start.",
  },
  {
    number: "2",
    title: "Export MQL5 code",
    description:
      "Click the Export button in the top-right corner. AlgoStudio generates a clean .mq5 file with well-commented MQL5 source code. The file downloads to your computer automatically. The code includes proper indicator handles, input parameters for optimization, and all the risk management logic from your template.",
    tip: "Free plan gets 1 export per month. Pro plan gives unlimited exports.",
  },
  {
    number: "3",
    title: "Load in MT5 and run Strategy Tester",
    description:
      "Open MetaTrader 5. Go to File → Open Data Folder → MQL5 → Experts. Copy the .mq5 file there. Back in MT5, open the Navigator panel (Ctrl+N), right-click on Expert Advisors, and click Refresh. Your EA appears in the list. To backtest: go to View → Strategy Tester, select your EA, pick a symbol and timeframe, and click Start.",
    tip: "Start with a demo account. Test on at least 6 months of historical data before considering live trading.",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="pt-32 pb-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Export to MT5 in 3 steps</h1>
          <p className="text-lg text-[#94A3B8] mb-12">
            From template to running bot in under 5 minutes. Here&apos;s how.
          </p>

          <div className="space-y-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 md:p-8"
              >
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                    {step.number}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-3">{step.title}</h2>
                    <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
                      {step.description}
                    </p>
                    <div className="bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)] rounded-lg px-4 py-3">
                      <p className="text-xs text-[#A78BFA]">
                        <strong>Tip:</strong> {step.tip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl">
            <h2 className="text-lg font-semibold text-white mb-3">Need more help?</h2>
            <p className="text-sm text-[#94A3B8] mb-4">
              Check our blog for strategy-specific tutorials, or reach out directly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/blog" className="text-sm text-[#22D3EE] hover:underline">
                Read tutorials &rarr;
              </Link>
              <Link href="/contact" className="text-sm text-[#22D3EE] hover:underline">
                Contact support &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>

      <CTASection
        title="Ready to build your first bot?"
        description="Pick a template and export clean MQL5 code in minutes."
      />

      {/* Footer */}
      <footer className="border-t border-[rgba(79,70,229,0.1)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <span>&copy; {new Date().getFullYear()} AlgoStudio</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
