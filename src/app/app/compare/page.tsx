import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppNav } from "@/components/app/app-nav";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { resolveTier } from "@/lib/plan-limits";
import { ComparisonTable } from "./comparison-table";

export default async function ComparePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?expired=true");

  const [subscription, instances] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.liveEAInstance.findMany({
      where: { userId: session.user.id, deletedAt: null },
      select: {
        id: true,
        eaName: true,
        symbol: true,
        broker: true,
        accountNumber: true,
        balance: true,
        equity: true,
        totalTrades: true,
        totalProfit: true,
        openTrades: true,
        status: true,
        mode: true,
        parentInstanceId: true,
        lifecycleState: true,
        strategyStatus: true,
        lastHeartbeat: true,
        healthSnapshots: {
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: { overallScore: true, driftDetected: true, status: true },
        },
      },
    }),
  ]);

  const tier = resolveTier(subscription);

  // Group instances by account (parent-child relationship)
  const accountMap = new Map<
    string,
    {
      key: string;
      name: string;
      broker: string | null;
      accountNumber: string | null;
      balance: number;
      equity: number;
      totalProfit: number;
      totalTrades: number;
      openTrades: number;
      strategyCount: number;
      onlineCount: number;
      healthScore: number | null;
      driftDetected: boolean;
      mode: string;
      lastHeartbeat: string | null;
    }
  >();

  // Find parent instances (account containers)
  const parents = instances.filter((i) => !i.parentInstanceId && !i.symbol);
  const children = instances.filter((i) => i.parentInstanceId || i.symbol);

  for (const parent of parents) {
    const accountChildren = children.filter((c) => c.parentInstanceId === parent.id);
    const allInAccount = [parent, ...accountChildren];
    const strategies = accountChildren.filter((c) => c.symbol);

    accountMap.set(parent.id, {
      key: parent.id,
      name: parent.eaName,
      broker: parent.broker,
      accountNumber: parent.accountNumber,
      balance: parent.balance ?? 0,
      equity: parent.equity ?? 0,
      totalProfit: parent.totalProfit,
      totalTrades: parent.totalTrades,
      openTrades: parent.openTrades,
      strategyCount: strategies.length,
      onlineCount: allInAccount.filter((i) => i.status === "ONLINE").length,
      healthScore: (() => {
        const scores = strategies
          .map((s) => s.healthSnapshots[0]?.overallScore)
          .filter((s): s is number => s != null);
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      })(),
      driftDetected: strategies.some((s) => s.healthSnapshots[0]?.driftDetected),
      mode: parent.mode,
      lastHeartbeat: parent.lastHeartbeat?.toISOString() ?? null,
    });
  }

  // Standalone instances (no parent, have symbol — external or single-strategy)
  const standalones = instances.filter(
    (i) => !i.parentInstanceId && i.symbol && !parents.some((p) => p.id === i.id)
  );
  for (const inst of standalones) {
    accountMap.set(inst.id, {
      key: inst.id,
      name: inst.eaName,
      broker: inst.broker,
      accountNumber: inst.accountNumber,
      balance: inst.balance ?? 0,
      equity: inst.equity ?? 0,
      totalProfit: inst.totalProfit,
      totalTrades: inst.totalTrades,
      openTrades: inst.openTrades,
      strategyCount: 1,
      onlineCount: inst.status === "ONLINE" ? 1 : 0,
      healthScore: inst.healthSnapshots[0]?.overallScore ?? null,
      driftDetected: inst.healthSnapshots[0]?.driftDetected ?? false,
      mode: inst.mode,
      lastHeartbeat: inst.lastHeartbeat?.toISOString() ?? null,
    });
  }

  const accounts = [...accountMap.values()].sort((a, b) => b.balance - a.balance);

  return (
    <div className="min-h-screen">
      <AppNav activeItem="monitor" session={session} tier={tier} />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs
          items={[
            { label: "Dashboard", href: "/app" },
            { label: "Command Center", href: "/app/live" },
            { label: "Compare Accounts" },
          ]}
        />
        <div className="mt-4 mb-6">
          <h1 className="text-xl font-bold text-[#F1F5F9] tracking-tight">Compare Accounts</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Side-by-side performance comparison across your trading accounts.
          </p>
        </div>

        {accounts.length < 2 ? (
          <div className="text-center py-16 rounded-xl border border-[#1E293B]/40 bg-[#0A0118]/40">
            <h3 className="text-base font-semibold text-white mb-2">
              Need at least 2 accounts to compare
            </h3>
            <p className="text-sm text-[#64748B] max-w-sm mx-auto">
              Connect additional trading accounts in the Command Center to see a side-by-side
              comparison.
            </p>
          </div>
        ) : (
          <ComparisonTable accounts={accounts} />
        )}
      </main>
    </div>
  );
}
