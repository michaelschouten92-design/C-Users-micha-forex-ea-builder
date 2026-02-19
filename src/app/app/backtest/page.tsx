import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BacktestForm } from "./backtest-form";

export default async function BacktestPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });

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
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Backtest
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#CBD5E1] hidden sm:inline">{session.user.email}</span>
              <Link
                href="/app"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Dashboard
              </Link>
              <Link
                href="/app/settings"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Settings
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Backtesting</h2>
          <p className="mt-2 text-[#94A3B8]">
            Test your strategy against historical data to see how it would have performed.
          </p>
        </div>

        <BacktestForm projects={projects} />

        {/* Results placeholder */}
        <div className="mt-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8">
          <h3 className="text-lg font-semibold text-white mb-4">Backtest Results</h3>
          <div className="flex items-center justify-center h-48 border border-dashed border-[rgba(79,70,229,0.3)] rounded-lg bg-[#0A0118]/50">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto text-[#4F46E5]/30 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-[#7C8DB0] text-sm">Results will appear here</p>
            </div>
          </div>
        </div>

        {/* MT5 Help Card */}
        <div className="mt-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8">
          <h3 className="text-lg font-semibold text-white mb-2">How to Backtest in MetaTrader 5</h3>
          <p className="text-sm text-[#94A3B8] mb-6">
            While we build our in-app backtesting engine, you can use the MT5 Strategy Tester for
            full backtesting with tick data.
          </p>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4F46E5]/20 border border-[#4F46E5]/30 flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                1
              </span>
              <div>
                <p className="text-white font-medium">Export your EA</p>
                <p className="text-sm text-[#94A3B8] mt-1">
                  Go to your project, click &ldquo;Export&rdquo; and download the .mq5 file.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4F46E5]/20 border border-[#4F46E5]/30 flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                2
              </span>
              <div>
                <p className="text-white font-medium">Open MT5 Strategy Tester</p>
                <p className="text-sm text-[#94A3B8] mt-1">
                  In MetaTrader 5, go to View &gt; Strategy Tester (or press Ctrl+R).
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4F46E5]/20 border border-[#4F46E5]/30 flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                3
              </span>
              <div>
                <p className="text-white font-medium">Load and configure</p>
                <p className="text-sm text-[#94A3B8] mt-1">
                  Place the .mq5 file in your MQL5/Experts folder, select it in the Strategy Tester,
                  choose your symbol, timeframe, date range, and initial deposit. Click
                  &ldquo;Start&rdquo; to run the backtest.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}
