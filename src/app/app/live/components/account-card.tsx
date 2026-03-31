"use client";

import { useState } from "react";
import { showSuccess, showError } from "@/lib/toast";
import { getCsrfHeaders } from "@/lib/api-client";
import { isAccountContainer } from "@/lib/live/live-instance-dto";
import { StatusBadge } from "./status-badge";
import { InvestigationPanel } from "./investigation-panel";
import type { EAInstanceData, AccountGroup, StrategyHealthLabel } from "./types";
import {
  formatCurrency,
  formatRelativeTime,
  calculateWinRate,
  calculateProfitFactor,
  deriveStrategyHealth,
  HEALTH_STYLES,
  compareInstances,
} from "./utils";

export function AccountCard({
  account,
  changedIds,
  onTogglePause,
  onDelete,
  onLinkBaseline,
  onUnlinkBaseline,
  forceExpandId,
}: {
  account: AccountGroup;
  changedIds: Set<string>;
  onTogglePause: (instanceId: string, tradingState: "TRADING" | "PAUSED") => void;
  onDelete: (instanceId: string) => void;
  onLinkBaseline: (instanceId: string) => void;
  onUnlinkBaseline: (instanceId: string) => void;
  forceExpandId?: string | null;
}) {
  const { primary, instances } = account;
  const shouldForceExpand =
    forceExpandId != null &&
    (forceExpandId === primary.id || instances.some((ea) => ea.id === forceExpandId));
  const hasRiskyStrategy = instances.some((ea) => {
    const h = deriveStrategyHealth(ea);
    return h === "Edge at Risk" || h === "Elevated";
  });
  const [manualExpanded, setExpanded] = useState(hasRiskyStrategy);
  const expanded = manualExpanded || shouldForceExpand;
  const [expandedStrategyKey, setExpandedStrategyKey] = useState<string | null>(null);
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [rotateLoading, setRotateLoading] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trackRecordToken, setTrackRecordToken] = useState<string | null>(
    primary.trackRecordToken ?? null
  );
  const [trackRecordLoading, setTrackRecordLoading] = useState(false);
  const [trackRecordCopied, setTrackRecordCopied] = useState(false);

  // Account-level metrics: use primary (account-wide if available), else aggregate
  const isAccountWide = primary.symbol === null;
  const balance = isAccountWide
    ? primary.balance
    : instances.reduce((sum, ea) => sum + (ea.balance ?? 0), 0) || null;
  const equity = isAccountWide
    ? primary.equity
    : instances.reduce((sum, ea) => sum + (ea.equity ?? 0), 0) || null;
  const totalProfit = isAccountWide
    ? primary.totalProfit
    : instances.reduce((sum, ea) => sum + ea.totalProfit, 0);
  const totalTrades = isAccountWide
    ? primary.totalTrades
    : instances.reduce((sum, ea) => sum + ea.totalTrades, 0);
  const openTrades = isAccountWide
    ? primary.openTrades
    : instances.reduce((sum, ea) => sum + ea.openTrades, 0);

  const allHeartbeats = isAccountWide
    ? primary.heartbeats
    : instances.flatMap((ea) => ea.heartbeats ?? []);
  // Always aggregate trades from all instances so manifest context instance trades
  // (Milestone C) are included alongside account-wide trades.
  const allTrades = instances.flatMap((ea) => ea.trades ?? []);
  const winRate = calculateWinRate(allTrades);
  const profitFactor = calculateProfitFactor(allTrades);
  // Count strategies flagged as Edge at Risk (lifecycle or health DEGRADED).
  const edgeAtRiskCount = instances.filter(
    (ea) => ea.lifecycleState === "EDGE_AT_RISK" || ea.healthStatus === "DEGRADED"
  ).length;
  // Group trades by symbol + magicNumber to identify unique strategies.
  // Also includes manifest context instances as rows even before any trades exist.
  const strategyGroups = (() => {
    const map = new Map<
      string,
      {
        symbol: string;
        magicNumber: number | null;
        trades: typeof allTrades;
        instanceId: string | null;
      }
    >();
    // Normalize broker suffixes: "EURUSD.r" → "EURUSD", "EURUSDm" → "EURUSD"
    const normSym = (s: string) => s.replace(/[.\-_].*$/, "").toUpperCase();
    for (const t of allTrades) {
      const key = `${t.symbol}|${t.magicNumber ?? "none"}`;
      const existing = map.get(key);
      if (existing) {
        existing.trades.push(t);
      } else {
        // Match trade to owning instance (with broker-suffix normalization)
        const tradeSym = normSym(t.symbol ?? "");
        const inst = instances.find(
          (ea) =>
            (ea.symbol && normSym(ea.symbol) === tradeSym) ||
            ea.deployments?.some((d) => normSym(d.symbol) === tradeSym)
        );
        map.set(key, {
          symbol: t.symbol ?? "UNKNOWN",
          magicNumber: t.magicNumber ?? null,
          trades: [t],
          instanceId: inst?.id ?? null,
        });
      }
    }
    // Manifest/auto-discovered mode: add context instances (non-primary, with symbol set)
    // as strategy rows so strategies appear immediately after the first heartbeat, before
    // any trades. Resolve magicNumber from the instance's deployment if available.
    for (const ctx of instances) {
      if (ctx.id === primary.id || !ctx.symbol) continue;
      const key = `ctx:${ctx.id}`;
      if (!map.has(key)) {
        const dep = ctx.deployments?.find((d) => normSym(d.symbol) === normSym(ctx.symbol!));
        map.set(key, {
          symbol: ctx.symbol,
          magicNumber: dep?.magicNumber ?? null,
          trades: [],
          instanceId: ctx.id,
        });
      }
    }
    return Array.from(map.entries())
      .sort(([keyA, a], [keyB, b]) => {
        // Match strategy group to its owning instance for priority sorting
        const matchInstance = (k: string): EAInstanceData | undefined => {
          if (k.startsWith("ctx:")) return instances.find((ea) => ea.id === k.slice(4));
          const [sym] = k.split("|");
          const normKey = normSym(sym ?? "");
          return instances.find(
            (ea) =>
              (ea.symbol && normSym(ea.symbol) === normKey) ||
              ea.deployments?.some((d) => normSym(d.symbol) === normKey)
          );
        };
        const instA = matchInstance(keyA);
        const instB = matchInstance(keyB);
        if (instA && instB) {
          const cmp = compareInstances(instA, instB);
          if (cmp !== 0) return cmp;
        }
        // Fallback: PnL magnitude for rows without a matching instance
        const pnlA = a.trades.reduce((s, t) => s + t.profit, 0);
        const pnlB = b.trades.reduce((s, t) => s + t.profit, 0);
        return Math.abs(pnlB) - Math.abs(pnlA);
      })
      .map(([, v]) => v);
  })();

  const statusChanged = instances.some((ea) => changedIds.has(ea.id));
  const onlineCount = instances.filter((ea) => ea.status === "ONLINE").length;
  const accountStatus: "ONLINE" | "OFFLINE" | "ERROR" =
    onlineCount > 0
      ? "ONLINE"
      : instances.some((ea) => ea.status === "ERROR")
        ? "ERROR"
        : "OFFLINE";

  // Account-level pause/halt
  const allPaused = instances.every((ea) => ea.tradingState === "PAUSED");
  const anyHalted = instances.some((ea) => (ea.operatorHold ?? "NONE") !== "NONE");
  const [pauseLoading, setPauseLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleAccountPause() {
    setPauseLoading(true);
    const target = allPaused ? "TRADING" : "PAUSED";
    for (const ea of instances) {
      await onTogglePause(ea.id, target);
    }
    setPauseLoading(false);
  }

  async function handleAccountDelete() {
    setDeleteLoading(true);
    for (const ea of instances) {
      await onDelete(ea.id);
    }
  }

  async function handleRotateKey() {
    setRotateLoading(true);
    try {
      const res = await fetch(`/api/live/${primary.id}/rotate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setRotatedKey(data.apiKey);
        setShowRotateConfirm(false);
        showSuccess("API key regenerated", "Copy your new key now — it won't be shown again.");
      } else {
        const data = await res.json().catch(() => ({}));
        showError("Key rotation failed", data.message ?? "Something went wrong");
      }
    } catch {
      showError("Key rotation failed", "Network error");
    }
    setRotateLoading(false);
  }

  async function handleCopyKey() {
    if (!rotatedKey) return;
    try {
      await navigator.clipboard.writeText(rotatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Copy failed", "Could not copy to clipboard");
    }
  }

  async function handleTrackRecordAction(action: "publish" | "unpublish") {
    setTrackRecordLoading(true);
    try {
      const res = await fetch(`/api/live/${primary.id}/track-record-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setTrackRecordToken(data.isPublic ? data.token : null);
      } else {
        showError("Failed", "Could not update track record share");
      }
    } catch {
      showError("Failed", "Network error");
    }
    setTrackRecordLoading(false);
  }

  async function handleCopyTrackRecordUrl() {
    if (!trackRecordToken) return;
    const url = `${window.location.origin}/track-record/${trackRecordToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setTrackRecordCopied(true);
      setTimeout(() => setTrackRecordCopied(false), 2000);
    } catch {
      showError("Copy failed", "Could not copy to clipboard");
    }
  }

  // Aggregate health counts from child strategy instances
  const healthCounts = (() => {
    const counts: Record<StrategyHealthLabel, number> = {
      Healthy: 0,
      Elevated: 0,
      "Edge at Risk": 0,
      Pending: 0,
    };
    for (const ea of instances) {
      if (ea.id === primary.id && !ea.symbol) continue; // skip account-wide parent
      counts[deriveStrategyHealth(ea)]++;
    }
    return counts;
  })();
  const healthSummaryParts = (
    ["Edge at Risk", "Elevated", "Healthy", "Pending"] as StrategyHealthLabel[]
  ).filter((label) => healthCounts[label] > 0);

  const lastHeartbeat = instances
    .map((ea) => ea.lastHeartbeat)
    .filter(Boolean)
    .sort()
    .pop();

  // Derive worst health across all instances for accent bar
  const accentColor = (() => {
    let worst: StrategyHealthLabel = "Pending";
    for (const ea of instances) {
      const h = deriveStrategyHealth(ea);
      if (h === "Edge at Risk") return "#EF4444";
      if (h === "Elevated") worst = "Elevated";
      else if (h === "Healthy" && worst === "Pending") worst = "Healthy";
    }
    if (worst === "Elevated") return "#F59E0B";
    if (worst === "Healthy") return "#10B981";
    return "#A78BFA";
  })();

  // Determine mode-based left border
  const isLiveMode = instances.every((ea) => ea.mode !== "PAPER");
  const modeBorderClass = isLiveMode
    ? "border-l-2 border-l-[#10B981]"
    : "border-l-2 border-l-[#F59E0B]";

  return (
    <div
      id={`account-card-${primary.id}`}
      className={`relative overflow-hidden bg-[#0C0714] border rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-300 ${modeBorderClass} ${
        healthCounts["Edge at Risk"] > 0
          ? "border-[#1E293B]"
          : statusChanged
            ? "border-[#475569] shadow-[0_0_12px_rgba(100,116,139,0.15)]"
            : "border-[#1E293B]/80 hover:border-[#334155]"
      }`}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: accentColor, opacity: 0.4 }}
      />
      {/* Header zone */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={accountStatus} animate={statusChanged} />
              <h3 className="font-semibold text-white truncate text-[15px]">{primary.eaName}</h3>
              {(() => {
                const overridePending = instances.some(
                  (ea) => (ea.operatorHold ?? "NONE") === "OVERRIDE_PENDING"
                );
                const execState = overridePending
                  ? "OVERRIDE_PENDING"
                  : anyHalted
                    ? "HALTED"
                    : allPaused
                      ? "PAUSED"
                      : "RUN";
                if (execState === "RUN") return null;
                const execColor =
                  execState === "HALTED" || execState === "OVERRIDE_PENDING"
                    ? "#EF4444"
                    : "#F59E0B";
                const execLabel = execState === "OVERRIDE_PENDING" ? "OVERRIDE PENDING" : execState;
                return (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-medium rounded"
                    style={{
                      backgroundColor: `${execColor}15`,
                      color: execColor,
                    }}
                  >
                    {execLabel}
                  </span>
                );
              })()}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-sm text-[#525B6B]">
              {account.broker && <span>{account.broker}</span>}
              {account.accountNumber && (
                <>
                  {account.broker && <span className="text-[#334155]">·</span>}
                  <span>#{account.accountNumber}</span>
                </>
              )}
              {(account.broker || account.accountNumber) && (
                <span className="text-[#334155]">·</span>
              )}
              <span>Portfolio</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {instances.some((ea) => ea.mode === "PAPER") && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded bg-[#F59E0B]/10 text-[#F59E0B]/80">
                PAPER
              </span>
            )}
            {/* Edge monitoring status badge — only show non-healthy states */}
            {(() => {
              const latestSnapshot = instances
                .map((ea) => ea.healthSnapshots?.[0])
                .filter(Boolean)[0];
              if (!latestSnapshot) return null;
              const { driftDetected, driftSeverity, status } = latestSnapshot;
              if (driftDetected) {
                return (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded bg-[#EF4444]/10 text-[#EF4444]">
                    <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                    Drift
                  </span>
                );
              }
              if (driftSeverity > 0.3 || status === "WARNING") {
                return (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded bg-[#F59E0B]/10 text-[#F59E0B]">
                    <span className="w-1 h-1 rounded-full bg-[#F59E0B]" />
                    Warning
                  </span>
                );
              }
              if (status === "DEGRADED") {
                return (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded bg-[#EF4444]/10 text-[#EF4444]">
                    <span className="w-1 h-1 rounded-full bg-[#EF4444]" />
                    Edge at Risk
                  </span>
                );
              }
              return null; // Healthy state — no badge needed, reduces noise
            })()}
            {instances.some((ea) => ea.isAutoDiscovered) && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded bg-[#8B5CF6]/10 text-[#A78BFA]/80">
                Discovered
              </span>
            )}
            {/* Show baseline link CTA when any instance is missing a baseline */}
            {(() => {
              const unlinkable = instances.find(
                (ea) => !ea.baseline && !ea.relinkRequired && ea.isExternal
              );
              if (!unlinkable) return null;
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLinkBaseline(unlinkable.id);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium rounded border border-[#4F46E5]/30 text-[#818CF8] hover:bg-[#4F46E5]/10 transition-colors"
                >
                  <svg
                    className="w-2.5 h-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101"
                    />
                  </svg>
                  Link Baseline
                </button>
              );
            })()}
          </div>
        </div>

        {/* Strategy health strip */}
        {healthSummaryParts.length > 0 && (
          <div className="flex items-center gap-3 mt-2.5">
            {healthSummaryParts.map((label) => {
              const hs = HEALTH_STYLES[label];
              return (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium ${hs.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${hs.dot}`} />
                  {healthCounts[label]} {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Financial metrics — primary row */}
      <div className="grid grid-cols-3 gap-3 px-5 py-3 border-y border-[#1E293B]/40">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-[#475569] mb-0.5">Balance</p>
          <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(balance)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-[#475569] mb-0.5">Equity</p>
          <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(equity)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-[#475569] mb-0.5">Profit</p>
          <p
            className={`text-xl font-bold tabular-nums ${totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {formatCurrency(totalProfit)}
          </p>
        </div>
      </div>

      {/* Performance metrics + actions */}
      <div className="px-5 pt-3 pb-4">
        {/* Secondary metrics */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-white tabular-nums">{totalTrades}</span>
            <span className="text-[10px] text-[#475569]">trades</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-white tabular-nums">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-[#475569]">win rate</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-white tabular-nums">
              {profitFactor === Infinity ? "\u221E" : profitFactor.toFixed(2)}
            </span>
            <span className="text-[10px] text-[#475569]">PF</span>
          </div>
          {edgeAtRiskCount > 0 && (
            <div className="flex items-baseline gap-1 ml-auto">
              <span className="text-sm font-semibold text-[#EF4444] tabular-nums">
                {edgeAtRiskCount}
              </span>
              <span className="text-[10px] text-[#EF4444]/70">at risk</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAccountPause}
            disabled={pauseLoading}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
              allPaused
                ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
            }`}
          >
            {allPaused ? "Resume All" : "Pause All"}
          </button>

          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#EF4444]">Delete all?</span>
              <button
                onClick={handleAccountDelete}
                disabled={deleteLoading}
                className="px-2 py-0.5 text-[10px] font-medium text-white bg-[#EF4444] rounded-md hover:bg-[#DC2626]"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-0.5 text-[10px] font-medium text-[#64748B] hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-2.5 py-1 rounded-md text-[10px] font-medium border border-[#1E293B] text-[#64748B] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
            >
              Delete
            </button>
          )}

          <span className="ml-auto text-[9px] text-[#475569]">
            Heartbeat {formatRelativeTime(lastHeartbeat ?? null).toLowerCase()}
          </span>
        </div>
      </div>
      {/* close px-5 pt-3 pb-4 wrapper */}

      {/* API Key management — only for root/parent instances (not child/discovered) */}
      {!primary.parentInstanceId && (
        <div className="mx-5 mb-2 px-3 py-2 rounded-md bg-white/[0.02] border border-[#1E293B]/50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#525B6B] mb-0.5">API Key</p>
              {rotatedKey ? (
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-[#10B981] truncate max-w-[280px]">
                    {rotatedKey}
                  </code>
                  <button
                    onClick={handleCopyKey}
                    className="text-[10px] font-medium text-[#94A3B8] hover:text-white transition-colors shrink-0"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => setRotatedKey(null)}
                    className="text-[10px] text-[#475569] hover:text-[#94A3B8] transition-colors shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <p className="text-xs font-mono text-[#64748B]">
                  {"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                  {primary.apiKeySuffix ?? "\u2022\u2022\u2022\u2022"}
                </p>
              )}
            </div>
            {!rotatedKey && (
              <div className="shrink-0">
                {showRotateConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#F59E0B]">Invalidate current key?</span>
                    <button
                      onClick={handleRotateKey}
                      disabled={rotateLoading}
                      className="px-2 py-0.5 text-[10px] font-medium text-white bg-[#F59E0B] rounded-md hover:bg-[#D97706] disabled:opacity-50"
                    >
                      {rotateLoading ? "..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setShowRotateConfirm(false)}
                      className="px-2 py-0.5 text-[10px] text-[#64748B] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRotateConfirm(true)}
                    className="text-[10px] font-medium text-[#94A3B8] hover:text-white transition-colors"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Public Track Record share — only for root instances */}
      {!primary.parentInstanceId && (
        <div className="mx-5 mb-2 px-3 py-2 rounded-md bg-white/[0.02] border border-[#1E293B]/50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#525B6B] mb-0.5">
                Public Track Record
              </p>
              {trackRecordToken ? (
                <p className="text-[10px] text-[#10B981]">Published</p>
              ) : (
                <p className="text-[10px] text-[#64748B]">
                  Share a verified live account track record monitored by AlgoStudio.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {trackRecordToken ? (
                <>
                  <a
                    href={`/track-record/${trackRecordToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-medium text-[#94A3B8] hover:text-white transition-colors"
                  >
                    View Track Record {"\u2197"}
                  </a>
                  <button
                    onClick={handleCopyTrackRecordUrl}
                    className="text-[10px] text-[#94A3B8] hover:text-white transition-colors"
                  >
                    {trackRecordCopied ? "\u2713 Copied" : "Copy link"}
                  </button>
                  <a
                    href={`https://x.com/intent/tweet?text=${encodeURIComponent("Verified live account track record monitored by AlgoStudio.")}&url=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/track-record/${trackRecordToken}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#94A3B8] hover:text-white transition-colors"
                  >
                    Share on X
                  </a>
                  <button
                    onClick={() => handleTrackRecordAction("unpublish")}
                    disabled={trackRecordLoading}
                    className="text-[10px] text-[#475569] hover:text-[#EF4444] transition-colors disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleTrackRecordAction("publish")}
                  disabled={trackRecordLoading}
                  className="text-[10px] font-medium text-[#94A3B8] hover:text-white transition-colors disabled:opacity-50"
                >
                  {trackRecordLoading ? "Sharing..." : "Share Track Record"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expand strategies toggle */}
      <div className="mx-5 mb-4 mt-1 border-t border-[#1E293B]/40 pt-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[11px] font-medium text-[#64748B] hover:text-[#94A3B8] transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Show strategies ({strategyGroups.length})
        </button>

        {expanded && (
          <div className="mt-3 space-y-1">
            {strategyGroups.length === 0 ? (
              <div className="px-3 py-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#CBD5E1] font-medium">Awaiting first trade...</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">
                      Your Monitor EA is connected and listening. Strategies will appear here
                      automatically once a trade is detected — this typically takes under 60 seconds
                      after your EA opens or closes its first position. If no strategy appears after
                      several minutes, verify that your EA is using a non-zero Magic Number.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Header row */}
                <div className="grid grid-cols-[1fr_110px_150px] gap-2 px-3 py-1.5 text-[9px] uppercase tracking-wider text-[#64748B]">
                  <span>Symbol</span>
                  <span>Edge Status</span>
                  <span>Baseline</span>
                </div>
                {/* Strategy rows */}
                {strategyGroups.map((sg) => {
                  // Resolve health badge from owning instance.
                  // Fallback: if trade→instance match failed, pick the first
                  // linkable non-container instance in this account card so the
                  // "Link" button still renders.
                  const owningInstance = sg.instanceId
                    ? instances.find((ea) => ea.id === sg.instanceId)
                    : instances.find((ea) => ea.id !== primary.id && !isAccountContainer(ea));
                  const resolvedInstanceId = sg.instanceId ?? owningInstance?.id ?? null;
                  // Derive baseline status from instance-level truth (deployments not serialized to client)
                  const relinkRequired = owningInstance?.relinkRequired ?? false;
                  const isLinked = !relinkRequired && !!owningInstance?.baseline;
                  const health = deriveStrategyHealth(owningInstance);
                  const hs = HEALTH_STYLES[health];
                  const baselineTrades = owningInstance?.baseline?.totalTrades;
                  const rowKey = `${sg.symbol}|${sg.magicNumber ?? "none"}`;
                  const isExpanded = expandedStrategyKey === rowKey;
                  const isHighlighted =
                    forceExpandId != null && resolvedInstanceId === forceExpandId;
                  return (
                    <div key={rowKey}>
                      <div
                        onClick={() => setExpandedStrategyKey(isExpanded ? null : rowKey)}
                        className={`grid grid-cols-[1fr_110px_150px] gap-2 px-3 py-2 rounded-md bg-white/[0.02] border cursor-pointer transition-colors ${
                          isHighlighted
                            ? "border-[#F59E0B]/40 bg-[#F59E0B]/5"
                            : isExpanded
                              ? "border-[#334155] bg-[#0F0A1A]"
                              : "border-[#1E293B] hover:border-[#334155]"
                        }`}
                      >
                        <p className="text-xs font-semibold text-[#CBD5E1] truncate self-center">
                          {sg.symbol}
                        </p>
                        <div className="self-center">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${hs.bg} ${hs.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${hs.dot}`} />
                            {health}
                          </span>
                        </div>
                        <div className="self-center flex items-center gap-2">
                          <p
                            className={`text-xs ${isLinked ? "text-[#10B981] font-medium" : relinkRequired ? "text-[#F59E0B] font-medium" : "text-[#64748B]"}`}
                          >
                            {isLinked
                              ? `Linked${baselineTrades ? ` (${baselineTrades} trades)` : ""}`
                              : relinkRequired
                                ? "Relink required"
                                : "Missing"}
                          </p>
                          {resolvedInstanceId &&
                            (isLinked ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnlinkBaseline(resolvedInstanceId);
                                }}
                                className="text-[9px] font-medium text-[#EF4444]/70 hover:text-[#EF4444] transition-colors"
                              >
                                Unlink
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onLinkBaseline(resolvedInstanceId);
                                }}
                                className="text-[9px] font-medium text-[#94A3B8] hover:text-white transition-colors"
                              >
                                {relinkRequired ? "Relink" : "Link"}
                              </button>
                            ))}
                        </div>
                      </div>
                      {isExpanded && owningInstance && (
                        <InvestigationPanel
                          instance={owningInstance}
                          trades={sg.trades}
                          health={health}
                          isLinked={isLinked}
                        />
                      )}
                      {isExpanded && !owningInstance && (
                        <div className="ml-3 mr-3 mb-1 px-4 py-3 rounded-b-lg bg-[#0A0118]/60 border border-t-0 border-[rgba(79,70,229,0.15)] text-[11px] text-[#64748B]">
                          No instance data available for investigation.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
