import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { AppNav } from "@/components/app/app-nav";
import { LiveDashboardClient } from "./live-dashboard-client";
import { PortfolioHeatmap } from "./portfolio-heatmap";
import { MonitorTabs } from "./monitor-tabs";
import { loadMonitorData, type AuthorityDecision, type RecentDecision } from "./load-monitor-data";
import { DecisionTimeline } from "./components/decision-timeline";
import { explainReasonCode } from "@/domain/heartbeat/reason-explainers";
import { getControlExplanation } from "@/domain/heartbeat/control-explanations";
import type { HeartbeatReasonCode } from "@/domain/heartbeat/decide-heartbeat-action";
import type { HeartbeatAnalyticsResult } from "@/domain/heartbeat/heartbeat-analytics";

export default async function LiveEADashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const data = await loadMonitorData(session.user.id);

  // Fail-closed: render degraded state on DB error
  if (!data) {
    return (
      <div className="min-h-screen">
        <AppNav activeItem="monitor" session={session} tier="FREE" firstProjectId={null} />
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

  const { eaInstances, subscription, authority, analytics, recentDecisions } = data;

  let tier: "FREE" | "PRO" | "ELITE" = (subscription?.tier as "FREE" | "PRO" | "ELITE") ?? "FREE";
  if (tier !== "FREE") {
    const isActive = subscription?.status === "active" || subscription?.status === "trialing";
    const isExpired = subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date();
    if (!isActive || isExpired) {
      tier = "FREE";
    }
  }

  // FREE tier: institutional governance gating
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Command Center</h1>
          <p className="text-[#94A3B8] mb-2">
            Lifecycle governance, execution authority, and structural deviation monitoring for live
            algorithmic strategies.
          </p>
          <p className="text-[#64748B] text-sm mb-6">Available on Pro and Elite plans.</p>
          <Link
            href="/pricing"
            className="inline-block bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

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

  // ── Derive governance context from instance data ──
  const now = new Date();
  const hasOperatorHold = eaInstances.some((ea) => ea.operatorHold !== "NONE");
  const suppressedInstances = eaInstances.filter(
    (ea) => ea.monitoringSuppressedUntil && ea.monitoringSuppressedUntil > now
  );
  const hasSuppression = suppressedInstances.length > 0;
  const lifecycleStates = [...new Set(eaInstances.map((ea) => ea.lifecycleState))];

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

        {/* ══════════════════════════════════════════════════════
            CONTROL — Execution Authority (primary, visually dominant)
            ══════════════════════════════════════════════════════ */}
        {eaInstances.length > 0 && (
          <section className="mt-6 mb-10">
            <div className="grid lg:grid-cols-3 gap-4">
              {/* ── Execution Authority + Control Explanation (wide left) ── */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <ExecutionAuthorityCard authority={authority} />
                <ControlExplanationPanel authority={authority} />
                <DecisionTimeline events={recentDecisions} />
              </div>

              {/* ── Governance Context + Authority Uptime (stacked right) ── */}
              <div className="flex flex-col gap-4">
                <GovernanceContextCard
                  hasOperatorHold={hasOperatorHold}
                  hasSuppression={hasSuppression}
                  lifecycleStates={lifecycleStates}
                  instanceCount={eaInstances.length}
                />
                <AuthorityUptimeCard analytics={analytics} />
              </div>
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
        </section>
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

function ExecutionAuthorityCard({ authority }: { authority: AuthorityDecision | null }) {
  // Fail-closed: no authority data → PAUSE with COMPUTATION_FAILED
  const action = authority?.action ?? "PAUSE";
  const reasonCode = authority?.reasonCode ?? "COMPUTATION_FAILED";
  const explanation = explainReasonCode(reasonCode);
  const decidedAt = authority?.decidedAt ?? null;
  const colors = AUTHORITY_COLORS[action] ?? AUTHORITY_COLORS.PAUSE;

  return (
    <div
      className="rounded-xl p-6 h-full"
      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium tracking-wider uppercase text-[#94A3B8]">
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

      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.dot }}
        />
        <span className="text-3xl font-bold" style={{ color: colors.text }}>
          {action}
        </span>
      </div>

      <p className="text-sm text-[#CBD5E1] leading-relaxed mb-3">{explanation}</p>

      <span className="inline-block text-[11px] font-mono text-[#64748B] px-2 py-0.5 rounded bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.15)]">
        {reasonCode}
      </span>
    </div>
  );
}

const AUTHORITY_REASON_LABELS: Record<string, string> = {
  NO_STRATEGIES: "No strategies have been created",
  NO_LIVE_INSTANCE: "No live EA instance is connected",
};

function ControlExplanationPanel({ authority }: { authority: AuthorityDecision | null }) {
  const reasonCode = authority?.reasonCode ?? "COMPUTATION_FAILED";
  const action = authority?.action ?? "PAUSE";
  const authorityReasons = authority?.authorityReasons;

  const explanation = getControlExplanation(reasonCode as HeartbeatReasonCode);
  const colors = AUTHORITY_COLORS[action] ?? AUTHORITY_COLORS.PAUSE;

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.dot }}
        />
        <h3 className="text-sm font-medium text-white">{explanation.title}</h3>
      </div>

      <p className="text-sm text-[#CBD5E1] leading-relaxed mb-3">{explanation.explanation}</p>

      <div className="border-t border-[rgba(79,70,229,0.15)] pt-3">
        <p className="text-xs text-[#7C8DB0] mb-1 uppercase tracking-wider font-medium">
          Resolution
        </p>
        <p className="text-sm text-[#94A3B8] leading-relaxed">{explanation.resolution}</p>
      </div>

      {authorityReasons && authorityReasons.length > 0 && (
        <div className="border-t border-[rgba(79,70,229,0.15)] pt-3 mt-3">
          <p className="text-xs text-[#7C8DB0] mb-2 uppercase tracking-wider font-medium">
            Details
          </p>
          <ul className="space-y-1.5">
            {authorityReasons.map((reason) => (
              <li key={reason} className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <span className="w-1 h-1 rounded-full bg-[#F59E0B] flex-shrink-0" />
                {AUTHORITY_REASON_LABELS[reason] ?? reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GovernanceContextCard({
  hasOperatorHold,
  hasSuppression,
  lifecycleStates,
  instanceCount,
}: {
  hasOperatorHold: boolean;
  hasSuppression: boolean;
  lifecycleStates: string[];
  instanceCount: number;
}) {
  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
      <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8] mb-3">
        Governance Context
      </h3>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#7C8DB0]">Instances</span>
          <span className="text-[#CBD5E1] font-mono text-xs">{instanceCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#7C8DB0]">Operator Hold</span>
          <StatusPill active={hasOperatorHold} activeLabel="ACTIVE" inactiveLabel="NONE" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#7C8DB0]">Suppression</span>
          <StatusPill active={hasSuppression} activeLabel="ACTIVE" inactiveLabel="NONE" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#7C8DB0]">Lifecycle</span>
          <span className="text-[11px] font-mono text-[#94A3B8]">
            {lifecycleStates.length > 0 ? lifecycleStates.join(", ") : "—"}
          </span>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-[#64748B] leading-relaxed">
        Control is enforced by governed rules — not discretionary interpretation.
      </p>
    </div>
  );
}

function AuthorityUptimeCard({ analytics }: { analytics: HeartbeatAnalyticsResult | null }) {
  // Fail-closed: no analytics → show breach with safe copy
  const coverage = analytics?.coveragePct ?? 0;
  const cadenceBreached = analytics?.cadenceBreached ?? true;
  const longestGapMs = analytics?.longestGapMs ?? 0;
  const runPct = analytics?.runPct ?? 0;

  const coverageColor = coverage >= 95 ? "#10B981" : coverage >= 80 ? "#F59E0B" : "#EF4444";
  const runColor = runPct >= 95 ? "#10B981" : runPct >= 80 ? "#F59E0B" : "#EF4444";

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
      <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8] mb-3">
        Authority Uptime (24h)
      </h3>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#7C8DB0]">Coverage</span>
          <span className="font-mono text-xs" style={{ color: coverageColor }}>
            {coverage.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#7C8DB0]">RUN</span>
          <span className="font-mono text-xs" style={{ color: runColor }}>
            {runPct.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#7C8DB0]">Cadence</span>
          {cadenceBreached ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-[#EF4444]">
              BREACH
            </span>
          ) : (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)] text-[#10B981]">
              OK
            </span>
          )}
        </div>

        {longestGapMs > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[#7C8DB0]">Longest gap</span>
            <span className="font-mono text-xs text-[#94A3B8]">{formatGap(longestGapMs)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  if (active) {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-[#F59E0B]">
        {activeLabel}
      </span>
    );
  }
  return <span className="text-[11px] font-mono text-[#64748B]">{inactiveLabel}</span>;
}

function formatGap(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}
