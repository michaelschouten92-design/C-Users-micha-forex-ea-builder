"use client";

import type { NodeProps } from "@xyflow/react";
import type { CloseConditionNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: CloseConditionNodeData };

const directionLabels = {
  BUY: "Close Buy",
  SELL: "Close Sell",
  BOTH: "Close Both",
};

export function CloseConditionNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="trading"
      label={data.label}
      icon={NodeIcons.exit}
      inputHandles={1}
      outputHandles={0}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">Direction:</span>
          <span className="font-medium">{directionLabels[data.closeDirection]}</span>
        </div>
      </div>
    </BaseNode>
  );
}
