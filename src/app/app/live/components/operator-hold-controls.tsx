"use client";

import { useTransition, useState } from "react";
import { updateOperatorHold } from "../actions";

interface InstanceHoldInfo {
  id: string;
  eaName: string | null;
  symbol: string | null;
  operatorHold: string | null;
}

export function OperatorHoldControls({ instances }: { instances: InstanceHoldInfo[] }) {
  if (instances.length === 0) return null;

  return (
    <div
      id="operator-hold"
      className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5"
    >
      <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8] mb-3">
        Operator Hold
      </h3>
      <div className="space-y-3">
        {instances.map((inst) => (
          <InstanceHoldRow key={inst.id} instance={inst} />
        ))}
      </div>
      <p className="mt-4 text-[10px] text-[#64748B] leading-relaxed">
        Halting an instance overrides all automated governance decisions.
      </p>
    </div>
  );
}

const HOLD_STATUS: Record<string, { dot: string; badge: string; badgeColor: string }> = {
  HALTED: { dot: "#EF4444", badge: "Halted", badgeColor: "rgba(239,68,68,0.15)" },
  OVERRIDE_PENDING: {
    dot: "#F59E0B",
    badge: "Override pending",
    badgeColor: "rgba(245,158,11,0.15)",
  },
};

function InstanceHoldRow({ instance }: { instance: InstanceHoldInfo }) {
  const [isTransitioning, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currentHold, setCurrentHold] = useState(instance.operatorHold);

  const isHalted = currentHold === "HALTED";
  const isOverridePending = currentHold === "OVERRIDE_PENDING";
  const canToggle = currentHold === "NONE" || currentHold === "HALTED";
  const label = instance.eaName || instance.symbol || instance.id.slice(0, 8);
  const status = HOLD_STATUS[currentHold ?? ""];

  function handleToggle() {
    setError(null);
    const targetHold = isHalted ? "NONE" : "HALTED";

    startTransition(async () => {
      const result = await updateOperatorHold(instance.id, targetHold);
      if (result.ok) {
        setCurrentHold(targetHold);
      } else {
        setError(
          result.code === "NOT_OWNER"
            ? "Instance not found or access denied."
            : result.code === "INVALID_TRANSITION"
              ? "Cannot change hold in current state."
              : "Failed to update. Try again."
        );
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: status?.dot ?? "#10B981" }}
          />
          <span className="text-sm text-[#CBD5E1] truncate">{label}</span>
          {status && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: status.badgeColor, color: status.dot }}
            >
              {status.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <span className="text-[10px] text-[#EF4444] max-w-[140px] truncate">{error}</span>
          )}
          <button
            onClick={handleToggle}
            disabled={isTransitioning || !canToggle}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isHalted
                ? "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.25)] text-[#10B981] hover:bg-[rgba(16,185,129,0.2)]"
                : "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.25)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.2)]"
            }`}
          >
            {isTransitioning ? "…" : isHalted ? "Release halt" : "Halt execution"}
          </button>
        </div>
      </div>
      {isOverridePending && (
        <p className="text-[10px] text-[#F59E0B] mt-1.5 ml-3.5">
          Controls are temporarily locked while an override is pending review.
        </p>
      )}
    </div>
  );
}
