import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "About — AlgoStudio",
  description:
    "AlgoStudio was built to make MetaTrader 5 automation simple. One founder, one mission: help traders build MT5 bots without coding or overwhelm.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About AlgoStudio",
    description:
      "One founder, one mission: help traders build MT5 bots without coding or overwhelm.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="pt-32 pb-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">About AlgoStudio</h1>

          <div className="space-y-6 text-[#94A3B8] leading-relaxed">
            <p className="text-lg">I built AlgoStudio because I got overwhelmed.</p>

            <p>
              As a trader, I wanted to automate my strategies in MetaTrader 5. So I tried the
              existing tools — complex visual builders with hundreds of options, MQL5 coding
              courses, drag-and-drop platforms that still required programming logic to get anything
              useful out the door.
            </p>

            <p>
              Every tool assumed I wanted maximum power and flexibility. What I actually wanted was
              to take a simple idea — like &quot;buy when the fast EMA crosses above the slow EMA,
              with a 1.5x ATR stop loss&quot; — and turn it into a working MT5 bot I could backtest.
              In five minutes, not five weeks.
            </p>

            <p>That tool didn&apos;t exist. So I built it.</p>

            <p>
              <strong className="text-white">
                AlgoStudio is the simplest way to turn a trading idea into an MT5 bot.
              </strong>{" "}
              You pick a proven strategy template, adjust a few settings, and export clean MQL5
              code. No blank canvas. No 50-field configuration forms. No AND/OR logic builders. Just
              the settings that matter, with sensible defaults that work out of the box.
            </p>

            <p>
              The templates are designed around real strategies that traders actually use: EMA
              crossovers, RSI reversals, range breakouts, trend pullbacks, and MACD momentum. Each
              template produces a fully functional Expert Advisor that you can load into MetaTrader
              5 and test immediately.
            </p>

            <p>
              AlgoStudio is a solo project. I&apos;m both the developer and the first user. Every
              feature exists because I needed it — not because it looked good on a feature
              comparison chart.
            </p>

            <div className="border-t border-[rgba(79,70,229,0.1)] pt-6 mt-8">
              <p className="text-white font-medium">Build your first bot in 5 minutes.</p>
              <Link
                href="/login?mode=register"
                className="inline-block mt-4 bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-colors"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
