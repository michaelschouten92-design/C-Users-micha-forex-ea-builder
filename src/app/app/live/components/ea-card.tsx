"use client";

import { useState } from "react";
import { HealthDetailPanel } from "@/components/app/health-detail-panel";
import { ProofPanel } from "@/components/app/proof-panel";
import { StrategyStatusBadge } from "@/components/app/strategy-status-badge";
import type { StrategyStatus } from "@/lib/strategy-status/resolver";
import { resolveInstanceBaselineTrust } from "@/lib/live/baseline-trust-state";
import { formatMonitoringReasons } from "@/lib/live/monitoring-reason-copy";
import { updateOperatorHold } from "../actions";
import { TradeLogPanel } from "./trade-log-panel";
import { TrackRecordPanel } from "./track-record-panel";
import { StatusBadge } from "./status-badge";
import { MiniEquityChart } from "./mini-equity-chart";
import type { EAInstanceData } from "./types";
import {
  formatCurrency,
  calculateWinRate,
  calculateProfitFactor,
  formatRelativeTime,
  resolveInstanceAttention,
} from "./utils";

export function EACard({
  ea,
  statusChanged,
  onTogglePause,
  onDelete,
  onLinkBaseline,
}: {
  ea: EAInstanceData;
  statusChanged: boolean;
  onTogglePause: (instanceId: string, tradingState: "TRADING" | "PAUSED") => void;
  onDelete: (instanceId: string) => void;
  onLinkBaseline?: (instanceId: string) => void;
}) {
  const [showTradeLog, setShowTradeLog] = useState(false);
  const [showTrackRecord, setShowTrackRecord] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [haltState, setHaltState] = useState(ea.operatorHold ?? "NONE");
  const [haltLoading, setHaltLoading] = useState(false);
  const [showHaltConfirm, setShowHaltConfirm] = useState(false);
  const trades = ea.trades ?? [];
  const heartbeats = ea.heartbeats ?? [];
  const winRate = calculateWinRate(trades);
  const profitFactor = calculateProfitFactor(trades);
  const closedCount = ea.totalTrades;
  const isEdgeAtRisk = ea.lifecycleState === "EDGE_AT_RISK" || ea.healthStatus === "DEGRADED";

  async function handleTogglePause(): Promise<void> {
    setPauseLoading(true);
    onTogglePause(ea.id, ea.tradingState === "TRADING" ? "PAUSED" : "TRADING");
    setPauseLoading(false);
  }

  async function handleDelete(): Promise<void> {
    setDeleteLoading(true);
    onDelete(ea.id);
  }

  function handleToggleHalt(): void {
    if (haltState === "HALTED") {
      executeHalt("NONE");
    } else {
      setShowHaltConfirm(true);
    }
  }

  async function executeHalt(target: "HALTED" | "NONE"): Promise<void> {
    setShowHaltConfirm(false);
    setHaltLoading(true);
    const result = await updateOperatorHold(ea.id, target);
    if (result.ok) {
      setHaltState(target);
    }
    setHaltLoading(false);
  }

  return (
    <div
      id={`ea-card-${ea.id}`}
      className={`bg-[#1A0626] border rounded-xl p-6 transition-all duration-500 hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)] ${
        statusChanged
          ? "border-[#A78BFA] shadow-[0_0_20px_rgba(167,139,250,0.2)]"
          : "border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.4)]"
      } ${ea.mode === "PAPER" ? "border-l-2 border-l-[#F59E0B]" : ""}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate" title={ea.eaName}>
            {ea.eaName}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#7C8DB0]">
            {ea.symbol ? (
              <span>{ea.symbol}</span>
            ) : (
              <span className="text-[#7C8DB0]/70 italic">Account-wide (portfolio mode)</span>
            )}
            {ea.timeframe && <span>{ea.timeframe}</span>}
            {ea.broker && (
              <>
                <span className="text-[#334155]">|</span>
                <span>{ea.broker}</span>
              </>
            )}
            {ea.accountNumber && (
              <>
                <span className="text-[#334155]">|</span>
                <span>#{ea.accountNumber}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={ea.status} animate={statusChanged} />
          {ea.strategyStatus && (
            <StrategyStatusBadge status={ea.strategyStatus as StrategyStatus} variant="compact" />
          )}
          {(() => {
            const execState =
              haltState === "HALTED" ? "HALTED" : ea.tradingState === "PAUSED" ? "PAUSED" : "RUN";
            const execColor =
              execState === "HALTED" ? "#EF4444" : execState === "PAUSED" ? "#F59E0B" : "#10B981";
            const execBg =
              execState === "HALTED" ? "#EF4444" : execState === "PAUSED" ? "#F59E0B" : "#10B981";
            return (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium rounded-full"
                style={{
                  backgroundColor: `${execBg}20`,
                  color: execColor,
                  border: `1px solid ${execBg}4D`,
                }}
              >
                {execState}
              </span>
            );
          })()}
          {ea.mode === "PAPER" && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
              Paper
            </span>
          )}
          {(() => {
            const trust = resolveInstanceBaselineTrust({
              hasBaseline: !!ea.baseline,
              relinkRequired: !!ea.relinkRequired,
            });
            const bgMap = { VERIFIED: "#4F46E5", SUSPENDED: "#F59E0B", MISSING: "#64748B" };
            const bg = bgMap[trust.state];
            return (
              <span
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full"
                style={{
                  backgroundColor: `${bg}33`,
                  color: trust.color,
                  borderWidth: 1,
                  borderColor: `${bg}4D`,
                }}
                title={
                  trust.state === "VERIFIED" && ea.baseline
                    ? `Baseline: WR ${(ea.baseline.winRate ?? 0).toFixed(1)}% | PF ${(ea.baseline.profitFactor ?? 0).toFixed(2)} | ${ea.baseline.totalTrades} trades`
                    : undefined
                }
              >
                Baseline {trust.label.toLowerCase()}
              </span>
            );
          })()}
          {/* Auto-discovered strategy badge */}
          {ea.isAutoDiscovered && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
              Discovered
            </span>
          )}
        </div>
      </div>

      {/* Status Detail Box — compact interpretation aid for non-healthy instances */}
      {/* Skipped for SUSPENDED (the relink warning below already covers that case) */}
      {(() => {
        const attention = resolveInstanceAttention(ea, formatMonitoringReasons);
        if (!attention || attention.statusLabel === "Baseline suspended") return null;
        return (
          <div
            className="mb-4 rounded-lg p-3 flex items-start gap-3"
            style={{
              backgroundColor: `${attention.color}08`,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: `${attention.color}20`,
            }}
          >
            <span
              className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: attention.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium" style={{ color: attention.color }}>
                {attention.statusLabel}
              </p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                {attention.reason}
              </p>
              <p className="text-[10px] mt-1" style={{ color: `${attention.color}CC` }}>
                → {attention.actionLabel}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Relink required warning */}
      {ea.relinkRequired && (
        <div className="mb-4 rounded-lg bg-[#F59E0B]/[0.06] border border-[#F59E0B]/20 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#F59E0B] mb-1">
                Material configuration change detected — baseline trust suspended
              </p>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-3">
                Monitoring is running without a trusted baseline. Governance may emit NO_BASELINE
                until a replacement baseline is linked.
              </p>
              {onLinkBaseline && (
                <button
                  onClick={() => onLinkBaseline(ea.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/30 transition-colors"
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
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Restore baseline trust
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Baseline Snapshot — only when trusted */}
      {!ea.relinkRequired && ea.baseline && (
        <div className="mb-4 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.12)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
            Baseline Snapshot
          </p>
          <p className="text-[10px] text-[#64748B] mb-2">Derived from linked backtest</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] text-[#64748B]">Trades</p>
              <p className="text-xs font-medium text-[#CBD5E1]">{ea.baseline.totalTrades}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#64748B]">Profit Factor</p>
              <p className="text-xs font-medium text-[#CBD5E1]">
                {(ea.baseline.profitFactor ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#64748B]">Max Drawdown</p>
              <p className="text-xs font-medium text-[#CBD5E1]">
                {(ea.baseline.maxDrawdownPct ?? 0).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#64748B]">Sharpe</p>
              <p className="text-xs font-medium text-[#CBD5E1]">
                {(ea.baseline.sharpeRatio ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Why At Risk — only when degraded/unstable with active reasons */}
      {(ea.strategyStatus === "EDGE_DEGRADED" || ea.strategyStatus === "UNSTABLE") &&
        ea.monitoringReasons &&
        ea.monitoringReasons.length > 0 && (
          <div className="mb-4 rounded-lg bg-[#EF4444]/[0.04] border border-[#EF4444]/15 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#EF4444] mb-1.5">
              Why At Risk
            </p>
            <ul className="space-y-1">
              {formatMonitoringReasons(ea.monitoringReasons).map((reason) => (
                <li key={reason} className="flex items-start gap-1.5 text-[11px] text-[#CBD5E1]">
                  <span className="mt-1 w-1 h-1 rounded-full bg-[#EF4444] shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Financial Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Balance</p>
          <p className="text-sm font-medium text-white">{formatCurrency(ea.balance)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Equity</p>
          <p className="text-sm font-medium text-white">{formatCurrency(ea.equity)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Profit</p>
          <p
            className={`text-sm font-medium ${ea.totalProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {formatCurrency(ea.totalProfit)}
          </p>
        </div>
      </div>

      {/* Mini equity chart */}
      <div className="mb-4 rounded-lg bg-[#0A0118]/50 p-2">
        <MiniEquityChart heartbeats={ea.heartbeats ?? []} />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Trades</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{closedCount}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Win Rate</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{winRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
            Profit Factor
          </p>
          <p className="text-sm font-medium text-[#CBD5E1]">
            {profitFactor === Infinity ? "---" : profitFactor.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Edge Status</p>
          <p
            className={`text-sm font-medium ${isEdgeAtRisk ? "text-[#EF4444]" : "text-[#10B981]"}`}
          >
            {isEdgeAtRisk ? "At Risk" : "Healthy"}
          </p>
        </div>
      </div>

      {/* Slippage info (estimated from trade data) */}
      {(() => {
        const closedTrades = (ea.trades ?? []).filter((t) => t.closeTime !== null);
        if (closedTrades.length < 5) return null;
        // Estimate average absolute profit deviation as a proxy for slippage awareness
        const avgProfit =
          closedTrades.reduce((s, t) => s + Math.abs(t.profit), 0) / closedTrades.length;
        const variance =
          closedTrades.reduce((s, t) => s + Math.pow(Math.abs(t.profit) - avgProfit, 2), 0) /
          closedTrades.length;
        const stdDev = Math.sqrt(variance);
        return (
          <div
            className="flex items-center gap-2 mt-2 text-[10px] text-[#7C8DB0]"
            title="Estimated from trade profit variance. High variance may indicate significant slippage."
          >
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>P/L Std Dev: {formatCurrency(stdDev)} (higher values may indicate slippage)</span>
          </div>
        );
      })()}

      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[rgba(79,70,229,0.1)]">
        {/* Suppress pause/halt for DRAFT strategies — governance already returns PAUSE */}
        {ea.lifecycleState !== "DRAFT" && (
          <>
            <button
              onClick={handleTogglePause}
              disabled={pauseLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                ea.tradingState === "PAUSED"
                  ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/30"
                  : "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/30"
              } disabled:opacity-50`}
            >
              {ea.tradingState === "PAUSED" ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              {ea.tradingState === "PAUSED" ? "Resume Strategy" : "Pause Strategy"}
            </button>

            <button
              onClick={handleToggleHalt}
              disabled={haltLoading || haltState === "OVERRIDE_PENDING"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 disabled:opacity-50 ${
                haltState === "HALTED"
                  ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/30"
                  : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25 hover:bg-[#EF4444]/20"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    haltState === "HALTED"
                      ? "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      : "M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  }
                />
              </svg>
              {haltLoading ? "…" : haltState === "HALTED" ? "Resume Trading" : "Emergency Halt"}
            </button>
          </>
        )}

        <button
          onClick={() => setShowTradeLog(!showTradeLog)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white hover:border-[rgba(79,70,229,0.4)] transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          {showTradeLog ? "Hide Trades" : "Trade Log"}
        </button>

        <button
          onClick={() => setShowTrackRecord(!showTrackRecord)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
            showTrackRecord
              ? "bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/30"
              : "border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white hover:border-[rgba(79,70,229,0.4)]"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          {showTrackRecord ? "Hide Record" : "Track Record"}
        </button>

        <button
          onClick={() => setShowHealth(!showHealth)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
            showHealth
              ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30"
              : "border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white hover:border-[rgba(79,70,229,0.4)]"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {showHealth ? "Hide Health" : "Health"}
        </button>

        <button
          onClick={() => setShowProof(!showProof)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
            showProof
              ? "bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/30"
              : "border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white hover:border-[rgba(79,70,229,0.4)]"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          {showProof ? "Hide Proof" : "Proof"}
        </button>

        {ea.isAutoDiscovered && onLinkBaseline ? (
          <button
            onClick={() => onLinkBaseline(ea.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#8B5CF6]/40 text-[#A78BFA] hover:bg-[#8B5CF6]/20 hover:border-[#8B5CF6]/60 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Link &amp; Activate
          </button>
        ) : ea.isExternal && !ea.baseline && !ea.relinkRequired && onLinkBaseline ? (
          <button
            onClick={() => onLinkBaseline(ea.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(79,70,229,0.3)] text-[#818CF8] hover:bg-[#4F46E5]/20 hover:border-[#4F46E5]/50 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Link baseline
          </button>
        ) : null}

        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-[#7C8DB0] whitespace-nowrap">
            Last heartbeat: {formatRelativeTime(ea.lastHeartbeat)}
          </span>

          {/* Delete button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(239,68,68,0.2)] text-[#7C8DB0] hover:text-[#EF4444] hover:border-[#EF4444]/40 transition-all duration-200"
            title="Delete this EA instance"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="mt-3 p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
          <p className="text-sm text-[#EF4444] font-medium mb-1">
            Delete &ldquo;{ea.eaName}&rdquo;?
          </p>
          <p className="text-xs text-[#7C8DB0] mb-3">
            This will remove the EA instance and all its data from your dashboard. This action
            cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-[#EF4444] hover:bg-[#DC2626] transition-all duration-200 disabled:opacity-50"
            >
              {deleteLoading ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7C8DB0] border border-[rgba(79,70,229,0.2)] hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showHaltConfirm && (
        <div className="mt-3 p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
          <p className="text-sm text-[#EF4444] font-medium mb-1">Emergency Halt</p>
          <p className="text-xs text-[#CBD5E1] mb-1">
            This will block AlgoStudio from approving trades for this strategy.
          </p>
          <p className="text-xs text-[#7C8DB0] mb-3">
            Trading on the terminal will not be automatically stopped.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => executeHalt("HALTED")}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-[#EF4444] hover:bg-[#DC2626] transition-all duration-200"
            >
              Emergency Halt
            </button>
            <button
              onClick={() => setShowHaltConfirm(false)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7C8DB0] border border-[rgba(79,70,229,0.2)] hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {ea.lastError && ea.status === "ERROR" && (
        <div className="mt-2">
          <span className="text-xs text-[#EF4444] truncate block max-w-full" title={ea.lastError}>
            {ea.lastError}
          </span>
        </div>
      )}

      {/* Trade Log (expandable) */}
      {showTradeLog && <TradeLogPanel instanceId={ea.id} eaName={ea.eaName} />}

      {/* Track Record (expandable) */}
      {showTrackRecord && <TrackRecordPanel instanceId={ea.id} eaName={ea.eaName} />}

      {/* Health Detail (expandable) */}
      {showHealth && (
        <HealthDetailPanel
          instanceId={ea.id}
          strategyStatus={(ea.strategyStatus as StrategyStatus) ?? null}
        />
      )}

      {/* Proof Panel (expandable) */}
      {showProof && <ProofPanel instanceId={ea.id} />}
    </div>
  );
}
