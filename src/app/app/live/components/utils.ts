import { resolveInstanceBaselineTrust } from "@/lib/live/baseline-trust-state";
import type { EAInstanceData, InstanceAttention, AccountGroup, StrategyHealthLabel } from "./types";

// ============================================
// FORMATTING HELPERS
// ============================================

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/** Format P&L with explicit +/- sign for clarity */
export function formatPnl(value: number | null): string {
  if (value === null || value === undefined) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
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

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatMetricsDuration(seconds: number): string {
  if (seconds <= 0) return "---";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ============================================
// CALCULATION HELPERS
// ============================================

export function calculateWinRate(trades: { profit: number; closeTime: string | null }[]): number {
  const closed = trades.filter((t) => t.closeTime !== null);
  if (closed.length === 0) return 0;
  const winners = closed.filter((t) => t.profit > 0).length;
  return (winners / closed.length) * 100;
}

export function calculateProfitFactor(
  trades: { profit: number; closeTime: string | null }[]
): number {
  const closed = trades.filter((t) => t.closeTime !== null);
  const grossProfit = closed.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(
    closed.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)
  );
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

// ============================================
// INSTANCE ATTENTION RESOLVER
// ============================================

export function resolveInstanceAttention(
  ea: EAInstanceData,
  monitoringReasonFormatter: (reasons: string[]) => string[]
): InstanceAttention | null {
  const trust = resolveInstanceBaselineTrust({
    hasBaseline: !!ea.baseline,
    relinkRequired: !!ea.relinkRequired,
  });

  if (trust.state === "SUSPENDED") {
    return {
      statusLabel: "Baseline suspended",
      reason: "Material change invalidated baseline trust",
      actionLabel: trust.actionLabel!,
      color: "#F59E0B",
    };
  }
  if (trust.state === "MISSING") {
    return {
      statusLabel: "No baseline linked",
      reason: "No baseline is linked to this deployment",
      actionLabel: trust.actionLabel!,
      color: "#71717A",
    };
  }
  if (ea.lifecycleState === "EDGE_AT_RISK" || ea.strategyStatus === "EDGE_DEGRADED") {
    return {
      statusLabel: "Edge at risk",
      reason: ea.monitoringReasons?.length
        ? monitoringReasonFormatter(ea.monitoringReasons)[0]
        : "Live performance has materially diverged from baseline",
      actionLabel: "Inspect drift",
      color: "#EF4444",
    };
  }
  if (ea.strategyStatus === "UNSTABLE") {
    return {
      statusLabel: "Unstable",
      reason: ea.monitoringReasons?.length
        ? monitoringReasonFormatter(ea.monitoringReasons)[0]
        : "Health metrics show early signs of deviation",
      actionLabel: "Inspect performance",
      color: "#F59E0B",
    };
  }
  if (ea.healthStatus === "INSUFFICIENT_DATA" || ea.strategyStatus === "TESTING") {
    const waitReason = !ea.lastHeartbeat
      ? "Awaiting first heartbeat from the EA"
      : ea.totalTrades === 0
        ? "Awaiting first trade to begin evaluation"
        : "More live samples needed before evaluation";
    return {
      statusLabel: "Waiting for data",
      reason: waitReason,
      actionLabel: "Collect more data",
      color: "#A78BFA",
    };
  }
  if (ea.status === "ERROR") {
    return {
      statusLabel: "Connection error",
      reason: ea.lastError ?? "EA reported an error state",
      actionLabel: "Check connection",
      color: "#EF4444",
    };
  }
  return null;
}

// ============================================
// ACCOUNT GROUPING
// ============================================

export function groupByAccount(instances: EAInstanceData[]): AccountGroup[] {
  const map = new Map<string, EAInstanceData[]>();

  // Identify known parent ids: instances that at least one child points to
  const knownParentIds = new Set(
    instances.map((ea) => ea.parentInstanceId).filter((id): id is string => id != null)
  );
  // IDs actually present in the array — used to detect orphaned children
  const presentIds = new Set(instances.map((ea) => ea.id));

  for (const ea of instances) {
    let key: string;
    if (ea.parentInstanceId && presentIds.has(ea.parentInstanceId)) {
      // Child with explicit parent link (parent present) — group under parent
      key = ea.parentInstanceId;
    } else if (knownParentIds.has(ea.id)) {
      // This instance is a known parent (children point to it) — group by own id
      key = ea.id;
    } else {
      // Standalone or legacy instance without parent relation — group by broker|accountNumber
      key = `${ea.broker ?? "Unknown"}|${ea.accountNumber ?? ea.id}`;
    }

    const group = map.get(key) ?? [];
    group.push(ea);
    map.set(key, group);
  }
  return Array.from(map.entries()).map(([key, group]) => {
    // Use account-wide instance as primary if available, otherwise first
    const accountWide = group.find((ea) => ea.symbol === null);
    const primary = accountWide ?? group[0];
    return {
      key,
      broker: primary.broker,
      accountNumber: primary.accountNumber,
      instances: group,
      primary,
    };
  });
}

// ============================================
// PRIORITY SORTING
// ============================================

/**
 * Compute a numeric priority for an instance. Lower = more urgent.
 *
 * Priority buckets:
 *   0 — EDGE_AT_RISK lifecycle
 *   1 — DEGRADED health (product label: "Edge at Risk")
 *   2 — WARNING health
 *   3 — Discovered / Draft / needs activation
 *   4 — Active healthy strategies (LIVE_MONITORING + HEALTHY)
 *   5 — Inactive / paused / no signal
 */
export function instancePriority(ea: EAInstanceData): number {
  // Bucket 0: lifecycle EDGE_AT_RISK
  if (ea.lifecycleState === "EDGE_AT_RISK") return 0;

  // Bucket 1: health DEGRADED
  const healthStatus = ea.healthSnapshots?.[0]?.status ?? ea.healthStatus ?? null;
  if (healthStatus === "DEGRADED") return 1;

  // Bucket 2: health WARNING
  if (healthStatus === "WARNING") return 2;

  // Bucket 3: discovered / draft / needs baseline
  if (ea.isAutoDiscovered || ea.lifecycleState === "DRAFT") return 3;

  // Bucket 4: active healthy
  if (
    ea.status === "ONLINE" &&
    (healthStatus === "HEALTHY" || healthStatus === "INSUFFICIENT_DATA" || healthStatus === null)
  ) {
    return 4;
  }

  // Bucket 5: everything else (offline, inactive, etc.)
  return 5;
}

/**
 * Tie-breaker comparator within the same priority bucket.
 * Negative = a before b.
 */
export function instanceTieBreaker(a: EAInstanceData, b: EAInstanceData): number {
  // 1. Drift detected first
  const aDrift = a.healthSnapshots?.[0]?.driftDetected === true ? 0 : 1;
  const bDrift = b.healthSnapshots?.[0]?.driftDetected === true ? 0 : 1;
  if (aDrift !== bDrift) return aDrift - bDrift;

  // 2. Worse health score first (lower score = worse)
  const aScore = a.healthSnapshots?.[0] ? 1 - (a.healthSnapshots[0].driftSeverity ?? 0) : 1;
  const bScore = b.healthSnapshots?.[0] ? 1 - (b.healthSnapshots[0].driftSeverity ?? 0) : 1;
  if (aScore !== bScore) return aScore - bScore;

  // 3. More recent heartbeat first
  const aTime = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
  const bTime = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
  if (aTime !== bTime) return bTime - aTime;

  // 4. Stable fallback: id
  return a.id.localeCompare(b.id);
}

export function compareInstances(a: EAInstanceData, b: EAInstanceData): number {
  const pa = instancePriority(a);
  const pb = instancePriority(b);
  if (pa !== pb) return pa - pb;
  return instanceTieBreaker(a, b);
}

/**
 * Sort account groups by firstSeen (createdAt of the primary instance) ascending.
 * Oldest accounts stay at the top — operators rely on spatial memory.
 * Also sorts instances within each group by priority.
 */
export function sortByPriority(groups: AccountGroup[]): AccountGroup[] {
  // Sort instances within each group (strategies inside an account)
  for (const group of groups) {
    group.instances.sort(compareInstances);
  }

  // Stable account order: user-defined sortOrder first, then createdAt fallback
  return groups.sort((a, b) => {
    const sa = a.primary.sortOrder ?? 0;
    const sb = b.primary.sortOrder ?? 0;
    // Both have explicit sort order → use it
    if (sa !== 0 && sb !== 0) return sa - sb;
    // One has sort order, the other doesn't → sorted one comes first
    if (sa !== 0) return -1;
    if (sb !== 0) return 1;
    // Neither has sort order → fall back to createdAt
    const ta = new Date(a.primary.createdAt).getTime();
    const tb = new Date(b.primary.createdAt).getTime();
    return ta - tb;
  });
}

// ============================================
// STRATEGY HEALTH DISPLAY
// ============================================

export function deriveStrategyHealth(instance: EAInstanceData | undefined): StrategyHealthLabel {
  if (!instance) return "Pending";

  // Lifecycle state is the strongest signal
  if (instance.lifecycleState === "EDGE_AT_RISK" || instance.lifecycleState === "INVALIDATED") {
    return "Edge at Risk";
  }

  // Latest health snapshot
  const snap = instance.healthSnapshots?.[0];
  if (snap) {
    if (snap.status === "AT_RISK" || snap.status === "DEGRADED") return "Edge at Risk";
    if (snap.status === "WARNING" || snap.driftDetected) return "Elevated";
    if (snap.status === "HEALTHY") return "Healthy";
  }

  // Fallback: strategy status
  if (instance.strategyStatus === "EDGE_DEGRADED") return "Edge at Risk";
  if (instance.strategyStatus === "UNSTABLE") return "Elevated";

  // No explicit health confirmation — treat as pending
  return "Pending";
}

export const HEALTH_STYLES: Record<StrategyHealthLabel, { bg: string; text: string; dot: string }> =
  {
    Healthy: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", dot: "bg-[#10B981]" },
    Elevated: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
    "Edge at Risk": { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", dot: "bg-[#EF4444]" },
    Pending: { bg: "bg-[#64748B]/10", text: "text-[#64748B]", dot: "bg-[#64748B]" },
  };

// ============================================
// SIGNAL SUMMARY
// ============================================

export function deriveSignalSummary(
  health: StrategyHealthLabel,
  snap: (EAInstanceData["healthSnapshots"] extends (infer U)[] | undefined ? U : never) | undefined,
  isLinked: boolean
): string {
  if (!isLinked) return "No baseline linked — monitoring inactive";
  if (!snap) return "Awaiting first monitoring evaluation";
  switch (health) {
    case "Healthy":
      return "Snapshot status: HEALTHY";
    case "Elevated":
      return snap.driftDetected
        ? "Drift detected by CUSUM monitoring"
        : `Snapshot status: ${snap.status}`;
    case "Edge at Risk":
      return `Snapshot status: ${snap.status} — drift detected: ${snap.driftDetected ? "yes" : "no"} — manual review required`;
    case "Pending":
      return "No health snapshot available";
  }
}
