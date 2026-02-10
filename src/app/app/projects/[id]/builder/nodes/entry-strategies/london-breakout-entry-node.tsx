"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { LondonBreakoutEntryData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: LondonBreakoutEntryData };

export const LondonBreakoutEntryNode = memo(function LondonBreakoutEntryNode({
  id,
  data,
  selected,
}: Props) {
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
          <span className="text-white font-medium">Asia Session</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Risk</span>
          <span className="text-white font-medium">{data.riskPercent}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">SL / TP</span>
          <span className="text-white font-medium">
            {data.slAtrMultiplier}× ATR / {data.tpRMultiple}R
          </span>
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {data.maxOneTradePerDay && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[#10B981]">
              1/day
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[#10B981]">
            {data.tradeLondonHours}h window
          </span>
        </div>
      </div>
    </BaseNode>
  );
});
