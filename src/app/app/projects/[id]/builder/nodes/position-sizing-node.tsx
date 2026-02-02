"use client";

import type { NodeProps } from "@xyflow/react";
import type { PositionSizingNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: PositionSizingNodeData };

const methodLabels = {
  FIXED_LOT: "Fixed Lot",
  RISK_PERCENT: "Risk %",
  BALANCE_PERCENT: "Balance %",
};

export function PositionSizingNode({ id, data, selected }: Props) {
  const getValue = () => {
    switch (data.method) {
      case "FIXED_LOT":
        return `${data.fixedLot} lots`;
      case "RISK_PERCENT":
        return `${data.riskPercent}%`;
      case "BALANCE_PERCENT":
        return `${data.balancePercent}%`;
    }
  };

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="trading"
      label={data.label}
      icon={NodeIcons.trading}
      inputHandles={0}
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
        <div className="flex justify-between">
          <span className="text-zinc-500">Range:</span>
          <span className="font-medium">{data.minLot} - {data.maxLot}</span>
        </div>
      </div>
    </BaseNode>
  );
}
