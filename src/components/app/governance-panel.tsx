/**
 * GovernancePanel — control-layer verdict for a deployment.
 *
 * Shows what the governance layer concludes about a deployment:
 * governance state, recommended action, heartbeat authority alignment,
 * active signals, and the summary reason.
 *
 * Positioned after the system recommendation on the instance detail page.
 * Clearly distinguished from raw monitoring truth (Layer 1).
 *
 * This panel answers: "What does the control layer think should happen?"
 * The monitoring sections above answer: "What is actually happening?"
 */

import type {
  DeploymentGovernance,
  GovernanceState,
  GovernanceAction,
} from "@/lib/semantic-layers";

// ── State display config ─────────────────────────────────

const STATE_CONFIG: Record<GovernanceState, { color: string; label: string; icon: string }> = {
  CLEAR: { color: "#10B981", label: "Clear", icon: "check" },
  OBSERVATION: { color: "#7C8DB0", label: "Observation", icon: "eye" },
  REVIEW_REQUIRED: { color: "#F59E0B", label: "Review Required", icon: "alert" },
  RESTRICTED: { color: "#EF4444", label: "Restricted", icon: "lock" },
  INVALIDATED: { color: "#EF4444", label: "Invalidated", icon: "stop" },
};

const ACTION_CONFIG: Record<GovernanceAction, { color: string; label: string }> = {
  NONE: { color: "#10B981", label: "No action needed" },
  OBSERVE: { color: "#7C8DB0", label: "Observe" },
  REVIEW: { color: "#F59E0B", label: "Review recommended" },
  PAUSE: { color: "#F59E0B", label: "Pause recommended" },
  STOP: { color: "#EF4444", label: "Stop recommended" },
};

const AUTHORITY_CONFIG: Record<string, { color: string; label: string }> = {
  RUN: { color: "#10B981", label: "RUN" },
  PAUSE: { color: "#F59E0B", label: "PAUSE" },
  STOP: { color: "#EF4444", label: "STOP" },
};

const CONFIDENCE_CONFIG: Record<string, { color: string; label: string }> = {
  HIGH: { color: "#10B981", label: "High" },
  MEDIUM: { color: "#F59E0B", label: "Medium" },
  LOW: { color: "#71717A", label: "Low" },
};

// ── Component ────────────────────────────────────────────

interface GovernancePanelProps {
  governance: DeploymentGovernance;
}

export function GovernancePanel({ governance }: GovernancePanelProps) {
  const stateConfig = STATE_CONFIG[governance.state];
  const actionConfig = ACTION_CONFIG[governance.action];

  return (
    <div
      className="rounded-xl bg-[#111114] p-4"
      style={{
        border: `1px solid ${stateConfig.color}20`,
        borderLeft: `3px solid ${stateConfig.color}`,
      }}
    >
      {/* Header: State + Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <StateIcon icon={stateConfig.icon} color={stateConfig.color} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
                Governance
              </h3>
              <span className="text-xs font-semibold" style={{ color: stateConfig.color }}>
                {stateConfig.label}
              </span>
            </div>
            <p className="text-[11px] text-[#A1A1AA] mt-0.5">{governance.summaryLine}</p>
          </div>
        </div>

        {/* Right: Authority + Confidence */}
        <div className="flex items-center gap-3">
          {governance.heartbeatAuthority && (
            <div className="text-center">
              <p className="text-[9px] text-[#52525B] uppercase">Authority</p>
              <p
                className="text-xs font-bold"
                style={{
                  color: AUTHORITY_CONFIG[governance.heartbeatAuthority]?.color ?? "#71717A",
                }}
              >
                {AUTHORITY_CONFIG[governance.heartbeatAuthority]?.label ?? "—"}
              </p>
            </div>
          )}
          <div className="text-center">
            <p className="text-[9px] text-[#52525B] uppercase">Confidence</p>
            <p
              className="text-xs font-medium"
              style={{ color: CONFIDENCE_CONFIG[governance.confidence]?.color ?? "#71717A" }}
            >
              {CONFIDENCE_CONFIG[governance.confidence]?.label ?? governance.confidence}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-[#52525B] uppercase">Action</p>
            <p className="text-xs font-medium" style={{ color: actionConfig.color }}>
              {actionConfig.label}
            </p>
          </div>
        </div>
      </div>

      {/* Signals list */}
      {governance.signals.length > 0 && (
        <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex flex-wrap gap-1.5">
            {governance.signals.map((signal, i) => (
              <span
                key={signal}
                className="text-[10px] px-2 py-0.5 rounded-full border bg-[rgba(255,255,255,0.02)]"
                style={{
                  color: i === 0 ? stateConfig.color : "#71717A",
                  borderColor: i === 0 ? `${stateConfig.color}25` : "rgba(255,255,255,0.06)",
                }}
                title={governance.reasons[i]}
              >
                {governance.reasons[i]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── State icon ───────────────────────────────────────────

function StateIcon({ icon, color }: { icon: string; color: string }) {
  const cls = "w-5 h-5 flex-shrink-0";

  switch (icon) {
    case "check":
      return (
        <svg
          className={cls}
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "eye":
      return (
        <svg
          className={cls}
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      );
    case "alert":
      return (
        <svg
          className={cls}
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      );
    case "lock":
      return (
        <svg
          className={cls}
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      );
    case "stop":
      return (
        <svg
          className={cls}
          style={{ color }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      );
    default:
      return null;
  }
}
