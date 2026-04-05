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
import { AccountTile } from "./components/account-tile";
import { ActivityFeed, type FeedItem } from "./components/activity-feed";
import { StatCard } from "./components/stat-card";
import { AlertsModal } from "./components/alerts-modal";
import { AlertsSidebar } from "./components/alerts-sidebar";
import type { EAInstanceData, LiveDashboardClientProps } from "./components/types";
import {
  formatCurrency,
  formatPnl,
  formatRelativeTime,
  resolveInstanceAttention,
  groupByAccount,
  sortByPriority,
} from "./components/utils";

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveDashboardClient({
  initialData,
  initialRelinkInstanceId,
}: LiveDashboardClientProps) {
  const [eaInstances, setEaInstances] = useState<EAInstanceData[]>(initialData);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const [modeFilter, setModeFilter] = useState<"ALL" | "LIVE" | "PAPER">("ALL");
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const registerDialogRef = useRef<HTMLButtonElement>(null);
  const [scrollExpandId, setScrollExpandId] = useState<string | null>(null);
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);
  const [liveFeedItems, setLiveFeedItems] = useState<FeedItem[]>([]);
  const [draggedAccountKey, setDraggedAccountKey] = useState<string | null>(null);
  const [dragOverAccountKey, setDragOverAccountKey] = useState<string | null>(null);
  const [linkBaselineInstanceId, setLinkBaselineInstanceId] = useState<string | null>(() => {
    // Auto-open LinkBaselineDialog from ?relink= query param
    if (initialRelinkInstanceId && initialData.some((ea) => ea.id === initialRelinkInstanceId)) {
      return initialRelinkInstanceId;
    }
    return null;
  });
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
  // tabs removed — accounts are always visible
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

    // Merge polling data with existing static data (baseline, edgeScore, etc.)
    const mergedInstances = newInstances.map((ea) => {
      const prev = previousMap.get(ea.id);
      if (!prev) return ea;
      return {
        ...prev,
        ...ea,
        // Preserve static fields that polling doesn't include
        baseline: ea.baseline ?? prev.baseline,
        edgeScore: ea.edgeScore ?? prev.edgeScore,
        trackRecordToken: ea.trackRecordToken ?? prev.trackRecordToken,
        trades: ea.trades.length > 0 ? ea.trades : prev.trades,
      };
    });

    const newMap = new Map<string, EAInstanceData>();
    mergedInstances.forEach((ea) => newMap.set(ea.id, ea));
    previousDataRef.current = newMap;

    setEaInstances(mergedInstances);
    setChangedIds(changed);

    if (changed.size > 0) {
      if (changedTimeoutRef.current) clearTimeout(changedTimeoutRef.current);
      changedTimeoutRef.current = setTimeout(() => setChangedIds(new Set()), 2000);
    }
  }, []);

  // SSE live stream with polling fallback
  const { status: connectionStatus, lastUpdated } = useLiveStream({
    onInit: (data) => {
      // SSE sends empty init to signal connection ready; only update if data is present
      const arr = data as EAInstanceData[];
      if (arr.length > 0) processUpdate(arr);
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
      const ea = previousDataRef.current.get(trade.instanceId);
      if (soundAlertsRef.current) {
        showInfo(`New trade on ${ea?.eaName ?? "EA"}`, `P/L: $${trade.profit.toFixed(2)}`);
      }
      // Add to live activity feed
      setLiveFeedItems((prev) =>
        [
          {
            id: trade.ticket ?? `${trade.instanceId}-${Date.now()}`,
            symbol: trade.symbol ?? "UNKNOWN",
            type: trade.type ?? "BUY",
            profit: trade.profit,
            lots: trade.lots,
            eaName: ea?.eaName ?? "EA",
            closeTime: trade.closeTime,
            isNew: true,
          },
          ...prev,
        ].slice(0, 20)
      );
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
    pollingInterval: 30000,
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

  function handleKeyboardReorder(e: React.KeyboardEvent, accountKey: string) {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();

    const sorted = sortByPriority(groupByAccount(eaInstances));
    const fromIdx = sorted.findIndex((g) => g.key === accountKey);
    if (fromIdx < 0) return;

    const toIdx = e.key === "ArrowUp" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= sorted.length) return;

    // Reuse the same reorder logic as drag-drop
    const targetKey = sorted[toIdx].key;
    setDraggedAccountKey(accountKey);
    handleDrop(targetKey);
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

  // ── Hoisted metrics ──
  const containers = eaInstances.filter(isAccountContainer);
  const metricsSource =
    containers.length > 0 ? containers : eaInstances.filter((ea) => ea.mode === "LIVE");

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
  // ── New dashboard stats ──
  const filteredInstances =
    modeFilter === "ALL" ? eaInstances : eaInstances.filter((ea) => ea.mode === modeFilter);
  const accountGroups = sortByPriority(groupByAccount(filteredInstances));
  const totalAccounts = accountGroups.length;
  const totalStrategies = filteredInstances.filter((ea) => ea.symbol !== null).length;
  const totalOpenTrades = metricsSource.reduce((sum, ea) => sum + ea.openTrades, 0);

  // ── Portfolio totals (split by mode) ──
  // Live: from containers (account-wide aggregates) which only include mode=LIVE
  const liveBalance = metricsSource.reduce((sum, ea) => sum + (ea.balance ?? 0), 0);
  const liveEquity = metricsSource.reduce((sum, ea) => sum + (ea.equity ?? 0), 0);
  const totalFloatingPnl = liveEquity - liveBalance;
  // Paper: from paper account primaries (not containers since isAccountContainer checks mode=LIVE)
  const paperPrimaries = eaInstances.filter(
    (ea) => ea.mode === "PAPER" && !ea.parentInstanceId && !ea.symbol
  );
  // Fallback: if no paper primaries, sum all paper instances without parents
  const paperBalance =
    paperPrimaries.length > 0
      ? paperPrimaries.reduce((sum, ea) => sum + (ea.balance ?? 0), 0)
      : eaInstances
          .filter((ea) => ea.mode === "PAPER" && !ea.parentInstanceId)
          .reduce((sum, ea) => sum + (ea.balance ?? 0), 0);

  // ── Activity feed: merge live SSE trades with recent historical trades ──
  const feedItems: FeedItem[] = (() => {
    const liveIds = new Set(liveFeedItems.map((f) => f.id));
    const historical: FeedItem[] = [];
    for (const ea of eaInstances) {
      for (const t of ea.trades ?? []) {
        const id = t.ticket ?? `${ea.id}-${t.closeTime ?? t.profit}`;
        if (liveIds.has(id)) continue;
        historical.push({
          id,
          symbol: t.symbol ?? "UNKNOWN",
          type: t.type ?? (t.profit >= 0 ? "BUY" : "SELL"),
          profit: t.profit,
          lots: t.lots,
          eaName: ea.eaName,
          closeTime: t.closeTime,
        });
      }
    }
    historical.sort((a, b) => {
      if (a.closeTime && b.closeTime)
        return new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime();
      if (a.closeTime) return -1;
      if (b.closeTime) return 1;
      return 0;
    });
    return [...liveFeedItems, ...historical].slice(0, 15);
  })();

  // Sidebar content (shared between desktop and mobile render)
  const sidebarContent = (
    <>
      <AlertsSidebar
        alertGroups={sortedAlertGroups}
        totalCount={actionItems.length}
        onDismiss={(id) => setDismissedAlerts((prev) => new Set([...prev, id]))}
        onConfigureAlerts={() => setShowAlertsModal(true)}
      />
    </>
  );

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* ═══ MAIN CONTENT ═══ */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* ── Stat Cards Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Live Balance"
              value={formatCurrency(liveBalance)}
              accentColor="#10B981"
              subValue={
                paperBalance > 0
                  ? `Paper: ${formatCurrency(paperBalance)}`
                  : `Equity: ${formatCurrency(liveEquity)}`
              }
              subColor="#64748B"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Floating P&L"
              value={formatPnl(totalFloatingPnl)}
              accentColor={totalFloatingPnl >= 0 ? "#10B981" : "#EF4444"}
              subValue={`${totalOpenTrades} open positions`}
              subColor="#818CF8"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              }
            />
            <StatCard
              label="Strategies"
              value={totalStrategies}
              accentColor="#A78BFA"
              subValue={`across ${totalAccounts} accounts`}
              subColor="#64748B"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Connection"
              value={
                connectionStatus === "connected"
                  ? "Live"
                  : connectionStatus === "fallback-polling"
                    ? "Delayed"
                    : "Offline"
              }
              accentColor={
                connectionStatus === "connected"
                  ? "#10B981"
                  : connectionStatus === "fallback-polling"
                    ? "#F59E0B"
                    : "#EF4444"
              }
              subValue={
                lastUpdated
                  ? `Updated ${Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago`
                  : undefined
              }
              subColor="#64748B"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              }
              actionLabel="Connect Account"
              onAction={() => registerDialogRef.current?.click()}
            />
          </div>

          {/* ── Connection warning (only for disconnected — polling is shown inline) ── */}
          {connectionStatus === "disconnected" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 text-[10px] text-[#EF4444]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] flex-shrink-0" />
              Connection lost. Reconnecting...
            </div>
          )}

          {/* ── Controls bar ── */}
          <div className="flex flex-wrap items-center gap-2.5 px-1">
            <div className="flex items-center rounded-full bg-[#0A0118]/60 border border-[#1E293B]/30 p-0.5">
              {(["ALL", "LIVE", "PAPER"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setModeFilter(mode)}
                  aria-label={`Filter: ${mode === "ALL" ? "All modes" : mode === "LIVE" ? "Live only" : "Paper only"}`}
                  aria-pressed={modeFilter === mode}
                  className={`px-2.5 py-1 text-[10px] font-medium transition-colors rounded-full ${
                    modeFilter === mode
                      ? mode === "PAPER"
                        ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                        : "bg-white/10 text-white"
                      : "text-[#64748B] hover:text-[#94A3B8]"
                  }`}
                >
                  {mode === "ALL" ? "All" : mode === "LIVE" ? "Live" : "Paper"}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSoundAlerts(!soundAlerts)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                soundAlerts ? "text-[#F59E0B]" : "text-[#64748B] hover:text-[#94A3B8]"
              }`}
              title={soundAlerts ? "Notifications on" : "Notifications off"}
              aria-label={soundAlerts ? "Disable notifications" : "Enable notifications"}
              aria-pressed={soundAlerts}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            </button>

            <div className="ml-auto flex items-center gap-2">
              {connectionStatus === "fallback-polling" && (
                <span className="flex items-center gap-1.5 text-[10px] text-[#F59E0B]">
                  <span className="w-1 h-1 rounded-full bg-[#F59E0B] animate-pulse" />
                  Delayed updates
                </span>
              )}
              {accountGroups.length >= 2 && (
                <Link
                  href="/app/compare"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#CBD5E1] hover:text-white border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] rounded-md transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                    />
                  </svg>
                  Compare Accounts
                </Link>
              )}
              <RegisterEADialog onSuccess={fetchUpdate} triggerRef={registerDialogRef} />
            </div>
          </div>

          {/* Success Banner */}
          {linkedSuccessBanner && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-xs font-medium">
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

          {/* ── Account Cards ── */}
          {eaInstances.length > 0 ? (
            <div className="space-y-3">
              <div
                role="list"
                aria-label="Trading accounts — Alt+Arrow Up/Down to reorder"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
              >
                {accountGroups.map((account) => (
                  <div
                    key={account.key}
                    draggable
                    tabIndex={0}
                    role="listitem"
                    aria-label={`${account.primary.eaName ?? account.broker ?? "Account"} — Alt+Arrow to reorder`}
                    onDragStart={() => handleDragStart(account.key)}
                    onDragOver={(e) => handleDragOver(e, account.key)}
                    onDragEnd={handleDragEnd}
                    onDrop={() => handleDrop(account.key)}
                    onKeyDown={(e) => handleKeyboardReorder(e, account.key)}
                    className={`transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] focus-visible:rounded-lg ${
                      draggedAccountKey === account.key ? "opacity-40" : ""
                    } ${dragOverAccountKey === account.key ? "ring-2 ring-[#4F46E5] rounded-lg" : ""}`}
                  >
                    <AccountTile
                      account={account}
                      isSelected={selectedAccountKey === account.key}
                      onClick={() =>
                        setSelectedAccountKey((prev) => (prev === account.key ? null : account.key))
                      }
                      changedIds={changedIds}
                    />
                  </div>
                ))}
              </div>

              {/* Detail panel — below grid when account selected */}
              {selectedAccountKey &&
                (() => {
                  const sel = accountGroups.find((a) => a.key === selectedAccountKey);
                  if (!sel) return null;
                  return (
                    <AccountCard
                      account={sel}
                      changedIds={changedIds}
                      onTogglePause={handleTogglePause}
                      onDelete={handleDelete}
                      onLinkBaseline={(id) => setLinkBaselineInstanceId(id)}
                      onUnlinkBaseline={handleUnlinkBaseline}
                      forceExpandId={scrollExpandId}
                    />
                  );
                })()}
            </div>
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

          {/* Activity feed — below accounts */}
          {eaInstances.length > 0 && feedItems.length > 0 && (
            <div className="rounded-lg bg-[#0A0118]/40 border border-[#1E293B]/30 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#1E293B]/20">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Recent Trades
                  </span>
                  {liveFeedItems.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  )}
                </div>
              </div>
              <ActivityFeed items={feedItems} />
            </div>
          )}
        </div>

        {/* ═══ SIDEBAR (desktop) ═══ */}
        {eaInstances.length > 0 && (
          <aside className="hidden lg:flex lg:flex-col w-72 xl:w-80 flex-shrink-0 self-start sticky top-4 max-h-[calc(100vh-6rem)]">
            {sidebarContent}
          </aside>
        )}
      </div>

      {/* ═══ SIDEBAR (mobile: stacked below) ═══ */}
      {eaInstances.length > 0 && <div className="lg:hidden space-y-3 mt-3">{sidebarContent}</div>}

      {/* ── Modals ── */}
      {showAlertsModal && (
        <AlertsModal instances={eaInstances} onClose={() => setShowAlertsModal(false)} />
      )}

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
              onLinkingStarted={() => {}}
              isActivating={activatingInstanceId === linkBaselineInstanceId}
              onClose={() => {
                setLinkBaselineInstanceId(null);

                setActivatingInstanceId(null);
              }}
              onLinked={async (instanceId, baseline) => {
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
