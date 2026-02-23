import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "About — AlgoStudio | Strategy Validation Platform",
  description:
    "AlgoStudio is a strategy validation platform that helps traders know if their strategy actually works. One founder. One mission: replace trading hope with objective evidence.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About AlgoStudio",
    description: "One founder, one mission: replace trading hope with objective evidence.",
  },
};

export default function AboutPage() {
  return (
    <div id="main-content" className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="pt-32 pb-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">About AlgoStudio</h1>

          <div className="space-y-6 text-[#94A3B8] leading-relaxed">
            <p className="text-lg">I built AlgoStudio because I kept making the same mistake.</p>

            <p>
              As a trader, I&apos;d build a strategy, run one backtest, see a profit line going up,
              and deploy it live. Sometimes it worked. Often it didn&apos;t. And when it stopped
              working, I had no way of knowing whether the market had changed, my parameters were
              wrong, or the original backtest was just luck.
            </p>

            <p>
              I wasn&apos;t alone. Most algorithmic traders face the same blind spots: no
              statistical validation, no tamper-proof record of performance, no warning when an edge
              starts to fade. The existing tools gave you a builder and stopped there. The hard part
              — knowing whether your strategy actually works — was left entirely to you.
            </p>

            <p>
              That&apos;s why AlgoStudio isn&apos;t just an EA builder. It&apos;s a complete
              strategy intelligence platform.
            </p>

            <p>
              <strong className="text-white">
                AlgoStudio helps you answer the only question that matters: does this strategy have
                a real edge?
              </strong>{" "}
              You build with proven templates. You validate with Monte Carlo simulation. You verify
              performance with an immutable track record. And you monitor strategy health in
              production — with alerts when your edge begins to degrade.
            </p>

            <p>
              The platform is built around a simple pipeline: Build → Verify → Monitor. Each stage
              builds confidence before you commit more capital. One test tells you nothing. A
              thousand Monte Carlo simulations tell you everything.
            </p>

            <p>
              AlgoStudio is a solo project. I&apos;m both the developer and the first user. Every
              feature exists because I needed it — not because it looked good on a feature
              comparison chart.
            </p>

            <div className="border-t border-[rgba(79,70,229,0.1)] pt-6 mt-8">
              <p className="text-white font-medium">Stop guessing. Start validating.</p>
              <Link
                href="/login?mode=register"
                className="inline-block mt-4 bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-colors"
              >
                Start Validating — Free
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
