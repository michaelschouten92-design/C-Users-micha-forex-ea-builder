import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CreateProjectButton } from "./components/create-project-button";
import { ProjectList } from "./components/project-list";
import { EmailVerificationBanner } from "./components/email-verification-banner";
import { AppNav } from "@/components/app/app-nav";
import { generateDailyInsights } from "@/lib/daily-insights";
import { OnboardingGate } from "./components/onboarding-gate";
import { OnboardingChecklist } from "./components/onboarding-checklist";
import { shouldRedirectToOnboarding } from "./onboarding-heuristic";
import { PortfolioHealthSummary } from "@/components/app/portfolio-health-summary";
import { PortfolioRiskBanner } from "@/components/app/portfolio-risk-banner";
import { CommandCenterView } from "./command-center-view";
import { loadCommandCenterData } from "./load-command-center-data";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  // ── Server-driven onboarding gate (fail-closed) ──────────
  let onboardingRedirect: string | null;
  try {
    const [strategyCount, liveEACount] = await Promise.all([
      prisma.project.count({ where: { userId: session.user.id, deletedAt: null } }),
      prisma.liveEAInstance.count({ where: { userId: session.user.id, deletedAt: null } }),
    ]);
    onboardingRedirect = shouldRedirectToOnboarding(strategyCount, liveEACount);
  } catch {
    onboardingRedirect = "/app/onboarding?step=scope";
  }
  if (onboardingRedirect) {
    redirect(onboardingRedirect);
  }

  const data = await loadDashboardData(session.user.id);
  if (!data) {
    return (
      <div className="min-h-screen">
        <AppNav session={session} tier="FREE" firstProjectId={null} />
        <main id="main-content" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-24">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-[rgba(245,158,11,0.15)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-3">
                Dashboard temporarily unavailable
              </h2>
              <p className="text-[#94A3B8] mb-6">
                Unable to load dashboard data. Please try again in a moment.
              </p>
              <Link
                href="/app"
                className="inline-block px-6 py-2.5 bg-[#4F46E5] text-white rounded-lg hover:bg-[#6366F1] transition-colors"
              >
                Try Again
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { projects, subscription, user, commandCenter, recentBacktests, exportCount } = data;

  // Determine effective tier
  let tier: "FREE" | "PRO" | "ELITE" = (subscription?.tier as "FREE" | "PRO" | "ELITE") ?? "FREE";
  if (tier !== "FREE") {
    const isActive = subscription?.status === "active" || subscription?.status === "trialing";
    const isExpired = subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date();
    if (!isActive || isExpired) {
      tier = "FREE";
    }
  }

  // Daily insights (uses instance data mapped to insights input shape)
  const liveEASummary = commandCenter.instances.map((inst) => ({
    id: inst.id,
    eaName: inst.eaName,
    symbol: inst.symbol,
    status: inst.status,
    totalProfit: inst.totalProfit,
    totalTrades: inst.totalTrades,
    balance: null as number | null,
    equity: null as number | null,
    lastHeartbeat: inst.lastHeartbeat ? new Date(inst.lastHeartbeat) : null,
    strategyStatus: undefined as string | undefined,
  }));
  const insights = generateDailyInsights(liveEASummary, recentBacktests, projects.length);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Onboarding state
  const isNewUser =
    projects.length === 0 && recentBacktests.length === 0 && commandCenter.instances.length === 0;
  const isActivating =
    !isNewUser &&
    (projects.length === 0 ||
      recentBacktests.length === 0 ||
      exportCount === 0 ||
      commandCenter.instances.length === 0);

  // Derive nav monitor status from command center data
  const ps = commandCenter.portfolioSummary;
  const navMonitorStatus =
    commandCenter.instances.length === 0
      ? undefined
      : ps.invalidatedCount > 0 || ps.atRiskCount > 0
        ? ps.invalidatedCount > 0
          ? ("critical" as const)
          : ("warning" as const)
        : ("healthy" as const);

  return (
    <div className="min-h-screen">
      <AppNav
        session={session}
        tier={tier}
        firstProjectId={projects.length > 0 ? projects[0].id : null}
        monitorStatus={navMonitorStatus}
      />

      {user && !user.emailVerified && <EmailVerificationBanner />}

      <main id="main-content" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {isNewUser ? (
          <OnboardingGate />
        ) : (
          <>
            {/* ── Greeting ── */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">{greeting}.</h2>
              <p className="text-sm text-[#71717A] mt-1">
                {ps.onlineCount} online &middot; {recentBacktests.length} evaluation
                {recentBacktests.length !== 1 ? "s" : ""} &middot; {projects.length} project
                {projects.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* ── Activation Checklist ── */}
            {isActivating && (
              <OnboardingChecklist
                hasProjects={projects.length > 0}
                hasBacktests={recentBacktests.length > 0}
                hasExports={exportCount > 0}
                hasLiveEAs={commandCenter.instances.length > 0}
                tier={tier}
                firstProjectId={projects.length > 0 ? projects[0].id : null}
              />
            )}

            {/* ── Portfolio Risk Banner ── */}
            {commandCenter.instances.length > 0 && (
              <div className="mb-4">
                <PortfolioRiskBanner
                  summary={{
                    invalidated: ps.invalidatedCount,
                    atRisk: ps.atRiskCount,
                    awaitingData: ps.awaitingDataCount,
                  }}
                />
              </div>
            )}

            {/* ══════════════════════════════════════════
                COMMAND CENTER
                Layer 3: Portfolio operational summary
                Layer 1: Individual deployment cards (instance truth)
                ══════════════════════════════════════════ */}
            {commandCenter.instances.length > 0 && (
              <section className="mb-10">
                <div className="mb-4">
                  <PortfolioHealthSummary summary={commandCenter.portfolioSummary} />
                </div>
                <Suspense fallback={<StrategyGridSkeleton />}>
                  <CommandCenterView instances={commandCenter.instances} />
                </Suspense>
              </section>
            )}

            {/* ── Daily Insights ── */}
            {insights.length > 0 && (
              <div className="mb-8 space-y-3">
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`rounded-xl px-5 py-4 border flex flex-col sm:flex-row sm:items-center gap-3 ${
                      insight.type === "warning"
                        ? "bg-[#F59E0B]/5 border-[#F59E0B]/20"
                        : insight.type === "success"
                          ? "bg-[#10B981]/5 border-[#10B981]/20"
                          : insight.type === "action"
                            ? "bg-[#6366F1]/5 border-[#6366F1]/20"
                            : "bg-[#111114] border-[rgba(255,255,255,0.06)]"
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
                              ? "text-[#10B981]"
                              : "text-white"
                        }`}
                      >
                        {insight.message}
                      </p>
                      {insight.detail && (
                        <p className="text-xs text-[#71717A] mt-0.5">{insight.detail}</p>
                      )}
                    </div>
                    {insight.linkHref && (
                      <Link
                        href={insight.linkHref}
                        className="text-xs text-[#818CF8] hover:text-white transition-colors font-medium flex-shrink-0"
                      >
                        {insight.linkLabel || "View"} &rarr;
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Recent Backtests ── */}
            {recentBacktests.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Recent Evaluations</h3>
                  <Link
                    href="/app/evaluate"
                    className="text-xs text-[#818CF8] hover:text-white transition-colors"
                  >
                    View All &rarr;
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentBacktests.slice(0, 6).map((bt) => (
                    <Link
                      key={bt.id}
                      href={`/app/evaluate/${bt.id}`}
                      className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.10)] transition-colors"
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
                                ? "#10B981"
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
                          <span className="text-[#71717A]">Symbol</span>
                          <p className="text-[#FAFAFA]">{bt.symbol}</p>
                        </div>
                        <div>
                          <span className="text-[#71717A]">Profit</span>
                          <p
                            className={
                              (bt.totalNetProfit ?? 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                            }
                          >
                            ${(bt.totalNetProfit ?? 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#71717A]">Win Rate</span>
                          <p className="text-[#FAFAFA]">{(bt.winRate ?? 0).toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-[#71717A]">PF</span>
                          <p className="text-[#FAFAFA]">{(bt.profitFactor ?? 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Upload CTA (when no backtests) ── */}
            {recentBacktests.length === 0 && (
              <Link
                href="/app/evaluate"
                className="block mb-8 p-6 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl hover:border-[rgba(255,255,255,0.20)] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                      Evaluate Your First Strategy
                    </h3>
                    <p className="text-xs text-[#71717A] mt-1">
                      Upload an MT5 report and get a full strategy evaluation — health score, AI
                      analysis, and stress test.
                    </p>
                  </div>
                  <span className="text-[#A1A1AA] group-hover:text-white transition-colors shrink-0 ml-4">
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

            {/* ── Projects ── */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">My Projects</h3>
                <CreateProjectButton />
              </div>
              <ProjectList projects={projects} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Loading skeleton for strategy grid ──

function StrategyGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 animate-pulse"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 bg-[#18181B] rounded w-32" />
            <div className="h-5 bg-[#18181B] rounded-full w-16" />
          </div>
          <div className="h-3 bg-[#18181B] rounded w-24 mb-3" />
          <div className="h-1.5 bg-[#09090B] rounded-full mb-3" />
          <div className="flex justify-between mb-2">
            <div className="h-8 bg-[#18181B] rounded w-16" />
            <div className="h-8 bg-[#18181B] rounded w-16" />
            <div className="h-8 bg-[#18181B] rounded w-16" />
          </div>
          <div className="h-3 bg-[#18181B] rounded w-40 mt-2" />
        </div>
      ))}
    </div>
  );
}

// ── Insight Icon (unchanged) ──

// ── Data loader (fail-closed: returns null on any error) ──

async function loadDashboardData(userId: string) {
  try {
    const [projects, subscription, user, commandCenter, recentBacktests, exportCount] =
      await Promise.all([
        prisma.project.findMany({
          where: { userId, deletedAt: null },
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
          where: { userId },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { emailVerified: true },
        }),
        loadCommandCenterData(userId),
        prisma.backtestRun.findMany({
          where: { upload: { userId } },
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
        prisma.exportJob.count({
          where: { userId, status: "DONE" },
        }),
      ]);

    return { projects, subscription, user, commandCenter, recentBacktests, exportCount };
  } catch (err) {
    console.error("[app/page] data loading failed:", err);
    return null;
  }
}

function InsightIcon({ type, icon }: { type: string; icon: string }) {
  const color =
    type === "warning"
      ? "#F59E0B"
      : type === "success"
        ? "#10B981"
        : type === "action"
          ? "#818CF8"
          : "#71717A";

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
