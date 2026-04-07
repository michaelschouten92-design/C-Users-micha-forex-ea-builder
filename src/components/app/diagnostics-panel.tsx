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

// ── Rule evaluation table ─────────────────────────────────

type RuleStatus = "PASS" | "AT_RISK" | "INVALIDATED";

interface RuleRow {
  name: string;
  status: RuleStatus;
  measured: string;
  threshold: string;
}

const STATUS_COLORS: Record<RuleStatus, string> = {
  PASS: "#10B981",
  AT_RISK: "#F59E0B",
  INVALIDATED: "#EF4444",
};

function deriveRuleRows(
  health: HealthSnapshotDetail | null,
  triggeredReasons: string[]
): RuleRow[] {
  const triggered = new Set(triggeredReasons);

  // 1. Drawdown Breach
  const ddThreshold =
    health?.baselineMaxDDPct != null
      ? health.baselineMaxDDPct * MONITORING.DRAWDOWN_BREACH_MULTIPLIER
      : null;
  const ddTriggered = triggered.has("MONITORING_DRAWDOWN_BREACH");

  // 2. Sharpe Degradation — no live Sharpe in HealthSnapshot
  const sharpeTriggered = triggered.has("MONITORING_SHARPE_DEGRADATION");

  // 3. Losing Streak — not stored in HealthSnapshot
  const streakTriggered = triggered.has("MONITORING_LOSS_STREAK");

  // 4. Inactivity — not stored in HealthSnapshot
  const inactivityTriggered = triggered.has("MONITORING_INACTIVITY");

  // 5. CUSUM Drift
  const driftTriggered = triggered.has("MONITORING_CUSUM_DRIFT");

  return [
    {
      name: "Drawdown Breach",
      status: ddTriggered ? "AT_RISK" : "PASS",
      measured: health ? `${health.liveMaxDrawdownPct.toFixed(1)}%` : "\u2014",
      threshold:
        ddThreshold != null
          ? `< ${ddThreshold.toFixed(1)}%`
          : `< baseline \u00D7 ${MONITORING.DRAWDOWN_BREACH_MULTIPLIER}`,
    },
    {
      name: "Sharpe Degradation",
      status: sharpeTriggered ? "AT_RISK" : "PASS",
      measured: sharpeTriggered ? "Below min" : health ? "Within range" : "\u2014",
      threshold: `> baseline \u00D7 ${MONITORING.SHARPE_MIN_RATIO}`,
    },
    {
      name: "Losing Streak",
      status: streakTriggered ? "AT_RISK" : "PASS",
      measured: streakTriggered
        ? `\u2265 ${MONITORING.MAX_LOSING_STREAK}`
        : health
          ? `< ${MONITORING.MAX_LOSING_STREAK}`
          : "\u2014",
      threshold: `< ${MONITORING.MAX_LOSING_STREAK}`,
    },
    {
      name: "Inactivity",
      status: inactivityTriggered ? "AT_RISK" : "PASS",
      measured: inactivityTriggered
        ? `\u2265 ${MONITORING.MAX_INACTIVITY_DAYS}d`
        : health
          ? `< ${MONITORING.MAX_INACTIVITY_DAYS}d`
          : "\u2014",
      threshold: `< ${MONITORING.MAX_INACTIVITY_DAYS}d`,
    },
    {
      name: "CUSUM Drift",
      status: driftTriggered || health?.driftDetected ? "AT_RISK" : "PASS",
      measured: health
        ? `${health.driftSeverity > 0 ? Math.round(health.driftSeverity * 100) + "%" : "0%"} severity`
        : "\u2014",
      threshold: `< ${MONITORING.CUSUM_DRIFT_CONSECUTIVE_SNAPSHOTS} consecutive`,
    },
  ];
}

function RuleStatusBadge({ status }: { status: RuleStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded"
      style={{
        backgroundColor: `${color}15`,
        color,
      }}
    >
      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
      {status === "PASS" ? "Pass" : status === "AT_RISK" ? "At Risk" : "Fail"}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────

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
          <p className="text-xs text-[#7C8DB0]">
            No monitoring evaluation completed yet. The system will run its first evaluation after
            sufficient trade data has been collected.
          </p>
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

            {/* Rule evaluation table */}
            {health && health.status !== "INSUFFICIENT_DATA" && (
              <div className="pt-2 border-t border-[rgba(79,70,229,0.1)] space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">
                  Rule Evaluation
                </p>
                {/* Header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-2 py-1">
                  <span className="text-[9px] uppercase tracking-wider text-[#7C8DB0]">Rule</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#7C8DB0] w-14 text-center">
                    Status
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#7C8DB0] w-24 text-right">
                    Measured
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#7C8DB0] w-28 text-right">
                    Threshold
                  </span>
                </div>
                {/* Rows */}
                {deriveRuleRows(health, latestRun.reasons).map((rule) => (
                  <div
                    key={rule.name}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-2 py-1.5 rounded"
                    style={{
                      backgroundColor:
                        rule.status !== "PASS" ? `${STATUS_COLORS[rule.status]}08` : "transparent",
                    }}
                  >
                    <span className="text-xs text-[#FAFAFA] font-medium">{rule.name}</span>
                    <span className="w-14 flex justify-center">
                      <RuleStatusBadge status={rule.status} />
                    </span>
                    <span className="text-[11px] text-white tabular-nums w-24 text-right">
                      {rule.measured}
                    </span>
                    <span className="text-[10px] text-[#7C8DB0] tabular-nums w-28 text-right">
                      {rule.threshold}
                    </span>
                  </div>
                ))}
              </div>
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
                <span className="text-[#FAFAFA] tabular-nums">
                  {MONITORING.DRAWDOWN_BREACH_MULTIPLIER}x baseline
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Sharpe Min</span>
                <span className="text-[#FAFAFA] tabular-nums">
                  {MONITORING.SHARPE_MIN_RATIO}x baseline
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Max Loss Streak</span>
                <span className="text-[#FAFAFA] tabular-nums">{MONITORING.MAX_LOSING_STREAK}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Inactivity</span>
                <span className="text-[#FAFAFA] tabular-nums">
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
