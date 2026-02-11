"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { RSIReversalEntryData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: RSIReversalEntryData };

export const RSIReversalEntryNode = memo(function RSIReversalEntryNode({
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
          <span className="text-[#94A3B8]">Timeframe</span>
          <span className="text-white font-medium">{data.timeframe ?? "H1"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">RSI Period</span>
          <span className="text-white font-medium">{data.rsiPeriod}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">OB / OS</span>
          <span className="text-white font-medium">
            {data.overboughtLevel} / {data.oversoldLevel}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Risk</span>
          <span className="text-white font-medium">{data.riskPercent}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">SL / TP</span>
          <span className="text-white font-medium">
            {data.slMethod === "PIPS"
              ? `${data.slFixedPips ?? 50} pips`
              : data.slMethod === "PERCENT"
                ? `${data.slPercent ?? 1}%`
                : `${data.slAtrMultiplier}× ATR`}{" "}
            / {data.tpRMultiple}R
          </span>
        </div>
        {data.trendFilter && (
          <div className="flex gap-1 mt-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[#10B981]">
              Trend
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  );
});
