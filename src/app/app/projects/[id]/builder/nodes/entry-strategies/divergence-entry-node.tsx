"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { DivergenceEntryData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: DivergenceEntryData };

export const DivergenceEntryNode = memo(function DivergenceEntryNode({
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
          <span className="text-[#94A3B8]">Indicator</span>
          <span className="text-white font-medium">
            {data.indicator === "MACD"
              ? `MACD(${data.macdFast}/${data.macdSlow}/${data.macdSignal})`
              : `RSI(${data.rsiPeriod})`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Lookback</span>
          <span className="text-white font-medium">{data.lookbackBars} bars</span>
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
      </div>
    </BaseNode>
  );
});
