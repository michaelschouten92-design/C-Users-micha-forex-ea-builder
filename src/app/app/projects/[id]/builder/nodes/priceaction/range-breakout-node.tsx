"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { RangeBreakoutNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: RangeBreakoutNodeData };

const rangeTypeLabels: Record<string, string> = {
  PREVIOUS_CANDLES: "Candles",
  SESSION: "Session",
  TIME_WINDOW: "Time Window",
};

const directionLabels: Record<string, string> = {
  BUY_ON_HIGH: "Buy High",
  SELL_ON_LOW: "Sell Low",
  BOTH: "Both",
};

const sessionLabels: Record<string, string> = {
  ASIAN: "Asian",
  LONDON: "London",
  NEW_YORK: "New York",
  CUSTOM: "Custom",
};

export const RangeBreakoutNode = memo(function RangeBreakoutNode({ id, data, selected }: Props) {
  const getRangeDescription = () => {
    switch (data.rangeType) {
      case "PREVIOUS_CANDLES":
        return `${data.lookbackCandles} candles`;
      case "SESSION":
        return sessionLabels[data.rangeSession];
      case "TIME_WINDOW":
        return `${String(data.sessionStartHour).padStart(2, "0")}:${String(data.sessionStartMinute).padStart(2, "0")} - ${String(data.sessionEndHour).padStart(2, "0")}:${String(data.sessionEndMinute).padStart(2, "0")}`;
      default:
        return "";
    }
  };

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="priceaction"
      label={data.label}
      icon={NodeIcons.priceaction}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">Timeframe:</span>
          <span className="font-medium">{data.timeframe}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Range:</span>
          <span className="font-medium">
            {rangeTypeLabels[data.rangeType]} ({getRangeDescription()})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Direction:</span>
          <span className="font-medium">{directionLabels[data.breakoutDirection]}</span>
        </div>
        {data.minRangePips > 0 && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Min Range:</span>
            <span className="font-medium">{data.minRangePips} pips</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
});
