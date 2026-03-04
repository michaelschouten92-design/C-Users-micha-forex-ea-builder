import type { DecisionContext } from "../load-monitor-data";

interface DecisionContextPanelProps {
  context?: DecisionContext;
  timestamp?: string;
  isHistorical?: boolean;
}

const HOLD_LABELS: Record<string, { label: string; color: string }> = {
  NONE: { label: "None", color: "#10B981" },
  HALTED: { label: "Halted", color: "#EF4444" },
  OVERRIDE_PENDING: { label: "Override Pending", color: "#F59E0B" },
};

function formatLifecycleState(state: string): string {
  return state
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function DecisionContextPanel({
  context,
  timestamp,
  isHistorical,
}: DecisionContextPanelProps) {
  if (!context && !isHistorical) return null;

  if (!context) {
    return (
      <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
        <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8] mb-3">
          Decision Context
        </h3>
        <p className="text-sm text-[#64748B]">No governance context recorded for this decision.</p>
      </div>
    );
  }

  const hold = context.operatorHold != null ? HOLD_LABELS[context.operatorHold] : undefined;

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
      <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8] mb-3">
        Decision Context
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {timestamp && (
          <>
            <dt className="text-[#64748B]">Decided At</dt>
            <dd className="text-[#CBD5E1] font-mono text-xs">
              {new Date(timestamp).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </dd>
          </>
        )}
        {context.lifecycleState !== undefined && (
          <>
            <dt className="text-[#64748B]">Lifecycle State</dt>
            <dd className="text-[#CBD5E1]">{formatLifecycleState(context.lifecycleState)}</dd>
          </>
        )}
        {hold && (
          <>
            <dt className="text-[#64748B]">Operator Hold</dt>
            <dd style={{ color: hold.color }}>{hold.label}</dd>
          </>
        )}
        {context.suppressionActive !== undefined && (
          <>
            <dt className="text-[#64748B]">Monitoring Suppressed</dt>
            <dd className={context.suppressionActive ? "text-[#F59E0B]" : "text-[#10B981]"}>
              {context.suppressionActive ? "Yes" : "No"}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
