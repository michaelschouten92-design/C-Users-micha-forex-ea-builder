"use client";

import { isAccountContainer } from "@/lib/live/live-instance-dto";
import { StatusBadge } from "./status-badge";
import type { AccountGroup } from "./types";
import {
  formatCurrency,
  formatPnl,
  formatRelativeTime,
  calculateWinRate,
  deriveStrategyHealth,
  HEALTH_STYLES,
} from "./utils";

interface AccountTileProps {
  account: AccountGroup;
  isSelected: boolean;
  onClick: () => void;
  changedIds: Set<string>;
}

export function AccountTile({ account, isSelected, onClick, changedIds }: AccountTileProps) {
  const { primary, instances } = account;

  const isAccountWide = isAccountContainer(primary);
  const balance = isAccountWide
    ? primary.balance
    : instances.reduce((sum, ea) => sum + (ea.balance ?? 0), 0) || null;
  const totalProfit = isAccountWide
    ? primary.totalProfit
    : instances.reduce((sum, ea) => sum + ea.totalProfit, 0);

  const allTrades = instances.flatMap((ea) => ea.trades ?? []);
  const winRate = calculateWinRate(allTrades);
  const closedCount = allTrades.filter((t) => t.closeTime !== null).length;

  // Top strategies by health status
  const strategies = instances
    .filter((ea) => ea.symbol !== null)
    .slice(0, 3)
    .map((ea) => ({
      symbol: ea.symbol!,
      health: deriveStrategyHealth(ea),
      hasBaseline: !!ea.baseline,
    }));
  const totalStrategies = instances.filter((ea) => ea.symbol !== null).length;
  const hiddenCount = totalStrategies - strategies.length;

  const onlineCount = instances.filter((ea) => ea.status === "ONLINE").length;
  const accountStatus: "ONLINE" | "OFFLINE" | "ERROR" =
    onlineCount > 0
      ? "ONLINE"
      : instances.some((ea) => ea.status === "ERROR")
        ? "ERROR"
        : "OFFLINE";

  const statusChanged = instances.some((ea) => changedIds.has(ea.id));
  const lastHeartbeat = instances
    .map((ea) => ea.lastHeartbeat)
    .filter(Boolean)
    .sort()
    .pop();
  const isPaper = instances.some((ea) => ea.mode === "PAPER");

  // Donut SVG
  const hasClosedTrades = closedCount > 0;
  const donutSize = 64;
  const donutStroke = 5;
  const donutRadius = (donutSize - donutStroke) / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutOffset = hasClosedTrades
    ? donutCircumference * (1 - winRate / 100)
    : donutCircumference;
  const donutColor = !hasClosedTrades ? "#334155" : winRate >= 50 ? "#10B981" : "#F59E0B";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-xl bg-[#0C0714] border p-4 transition-all duration-200 cursor-pointer hover:border-[#475569] focus-visible:ring-2 focus-visible:ring-[#818CF8] focus-visible:outline-none ${
        isSelected
          ? "ring-2 ring-[#4F46E5] border-[#4F46E5]/50"
          : statusChanged
            ? "border-[#475569] shadow-[0_0_12px_rgba(100,116,139,0.15)]"
            : "border-[#1E293B]/80"
      }`}
    >
      {/* Header: Name + Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={accountStatus} animate={statusChanged} />
          <span className="font-semibold text-white text-sm truncate" title={primary.eaName}>
            {primary.eaName}
          </span>
          {isPaper && (
            <span className="px-1.5 py-0.5 text-[8px] font-medium rounded bg-[#F59E0B]/10 text-[#F59E0B] flex-shrink-0">
              PAPER
            </span>
          )}
        </div>
        <span className="text-[9px] text-[#475569] flex-shrink-0">
          {formatRelativeTime(lastHeartbeat ?? null)}
        </span>
      </div>

      {/* Body: Donut + Financials */}
      <div className="flex gap-4 mb-3">
        {/* Win rate donut */}
        <div className="relative flex-shrink-0">
          <svg width={donutSize} height={donutSize} className="-rotate-90">
            <circle
              cx={donutSize / 2}
              cy={donutSize / 2}
              r={donutRadius}
              fill="none"
              stroke="#1E293B"
              strokeWidth={donutStroke}
            />
            <circle
              cx={donutSize / 2}
              cy={donutSize / 2}
              r={donutRadius}
              fill="none"
              stroke={donutColor}
              strokeWidth={donutStroke}
              strokeDasharray={donutCircumference}
              strokeDashoffset={donutOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-bold tabular-nums" style={{ color: donutColor }}>
              {hasClosedTrades ? `${winRate.toFixed(0)}%` : "—"}
            </span>
            <span className="text-[7px] uppercase text-[#525B6B]">
              {hasClosedTrades ? "Win" : "N/A"}
            </span>
          </div>
        </div>

        {/* Financial numbers */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[9px] uppercase tracking-wider text-[#475569]">Balance</span>
            <span className="text-sm font-bold tabular-nums text-white">
              {formatCurrency(balance)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[9px] uppercase tracking-wider text-[#475569]">Profit</span>
            <span
              className={`text-sm font-bold tabular-nums ${totalProfit > 0 ? "text-[#10B981]" : totalProfit < 0 ? "text-[#EF4444]" : "text-[#64748B]"}`}
            >
              {formatPnl(totalProfit)}
            </span>
          </div>
          {account.broker && (
            <p className="text-[10px] text-[#525B6B] truncate pt-0.5">
              {account.broker}
              {account.accountNumber && ` · #${account.accountNumber}`}
            </p>
          )}
        </div>
      </div>

      {/* Strategy list */}
      {strategies.length > 0 && (
        <div className="space-y-1 mb-3">
          {strategies.map((s) => {
            const hs = HEALTH_STYLES[s.health];
            return (
              <div key={s.symbol} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hs.dot}`} />
                  <span className="text-[11px] text-[#CBD5E1] font-medium">{s.symbol}</span>
                </div>
                <span className={`text-[9px] font-medium ${hs.text}`}>{s.health}</span>
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <p className="text-[9px] text-[#475569] pl-3.5">+{hiddenCount} more</p>
          )}
        </div>
      )}

      {/* Action link */}
      <div className="flex items-center gap-1 text-[11px] font-medium text-[#818CF8]">
        {isSelected ? "Hide Details" : "View Details"}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isSelected ? "M5 15l7-7 7 7" : "M17 8l4 4m0 0l-4 4m4-4H3"}
          />
        </svg>
      </div>
    </div>
  );
}
