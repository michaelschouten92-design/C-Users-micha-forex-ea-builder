import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { BacktestUpload } from "./backtest-upload";
import { BacktestForm } from "./backtest-form";
import { BacktestTabs } from "./backtest-tabs";
import { Optimization } from "./optimization";

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
      <nav
        role="navigation"
        aria-label="App navigation"
        className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50"
      >
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
                href="/app/live"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Live EAs
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

      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Backtest" }]} />
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Backtesting</h2>
          <p className="mt-2 text-[#94A3B8]">
            Run backtests directly in your browser or import MT5 Strategy Tester reports.
          </p>
        </div>

        <BacktestTabs
          runBacktestTab={<BacktestForm projects={projects} />}
          optimizeTab={<Optimization projects={projects} />}
          importReportTab={
            <>
              <BacktestUpload projects={projects} />
              {/* MT5 Help Card */}
              <div className="mt-8 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-8">
                <h3 className="text-lg font-semibold text-white mb-2">
                  How to Export a Strategy Tester Report
                </h3>
                <p className="text-sm text-[#94A3B8] mb-6">
                  Follow these steps to get your backtest report from MetaTrader 5.
                </p>
                <ol className="space-y-4">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4F46E5]/20 border border-[#4F46E5]/30 flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                      1
                    </span>
                    <div>
                      <p className="text-white font-medium">Run your backtest in MT5</p>
                      <p className="text-sm text-[#94A3B8] mt-1">
                        Open the Strategy Tester (View &gt; Strategy Tester or Ctrl+R), select your
                        EA, configure settings, and click &ldquo;Start&rdquo;.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4F46E5]/20 border border-[#4F46E5]/30 flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                      2
                    </span>
                    <div>
                      <p className="text-white font-medium">Open the Backtest tab</p>
                      <p className="text-sm text-[#94A3B8] mt-1">
                        After the test completes, click the &ldquo;Backtest&rdquo; tab at the bottom
                        of the Strategy Tester panel.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4F46E5]/20 border border-[#4F46E5]/30 flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                      3
                    </span>
                    <div>
                      <p className="text-white font-medium">Save as HTML report</p>
                      <p className="text-sm text-[#94A3B8] mt-1">
                        Right-click anywhere in the results &gt; &ldquo;Save as Report&rdquo;. Save
                        the .htm file, then upload it above.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </>
          }
        />
      </main>
    </div>
  );
}
