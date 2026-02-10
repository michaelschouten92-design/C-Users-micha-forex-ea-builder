"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { RangeBreakoutEntryData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: RangeBreakoutEntryData };

export const RangeBreakoutEntryNode = memo(function RangeBreakoutEntryNode({
  id,
  data,
  selected,
}: Props) {
  const rangeLabel =
    data.rangeMethod === "CUSTOM_TIME"
      ? `${String(data.customStartHour).padStart(2, "0")}:${String(data.customStartMinute).padStart(2, "0")} - ${String(data.customEndHour).padStart(2, "0")}:${String(data.customEndMinute).padStart(2, "0")}`
      : `${data.rangePeriod} candles (${data.rangeTimeframe ?? "H1"})`;

  const slLabel =
    data.slMethod === "RANGE_OPPOSITE"
      ? "Range SL"
      : data.slMethod === "PIPS"
        ? `${data.slFixedPips ?? 50} pips`
        : `${data.slAtrMultiplier}× ATR`;

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="entrystrategy"
      label={data.label}
      icon={NodeIcons.entryStrategy}
    >
      <div className="px-3 py-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Range</span>
          <span className="text-white font-medium">{rangeLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Risk</span>
          <span className="text-white font-medium">{data.riskPercent}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">SL / TP</span>
          <span className="text-white font-medium">
            {slLabel} / {data.tpRMultiple}R
          </span>
        </div>
        {data.htfTrendFilter && (
          <div className="flex gap-1 mt-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[#10B981]">
              HTF
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  );
});
