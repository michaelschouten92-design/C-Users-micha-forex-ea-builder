import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Features — Simple MT5 EA Builder",
  description:
    "Strategy templates, guided customization, and clean MQL5 export. AlgoStudio is the simplest no-code MT5 EA builder for traders who want automation without overwhelm.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Features — Simple MT5 EA Builder | AlgoStudio",
    description:
      "Strategy templates, guided customization, and clean MQL5 export. Build your first MT5 bot in 5 minutes.",
  },
};

const features = [
  {
    title: "Strategy templates",
    subtitle: "Start fast",
    description:
      "Pick from proven templates like EMA Crossover, Range Breakout, or RSI Reversal. Each comes with sensible defaults — adjust a few settings and export. No blank canvas, no guesswork.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
        />
      </svg>
    ),
  },
  {
    title: "Guided customization",
    subtitle: "No overwhelm",
    description:
      "Each template shows only the settings that matter — 3 to 5 basic fields plus optional advanced toggles. You always know what each setting does. No 50-field forms, no confusing logic builders.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
    ),
  },
  {
    title: "Clean MQL5 export",
    subtitle: "You own the code",
    description:
      "Export readable, well-commented MQL5 source code. Load it into MetaTrader 5, backtest in Strategy Tester, or edit it further. No lock-in — the code is yours.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    title: "Strategy summary",
    subtitle: "Clarity at a glance",
    description:
      "Every strategy shows a plain-language summary of what it does. Before exporting, you can read exactly how your bot will trade — no surprises.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    title: "Works with any MT5 broker",
    subtitle: "Universal compatibility",
    description:
      "The exported EA runs on any MetaTrader 5 platform — forex, indices, commodities, crypto. Use your existing broker account. No special integration needed.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="pt-32 pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Simple tools for serious trading
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              AlgoStudio gives you everything you need to build an MT5 trading bot — and nothing you
              don&apos;t. No feature overload. No learning curve.
            </p>
          </div>

          <div className="space-y-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 md:p-8"
              >
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-lg flex items-center justify-center flex-shrink-0 text-[#A78BFA]">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-xs text-[#A78BFA] font-medium uppercase tracking-wider mb-1">
                      {f.subtitle}
                    </p>
                    <h2 className="text-xl font-semibold text-white mb-2">{f.title}</h2>
                    <p className="text-sm text-[#94A3B8] leading-relaxed">{f.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <CTASection
        title="Start building. Export your first bot today."
        description="Pick a template, adjust a few settings, and export clean MQL5 code to MetaTrader 5."
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
