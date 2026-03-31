"use client";

import type { EAInstanceData, StrategyHealthLabel } from "./types";
import {
  HEALTH_STYLES,
  deriveSignalSummary,
  formatCurrency,
  formatRelativeTime,
  formatDateTime,
} from "./utils";

export function InvestigationPanel({
  instance,
  trades,
  health,
  isLinked,
}: {
  instance: EAInstanceData;
  trades: { profit: number; closeTime: string | null }[];
  health: StrategyHealthLabel;
  isLinked: boolean;
}) {
  const snap = instance.healthSnapshots?.[0];
  const recentTrades = trades
    .filter((t) => t.closeTime)
    .sort((a, b) => (b.closeTime! > a.closeTime! ? 1 : b.closeTime! < a.closeTime! ? -1 : 0))
    .slice(0, 10);
  const wins = recentTrades.filter((t) => t.profit > 0).length;
  const losses = recentTrades.filter((t) => t.profit < 0).length;
  const hs = HEALTH_STYLES[health];

  return (
    <div className="ml-3 mr-3 mb-1 px-4 py-3 rounded-b-lg bg-[#0A0118]/60 border border-t-0 border-[rgba(79,70,229,0.15)] space-y-3">
      {/* Status Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span className={`inline-flex items-center gap-1 font-medium ${hs.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hs.dot}`} />
          {health}
        </span>
        <span className="text-[#7C8DB0]">
          Lifecycle: <span className="text-[#CBD5E1]">{instance.lifecycleState ?? "—"}</span>
        </span>
        {snap && (
          <span className="text-[#7C8DB0]">
            Snapshot: <span className="text-[#CBD5E1]">{snap.status}</span>
          </span>
        )}
        <span className="text-[#7C8DB0]">
          Baseline: <span className="text-[#CBD5E1]">{isLinked ? "Linked" : "Not linked"}</span>
        </span>
      </div>

      {/* Signal Summary */}
      <p className="text-[11px] text-[#94A3B8] leading-relaxed">
        {deriveSignalSummary(health, snap, isLinked)}
      </p>

      {/* Drift Context */}
      {snap && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px]">
          <span className="text-[#7C8DB0]">
            CUSUM severity: <span className="text-[#CBD5E1]">{snap.driftSeverity.toFixed(3)}</span>
          </span>
          <span className="text-[#7C8DB0]">
            Drift detected:{" "}
            <span className="text-[#CBD5E1]">{snap.driftDetected ? "Yes" : "No"}</span>
          </span>
        </div>
      )}

      {/* Recent Evidence */}
      {recentTrades.length > 0 && (
        <div className="text-[10px]">
          <span className="text-[#7C8DB0]">Last {recentTrades.length} trades: </span>
          <span className="text-[#10B981]">{wins}W</span>
          <span className="text-[#64748B]"> / </span>
          <span className="text-[#EF4444]">{losses}L</span>
          <span className="text-[#64748B]"> · Net: </span>
          <span
            className={
              recentTrades.reduce((s, t) => s + t.profit, 0) >= 0
                ? "text-[#10B981]"
                : "text-[#EF4444]"
            }
          >
            {formatCurrency(recentTrades.reduce((s, t) => s + t.profit, 0))}
          </span>
        </div>
      )}

      {/* Monitoring Integrity */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-[#7C8DB0] border-t border-[rgba(79,70,229,0.08)] pt-2">
        <span>
          Status:{" "}
          <span className={instance.status === "ONLINE" ? "text-[#10B981]" : "text-[#EF4444]"}>
            {instance.status}
          </span>
        </span>
        <span>
          Heartbeat:{" "}
          <span className="text-[#CBD5E1]">
            {instance.lastHeartbeat ? formatRelativeTime(instance.lastHeartbeat) : "Never"}
          </span>
        </span>
        {instance.operatorHold && instance.operatorHold !== "NONE" && (
          <span>
            Hold: <span className="text-[#F59E0B]">{instance.operatorHold}</span>
          </span>
        )}
        {instance.monitoringSuppressedUntil &&
          new Date(instance.monitoringSuppressedUntil) > new Date() && (
            <span>
              Monitoring suppressed until:{" "}
              <span className="text-[#F59E0B]">
                {formatDateTime(instance.monitoringSuppressedUntil)}
              </span>
            </span>
          )}
      </div>
    </div>
  );
}
