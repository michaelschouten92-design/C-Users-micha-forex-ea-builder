"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { StopLossNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: StopLossNodeData };

const methodLabels: Record<string, string> = {
  FIXED_PIPS: "Fixed Pips",
  ATR_BASED: "ATR-Based",
  PERCENT: "Percentage",
  INDICATOR: "Indicator",
  RANGE_OPPOSITE: "Range Opposite",
};

export const StopLossNode = memo(function StopLossNode({ id, data, selected }: Props) {
  const getValue = () => {
    switch (data.method) {
      case "FIXED_PIPS":
        return `${data.fixedPips} pips`;
      case "ATR_BASED":
        return `ATR(${data.atrPeriod}) x ${data.atrMultiplier}`;
      case "PERCENT":
        return `${((data as Record<string, unknown>).slPercent as number) ?? 1}%`;
      case "INDICATOR":
        return "From indicator";
    }
  };

  return (
    <BaseNode
      id={id}
      selected={selected}
      category={data.category === "trading" ? "trading" : "riskmanagement"}
      label={data.label}
      icon={NodeIcons.stopLoss}
      inputHandles={1}
      outputHandles={1}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">Method:</span>
          <span className="font-medium">{methodLabels[data.method]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Value:</span>
          <span className="font-medium">{getValue()}</span>
        </div>
      </div>
    </BaseNode>
  );
});
