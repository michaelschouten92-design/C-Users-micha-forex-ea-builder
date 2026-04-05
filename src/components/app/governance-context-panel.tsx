/**
 * GovernanceContextPanel — expandable lifecycle, proof, and governance details.
 *
 * Collapsed by default. Shows lifecycle transitions, operator hold status,
 * and read-only execution context.
 */

import { DisclosureSection } from "./disclosure-section";
import { formatDateMedium } from "@/lib/format-date";
import type { StrategyDetailData } from "@/app/app/strategy/[instanceId]/load-strategy-detail";

const LIFECYCLE_LABELS: Record<string, string> = {
  LIVE_MONITORING: "Monitoring",
  EDGE_AT_RISK: "Edge at Risk",
  INVALIDATED: "Invalidated",
  VERIFIED: "Verified",
  BACKTESTED: "Backtested",
  DRAFT: "Draft",
};

const PHASE_LABELS: Record<string, string> = {
  NEW: "New (Collecting Data)",
  PROVING: "Proving",
  PROVEN: "Established",
  RETIRED: "Edge Expired",
};

interface GovernanceContextPanelProps {
  data: StrategyDetailData;
}

export function GovernanceContextPanel({ data }: GovernanceContextPanelProps) {
  return (
    <DisclosureSection title="Governance Context">
      <div className="pt-3 space-y-4">
        {/* Lifecycle state + phase */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Lifecycle</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <span className="text-[10px] text-[#7C8DB0]">State</span>
              <p className="text-white font-medium">
                {data.isAutoDiscovered
                  ? "Discovered"
                  : (LIFECYCLE_LABELS[data.lifecycleState] ?? data.lifecycleState)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-[#7C8DB0]">Phase</span>
              <p className="text-white font-medium">
                {PHASE_LABELS[data.lifecyclePhase] ?? data.lifecyclePhase}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-[#7C8DB0]">Phase Entered</span>
              <p className="text-[#CBD5E1]">{formatDateMedium(data.phaseEnteredAt)}</p>
            </div>
            {data.provenAt && (
              <div>
                <span className="text-[10px] text-[#7C8DB0]">Proven At</span>
                <p className="text-[#CBD5E1]">{formatDateMedium(data.provenAt)}</p>
              </div>
            )}
            {data.retiredAt && (
              <div>
                <span className="text-[10px] text-[#7C8DB0]">Retired</span>
                <p className="text-[#CBD5E1]">
                  {formatDateMedium(data.retiredAt)}
                  {data.retiredReason && ` (${data.retiredReason})`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Peak score */}
        {data.peakScore > 0 && (
          <div className="pt-2 border-t border-[rgba(79,70,229,0.1)]">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
              Peak Performance
            </p>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-[10px] text-[#7C8DB0]">Peak Score</span>
                <p className="text-white font-medium tabular-nums">
                  {Math.round(data.peakScore * 100)}%
                </p>
              </div>
              {data.peakScoreAt && (
                <div>
                  <span className="text-[10px] text-[#7C8DB0]">Achieved</span>
                  <p className="text-[#CBD5E1]">
                    {new Date(data.peakScoreAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Operator hold status */}
        <div className="pt-2 border-t border-[rgba(79,70,229,0.1)]">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">
            Operator Controls
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <span className="text-[10px] text-[#7C8DB0]">Operator Hold</span>
              <p
                className="font-medium"
                style={{
                  color:
                    data.operatorHold === "HALTED"
                      ? "#F59E0B"
                      : data.operatorHold === "OVERRIDE_PENDING"
                        ? "#6366F1"
                        : "#10B981",
                }}
              >
                {data.operatorHold === "NONE"
                  ? "None"
                  : data.operatorHold === "HALTED"
                    ? "Halted"
                    : "Override Pending"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-[#7C8DB0]">Connection</span>
              <p
                className="font-medium"
                style={{
                  color:
                    data.status === "ONLINE"
                      ? "#10B981"
                      : data.status === "ERROR"
                        ? "#EF4444"
                        : "#7C8DB0",
                }}
              >
                {data.status}
              </p>
            </div>
          </div>
        </div>

        {/* Strategy metadata */}
        <div className="pt-2 border-t border-[rgba(79,70,229,0.1)]">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-1">Metadata</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            {data.broker && (
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Broker</span>
                <span className="text-[#CBD5E1]">{data.broker}</span>
              </div>
            )}
            {data.symbol && (
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Symbol</span>
                <span className="text-[#CBD5E1]">{data.symbol}</span>
              </div>
            )}
            {data.timeframe && (
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Timeframe</span>
                <span className="text-[#CBD5E1]">{data.timeframe}</span>
              </div>
            )}
            {data.latestRun?.configVersion && (
              <div className="flex justify-between">
                <span className="text-[#7C8DB0]">Config Version</span>
                <span className="text-[#CBD5E1]">v{data.latestRun.configVersion}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </DisclosureSection>
  );
}
