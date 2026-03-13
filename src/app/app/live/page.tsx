import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { AppNav } from "@/components/app/app-nav";
import { LiveDashboardClient } from "./live-dashboard-client";
import { PortfolioHeatmap } from "./portfolio-heatmap";
import { MonitorTabs } from "./monitor-tabs";
import { loadMonitorData, type AuthorityDecision } from "./load-monitor-data";
import { ManualHaltStatus } from "./components/operator-hold-controls";
import { EdgeDriftPanel } from "./components/edge-drift-panel";
import { explainReasonCode } from "@/domain/heartbeat/reason-explainers";
import { computeLiveWinrateFromTrades, EDGE_DRIFT_TRADES_N } from "./edge-drift-helpers";
import { computeEdgeDrift } from "@/domain/strategy/edge-drift";
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
    relinkRequired: ea.terminalDeployments.length > 0,
    trades: ea.trades.map((t) => ({
      profit: t.profit,
      closeTime: t.closeTime?.toISOString() ?? null,
    })),
    heartbeats: ea.heartbeats.map((h) => ({
      equity: h.equity,
      createdAt: h.createdAt.toISOString(),
    })),
  }));

  const relinkInstanceId = params.relink ?? null;

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
        <AppBreadcrumbs
          items={[{ label: "Dashboard", href: "/app" }, { label: "Command Center" }]}
        />

        {/* ── System Status strip ── */}
        {eaInstances.length > 0 && (
          <SystemStatusStrip instances={eaInstances} authority={authority} />
        )}

        {/* ══════════════════════════════════════════════════════
            ONBOARDING — Activation checklist (auto-hides)
            ══════════════════════════════════════════════════════ */}
        <ActivationPanel />

        {/* ══════════════════════════════════════════════════════
            CONTROL — Governance card grid
            ══════════════════════════════════════════════════════ */}
        {eaInstances.length > 0 && (
          <section className="mt-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ExecutionAuthorityCard
                authority={authority}
                instances={eaInstances.map((ea) => ({
                  eaName: ea.eaName,
                  symbol: ea.symbol,
                  timeframe: ea.timeframe,
                }))}
              />
              <ManualHaltStatus
                instances={eaInstances.map((ea) => ({
                  id: ea.id,
                  eaName: ea.eaName,
                  symbol: ea.symbol,
                  operatorHold: ea.operatorHold,
                }))}
              />
              <EdgeDriftPanel
                instances={eaInstances.map((ea) => ({
                  id: ea.id,
                  eaName: ea.eaName,
                  symbol: ea.symbol,
                  trades: ea.trades.map((t) => ({
                    profit: t.profit,
                    closeTime: t.closeTime?.toISOString() ?? null,
                  })),
                  baselineWinrate: ea.strategyVersion?.backtestBaseline?.winRate ?? null,
                }))}
              />
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            OBSERVABILITY — Diagnostics (secondary)
            ══════════════════════════════════════════════════════ */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Observability</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Diagnostics and structural signals used to inform governance — not to override it.
            </p>
          </div>

          <MonitorTabs>
            <LiveDashboardClient
              initialData={serializedInstances}
              tier={tier}
              initialRelinkInstanceId={relinkInstanceId}
            />

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
      {session?.user ? (
        <AppNav activeItem="monitor" session={session} tier="FREE" firstProjectId={null} />
      ) : null}
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

function ExecutionAuthorityCard({
  authority,
  instances,
}: {
  authority: AuthorityDecision | null;
  instances: { eaName: string; symbol: string | null; timeframe: string | null }[];
}) {
  // Null authority = no heartbeat decisions recorded yet → setup state, not a system failure.
  const isSetupRequired = !authority;

  const action = authority?.action ?? "PAUSE";
  const reasonCode = authority?.reasonCode ?? "COMPUTATION_FAILED";
  const explanation = isSetupRequired
    ? "Monitoring is paused until required baselines are linked."
    : explainReasonCode(reasonCode);
  const decidedAt = authority?.decidedAt ?? null;
  const colors = AUTHORITY_COLORS[action] ?? AUTHORITY_COLORS.PAUSE;

  return (
    <div
      className="rounded-xl p-4 h-full"
      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8]">
          Execution Authority
        </h3>
        {decidedAt && (
          <span className="text-[10px] text-[#64748B] font-mono">
            {new Date(decidedAt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.dot }}
        />
        <span className="text-xl font-bold" style={{ color: colors.text }}>
          {action}
        </span>
        {isSetupRequired ? (
          <span className="ml-1 text-sm font-medium text-[#F59E0B]">— Setup required</span>
        ) : (
          <span className="ml-2 inline-block text-[11px] font-mono text-[#64748B] px-2 py-0.5 rounded bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)]">
            {reasonCode}
          </span>
        )}
      </div>

      <p className="text-xs text-[#CBD5E1] leading-relaxed">{explanation}</p>

      {isSetupRequired && instances.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {instances.slice(0, 2).map((inst, i) => (
            <p key={i} className="text-[11px] text-[#94A3B8] font-mono truncate">
              {[inst.eaName, inst.symbol, inst.timeframe].filter(Boolean).join(" · ")}
            </p>
          ))}
          {instances.length > 2 && (
            <p className="text-[10px] text-[#64748B]">+{instances.length - 2} more</p>
          )}
        </div>
      )}
    </div>
  );
}

function SystemStatusStrip({
  instances,
  authority,
}: {
  instances: {
    status: string;
    operatorHold: string | null;
    trades: { profit: number | null }[];
    strategyVersion?: { backtestBaseline?: { winRate: number | null } | null } | null;
  }[];
  authority: AuthorityDecision | null;
}) {
  const action = authority?.action ?? "PAUSE";
  const colors = AUTHORITY_COLORS[action] ?? AUTHORITY_COLORS.PAUSE;
  const halted = instances.filter((i) => i.operatorHold !== "NONE").length;
  const online = instances.filter((i) => i.status === "ONLINE").length;

  let driftCount = 0;
  for (const inst of instances) {
    const baselineWinrate = inst.strategyVersion?.backtestBaseline?.winRate ?? null;
    const hasBaseline =
      baselineWinrate !== null &&
      Number.isFinite(baselineWinrate) &&
      baselineWinrate >= 0 &&
      baselineWinrate <= 100;
    if (!hasBaseline) continue;
    const live = computeLiveWinrateFromTrades(inst.trades.slice(0, EDGE_DRIFT_TRADES_N));
    if (!live.ok || live.liveWinrate === undefined) continue;
    const drift = computeEdgeDrift(baselineWinrate!, live.liveWinrate);
    if (drift.status !== "OK") driftCount++;
  }

  const items: { label: string; value: string; color?: string }[] = [
    { label: "Execution", value: action, color: colors.text },
    { label: "Online", value: `${online}/${instances.length}` },
    { label: "Halted", value: String(halted), color: halted > 0 ? "#EF4444" : undefined },
    { label: "Drift", value: String(driftCount), color: driftCount > 0 ? "#F59E0B" : undefined },
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 rounded-lg bg-[rgba(79,70,229,0.06)] border border-[rgba(79,70,229,0.12)]">
      {items.map((item) => (
        <span key={item.label} className="text-xs text-[#7C8DB0]">
          {item.label}:{" "}
          <span className="font-mono font-medium" style={{ color: item.color ?? "#CBD5E1" }}>
            {item.value}
          </span>
        </span>
      ))}
    </div>
  );
}
