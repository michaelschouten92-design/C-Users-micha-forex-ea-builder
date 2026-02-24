import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateProjectButton } from "./components/create-project-button";
import { ProjectList } from "./components/project-list";
import { EmailVerificationBanner } from "./components/email-verification-banner";
import { NotificationCenter } from "@/components/app/notification-center";
import { MobileNavMenu } from "./components/mobile-nav-menu";
import { generateDailyInsights, getPortfolioStatus } from "@/lib/daily-insights";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const [projects, subscription, user, liveEAs, recentBacktests] = await Promise.all([
    prisma.project.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { versions: true } },
        versions: {
          orderBy: { versionNo: "desc" },
          take: 1,
          select: { versionNo: true },
        },
        tags: { select: { tag: true } },
      },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    }),
    prisma.liveEAInstance.findMany({
      where: { userId: session.user.id, deletedAt: null },
      select: {
        id: true,
        eaName: true,
        symbol: true,
        status: true,
        totalProfit: true,
        totalTrades: true,
        balance: true,
        equity: true,
        lastHeartbeat: true,
        strategyStatus: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.backtestRun.findMany({
      where: { upload: { userId: session.user.id } },
      select: {
        id: true,
        eaName: true,
        symbol: true,
        healthScore: true,
        healthStatus: true,
        totalNetProfit: true,
        profitFactor: true,
        maxDrawdownPct: true,
        winRate: true,
        totalTrades: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Determine effective tier
  let tier: "FREE" | "PRO" | "ELITE" = (subscription?.tier as "FREE" | "PRO" | "ELITE") ?? "FREE";
  if (tier !== "FREE") {
    const isActive = subscription?.status === "active" || subscription?.status === "trialing";
    const isExpired = subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date();
    if (!isActive || isExpired) {
      tier = "FREE";
    }
  }

  // Generate insights
  const insights = generateDailyInsights(liveEAs, recentBacktests, projects.length);
  const portfolio = getPortfolioStatus(liveEAs, recentBacktests);

  // Greeting based on server local time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav
        role="navigation"
        aria-label="Dashboard navigation"
        className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Command Center
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/app/backtest"
                className="text-sm px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg transition-colors font-medium hidden sm:inline-block"
              >
                Upload Backtest
              </Link>
              <span className="text-sm text-[#CBD5E1] hidden md:inline">{session.user.email}</span>
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium border ${
                  tier === "ELITE"
                    ? "bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/50"
                    : tier === "PRO"
                      ? "bg-[#4F46E5]/20 text-[#A78BFA] border-[#4F46E5]/50"
                      : "bg-[rgba(79,70,229,0.2)] text-[#A78BFA] border-[rgba(79,70,229,0.3)]"
                }`}
              >
                {tier}
              </span>
              <NotificationCenter />
              <Link
                href={projects.length > 0 ? `/app/projects/${projects[0].id}` : "/app"}
                className="text-sm text-[#22D3EE] font-medium transition-colors duration-200 hidden sm:inline"
              >
                EA Builder
              </Link>
              <Link
                href="/app/live"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200 hidden sm:inline"
              >
                Track Record
              </Link>
              <Link
                href="/app/risk-calculator"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200 hidden sm:inline"
              >
                Risk Calc
              </Link>
              <Link
                href="/app/settings"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200 hidden sm:inline"
              >
                Account
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
                className="hidden sm:block"
              >
                <button
                  type="submit"
                  className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
                >
                  Sign Out
                </button>
              </form>
              <MobileNavMenu firstProjectId={projects.length > 0 ? projects[0].id : null} />
            </div>
          </div>
        </div>
      </nav>

      {user && !user.emailVerified && <EmailVerificationBanner />}

      <main id="main-content" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* ====================================== */}
        {/* Portfolio Status Header */}
        {/* ====================================== */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {greeting}.{" "}
                <span
                  className={
                    portfolio.status === "HEALTHY"
                      ? "text-[#22C55E]"
                      : portfolio.status === "ATTENTION"
                        ? "text-[#F59E0B]"
                        : portfolio.status === "AT_RISK"
                          ? "text-[#EF4444]"
                          : "text-[#7C8DB0]"
                  }
                >
                  {portfolio.label}
                </span>
              </h2>
              <p className="text-sm text-[#7C8DB0] mt-1">
                {liveEAs.filter((e) => e.status === "ONLINE").length} active EA
                {liveEAs.filter((e) => e.status === "ONLINE").length !== 1 ? "s" : ""} &middot;{" "}
                {recentBacktests.length} backtest
                {recentBacktests.length !== 1 ? "s" : ""} &middot; {projects.length} project
                {projects.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/app/backtest"
              className="sm:hidden text-sm px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg transition-colors font-medium text-center"
            >
              Upload Backtest
            </Link>
          </div>
        </div>

        {/* ====================================== */}
        {/* Daily Insights */}
        {/* ====================================== */}
        {insights.length > 0 && (
          <div className="mb-8 space-y-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`rounded-xl px-5 py-4 border flex flex-col sm:flex-row sm:items-center gap-3 ${
                  insight.type === "warning"
                    ? "bg-[#F59E0B]/5 border-[#F59E0B]/20"
                    : insight.type === "success"
                      ? "bg-[#22C55E]/5 border-[#22C55E]/20"
                      : insight.type === "action"
                        ? "bg-[#4F46E5]/5 border-[#4F46E5]/20"
                        : "bg-[#1A0626] border-[rgba(79,70,229,0.15)]"
                }`}
              >
                <div className="flex-shrink-0">
                  <InsightIcon type={insight.type} icon={insight.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      insight.type === "warning"
                        ? "text-[#F59E0B]"
                        : insight.type === "success"
                          ? "text-[#22C55E]"
                          : "text-white"
                    }`}
                  >
                    {insight.message}
                  </p>
                  {insight.detail && (
                    <p className="text-xs text-[#7C8DB0] mt-0.5">{insight.detail}</p>
                  )}
                </div>
                {insight.linkHref && (
                  <Link
                    href={insight.linkHref}
                    className="text-xs text-[#A78BFA] hover:text-[#22D3EE] transition-colors font-medium flex-shrink-0"
                  >
                    {insight.linkLabel || "View"} &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ====================================== */}
        {/* Live EA Status Cards */}
        {/* ====================================== */}
        {liveEAs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Live Strategies</h3>
              <Link
                href="/app/live"
                className="text-xs text-[#A78BFA] hover:text-[#22D3EE] transition-colors"
              >
                View All &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveEAs.slice(0, 6).map((ea) => (
                <div
                  key={ea.id}
                  className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white truncate">{ea.eaName}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${(() => {
                        const s = ea.strategyStatus;
                        if (s === "CONSISTENT")
                          return "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25";
                        if (s === "MONITORING")
                          return "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/25";
                        if (s === "TESTING")
                          return "bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/25";
                        if (s === "UNSTABLE")
                          return "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25";
                        if (s === "EDGE_DEGRADED")
                          return "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25";
                        return "bg-[#7C8DB0]/10 text-[#7C8DB0] border-[#7C8DB0]/25";
                      })()}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            ea.strategyStatus === "CONSISTENT"
                              ? "#10B981"
                              : ea.strategyStatus === "MONITORING"
                                ? "#6366F1"
                                : ea.strategyStatus === "TESTING"
                                  ? "#A78BFA"
                                  : ea.strategyStatus === "UNSTABLE"
                                    ? "#F59E0B"
                                    : ea.strategyStatus === "EDGE_DEGRADED"
                                      ? "#EF4444"
                                      : "#7C8DB0",
                        }}
                      />
                      {ea.strategyStatus === "CONSISTENT"
                        ? "Consistent"
                        : ea.strategyStatus === "MONITORING"
                          ? "Monitoring"
                          : ea.strategyStatus === "TESTING"
                            ? "Testing"
                            : ea.strategyStatus === "UNSTABLE"
                              ? "Unstable"
                              : ea.strategyStatus === "EDGE_DEGRADED"
                                ? "Degraded"
                                : "Inactive"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#64748b]">Symbol</span>
                      <p className="text-[#CBD5E1]">{ea.symbol || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Profit</span>
                      <p
                        className={(ea.totalProfit ?? 0) >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}
                      >
                        ${(ea.totalProfit ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Trades</span>
                      <p className="text-[#CBD5E1]">{ea.totalTrades}</p>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Status</span>
                      <p
                        className={
                          ea.status === "ONLINE"
                            ? "text-[#22C55E]"
                            : ea.status === "ERROR"
                              ? "text-[#EF4444]"
                              : "text-[#64748b]"
                        }
                      >
                        {ea.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================== */}
        {/* Recent Backtests */}
        {/* ====================================== */}
        {recentBacktests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Backtests</h3>
              <Link
                href="/app/backtest"
                className="text-xs text-[#A78BFA] hover:text-[#22D3EE] transition-colors"
              >
                View All &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentBacktests.slice(0, 6).map((bt) => (
                <Link
                  key={bt.id}
                  href={`/app/backtest/${bt.id}`}
                  className="bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 hover:border-[rgba(79,70,229,0.3)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white truncate">
                      {bt.eaName || bt.symbol}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        color:
                          bt.healthStatus === "ROBUST"
                            ? "#22C55E"
                            : bt.healthStatus === "MODERATE"
                              ? "#F59E0B"
                              : "#EF4444",
                        background:
                          bt.healthStatus === "ROBUST"
                            ? "rgba(34,197,94,0.15)"
                            : bt.healthStatus === "MODERATE"
                              ? "rgba(245,158,11,0.15)"
                              : "rgba(239,68,68,0.15)",
                      }}
                    >
                      {bt.healthScore}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#64748b]">Symbol</span>
                      <p className="text-[#CBD5E1]">{bt.symbol}</p>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Profit</span>
                      <p
                        className={
                          (bt.totalNetProfit ?? 0) >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                        }
                      >
                        ${(bt.totalNetProfit ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Win Rate</span>
                      <p className="text-[#CBD5E1]">{(bt.winRate ?? 0).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-[#64748b]">PF</span>
                      <p className="text-[#CBD5E1]">{(bt.profitFactor ?? 0).toFixed(2)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ====================================== */}
        {/* Upload CTA (when no backtests) */}
        {/* ====================================== */}
        {recentBacktests.length === 0 && (
          <Link
            href="/app/backtest"
            className="block mb-8 p-6 bg-gradient-to-r from-[rgba(79,70,229,0.15)] to-[rgba(34,211,238,0.1)] border border-[rgba(79,70,229,0.25)] rounded-xl hover:border-[rgba(34,211,238,0.4)] transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-[#22D3EE] transition-colors">
                  Upload Your First Backtest
                </h3>
                <p className="text-xs text-[#7C8DB0] mt-1">
                  Upload an MT5 Strategy Tester report and get an instant health score, AI analysis,
                  and validation.
                </p>
              </div>
              <span className="text-[#94A3B8] group-hover:text-[#22D3EE] transition-colors shrink-0 ml-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </div>
          </Link>
        )}

        {/* ====================================== */}
        {/* Projects */}
        {/* ====================================== */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">My Projects</h3>
            <CreateProjectButton />
          </div>
          <ProjectList projects={projects} />
        </div>
      </main>
    </div>
  );
}

// ============================================
// Insight Icon
// ============================================

function InsightIcon({ type, icon }: { type: string; icon: string }) {
  const color =
    type === "warning"
      ? "#F59E0B"
      : type === "success"
        ? "#22C55E"
        : type === "action"
          ? "#A78BFA"
          : "#7C8DB0";

  // Map icon names to SVG paths
  switch (icon) {
    case "alert":
    case "weak":
    case "drawdown":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      );
    case "profit":
    case "robust":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      );
    case "offline":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656M12 12h.01"
          />
        </svg>
      );
    case "upload":
    default:
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      );
  }
}
