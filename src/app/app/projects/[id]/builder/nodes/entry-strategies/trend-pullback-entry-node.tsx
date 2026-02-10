"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { TrendPullbackEntryData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: TrendPullbackEntryData };

export const TrendPullbackEntryNode = memo(function TrendPullbackEntryNode({
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
          <span className="text-[#94A3B8]">Trend EMA</span>
          <span className="text-white font-medium">{data.trendEma}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">RSI Pullback</span>
          <span className="text-white font-medium">
            {data.rsiPullbackLevel} / {100 - data.rsiPullbackLevel}
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
        {data.londonSessionOnly && (
          <div className="flex gap-1 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[#10B981]">
              London
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  );
});
