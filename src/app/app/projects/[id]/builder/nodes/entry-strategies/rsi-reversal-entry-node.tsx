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
          <span className="text-white font-medium">{data.timeframe}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">RSI Period</span>
          <span className="text-white font-medium">{data.period}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">OB / OS</span>
          <span className="text-white font-medium">
            {data.overboughtLevel} / {data.oversoldLevel}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Direction</span>
          <span className="text-white font-medium">{data.direction}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Risk</span>
          <span className="text-white font-medium">
            {data.sizingMethod === "RISK_PERCENT"
              ? `${data.riskPercent}%`
              : `${data.fixedLot} lots`}
          </span>
        </div>
      </div>
    </BaseNode>
  );
});
