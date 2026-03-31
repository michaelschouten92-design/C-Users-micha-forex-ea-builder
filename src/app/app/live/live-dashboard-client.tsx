"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
import { PortfolioSummaryStrip } from "./components/portfolio-summary-strip";
import { TradingCalendar } from "./components/trading-calendar";
import { EquityCurveChart } from "./components/equity-curve-chart";
import { ConnectionIndicator } from "./components/connection-indicator";
import { OpenTradesPanel } from "./components/open-trades-panel";
import { AlertsModal } from "./components/alerts-modal";
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
} from "./components/utils";

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveDashboardClient({
  initialData,
  tier,
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
  const [linkingInstanceId, setLinkingInstanceId] = useState<string | null>(null);
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
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showRestoreGuide] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("algostudio:onboarding-dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [globalDrawdownThreshold, setGlobalDrawdownThreshold] = useState("10");
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

      {/* ── System Status Zone ── */}
      {eaInstances.length > 0 &&
        (() => {
          let healthy = 0;
          let attentionCount = 0;
          let monitoring = 0;
          let paused = 0;

          for (const ea of eaInstances) {
            if (ea.tradingState === "PAUSED") {
              paused++;
              continue;
            }
            const att = resolveInstanceAttention(ea, formatMonitoringReasons);
            if (!att) {
              healthy++;
            } else if (att.statusLabel === "Waiting for data") {
              monitoring++;
            } else {
              attentionCount++;
            }
          }

          const total = healthy + attentionCount + monitoring + paused;
          const allHealthy = attentionCount === 0 && paused === 0 && monitoring === 0;

          // Build action-required items
          const actionItems = eaInstances
            .filter((ea) => !isAccountContainer(ea) && !dismissedAlerts.has(ea.id))
            .map((ea) => {
              const att = resolveInstanceAttention(ea, formatMonitoringReasons);
              if (!att) return null;
              const identity = [ea.symbol, ea.timeframe].filter(Boolean).join(" · ") || ea.eaName;
              const isBaselineAction =
                att.statusLabel === "Baseline suspended" ||
                att.statusLabel === "No baseline linked";
              return {
                id: ea.id,
                identity,
                ...att,
                onClick: isBaselineAction
                  ? () => setLinkBaselineInstanceId(ea.id)
                  : () => {
                      const cardId = ea.parentInstanceId || ea.id;
                      if (ea.parentInstanceId) setScrollExpandId(ea.id);
                      document
                        .getElementById(`account-card-${cardId}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    },
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

          // Group action items
          const groups = new Map<
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
            const existing = groups.get(groupKey);
            if (existing) {
              existing.members.push(item);
            } else {
              groups.set(groupKey, {
                statusLabel: item.statusLabel,
                reason: item.reason,
                actionLabel: item.actionLabel,
                color: item.color,
                members: [item],
              });
            }
          }

          const ALERT_PRIORITY: Record<string, number> = {
            "Edge at risk": 0,
            Unstable: 1,
            "Connection error": 2,
            "Baseline suspended": 3,
            "Waiting for data": 4,
            "No baseline linked": 5,
          };
          const sortedGroups = [...groups.values()].sort(
            (a, b) => (ALERT_PRIORITY[a.statusLabel] ?? 9) - (ALERT_PRIORITY[b.statusLabel] ?? 9)
          );

          const hasRed = actionItems.some((i) => i.color === "#EF4444");
          const alertBorderColor = hasRed ? "#EF4444" : "#F59E0B";

          return (
            <div className="sticky top-0 z-20 py-2.5 px-3 border-b border-[#1E293B]/40 bg-[#0A0118]/98 backdrop-blur-sm rounded-lg">
              {/* System pulse header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    {allHealthy && (
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
                        style={{ backgroundColor: "#10B981" }}
                      />
                    )}
                    <span
                      className="relative inline-flex rounded-full h-2.5 w-2.5"
                      style={{
                        backgroundColor: allHealthy
                          ? "#10B981"
                          : hasRed
                            ? "#EF4444"
                            : attentionCount > 0
                              ? "#F59E0B"
                              : "#A78BFA",
                      }}
                    />
                  </span>
                  <p className="text-sm font-semibold text-[#CBD5E1]">
                    {allHealthy
                      ? "All systems nominal"
                      : attentionCount > 0
                        ? `${attentionCount} ${attentionCount === 1 ? "instance" : "instances"} need attention`
                        : monitoring > 0
                          ? "Collecting baseline data"
                          : paused > 0
                            ? "Trading paused"
                            : "System monitoring active"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {connectionStatus === "connected" && (
                    <span className="flex items-center gap-1.5 text-[10px] text-[#10B981]/70 font-medium">
                      <span className="relative flex h-1 w-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-50" />
                        <span className="relative inline-flex rounded-full h-1 w-1 bg-[#10B981]" />
                      </span>
                      Telemetry active
                    </span>
                  )}
                  <p className="text-[10px] text-[#475569]">
                    {total} instance{total !== 1 ? "s" : ""} monitored
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Two-Column Control Zone ── */}
      {eaInstances.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* LEFT: Operations */}
          <div className="lg:col-span-3 space-y-4 rounded-lg bg-[#0A0118]/40 border border-[#1E293B]/40 p-4">
            <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium">
              Portfolio Overview
            </p>
            {/* Portfolio Summary Strip */}
            <PortfolioSummaryStrip instances={eaInstances} dailyPnl={dailyPnl} />

            {/* Equity Curve */}
            <EquityCurveChart dailyPnl={dailyPnl} />

            {/* Trading Calendar */}
            <TradingCalendar dailyPnl={dailyPnl} />
            {/* Open Positions detail panel */}
            <OpenTradesPanel instances={eaInstances} />
            {/* Secondary reading: Paper P&L (only when paper instances exist) */}
            {eaInstances.some((ea) => ea.mode === "PAPER") && (
              <div className="flex items-baseline gap-2 px-1">
                <span className="text-[9px] uppercase tracking-[0.15em] text-[#475569]">
                  Paper P&L
                </span>
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    eaInstances
                      .filter((ea) => ea.mode === "PAPER")
                      .reduce((sum, ea) => sum + ea.totalProfit, 0) >= 0
                      ? "text-[#10B981]"
                      : "text-[#EF4444]"
                  }`}
                >
                  {formatCurrency(
                    eaInstances
                      .filter((ea) => ea.mode === "PAPER")
                      .reduce((sum, ea) => sum + ea.totalProfit, 0)
                  )}
                </span>
                <span className="text-[9px] text-[#475569]">tracked total</span>
              </div>
            )}

            {/* Secondary: health + exposure */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2 rounded-md bg-white/[0.015] border border-[#1E293B]/25">
              {/* Strategy Health */}
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
              {/* Exposure */}
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
              if (symbolMap.size <= 1) return null;
              const entries = Array.from(symbolMap.entries()).sort(
                (a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl)
              );
              return (
                <div className="px-3 py-2 rounded-md bg-white/[0.015] border border-[#1E293B]/25">
                  <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] mb-1.5">
                    Symbols
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {entries.map(([sym, data]) => (
                      <span
                        key={sym}
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono"
                      >
                        <span className="font-medium text-[#94A3B8]">{sym}</span>
                        <span
                          className={`font-semibold tabular-nums ${data.pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                        >
                          {formatCurrency(data.pnl)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* RIGHT: Monitoring */}
          <div className="lg:col-span-2 space-y-4 rounded-lg bg-[#0A0118]/40 border border-[#1E293B]/40 p-4">
            <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium">
              Monitoring
            </p>
            {(() => {
              const actionItems = eaInstances
                .filter((ea) => !isAccountContainer(ea) && !dismissedAlerts.has(ea.id))
                .map((ea) => {
                  const att = resolveInstanceAttention(ea, formatMonitoringReasons);
                  if (!att) return null;
                  const identity =
                    [ea.symbol, ea.timeframe].filter(Boolean).join(" · ") || ea.eaName;
                  const isBaselineAction =
                    att.statusLabel === "Baseline suspended" ||
                    att.statusLabel === "No baseline linked";
                  return {
                    id: ea.id,
                    identity,
                    ...att,
                    onClick: isBaselineAction
                      ? () => setLinkBaselineInstanceId(ea.id)
                      : () => {
                          const cardId = ea.parentInstanceId || ea.id;
                          if (ea.parentInstanceId) setScrollExpandId(ea.id);
                          document
                            .getElementById(`account-card-${cardId}`)
                            ?.scrollIntoView({ behavior: "smooth", block: "center" });
                        },
                  };
                })
                .filter((item): item is NonNullable<typeof item> => item !== null);

              if (actionItems.length === 0) return null;

              // Group action items
              const groups = new Map<
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
                const existing = groups.get(groupKey);
                if (existing) {
                  existing.members.push(item);
                } else {
                  groups.set(groupKey, {
                    statusLabel: item.statusLabel,
                    reason: item.reason,
                    actionLabel: item.actionLabel,
                    color: item.color,
                    members: [item],
                  });
                }
              }

              const ALERT_PRIORITY: Record<string, number> = {
                "Edge at risk": 0,
                Unstable: 1,
                "Connection error": 2,
                "Baseline suspended": 3,
                "Waiting for data": 4,
                "No baseline linked": 5,
              };
              const sortedGroups = [...groups.values()].sort(
                (a, b) =>
                  (ALERT_PRIORITY[a.statusLabel] ?? 9) - (ALERT_PRIORITY[b.statusLabel] ?? 9)
              );

              const hasRed = actionItems.some((i) => i.color === "#EF4444");
              const alertBorderColor = hasRed ? "#EF4444" : "#F59E0B";

              return (
                <div
                  className="rounded-md px-3 py-3"
                  style={{
                    borderColor: `${alertBorderColor}20`,
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: `${alertBorderColor}05`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-2 w-2">
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
                        style={{ backgroundColor: alertBorderColor }}
                      />
                      <span
                        className="relative inline-flex rounded-full h-2 w-2"
                        style={{ backgroundColor: alertBorderColor }}
                      />
                    </span>
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium">
                      Alerts
                    </p>
                    <span
                      className="text-[10px] font-semibold tabular-nums"
                      style={{ color: alertBorderColor }}
                    >
                      {actionItems.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {sortedGroups.map((group) => (
                      <div
                        key={group.statusLabel}
                        className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 bg-white/[0.02]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-semibold" style={{ color: group.color }}>
                              {group.statusLabel}
                            </p>
                            <span className="text-[10px] text-[#475569]">
                              ({group.members.length})
                            </span>
                            <span className="text-[10px] text-[#475569]">—</span>
                            <span className="text-[10px] text-[#64748B] truncate">
                              {group.reason}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {group.members.map((m) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1.5 text-[9px] text-[#94A3B8] bg-white/[0.04] px-1.5 py-0.5 rounded"
                              >
                                {m.identity}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    m.onClick();
                                  }}
                                  disabled={
                                    linkingInstanceId === m.id || activatingInstanceId === m.id
                                  }
                                  className="text-[9px] font-medium transition-colors hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ color: group.color }}
                                >
                                  {activatingInstanceId === m.id
                                    ? "Activating..."
                                    : linkingInstanceId === m.id
                                      ? "Linking..."
                                      : group.actionLabel}
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setDismissedAlerts(
                                (prev) => new Set([...prev, ...group.members.map((m) => m.id)])
                              )
                            }
                            className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors p-0.5"
                            title="Dismiss"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {(() => {
              let healthy = 0;
              let attentionCount = 0;
              let monitoring = 0;
              let paused = 0;
              for (const ea of eaInstances) {
                if (ea.tradingState === "PAUSED") {
                  paused++;
                  continue;
                }
                const att = resolveInstanceAttention(ea, formatMonitoringReasons);
                if (!att) {
                  healthy++;
                } else if (att.statusLabel === "Waiting for data") {
                  monitoring++;
                } else {
                  attentionCount++;
                }
              }
              return (
                <div className="rounded-md border border-[#1E293B]/25 bg-white/[0.015] px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium mb-2">
                    Health
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Healthy", count: healthy, color: "#10B981" },
                      { label: "Attention", count: attentionCount, color: "#F59E0B" },
                      { label: "Collecting", count: monitoring, color: "#A78BFA" },
                      { label: "Paused", count: paused, color: "#64748B" },
                    ].map((c) => (
                      <div key={c.label} className="text-center">
                        <p
                          className="text-lg font-bold font-mono tabular-nums leading-none"
                          style={{ color: c.count > 0 ? c.color : "#27272A" }}
                        >
                          {c.count}
                        </p>
                        <p className="text-[8px] uppercase tracking-wider text-[#525B6B] mt-1">
                          {c.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Baseline linked success banner */}
      {linkedSuccessBanner && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 text-xs text-[#10B981] font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
          Baseline linked successfully
        </div>
      )}

      {/* EA Cards Grid */}
      {eaInstances.length === 0 ? (
        <div className="bg-[#0A0118]/40 border border-[#1E293B]/40 rounded-lg p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1E293B] flex items-center justify-center">
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
          <h3 className="text-lg font-semibold text-white mb-2">No live EAs running</h3>
          <div className="text-sm text-[#94A3B8] max-w-md mx-auto mb-6 space-y-2 text-left">
            <p className="flex gap-2">
              <span className="text-[#818CF8] font-semibold shrink-0">1.</span>
              Export your strategy as an EA from the project builder
            </p>
            <p className="flex gap-2">
              <span className="text-[#818CF8] font-semibold shrink-0">2.</span>
              Download the AlgoStudio Monitor EA and add it to MT5
            </p>
            <p className="flex gap-2">
              <span className="text-[#818CF8] font-semibold shrink-0">3.</span>
              Your live strategies will appear here with real-time tracking
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-md hover:bg-[#4338CA] transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="rounded-lg bg-[#0A0118]/40 border border-[#1E293B]/40 p-4">
          <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium mb-4">
            Strategy Monitor
          </p>
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
                className={`transition-all ${draggedAccountKey === account.key ? "opacity-40" : ""} ${dragOverAccountKey === account.key ? "ring-2 ring-[#4F46E5] rounded-xl" : ""}`}
                style={{ cursor: "grab" }}
              >
                <AccountCard
                  account={account}
                  changedIds={changedIds}
                  onTogglePause={handleTogglePause}
                  onDelete={handleDelete}
                  onLinkBaseline={setLinkBaselineInstanceId}
                  onUnlinkBaseline={handleUnlinkBaseline}
                  forceExpandId={scrollExpandId}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings — drawdown alert (secondary, below accounts) */}
      {eaInstances.length > 0 && (
        <div className="bg-[#0A0118]/40 border border-[#1E293B]/40 rounded-lg p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <svg
                className="w-4 h-4 text-[#F59E0B] shrink-0"
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
              <p className="text-xs text-[#CBD5E1]">
                Floating drawdown alert (current balance-equity gap, all EAs)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#7C8DB0]">Alert at</span>
              <input
                type="number"
                value={globalDrawdownThreshold}
                onChange={(e) => setGlobalDrawdownThreshold(e.target.value)}
                min="0.1"
                max="100"
                step="0.1"
                className="w-20 rounded-md bg-[#0A0118] border border-[#1E293B] text-[#CBD5E1] px-2 py-1 text-xs text-center focus:outline-none focus:border-[#334155]"
              />
              <span className="text-xs text-[#7C8DB0]">% floating DD</span>
              <button
                onClick={handleSaveGlobalDrawdown}
                className="px-3 py-1 rounded-md text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore onboarding guide */}
      {eaInstances.length > 0 && showRestoreGuide && (
        <button
          onClick={() => {
            try {
              localStorage.removeItem("algostudio:onboarding-dismissed");
            } catch {
              /* private browsing */
            }
            window.location.reload();
          }}
          className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors"
        >
          Show setup guide again
        </button>
      )}

      {/* Alerts Modal */}
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
