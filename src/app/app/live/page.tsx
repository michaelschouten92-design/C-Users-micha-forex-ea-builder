import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

type EAInstanceWithRelations = {
  id: string;
  eaName: string;
  symbol: string | null;
  timeframe: string | null;
  broker: string | null;
  accountNumber: string | null;
  status: "ONLINE" | "OFFLINE" | "ERROR";
  lastHeartbeat: Date | null;
  lastError: string | null;
  balance: number | null;
  equity: number | null;
  openTrades: number;
  totalTrades: number;
  totalProfit: number;
  createdAt: Date;
  trades: { profit: number; closeTime: Date | null }[];
  heartbeats: { equity: number; createdAt: Date }[];
};

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "Never";
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} min ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffSec / 86400);
  return `${days}d ago`;
}

function calculateWinRate(trades: { profit: number; closeTime: Date | null }[]): number {
  const closedTrades = trades.filter((t) => t.closeTime !== null);
  if (closedTrades.length === 0) return 0;
  const winners = closedTrades.filter((t) => t.profit > 0).length;
  return (winners / closedTrades.length) * 100;
}

function calculateProfitFactor(trades: { profit: number; closeTime: Date | null }[]): number {
  const closedTrades = trades.filter((t) => t.closeTime !== null);
  const grossProfit = closedTrades
    .filter((t) => t.profit > 0)
    .reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(
    closedTrades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)
  );
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

function calculateMaxDrawdown(heartbeats: { equity: number; createdAt: Date }[]): number {
  if (heartbeats.length === 0) return 0;

  const sorted = [...heartbeats].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let peak = sorted[0].equity;
  let maxDrawdownPct = 0;

  for (const hb of sorted) {
    if (hb.equity > peak) {
      peak = hb.equity;
    }
    if (peak > 0) {
      const drawdownPct = ((peak - hb.equity) / peak) * 100;
      if (drawdownPct > maxDrawdownPct) {
        maxDrawdownPct = drawdownPct;
      }
    }
  }

  return maxDrawdownPct;
}

function StatusBadge({ status }: { status: "ONLINE" | "OFFLINE" | "ERROR" }) {
  if (status === "ONLINE") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10B981]">
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        Online
      </span>
    );
  }
  if (status === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EF4444]">
        <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
      <span className="w-2 h-2 rounded-full bg-[#64748B]" />
      Offline
    </span>
  );
}

function EACard({ ea }: { ea: EAInstanceWithRelations }) {
  const winRate = calculateWinRate(ea.trades);
  const profitFactor = calculateProfitFactor(ea.trades);
  const maxDrawdown = calculateMaxDrawdown(ea.heartbeats);
  const closedTradeCount = ea.trades.filter((t) => t.closeTime !== null).length;

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 hover:border-[rgba(79,70,229,0.4)] transition-all duration-200 hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)]">
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate" title={ea.eaName}>
            {ea.eaName}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#7C8DB0]">
            {ea.symbol && <span>{ea.symbol}</span>}
            {ea.timeframe && <span>{ea.timeframe}</span>}
            {ea.broker && (
              <>
                <span className="text-[rgba(79,70,229,0.4)]">|</span>
                <span>{ea.broker}</span>
              </>
            )}
            {ea.accountNumber && (
              <>
                <span className="text-[rgba(79,70,229,0.4)]">|</span>
                <span>#{ea.accountNumber}</span>
              </>
            )}
          </div>
        </div>
        <StatusBadge status={ea.status} />
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Balance</p>
          <p className="text-sm font-medium text-white">{formatCurrency(ea.balance)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Equity</p>
          <p className="text-sm font-medium text-white">{formatCurrency(ea.equity)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Profit</p>
          <p
            className={`text-sm font-medium ${ea.totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {formatCurrency(ea.totalProfit)}
          </p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Trades</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{closedTradeCount}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Win Rate</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{winRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
            Profit Factor
          </p>
          <p className="text-sm font-medium text-[#CBD5E1]">
            {profitFactor === Infinity ? "---" : profitFactor.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Max Drawdown</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{maxDrawdown.toFixed(1)}%</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(79,70,229,0.1)]">
        <span className="text-xs text-[#7C8DB0]">
          Last heartbeat: {formatRelativeTime(ea.lastHeartbeat)}
        </span>
        {ea.lastError && ea.status === "ERROR" && (
          <span className="text-xs text-[#EF4444] truncate max-w-[200px]" title={ea.lastError}>
            {ea.lastError}
          </span>
        )}
      </div>
    </div>
  );
}

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

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
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
                Live EAs
              </Link>
              <Link
                href="/app/compare"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Compare
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Live EAs</h2>
          <span className="text-sm text-[#7C8DB0]">
            {eaInstances.length} instance{eaInstances.length !== 1 ? "s" : ""}
          </span>
        </div>

        {eaInstances.length === 0 ? (
          <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#22D3EE] flex items-center justify-center opacity-60">
              <svg
                className="w-8 h-8 text-white"
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
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No live EAs yet</h3>
            <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
              Export a strategy and run it on MetaTrader to see your EA tracked here.
            </p>
            <Link
              href="/app"
              className="inline-block mt-6 px-4 py-2 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {eaInstances.map((ea) => (
              <EACard key={ea.id} ea={ea as unknown as EAInstanceWithRelations} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
