"use client";

import { useState } from "react";

interface AlertGroup {
  statusLabel: string;
  reason: string;
  actionLabel: string;
  color: string;
  members: Array<{ id: string; identity: string; onClick: () => void }>;
}

interface AlertsSidebarProps {
  alertGroups: AlertGroup[];
  totalCount: number;
  onDismiss: (id: string) => void;
  onConfigureAlerts: () => void;
}

const COLLAPSED_LIMIT = 3;

// Map severity to visual treatment
const SEVERITY_BG: Record<string, string> = {
  "Edge at risk": "bg-[#EF4444]/[0.07] border-[#EF4444]/20",
  "Baseline suspended": "bg-[#F59E0B]/[0.07] border-[#F59E0B]/20",
  "Connection error": "bg-[#EF4444]/[0.07] border-[#EF4444]/20",
  Unstable: "bg-[#F59E0B]/[0.07] border-[#F59E0B]/20",
};

export function AlertsSidebar({
  alertGroups,
  totalCount,
  onDismiss,
  onConfigureAlerts,
}: AlertsSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  return (
    <div className="rounded-xl bg-[#0D0D12]/60 border border-[#1E293B]/40 p-4 flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-[#EF4444]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.08em]">Alerts</h3>
          </div>
          {totalCount > 0 && (
            <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.4)]">
              {totalCount}
            </span>
          )}
        </div>
        <button
          onClick={onConfigureAlerts}
          className="p-1.5 rounded-md text-[#64748B] hover:text-[#A1A1AA] hover:bg-white/5 transition-colors"
          title="Configure alerts"
          aria-label="Configure alert rules"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {/* Alert list */}
      {alertGroups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
          <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-[#10B981]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span className="text-xs text-[#64748B]">All clear</span>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
          {alertGroups.map((group, gi) => {
            const isExpanded = expandedGroups.has(gi);
            const visibleMembers = isExpanded
              ? group.members
              : group.members.slice(0, COLLAPSED_LIMIT);
            const hiddenCount = group.members.length - COLLAPSED_LIMIT;
            const severityBg =
              SEVERITY_BG[group.statusLabel] ?? "bg-white/[0.02] border-[#1E293B]/30";

            return (
              <div key={gi} className={`rounded-lg border p-3 ${severityBg}`}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-[11px] font-bold" style={{ color: group.color }}>
                    {group.statusLabel}
                  </span>
                  <span className="text-[10px] text-[#64748B] tabular-nums font-medium">
                    {group.members.length}
                  </span>
                </div>
                <p className="text-[10px] text-[#7C8DB0] pl-4 mb-2">{group.reason}</p>

                {/* Members */}
                <div className="space-y-1 pl-4">
                  {visibleMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-1 group/alert">
                      <button
                        onClick={m.onClick}
                        className="text-[11px] text-[#FAFAFA] hover:text-white transition-colors truncate text-left font-medium"
                      >
                        {m.identity}
                        <span className="text-[#52525B] mx-1">&rarr;</span>
                        <span className="font-semibold" style={{ color: group.color }}>
                          {group.actionLabel}
                        </span>
                      </button>
                      <button
                        onClick={() => onDismiss(m.id)}
                        className="text-[11px] text-[#334155] hover:text-[#EF4444] transition-colors opacity-0 group-hover/alert:opacity-100 flex-shrink-0 p-0.5"
                        title="Dismiss"
                        aria-label={`Dismiss alert for ${m.identity}`}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {!isExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() => setExpandedGroups((prev) => new Set([...prev, gi]))}
                      className="text-[10px] text-[#818CF8] hover:text-[#A78BFA] transition-colors mt-1 font-medium"
                    >
                      +{hiddenCount} more
                    </button>
                  )}
                  {isExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() =>
                        setExpandedGroups((prev) => {
                          const next = new Set(prev);
                          next.delete(gi);
                          return next;
                        })
                      }
                      className="text-[10px] text-[#818CF8] hover:text-[#A78BFA] transition-colors mt-1 font-medium"
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
