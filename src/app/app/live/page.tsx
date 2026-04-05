import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { AppNav } from "@/components/app/app-nav";
import { LiveDashboardClient } from "./live-dashboard-client";
import { loadMonitorData } from "./load-monitor-data";
import { computeEdgeScore } from "@/domain/monitoring/edge-score";
import { ActivationPanel } from "@/components/onboarding/ActivationPanel";
import { resolveTier } from "@/lib/plan-limits";

export default async function LiveEADashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ decision?: string; relink?: string }>;
}) {
  let session: Session | null;
  try {
    session = await auth();
  } catch (err) {
    // Auth failure (DB timeout, config issue) — show degraded state
    console.error("[live/page] auth() failed:", err);
    return <DegradedFallback />;
  }

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const data = await loadMonitorData(session.user.id);

  // Fail-closed: render degraded state on DB error
  if (!data) {
    return <DegradedFallback session={session} />;
  }

  let params: { decision?: string; relink?: string };
  try {
    params = await searchParams;
  } catch {
    params = {};
  }

  const { subscription } = data;

  const tier = resolveTier(subscription);

  try {
    return renderDashboard(session, data, params, tier);
  } catch (err) {
    console.error("[live/page] render error:", err);
    return <DegradedFallback session={session} />;
  }
}

// ── Render the full dashboard (extracted so the page function can catch) ──

