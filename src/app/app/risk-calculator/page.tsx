import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { RiskCalculator } from "./risk-calculator";

export const metadata: Metadata = {
  title: "Risk Calculator — Monte Carlo Simulator | AlgoStudio",
  description:
    "Run Monte Carlo simulations to estimate the risk profile of your trading strategy. Analyze drawdown, ruin probability, and equity curves.",
};

export default async function RiskCalculatorPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="text-xl font-bold text-white hover:text-[#A78BFA] transition-colors"
              >
                AlgoStudio
              </Link>
              <span className="text-[#7C8DB0]">/</span>
              <span className="text-[#94A3B8]">Risk Calculator</span>
            </div>
            <Link href="/app" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content" className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Monte Carlo Risk Simulator</h1>
          <p className="text-[#94A3B8]">
            Estimate the risk profile of your strategy by simulating thousands of trade sequences.
            Understand worst-case drawdowns and probability of reaching your goals.
          </p>
        </div>

        <RiskCalculator />
      </main>
    </div>
  );
}
