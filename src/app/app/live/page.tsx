import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { LiveDashboardClient } from "./live-dashboard-client";
import { PortfolioHeatmap } from "./portfolio-heatmap";

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
      <nav
        role="navigation"
        aria-label="App navigation"
        className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Trading Studio
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#CBD5E1] hidden sm:inline">{session.user.email}</span>
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
              <Link
                href="/app"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Dashboard
              </Link>
              <Link
                href="/app/live"
                className="text-sm text-[#22D3EE] font-medium transition-colors duration-200"
              >
                Track Record
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

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Track Record" }]} />

        <LiveDashboardClient initialData={serializedInstances} />

        {/* Portfolio Correlation Heatmap (shown when multiple symbols are trading) */}
        {(() => {
          const symbols = [
            ...new Set(
              eaInstances.map((ea) => ea.symbol).filter((s): s is string => s !== null && s !== "")
            ),
          ];
          if (symbols.length < 2) return null;
          return (
            <div className="mt-6">
              <PortfolioHeatmap symbols={symbols} />
            </div>
          );
        })()}
      </main>
    </div>
  );
}
