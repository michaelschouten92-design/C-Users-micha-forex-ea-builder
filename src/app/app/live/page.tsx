import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { AppNav } from "@/components/app/app-nav";
import { LiveDashboardClient } from "./live-dashboard-client";
import { MonitorTabs } from "./monitor-tabs";
import { loadMonitorData, type AuthorityDecision } from "./load-monitor-data";
import { explainReasonCode } from "@/domain/heartbeat/reason-explainers";
import { ActivationPanel } from "@/components/onboarding/ActivationPanel";

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

  const tier = (subscription?.tier ?? "FREE") as import("@/lib/plans").PlanTier;

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
  const { eaInstances, authority } = data;

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
    strategyStatus: ea.strategyStatus as string,
    operatorHold: (ea.operatorHold ?? "NONE") as string,
    mode: ea.mode === "PAPER" ? ("PAPER" as const) : ("LIVE" as const),
    parentInstanceId: ea.parentInstanceId ?? null,
    lifecycleState: ea.lifecycleState ?? null,
    apiKeySuffix: ea.apiKeySuffix ?? null,
    trackRecordToken: ea.accountTrackRecordShares?.[0]?.token ?? null,
    healthStatus: ea.healthSnapshots?.[0]?.status ?? null,
    isExternal: ea.exportJobId === null,
    relinkRequired: ea.terminalDeployments.some(
      (d: { baselineStatus: string }) => d.baselineStatus === "RELINK_REQUIRED"
    ),
    monitoringReasons: ea.incidents?.[0] ? (ea.incidents[0].reasonCodes as string[]) : [],
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
    trades: ea.trades.map((t) => ({
      profit: t.profit,
      closeTime: t.closeTime?.toISOString() ?? null,
      symbol: t.symbol,
      magicNumber: t.magicNumber ?? null,
    })),
    heartbeats: ea.heartbeats.map((h) => ({
      equity: h.equity,
      createdAt: h.createdAt.toISOString(),
    })),
    healthSnapshots: (ea.healthSnapshots ?? []).map((hs) => ({
      driftDetected: hs.driftDetected,
      driftSeverity: hs.driftSeverity,
      status: hs.status,
    })),
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

        {/* ── Hero / System Status Zone ── */}
        <div className="mt-5 mb-8">
          <div className="rounded-xl border border-[rgba(79,70,229,0.2)] bg-gradient-to-b from-[rgba(79,70,229,0.09)] to-transparent px-6 py-5">
            {/* Title row */}
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <div className="flex items-baseline gap-3">
                <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Command Center</h1>
                {eaInstances.length > 0 && (
                  <span className="text-xs text-[#64748B] font-medium tabular-nums">
                    {eaInstances.length} {eaInstances.length === 1 ? "instance" : "instances"}{" "}
                    monitored
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-[#64748B] max-w-xl">
              Monitor live trading strategies and detect edge drift, instability and risk anomalies
              before they damage performance.
            </p>

            {/* System Status tiles */}
            {eaInstances.length > 0 && (
              <SystemStatusStrip instances={eaInstances} authority={authority} />
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            ONBOARDING — Activation checklist (auto-hides)
            ══════════════════════════════════════════════════════ */}
        <ActivationPanel />

        {/* ── Governance Alerts (compact — only shown when action needed) ── */}
        {eaInstances.length > 0 &&
          (() => {
            const action = authority?.action ?? "PAUSE";
            const isSetupRequired = !authority;
            const colors = AUTHORITY_COLORS[action] ?? AUTHORITY_COLORS.PAUSE;
            const halted = eaInstances.filter((ea) => ea.operatorHold !== "NONE");

            const showAuthority = action !== "RUN";
            const showHalted = halted.length > 0;

            if (!showAuthority && !showHalted) return null;

            const explanation = isSetupRequired
              ? "Monitoring is paused until required baselines are linked."
              : explainReasonCode(authority?.reasonCode ?? "COMPUTATION_FAILED");

            return (
              <section className="mb-8 space-y-2.5">
                {showAuthority && (
                  <div
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 rounded-xl"
                    style={{
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                      boxShadow: `0 0 20px ${colors.bg}`,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors.dot }}
                    />
                    <span className="text-[10px] uppercase tracking-wider text-[#525B6B] font-medium">
                      Governance
                    </span>
                    <span className="text-sm font-bold" style={{ color: colors.text }}>
                      {action}
                    </span>
                    {isSetupRequired && (
                      <span className="text-xs font-semibold text-[#F59E0B]">Setup required</span>
                    )}
                    <span className="text-xs text-[#94A3B8] leading-relaxed">{explanation}</span>
                  </div>
                )}
                {showHalted && (
                  <div
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.15)]"
                    style={{ boxShadow: "0 0 20px rgba(239,68,68,0.04)" }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#EF4444]" />
                    <span className="text-[10px] uppercase tracking-wider text-[#525B6B] font-medium">
                      Operator Hold
                    </span>
                    <span className="text-sm font-bold text-[#EF4444]">{halted.length} halted</span>
                    <span className="text-xs text-[#94A3B8]">
                      {halted
                        .slice(0, 3)
                        .map((h) => h.eaName || h.symbol || h.id.slice(0, 8))
                        .join(", ")}
                      {halted.length > 3 && ` +${halted.length - 3} more`}
                    </span>
                  </div>
                )}
              </section>
            );
          })()}

        {/* ── Strategies, Terminals, Journal ── */}
        <section>
          <MonitorTabs>
            <LiveDashboardClient
              initialData={serializedInstances}
              tier={tier}
              initialRelinkInstanceId={relinkInstanceId}
            />
          </MonitorTabs>
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

// ── Server-rendered Control Cards ────────────────────────

const AUTHORITY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> =
  {
    RUN: {
      bg: "rgba(16,185,129,0.08)",
      border: "rgba(16,185,129,0.25)",
      text: "#10B981",
      dot: "#10B981",
    },
    PAUSE: {
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.25)",
      text: "#F59E0B",
      dot: "#F59E0B",
    },
    STOP: {
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.25)",
      text: "#EF4444",
      dot: "#EF4444",
    },
  };

function SystemStatusStrip({
  instances,
  authority,
}: {
  instances: {
    status: string;
    operatorHold: string | null;
    healthSnapshots?: { driftDetected: boolean }[];
  }[];
  authority: AuthorityDecision | null;
}) {
  const action = authority?.action ?? "PAUSE";
  const colors = AUTHORITY_COLORS[action] ?? AUTHORITY_COLORS.PAUSE;
  const halted = instances.filter((i) => i.operatorHold !== "NONE").length;
  const online = instances.filter((i) => i.status === "ONLINE").length;

  // Count instances where CUSUM detected drift (latest snapshot)
  const driftCount = instances.filter((i) => i.healthSnapshots?.[0]?.driftDetected === true).length;

  const items: { label: string; value: string; color?: string }[] = [
    { label: "Execution", value: action, color: colors.text },
    { label: "Online", value: `${online}/${instances.length}` },
    { label: "Halted", value: String(halted), color: halted > 0 ? "#EF4444" : undefined },
    { label: "Drift", value: String(driftCount), color: driftCount > 0 ? "#F59E0B" : undefined },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => {
        const hasActiveColor = item.color && item.color !== "#CBD5E1";
        return (
          <div
            key={item.label}
            className="rounded-lg bg-[rgba(15,10,26,0.6)] border border-[#1E293B]/60 px-4 py-3 relative overflow-hidden"
            style={hasActiveColor ? { boxShadow: `0 0 16px ${item.color}10` } : undefined}
          >
            {/* Top accent line for active-state tiles */}
            {hasActiveColor && (
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ backgroundColor: item.color, opacity: 0.5 }}
              />
            )}
            <p className="text-[10px] uppercase tracking-wider text-[#525B6B] mb-1">{item.label}</p>
            <p
              className="text-lg font-bold font-mono tabular-nums leading-none"
              style={{ color: item.color ?? "#CBD5E1" }}
            >
              {item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
