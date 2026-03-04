import { getControlExplanation } from "@/domain/heartbeat/control-explanations";
import type { HeartbeatReasonCode } from "@/domain/heartbeat/decide-heartbeat-action";
import { ALL_HEARTBEAT_REASON_CODES } from "@/domain/heartbeat/decide-heartbeat-action";
import type { RecentDecision } from "../load-monitor-data";

const ACTION_BADGE: Record<string, { bg: string; border: string; text: string }> = {
  RUN: {
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
    text: "#10B981",
  },
  PAUSE: {
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    text: "#F59E0B",
  },
  STOP: {
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    text: "#EF4444",
  },
};

const knownCodes = new Set<string>(ALL_HEARTBEAT_REASON_CODES);

function reasonTitle(reasonCode: string): string {
  if (knownCodes.has(reasonCode)) {
    return getControlExplanation(reasonCode as HeartbeatReasonCode).title;
  }
  return reasonCode;
}

export function DecisionTimeline({ events }: { events: RecentDecision[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
        <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8] mb-3">
          Recent Decisions
        </h3>
        <p className="text-sm text-[#64748B]">No heartbeat decisions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
      <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8] mb-4">
        Recent Decisions
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(79,70,229,0.15)]">
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#64748B] pb-2 pr-4">
                Time
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#64748B] pb-2 pr-4">
                Action
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#64748B] pb-2">
                Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => {
              const badge = ACTION_BADGE[ev.action] ?? ACTION_BADGE.PAUSE;
              return (
                <tr key={i} className="border-b border-[rgba(79,70,229,0.08)] last:border-b-0">
                  <td className="py-2 pr-4 font-mono text-xs text-[#94A3B8] whitespace-nowrap">
                    {new Date(ev.timestamp).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: badge.bg,
                        border: `1px solid ${badge.border}`,
                        color: badge.text,
                      }}
                    >
                      {ev.action}
                    </span>
                  </td>
                  <td className="py-2 text-[#CBD5E1]">{reasonTitle(ev.reasonCode)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
