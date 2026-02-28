import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { AppNav } from "@/components/app/app-nav";
import { LiveDashboardClient } from "./live-dashboard-client";
import { PortfolioHeatmap } from "./portfolio-heatmap";
import { MonitorTabs } from "./monitor-tabs";

export default async function LiveEADashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const [eaInstances, subscription] = await Promise.all([
    prisma.liveEAInstance.findMany({
      where: { userId: session.user.id },
      orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } },
      include: {
        trades: {
          where: { closeTime: { not: null } },
          select: { profit: true, closeTime: true },
        },
        heartbeats: {
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { equity: true, createdAt: true },
        },
      },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  let tier: "FREE" | "PRO" | "ELITE" = (subscription?.tier as "FREE" | "PRO" | "ELITE") ?? "FREE";
  if (tier !== "FREE") {
    const isActive = subscription?.status === "active" || subscription?.status === "trialing";
    const isExpired = subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date();
    if (!isActive || isExpired) {
      tier = "FREE";
    }
  }

  // FREE users cannot access the live monitoring dashboard
  if (tier === "FREE") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-[rgba(79,70,229,0.15)] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-[#A78BFA]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Strategy Monitor</h1>
          <p className="text-[#94A3B8] mb-6">
            Monitor your Expert Advisors in real-time with live dashboards, trade tracking, and
            performance analytics. Available on Pro and Elite plans.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  // Serialize dates to ISO strings for the client component
  const serializedInstances = eaInstances.map((ea) => ({
    id: ea.id,
    eaName: ea.eaName,
    symbol: ea.symbol,
    timeframe: ea.timeframe,
    broker: ea.broker,
    accountNumber: ea.accountNumber,
    status: ea.status,
    paused: ea.paused,
    lastHeartbeat: ea.lastHeartbeat?.toISOString() ?? null,
    lastError: ea.lastError,
    balance: ea.balance,
    equity: ea.equity,
    openTrades: ea.openTrades,
    totalTrades: ea.totalTrades,
    totalProfit: ea.totalProfit,
    strategyStatus: ea.strategyStatus as string,
    mode: ea.mode === "PAPER" ? ("PAPER" as const) : ("LIVE" as const),
    trades: ea.trades.map((t) => ({
      profit: t.profit,
      closeTime: t.closeTime?.toISOString() ?? null,
    })),
    heartbeats: ea.heartbeats.map((h) => ({
      equity: h.equity,
      createdAt: h.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="min-h-screen">
      <AppNav
        activeItem="monitor"
        session={session}
        tier={tier}
        firstProjectId={null}
        monitorStatus={
          eaInstances.length === 0
            ? undefined
            : eaInstances.some((ea) => ea.strategyStatus === "EDGE_DEGRADED")
              ? "critical"
              : eaInstances.some((ea) => ea.strategyStatus === "UNSTABLE")
                ? "warning"
                : "healthy"
        }
      />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Monitor" }]} />

        <MonitorTabs>
          <LiveDashboardClient initialData={serializedInstances} tier={tier} />

          {/* Portfolio Correlation Heatmap (shown when multiple symbols are trading) */}
          {(() => {
            const symbols = [
              ...new Set(
                eaInstances
                  .map((ea) => ea.symbol)
                  .filter((s): s is string => s !== null && s !== "")
              ),
            ];
            if (symbols.length < 2) return null;
            return (
              <div className="mt-6">
                <PortfolioHeatmap symbols={symbols} />
              </div>
            );
          })()}
        </MonitorTabs>
      </main>
    </div>
  );
}
