"use client";

import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  accentColor: string;
  subValue?: string;
  subColor?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function StatCard({
  label,
  value,
  icon,
  accentColor,
  subValue,
  subColor,
  actionLabel,
  onAction,
}: StatCardProps) {
  return (
    <div className="rounded-xl bg-[#0D0D12]/60 border border-[#1E293B]/40 p-4 flex flex-col justify-between min-h-[130px]">
      {/* Header: label + icon */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#64748B] font-medium leading-tight">
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
      </div>

      {/* Value */}
      <div className="mb-2">
        <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: accentColor }}>
          {value}
        </p>
        {subValue && (
          <p
            className="text-[11px] font-medium mt-1 tabular-nums"
            style={{ color: subColor ?? "#64748B" }}
          >
            {subValue}
          </p>
        )}
      </div>

      {/* Action link */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-[11px] font-medium transition-colors mt-auto"
          style={{ color: accentColor }}
        >
          {actionLabel}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
