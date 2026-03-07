/**
 * DiagnosticsPanel — expandable monitoring rule results table.
 *
 * Shows the latest monitoring run verdict and per-rule details.
 * Collapsed by default — expert-level transparency.
 */

import { DisclosureSection } from "./disclosure-section";
import type {
  MonitoringRunSummary,
  HealthSnapshotDetail,
} from "@/app/app/strategy/[instanceId]/load-strategy-detail";
import { MONITORING } from "@/domain/monitoring/constants";

const VERDICT_CONFIG: Record<string, { color: string; label: string }> = {
  HEALTHY: { color: "#10B981", label: "Healthy" },
  AT_RISK: { color: "#F59E0B", label: "At Risk" },
  INVALIDATED: { color: "#EF4444", label: "Invalidated" },
};

const REASON_LABELS: Record<string, string> = {
  MONITORING_DRAWDOWN_BREACH: "Drawdown Breach",
  MONITORING_SHARPE_DEGRADATION: "Sharpe Degradation",
  MONITORING_LOSS_STREAK: "Losing Streak",
  MONITORING_INACTIVITY: "Inactivity",
  MONITORING_CUSUM_DRIFT: "CUSUM Drift",
  MONITORING_BASELINE_MISSING: "Baseline Missing",
  MONITORING_INVALID_INPUT: "Invalid Input",
};

interface DiagnosticsPanelProps {
  latestRun: MonitoringRunSummary | null;
  health: HealthSnapshotDetail | null;
}

export function DiagnosticsPanel({ latestRun, health }: DiagnosticsPanelProps) {
  const ruleCount = latestRun?.reasons?.length ?? 0;

  return (
    <DisclosureSection title="Monitoring Diagnostics" count={ruleCount}>
      <div className="pt-3 space-y-3">
        {!latestRun ? (
          <p className="text-xs text-[#7C8DB0]">No monitoring run completed yet.</p>
        ) : (
          <>
            {/* Verdict + timestamp */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {latestRun.verdict && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border"
                    style={{
                      backgroundColor: `${(VERDICT_CONFIG[latestRun.verdict] ?? VERDICT_CONFIG.HEALTHY).color}15`,
                      color: (VERDICT_CONFIG[latestRun.verdict] ?? VERDICT_CONFIG.HEALTHY).color,
                      borderColor: `${(VERDICT_CONFIG[latestRun.verdict] ?? VERDICT_CONFIG.HEALTHY).color}25`,
                    }}
                  >
                    Verdict: {(VERDICT_CONFIG[latestRun.verdict] ?? VERDICT_CONFIG.HEALTHY).label}
                  </span>
                )}
                {latestRun.configVersion && (
                  <span className="text-[10px] text-[#7C8DB0]">v{latestRun.configVersion}</span>
                )}
              </div>
              {latestRun.completedAt && (
                <span className="text-[10px] text-[#7C8DB0]">
                  {new Date(latestRun.completedAt).toLocaleString()}
                </span>
              )}
            </div>

            {/* Triggered reason codes */}
            {latestRun.reasons.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">
                  Triggered Rules
                </p>
                {latestRun.reasons.map((code) => (
                  <div
                    key={code}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.1)]"
                  >
                    <span className="text-xs text-[#EF4444] font-medium">
                      {REASON_LABELS[code] ?? code}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {latestRun.reasons.length === 0 && (
              <p className="text-xs text-[#10B981]">All rules passed.</p>
            )}
          </>
        )}

        {/* Drift diagnostics from health snapshot */}
        {health && health.status !== "INSUFFICIENT_DATA" && (
          <div className="pt-2 border-t border-[rgba(79,70,229,0.1)] space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Drift Analysis</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-[#7C8DB0]">CUSUM Value</span>
                <p className="text-white font-medium tabular-nums">
                  {health.driftCusumValue.toFixed(3)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#7C8DB0]">Drift Severity</span>
                <p
                  className="font-medium tabular-nums"
                  style={{
                    color:
                      health.driftSeverity > 0.7
                        ? "#EF4444"
                        : health.driftSeverity > 0.4
                          ? "#F59E0B"
                          : "#10B981",
                  }}
                >
                  {Math.round(health.driftSeverity * 100)}%
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#7C8DB0]">Drift Detected</span>
                <p
                  className="font-medium"
                  style={{
                    color: health.driftDetected ? "#EF4444" : "#10B981",
                  }}
                >
                  {health.driftDetected ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#7C8DB0]">Threshold</span>
                <p className="text-[#7C8DB0] font-medium tabular-nums">
                  {MONITORING.CUSUM_DRIFT_CONSECUTIVE_SNAPSHOTS} consecutive
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Monitoring thresholds reference */}
        {health && health.status !== "INSUFFICIENT_DATA" && (
          <div className="pt-2 border-t border-[rgba(79,70,229,0.1)] space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Active Thresholds</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">DD Breach</span>
                <span className="text-[#CBD5E1] tabular-nums">
                  {MONITORING.DRAWDOWN_BREACH_MULTIPLIER}x baseline
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Sharpe Min</span>
                <span className="text-[#CBD5E1] tabular-nums">
                  {MONITORING.SHARPE_MIN_RATIO}x baseline
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Max Loss Streak</span>
                <span className="text-[#CBD5E1] tabular-nums">{MONITORING.MAX_LOSING_STREAK}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Inactivity</span>
                <span className="text-[#CBD5E1] tabular-nums">
                  {MONITORING.MAX_INACTIVITY_DAYS}d
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DisclosureSection>
  );
}
