"use client";

import { Sparkline } from "./sparkline";
import { formatCurrency } from "./utils";

export function SummaryCard({
  label,
  subtitle,
  value,
  isCurrency = true,
  sparklineData,
}: {
  label: string;
  subtitle?: string;
  value: number;
  isCurrency?: boolean;
  sparklineData?: number[];
}) {
  const accentColor = isCurrency ? (value >= 0 ? "#10B981" : "#EF4444") : "#818CF8";

  return (
    <div
      className="bg-[#0F0A1A] border border-[#1E293B]/60 rounded-lg px-4 py-4 relative overflow-hidden"
      style={{ boxShadow: `0 1px 16px ${accentColor}06` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: accentColor, opacity: 0.3 }}
      />
      <p className="text-[9px] uppercase tracking-[0.15em] text-[#475569] font-medium mb-2">
        {label}
      </p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p
            className={`text-3xl font-bold tabular-nums leading-none ${isCurrency ? (value >= 0 ? "text-[#10B981]" : "text-[#EF4444]") : "text-white"}`}
          >
            {isCurrency ? formatCurrency(value) : value}
          </p>
          {subtitle && <p className="text-[10px] text-[#475569] mt-1.5">{subtitle}</p>}
        </div>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} color={isCurrency ? undefined : "#818CF8"} />
        )}
      </div>
    </div>
  );
}
