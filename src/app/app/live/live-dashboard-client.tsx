"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { showInfo, showSuccess, showError } from "@/lib/toast";
import { getCsrfHeaders } from "@/lib/api-client";
import { useLiveStream } from "./use-live-stream";
import { RegisterEADialog } from "./register-ea-dialog";
import { LinkBaselineDialog, type DeploymentContext } from "./link-baseline-dialog";
import { formatMonitoringReasons } from "@/lib/live/monitoring-reason-copy";
import {
  type LiveHeartbeatPatch,
  isAccountContainer,
  applyHeartbeatPatch,
} from "@/lib/live/live-instance-dto";
import { AccountCard } from "./components/account-card";
import { TradingCalendar } from "./components/trading-calendar";
import { EquityCurveChart } from "./components/equity-curve-chart";
import { ConnectionIndicator } from "./components/connection-indicator";
import { OpenTradesPanel } from "./components/open-trades-panel";
import { AlertsModal } from "./components/alerts-modal";
import { MonitorTabs } from "./monitor-tabs";
import { WinRateDonut } from "./components/win-rate-donut";
import type {
  EAInstanceData,
  LiveDashboardClientProps,
  StrategyHealthLabel,
} from "./components/types";
import {
  formatCurrency,
  resolveInstanceAttention,
  groupByAccount,
  sortByPriority,
  deriveStrategyHealth,
  HEALTH_STYLES,
  calculateWinRate,
  calculateProfitFactor,
} from "./components/utils";

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveDashboardClient({
  initialData,
  tier: _tier,
  initialRelinkInstanceId,
}: LiveDashboardClientProps) {
  const [eaInstances, setEaInstances] = useState<EAInstanceData[]>(initialData);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const [modeFilter, setModeFilter] = useState<"ALL" | "LIVE" | "PAPER">("ALL");
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [scrollExpandId, setScrollExpandId] = useState<string | null>(null);
  const [draggedAccountKey, setDraggedAccountKey] = useState<string | null>(null);
  const [dragOverAccountKey, setDragOverAccountKey] = useState<string | null>(null);
  const [linkBaselineInstanceId, setLinkBaselineInstanceId] = useState<string | null>(() => {
    // Auto-open LinkBaselineDialog from ?relink= query param
    if (initialRelinkInstanceId && initialData.some((ea) => ea.id === initialRelinkInstanceId)) {
      return initialRelinkInstanceId;
    }
    return null;
  });
  const [, setLinkingInstanceId] = useState<string | null>(null);
  const [activatingInstanceId, setActivatingInstanceId] = useState<string | null>(null);
  const [linkedSuccessBanner, setLinkedSuccessBanner] = useState(false);
  const linkedSuccessBannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up ?relink= from URL after initial render
  const relinkCleanedRef = useRef(false);
  useEffect(() => {
    if (initialRelinkInstanceId && !relinkCleanedRef.current) {
      relinkCleanedRef.current = true;
      const url = new URL(window.location.href);
      if (url.searchParams.has("relink")) {
        url.searchParams.delete("relink");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [initialRelinkInstanceId]);
  const [dismissedAlerts] = useState<Set<string>>(new Set());
  const [showRestoreGuide] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("algostudio:onboarding-dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [globalDrawdownThreshold, setGlobalDrawdownThreshold] = useState("10");
  const [activeTab, setActiveTab] = useState<"accounts" | "monitoring" | "journal">("accounts");
  const [dailyPnl, setDailyPnl] = useState<{ date: string; pnl: number }[]>([]);
  const previousDataRef = useRef<Map<string, EAInstanceData>>(new Map());
  const changedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const soundAlertsRef = useRef(soundAlerts);
  useEffect(() => {
    soundAlertsRef.current = soundAlerts;
  }, [soundAlerts]);

  // Clean up changed-ids highlight timeout on unmount
  useEffect(() => {
    return () => {
      if (changedTimeoutRef.current) clearTimeout(changedTimeoutRef.current);
      if (linkedSuccessBannerTimerRef.current) clearTimeout(linkedSuccessBannerTimerRef.current);
    };
  }, []);

  // Fetch daily PnL for equity curve chart
  useEffect(() => {
    let cancelled = false;
    fetch("/api/live/daily-pnl")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.dailyPnl) setDailyPnl(data.dailyPnl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize previous data
  useEffect(() => {
    const map = new Map<string, EAInstanceData>();
    initialData.forEach((ea) => map.set(ea.id, ea));
    previousDataRef.current = map;
  }, [initialData]);

  // Process incoming data (shared by SSE and polling)
  const processUpdate = useCallback((newInstances: EAInstanceData[]) => {
    const changed = new Set<string>();
    const previousMap = previousDataRef.current;

    for (const ea of newInstances) {
      const prev = previousMap.get(ea.id);
      if (!prev) {
        changed.add(ea.id);
        continue;
      }

      if (prev.status !== ea.status) {
        changed.add(ea.id);
        if (soundAlertsRef.current) {
          showInfo(
            `${ea.eaName} is now ${ea.status}`,
            `Status changed from ${prev.status} to ${ea.status}`
          );
        }
      }

      if (ea.totalTrades > prev.totalTrades && soundAlertsRef.current) {
        showInfo(`New trade on ${ea.eaName}`, `Total trades: ${ea.totalTrades}`);
      }
    }

    const newMap = new Map<string, EAInstanceData>();
    newInstances.forEach((ea) => newMap.set(ea.id, ea));
    previousDataRef.current = newMap;

    setEaInstances(newInstances);
    setChangedIds(changed);

    if (changed.size > 0) {
      if (changedTimeoutRef.current) clearTimeout(changedTimeoutRef.current);
      changedTimeoutRef.current = setTimeout(() => setChangedIds(new Set()), 2000);
    }
  }, []);

  // SSE live stream with polling fallback
  const { status: connectionStatus, lastUpdated } = useLiveStream({
    onInit: (data) => {
      processUpdate(data as EAInstanceData[]);
    },
    onHeartbeat: (data) => {
      const hb = data as LiveHeartbeatPatch;
      setEaInstances((prev) =>
        prev.map((ea) => (ea.id === hb.instanceId ? applyHeartbeatPatch(ea, hb) : ea))
      );
      setChangedIds((prev) => new Set([...prev, hb.instanceId]));
      if (changedTimeoutRef.current) clearTimeout(changedTimeoutRef.current);
      changedTimeoutRef.current = setTimeout(() => setChangedIds(new Set()), 2000);
    },
    onTrade: (data) => {
      const trade = data as {
        instanceId: string;
        ticket?: string;
        profit: number;
        closeTime: string | null;
        symbol?: string | null;
        magicNumber?: number | null;
        openPrice?: number;
        closePrice?: number | null;
        lots?: number;
        type?: string;
      };
      if (soundAlertsRef.current) {
        const ea = previousDataRef.current.get(trade.instanceId);
        showInfo(`New trade on ${ea?.eaName ?? "EA"}`, `P/L: $${trade.profit.toFixed(2)}`);
      }
      // Prepend the new trade so AccountCard metrics stay current without a full refresh
      setEaInstances((prev) =>
        prev.map((ea) =>
          ea.id === trade.instanceId
            ? {
                ...ea,
                trades: [
                  {
                    profit: trade.profit,
                    closeTime: trade.closeTime ?? null,
                    symbol: trade.symbol ?? null,
                    magicNumber: trade.magicNumber ?? null,
                    ticket: trade.ticket,
                    openPrice: trade.openPrice,
                    closePrice: trade.closePrice ?? null,
                    lots: trade.lots,
                    type: trade.type,
                  },
                  ...ea.trades,
                ].slice(0, 20),
              }
            : ea
        )
      );
    },
    onError: () => {
      // SSE error events handled internally
    },
    pollingInterval: 10000,
    pollingUrl: "/api/live/status",
    onPollingData: (data) => {
      processUpdate(data as EAInstanceData[]);
    },
  });

  const fetchUpdate = useCallback(async () => {
    try {
      const res = await fetch("/api/live/status");
      if (!res.ok) return;
      const data = await res.json();
      processUpdate(data.data as EAInstanceData[]);
    } catch {
      // Silent fail
    }
  }, [processUpdate]);

  async function handleTogglePause(
    instanceId: string,
    tradingState: "TRADING" | "PAUSED"
  ): Promise<void> {
    const res = await fetch(`/api/live/${instanceId}/pause`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({ tradingState }),
    });

    if (res.ok) {
      setEaInstances((prev) =>
        prev.map((ea) => (ea.id === instanceId ? { ...ea, tradingState } : ea))
      );
      const ea = eaInstances.find((e) => e.id === instanceId);
      const action = tradingState === "PAUSED" ? "paused" : "resumed";
      showSuccess(`${ea?.eaName ?? "EA"} ${action}`);
    } else {
      showError("Failed to update EA", "Please try again.");
    }
  }

  async function handleDelete(instanceId: string): Promise<void> {
    const ea = eaInstances.find((e) => e.id === instanceId);
    try {
      const res = await fetch(`/api/live/${instanceId}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
      });

      if (res.ok) {
        setEaInstances((prev) => prev.filter((e) => e.id !== instanceId));
        showSuccess(`${ea?.eaName ?? "EA"} deleted`);
      } else {
        showError("Failed to delete EA", "Please try again.");
      }
    } catch {
      showError("Failed to delete EA", "Network error. Please try again.");
    }
  }

  function handleDragStart(accountKey: string) {
    setDraggedAccountKey(accountKey);
  }

  function handleDragOver(e: React.DragEvent, accountKey: string) {
    e.preventDefault();
    if (accountKey !== draggedAccountKey) {
      setDragOverAccountKey(accountKey);
    }
  }

  function handleDragEnd() {
    setDraggedAccountKey(null);
    setDragOverAccountKey(null);
  }

  async function handleDrop(targetKey: string) {
    if (!draggedAccountKey || draggedAccountKey === targetKey) {
      handleDragEnd();
      return;
    }
    const sorted = sortByPriority(groupByAccount(eaInstances));
    const fromIdx = sorted.findIndex((g) => g.key === draggedAccountKey);
    const toIdx = sorted.findIndex((g) => g.key === targetKey);
    if (fromIdx < 0 || toIdx < 0) {
      handleDragEnd();
      return;
    }

    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Optimistic local update: set sortOrder on primary instances
    const newOrder = reordered.map((g) => g.primary.id);
    const previousInstances = eaInstances;
    setEaInstances((prev) =>
      prev.map((ea) => {
        const idx = newOrder.indexOf(ea.id);
        return idx >= 0 ? { ...ea, sortOrder: idx + 1 } : ea;
      })
    );
    handleDragEnd();

    // Persist to server — rollback on failure
    try {
      const res = await fetch("/api/live/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ order: newOrder }),
      });
      if (!res.ok) {
        setEaInstances(previousInstances);
        showError("Failed to save order", "Your changes were reverted.");
      }
    } catch {
      setEaInstances(previousInstances);
      showError("Failed to save order", "Your changes were reverted.");
    }
  }

  async function handleUnlinkBaseline(instanceId: string): Promise<void> {
    const res = await fetch(`/api/live/${instanceId}/unlink-baseline`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      setEaInstances((prev) =>
        prev.map((ea) =>
          ea.id === instanceId ? { ...ea, baseline: null, relinkRequired: false } : ea
        )
      );
      showSuccess("Baseline unlinked", "You can link a new baseline at any time.");
    } else {
      const data = await res.json().catch(() => ({}));
      showError(
        "Failed to unlink",
        (data as { message?: string }).message ?? "Something went wrong"
      );
    }
  }

  async function handleSaveGlobalDrawdown(): Promise<void> {
    const threshold = parseFloat(globalDrawdownThreshold);
    if (isNaN(threshold) || threshold <= 0 || threshold > 100) {
      showError("Invalid threshold", "Please enter a value between 0.1 and 100.");
      return;
    }

    // Create or update a global drawdown alert (no instanceId)
    const res = await fetch("/api/live/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify({
        alertType: "DRAWDOWN",
        threshold,
        channel: "EMAIL",
        alertState: "ACTIVE",
      }),
    });

    if (res.ok) {
      showSuccess("Floating drawdown alert saved", `Alert at ${threshold}% floating DD`);
    } else {
      showError("Failed to save alert");
    }
  }

  // Portfolio-level strategy health summary (excludes base/account containers)
  const portfolioHealthCounts = (() => {
    const counts: Record<StrategyHealthLabel, number> = {
      Healthy: 0,
      Elevated: 0,
      "Edge at Risk": 0,
      Pending: 0,
    };
    for (const ea of eaInstances) {
      if (!ea.symbol) continue; // skip account-wide parent containers
      counts[deriveStrategyHealth(ea)]++;
    }
    return counts;
  })();
  const portfolioHealthParts = (
    ["Edge at Risk", "Elevated", "Healthy", "Pending"] as StrategyHealthLabel[]
  ).filter((label) => portfolioHealthCounts[label] > 0);

  // ── Hoisted metrics ──
  const containers = eaInstances.filter(isAccountContainer);
  const metricsSource =
    containers.length > 0 ? containers : eaInstances.filter((ea) => ea.mode === "LIVE");
  const totalBalance = metricsSource.reduce((sum, ea) => sum + (ea.balance ?? 0), 0);
  const floatingPnl = metricsSource
    .filter((ea) => ea.equity != null && ea.balance != null)
    .reduce((sum, ea) => sum + (ea.equity! - ea.balance!), 0);
  const totalProfit = metricsSource.reduce((sum, ea) => sum + ea.totalProfit, 0);
  const allTrades = metricsSource.flatMap((ea) => ea.trades ?? []);
  const winRate = calculateWinRate(allTrades);
  const closedTrades = allTrades.filter((t) => t.closeTime !== null);
  const wins = closedTrades.filter((t) => t.profit > 0).length;
  const losses = closedTrades.filter((t) => t.profit <= 0).length;
  const profitFactor = calculateProfitFactor(allTrades);

  // ── System state counts ──
  let sysHealthy = 0,
    sysAttention = 0,
    sysMonitoring = 0,
    sysPaused = 0;
  for (const ea of eaInstances) {
    if (ea.tradingState === "PAUSED") {
      sysPaused++;
      continue;
    }
    const att = resolveInstanceAttention(ea, formatMonitoringReasons);
    if (!att) sysHealthy++;
    else if (att.statusLabel === "Waiting for data") sysMonitoring++;
    else sysAttention++;
  }
  const sysTotal = sysHealthy + sysAttention + sysMonitoring + sysPaused;
  const allHealthy = sysAttention === 0 && sysPaused === 0 && sysMonitoring === 0;

  // ── Action items for monitoring tab ──
  const actionItems = eaInstances
    .filter((ea) => !isAccountContainer(ea) && !dismissedAlerts.has(ea.id))
    .map((ea) => {
      const att = resolveInstanceAttention(ea, formatMonitoringReasons);
      if (!att) return null;
      const identity = [ea.symbol, ea.timeframe].filter(Boolean).join(" · ") || ea.eaName;
      const isBaselineAction =
        att.statusLabel === "Baseline suspended" || att.statusLabel === "No baseline linked";
      return {
        id: ea.id,
        identity,
        ...att,
        onClick: isBaselineAction
          ? () => setLinkBaselineInstanceId(ea.id)
          : () => {
              setActiveTab("accounts");
              const cardId = ea.parentInstanceId || ea.id;
              if (ea.parentInstanceId) setScrollExpandId(ea.id);
              setTimeout(
                () =>
                  document
                    .getElementById(`account-card-${cardId}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" }),
                100
              );
            },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Group action items
  const alertGroups = new Map<
    string,
    {
      statusLabel: string;
      reason: string;
      actionLabel: string;
      color: string;
      members: typeof actionItems;
    }
  >();
  for (const item of actionItems) {
    const groupKey = `${item.statusLabel}|${item.reason}|${item.actionLabel}`;
    const existing = alertGroups.get(groupKey);
    if (existing) existing.members.push(item);
    else
      alertGroups.set(groupKey, {
        statusLabel: item.statusLabel,
        reason: item.reason,
        actionLabel: item.actionLabel,
        color: item.color,
        members: [item],
      });
  }
  const ALERT_PRIORITY: Record<string, number> = {
    "Edge at risk": 0,
    Unstable: 1,
    "Connection error": 2,
    "Baseline suspended": 3,
    "Waiting for data": 4,
    "No baseline linked": 5,
  };
  const sortedAlertGroups = [...alertGroups.values()].sort(
    (a, b) => (ALERT_PRIORITY[a.statusLabel] ?? 9) - (ALERT_PRIORITY[b.statusLabel] ?? 9)
  );
  const hasRedAlert = actionItems.some((i) => i.color === "#EF4444");
  const alertBorderColor = hasRedAlert ? "#EF4444" : "#F59E0B";

  return (
    <div className="space-y-5">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 px-3 py-2 rounded-lg bg-[#0A0118]/40 border border-[#1E293B]/30">
        {/* Mode filter */}
        <div className="flex items-center rounded-md border border-[#1E293B] overflow-hidden">
          {(["ALL", "LIVE", "PAPER"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                modeFilter === mode
                  ? mode === "PAPER"
                    ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                    : "bg-white/5 text-white"
                  : "text-[#64748B] hover:text-[#94A3B8]"
              }`}
            >
              {mode === "ALL" ? "All" : mode === "LIVE" ? "Live" : "Paper"}
            </button>
          ))}
        </div>

        {/* Connection status indicator */}
        <ConnectionIndicator connectionStatus={connectionStatus} lastUpdated={lastUpdated} />

        {/* Sound toggle */}
        <button
          onClick={() => setSoundAlerts(!soundAlerts)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
            soundAlerts
              ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
              : "text-[#64748B] border-[#1E293B] hover:text-[#94A3B8]"
          }`}
          title={soundAlerts ? "Notifications on" : "Notifications off"}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {soundAlerts ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75a.75.75 0 01-.75-.75V6a.75.75 0 011.5 0v12a.75.75 0 01-.75.75zM8 15H5a1 1 0 01-1-1v-4a1 1 0 011-1h3l4-4v14l-4-4z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            )}
          </svg>
          Notifications
        </button>

        {/* Alerts config button */}
        <button
          onClick={() => setShowAlertsModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border border-[#1E293B] text-[#64748B] hover:text-[#94A3B8] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          Alerts
        </button>

        {/* Connect external EA */}
        <RegisterEADialog onSuccess={fetchUpdate} />

        {/* Manual refresh */}
        <button
          onClick={fetchUpdate}
          className="px-3 py-1.5 rounded-md text-[11px] font-medium text-[#64748B] border border-[#1E293B] hover:text-[#94A3B8] transition-colors"
        >
          Refresh Now
        </button>
      </div>

      {/* ── Hero: Equity Curve + KPI Sidebar ── */}
      {eaInstances.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Equity Curve — 3/4 width */}
          <div className="lg:col-span-3 rounded-lg bg-[#0A0118]/40 border border-[#1E293B]/40 p-4">
            <EquityCurveChart dailyPnl={dailyPnl} />
          </div>

          {/* KPI Sidebar — 1/4 width */}
          <div className="lg:col-span-1 rounded-lg bg-[#0A0118]/40 border border-[#1E293B]/40 p-4 space-y-4">
            {/* Financial metrics */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-1">Balance</p>
              <p className="text-xl font-bold tabular-nums text-[#10B981]">
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-1">
                Floating P&L
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${floatingPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
              >
                {formatCurrency(floatingPnl)}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-1">
                Total Profit
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
              >
                {formatCurrency(totalProfit)}
              </p>
            </div>

            {/* Win Rate with donut */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-1">
                  Win Rate
                </p>
                <p className="text-xl font-bold tabular-nums text-white">{winRate.toFixed(1)}%</p>
              </div>
              <WinRateDonut winRate={winRate} wins={wins} losses={losses} size={52} />
            </div>

            <div className="border-t border-[#1E293B]/40 my-1" />

            {/* System state */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">Online</span>
                <span className="text-[11px] font-semibold tabular-nums text-white">
                  {sysTotal - sysPaused}/{sysTotal}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">Status</span>
                <span
                  className={`text-[11px] font-semibold ${allHealthy ? "text-[#10B981]" : sysPaused > 0 ? "text-[#F59E0B]" : "text-white"}`}
                >
                  {sysPaused > 0 ? "PAUSED" : allHealthy ? "NOMINAL" : "ACTIVE"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">Attention</span>
                <span
                  className={`text-[11px] font-semibold tabular-nums ${sysAttention > 0 ? "text-[#F59E0B]" : "text-[#10B981]"}`}
                >
                  {sysAttention}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">Profit Factor</span>
                <span className="text-[11px] font-semibold tabular-nums text-white">
                  {profitFactor === Infinity ? "\u221E" : profitFactor.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Banner ── */}
      {linkedSuccessBanner && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-sm font-medium">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Baseline linked successfully — monitoring will resume automatically.
        </div>
      )}

      {/* ── Tabbed Content: Accounts / Monitoring / Journal ── */}
      {eaInstances.length > 0 ? (
        <MonitorTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          monitoringContent={
            <div className="space-y-4">
              {/* Alerts */}
              {actionItems.length > 0 && (
                <div
                  className="rounded-lg p-4"
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: `${alertBorderColor}20`,
                    backgroundColor: `${alertBorderColor}05`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-2 w-2">
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                        style={{ backgroundColor: alertBorderColor }}
                      />
                      <span
                        className="relative inline-flex rounded-full h-2 w-2"
                        style={{ backgroundColor: alertBorderColor }}
                      />
                    </span>
                    <p className="text-xs font-semibold" style={{ color: alertBorderColor }}>
                      {actionItems.length}{" "}
                      {actionItems.length === 1 ? "instance needs" : "instances need"} attention
                    </p>
                  </div>
                  <div className="space-y-3">
                    {sortedAlertGroups.map((group, gi) => (
                      <div key={gi} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ color: group.color, backgroundColor: `${group.color}15` }}
                          >
                            {group.statusLabel}
                          </span>
                          <span className="text-[10px] text-[#475569]">
                            {group.members.length} instance{group.members.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#64748B] pl-1">{group.reason}</p>
                        <div className="flex flex-wrap gap-1.5 pl-1">
                          {group.members.map((m) => (
                            <button
                              key={m.id}
                              onClick={m.onClick}
                              className="text-[10px] px-2 py-0.5 rounded-md border border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#475569] transition-colors"
                            >
                              {m.identity} &rarr; {group.actionLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Health Grid */}
              <div className="rounded-lg border border-[#1E293B]/40 bg-[#0A0118]/40 p-4">
                <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium mb-3">
                  System Health
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Healthy", count: sysHealthy, color: "#10B981" },
                    { label: "Attention", count: sysAttention, color: "#F59E0B" },
                    { label: "Collecting", count: sysMonitoring, color: "#A78BFA" },
                    { label: "Paused", count: sysPaused, color: "#64748B" },
                  ].map((c) => (
                    <div key={c.label} className="text-center">
                      <p
                        className="text-2xl font-bold tabular-nums leading-none"
                        style={{ color: c.color }}
                      >
                        {c.count}
                      </p>
                      <p className="text-[8px] uppercase tracking-wider text-[#525B6B] mt-1.5">
                        {c.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open Trades */}
              <OpenTradesPanel instances={eaInstances} />

              {/* Health + Exposure */}
              <div className="rounded-lg border border-[#1E293B]/40 bg-[#0A0118]/40 p-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {portfolioHealthParts.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] uppercase tracking-[0.15em] text-[#475569]">
                        Health
                      </span>
                      {portfolioHealthParts.map((label) => {
                        const hs = HEALTH_STYLES[label];
                        return (
                          <span
                            key={label}
                            className={`inline-flex items-center gap-1 text-xs font-medium ${hs.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${hs.dot}`} />
                            {portfolioHealthCounts[label]} {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[#475569]">
                      Exposure
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8]" />
                      {eaInstances.filter((ea) => ea.symbol && ea.openTrades > 0).length} Active
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#334155]" />
                      {eaInstances.filter((ea) => ea.symbol && ea.openTrades === 0).length} Idle
                    </span>
                  </div>
                </div>
              </div>

              {/* Per-Symbol Breakdown */}
              {(() => {
                const symbolMap = new Map<
                  string,
                  { pnl: number; count: number; openTrades: number }
                >();
                const filtered = eaInstances.filter(
                  (ea) => ea.symbol && (modeFilter === "ALL" || ea.mode === modeFilter)
                );
                for (const ea of filtered) {
                  const sym = ea.symbol!;
                  const existing = symbolMap.get(sym) || { pnl: 0, count: 0, openTrades: 0 };
                  existing.pnl += ea.totalProfit;
                  existing.count += 1;
                  existing.openTrades += ea.openTrades;
                  symbolMap.set(sym, existing);
                }
                if (symbolMap.size < 2) return null;
                return (
                  <div className="rounded-lg border border-[#1E293B]/40 bg-[#0A0118]/40 p-4">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium mb-2">
                      Symbols
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {[...symbolMap.entries()]
                        .sort((a, b) => b[1].pnl - a[1].pnl)
                        .map(([sym, d]) => (
                          <span key={sym} className="text-[11px] tabular-nums">
                            <span className="text-[#818CF8] font-semibold">{sym}</span>{" "}
                            <span className={d.pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}>
                              {formatCurrency(d.pnl)}
                            </span>
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })()}

              {/* Paper P&L */}
              {eaInstances.some((ea) => ea.mode === "PAPER") && (
                <div className="rounded-lg border border-[#1E293B]/40 bg-[#0A0118]/40 p-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[#475569]">
                      Paper P&L
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${eaInstances.filter((ea) => ea.mode === "PAPER").reduce((sum, ea) => sum + ea.totalProfit, 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                    >
                      {formatCurrency(
                        eaInstances
                          .filter((ea) => ea.mode === "PAPER")
                          .reduce((sum, ea) => sum + ea.totalProfit, 0)
                      )}
                    </span>
                    <span className="text-[9px] text-[#475569]">tracked total</span>
                  </div>
                </div>
              )}
            </div>
          }
        >
          {/* ── Accounts tab content (default) ── */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortByPriority(
                groupByAccount(
                  modeFilter === "ALL"
                    ? eaInstances
                    : eaInstances.filter((ea) => ea.mode === modeFilter)
                )
              ).map((account) => (
                <div
                  key={account.key}
                  draggable
                  onDragStart={() => handleDragStart(account.key)}
                  onDragOver={(e) => handleDragOver(e, account.key)}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(account.key)}
                  className={`transition-opacity ${
                    draggedAccountKey === account.key ? "opacity-40" : ""
                  } ${dragOverAccountKey === account.key ? "ring-2 ring-[#4F46E5] rounded-lg" : ""}`}
                >
                  <AccountCard
                    account={account}
                    changedIds={changedIds}
                    onTogglePause={handleTogglePause}
                    onDelete={handleDelete}
                    onLinkBaseline={(id) => setLinkBaselineInstanceId(id)}
                    onUnlinkBaseline={handleUnlinkBaseline}
                    forceExpandId={scrollExpandId}
                  />
                </div>
              ))}
            </div>
            <TradingCalendar dailyPnl={dailyPnl} />
          </div>
        </MonitorTabs>
      ) : (
        /* ── Empty state ── */
        <div className="text-center py-16 rounded-xl border border-[#1E293B]/40 bg-[#0A0118]/40">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#4F46E5]"
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
          <h3 className="text-lg font-semibold text-white mb-2">No strategies connected yet</h3>
          <p className="text-sm text-[#64748B] mb-6 max-w-md mx-auto">
            Connect your MetaTrader 5 terminal to start monitoring your trading strategies in
            real-time.
          </p>
          <RegisterEADialog onSuccess={fetchUpdate} />
        </div>
      )}

      {/* ── Drawdown Alert Settings ── */}
      {eaInstances.length > 0 && (
        <div className="bg-[#0A0118]/40 border border-[#1E293B]/40 rounded-lg p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <svg
                className="w-4 h-4 text-[#F59E0B] flex-shrink-0"
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
              <span className="text-[11px] text-[#A1A1AA]">
                <span className="font-medium text-[#F59E0B]">Floating drawdown alert</span> (current
                balance-equity gap, all EAs)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#64748B]">Alert at</span>
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={globalDrawdownThreshold}
                onChange={(e) => setGlobalDrawdownThreshold(e.target.value)}
                className="w-16 px-2 py-1 text-xs text-white bg-[#09090B] border border-[#1E293B] rounded focus:outline-none focus:border-[#4F46E5] tabular-nums text-center"
              />
              <span className="text-[10px] text-[#64748B]">% floating DD</span>
              <button
                onClick={handleSaveGlobalDrawdown}
                className="px-3 py-1 text-[10px] font-medium bg-[#4F46E5] text-white rounded hover:bg-[#6366F1] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore onboarding guide link */}
      {showRestoreGuide && eaInstances.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              try {
                localStorage.removeItem("algostudio:onboarding-dismissed");
              } catch {}
              window.location.reload();
            }}
            className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors underline"
          >
            Show setup guide again
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {showAlertsModal && (
        <AlertsModal instances={eaInstances} onClose={() => setShowAlertsModal(false)} />
      )}

      {/* Link Baseline Dialog */}
      {linkBaselineInstanceId &&
        (() => {
          const inst = eaInstances.find((ea) => ea.id === linkBaselineInstanceId);
          const ctx: DeploymentContext | undefined = inst
            ? { symbol: inst.symbol, timeframe: inst.timeframe, eaName: inst.eaName }
            : undefined;
          return (
            <LinkBaselineDialog
              instanceId={linkBaselineInstanceId}
              instanceName={inst?.eaName ?? ""}
              isRelink={inst?.relinkRequired}
              deploymentContext={ctx}
              onLinkingStarted={() => setLinkingInstanceId(linkBaselineInstanceId)}
              isActivating={activatingInstanceId === linkBaselineInstanceId}
              onClose={() => {
                setLinkBaselineInstanceId(null);
                setLinkingInstanceId(null);
                setActivatingInstanceId(null);
              }}
              onLinked={async (instanceId, baseline) => {
                // Check if this is an auto-discovered DRAFT instance — activate after linking
                const inst = eaInstances.find((ea) => ea.id === instanceId);
                if (inst?.isAutoDiscovered) {
                  setActivatingInstanceId(instanceId);
                  try {
                    const res = await fetch(`/api/live/${instanceId}/lifecycle`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                      body: JSON.stringify({ action: "activate" }),
                    });
                    if (res.ok) {
                      setEaInstances((prev) =>
                        prev.map((ea) =>
                          ea.id === instanceId
                            ? {
                                ...ea,
                                baseline,
                                relinkRequired: false,
                                lifecycleState: "LIVE_MONITORING",
                                isAutoDiscovered: false,
                              }
                            : ea
                        )
                      );
                    } else {
                      // Activation failed — baseline is linked, lifecycle stays in DRAFT
                      setEaInstances((prev) =>
                        prev.map((ea) =>
                          ea.id === instanceId ? { ...ea, baseline, relinkRequired: false } : ea
                        )
                      );
                      showError(
                        "Activation incomplete",
                        "Baseline was linked successfully, but live monitoring activation did not complete. Refresh the page to retry."
                      );
                    }
                  } catch {
                    // Network error — baseline is linked, activation request was not delivered
                    setEaInstances((prev) =>
                      prev.map((ea) =>
                        ea.id === instanceId ? { ...ea, baseline, relinkRequired: false } : ea
                      )
                    );
                    showError(
                      "Activation incomplete",
                      "Baseline was linked successfully, but the activation request could not be sent. Check your connection and refresh."
                    );
                  } finally {
                    setActivatingInstanceId(null);
                  }
                } else {
                  setEaInstances((prev) =>
                    prev.map((ea) =>
                      ea.id === instanceId ? { ...ea, baseline, relinkRequired: false } : ea
                    )
                  );
                }
                setLinkingInstanceId(null);
                setLinkedSuccessBanner(true);
                if (linkedSuccessBannerTimerRef.current)
                  clearTimeout(linkedSuccessBannerTimerRef.current);
                linkedSuccessBannerTimerRef.current = setTimeout(
                  () => setLinkedSuccessBanner(false),
                  5000
                );
                setLinkBaselineInstanceId(null);
              }}
            />
          );
        })()}
    </div>
  );
}