function renderDashboard(
  session: { user: { id: string; email?: string | null } },
  data: NonNullable<Awaited<ReturnType<typeof loadMonitorData>>>,
  params: { decision?: string; relink?: string },
  tier: import("@/lib/plans").PlanTier
) {
  const { eaInstances, tradeAggregates } = data;

  // ── Serialize dates for client component ──
  const serializedInstances = eaInstances.map((ea) => ({
    id: ea.id,
    createdAt: ea.createdAt.toISOString(),
    eaName: ea.eaName,
    symbol: ea.symbol,
    timeframe: ea.timeframe,
    broker: ea.broker,
    accountNumber: ea.accountNumber,
    status: ea.status,
    tradingState: ea.tradingState,
    lastHeartbeat: ea.lastHeartbeat?.toISOString() ?? null,
    lastError: ea.lastError,
    balance: ea.balance,
    equity: ea.equity,
    openTrades: ea.openTrades,
    totalTrades: ea.totalTrades,
    totalProfit: ea.totalProfit,
    sortOrder: ea.sortOrder ?? 0,
    strategyStatus: ea.strategyStatus as string,
    operatorHold: (ea.operatorHold ?? "NONE") as string,
    mode: ea.mode === "PAPER" ? ("PAPER" as const) : ("LIVE" as const),
    parentInstanceId: ea.parentInstanceId ?? null,
    lifecycleState: ea.lifecycleState ?? null,
    apiKeySuffix: ea.apiKeySuffix ?? null,
    trackRecordToken: ea.accountTrackRecordShares?.[0]?.token ?? null,
    healthStatus: ea.healthSnapshots?.[0]?.status ?? null,
    isExternal: ea.exportJobId === null,
    isAutoDiscovered: ea.isAutoDiscovered,
    relinkRequired: ea.terminalDeployments.some(
      (d: { baselineStatus: string }) => d.baselineStatus === "RELINK_REQUIRED"
    ),
    monitoringReasons: ea.incidents?.[0] ? (ea.incidents[0].reasonCodes as string[]) : [],
    monitoringSuppressedUntil: ea.monitoringSuppressedUntil?.toISOString() ?? null,
    baseline: (() => {
      const bl = ea.strategyVersion?.backtestBaseline as
        | {
            winRate: number | null;
            profitFactor: number | null;
            totalTrades: number | null;
            maxDrawdownPct: number | null;
            sharpeRatio: number | null;
          }
        | undefined;
      return bl
        ? {
            winRate: bl.winRate,
            profitFactor: bl.profitFactor,
            totalTrades: bl.totalTrades,
            maxDrawdownPct: bl.maxDrawdownPct,
            sharpeRatio: bl.sharpeRatio,
          }
        : null;
    })(),
    trades: [],
    heartbeats: [],
    healthSnapshots: (ea.healthSnapshots ?? []).map((hs) => ({
      driftDetected: hs.driftDetected,
      driftSeverity: hs.driftSeverity,
      status: hs.status,
    })),
    edgeScore: (() => {
      const bl = ea.strategyVersion?.backtestBaseline as
        | {
            winRate: number | null;
            profitFactor: number | null;
            maxDrawdownPct: number | null;
            netReturnPct: number | null;
            initialDeposit: number | null;
          }
        | undefined;
      if (!bl || bl.winRate == null || bl.profitFactor == null) return null;
      const agg = tradeAggregates.get(ea.id);
      if (!agg || agg.tradeCount === 0) {
        return {
          phase: "COLLECTING" as const,
          score: null,
          tradesCompleted: 0,
          tradesRequired: 10,
        };
      }
      const result = computeEdgeScore(
        {
          totalTrades: agg.tradeCount,
          winCount: agg.winCount,
          lossCount: agg.lossCount,
          grossProfit: agg.grossProfit,
          grossLoss: agg.grossLoss,
          maxDrawdownPct: 0, // per-instance DD not available from aggregates
          totalProfit: ea.totalProfit,
          balance: ea.balance ?? 0,
        },
        {
          winRate: bl.winRate,
          profitFactor: bl.profitFactor,
          maxDrawdownPct: bl.maxDrawdownPct ?? 0,
          netReturnPct: bl.netReturnPct ?? 0,
          initialDeposit: bl.initialDeposit ?? 0,
        }
      );
      return {
        phase: result.phase,
        score: result.score,
        tradesCompleted: result.tradesCompleted,
        tradesRequired: result.tradesRequired,
      };
    })(),
  }));

  const relinkInstanceId = params.relink ?? null;

  return (
    <div className="min-h-screen">
      <AppNav
        activeItem="monitor"
        session={session}
        tier={tier}
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
        <AppBreadcrumbs
          items={[{ label: "Dashboard", href: "/app" }, { label: "Command Center" }]}
        />

        {/* ── Title ── */}
        <div className="mt-4 mb-3 flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-[#F1F5F9] tracking-tight">Command Center</h1>
          {eaInstances.length > 0 && (
            <span className="text-xs text-[#64748B] font-medium tabular-nums">
              {eaInstances.length} {eaInstances.length === 1 ? "instance" : "instances"} monitored
            </span>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            ONBOARDING — Activation checklist (auto-hides)
            ══════════════════════════════════════════════════════ */}
        <ActivationPanel />

        {/* ── Strategies, Terminals, Journal ── */}
        <section>
          <LiveDashboardClient
            initialData={serializedInstances}
            tier={tier}
            initialRelinkInstanceId={relinkInstanceId}
          />
        </section>
      </main>
    </div>
  );
}

// ── Degraded fallback (shown when auth/data/render fails) ──

function DegradedFallback({
  session,
}: {
  session?: { user: { email?: string | null } } | null;
} = {}) {
  return (
    <div className="min-h-screen">
      {session?.user ? <AppNav activeItem="monitor" session={session} tier="FREE" /> : null}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs
          items={[{ label: "Dashboard", href: "/app" }, { label: "Command Center" }]}
        />
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
              Command Center temporarily unavailable
            </h2>
            <p className="text-[#94A3B8] mb-6">
              Authority status could not be determined. All strategies should be considered under
              PAUSE governance until connectivity is restored.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/app/live"
                className="px-6 py-2.5 bg-[#4F46E5] text-white rounded-lg hover:bg-[#6366F1] transition-colors"
              >
                Try Again
              </Link>
              <Link
                href="/app"
                className="px-6 py-2.5 border border-[rgba(79,70,229,0.5)] text-[#CBD5E1] rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
