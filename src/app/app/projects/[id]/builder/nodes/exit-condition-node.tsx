"use client";

import type { NodeProps } from "@xyflow/react";
import type { ExitConditionNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: ExitConditionNodeData };

const exitTypeLabels = {
  CLOSE_ALL: "Close All",
  CLOSE_BUY: "Close Buys",
  CLOSE_SELL: "Close Sells",
};

export function ExitConditionNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="condition"
      label={data.label}
      icon={NodeIcons.exit}
    >
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">Type:</span>
          <span className="font-medium">{exitTypeLabels[data.exitType]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Logic:</span>
          <span className="font-medium">{data.logic}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Rules:</span>
          <span className="font-medium">{data.rules.length}</span>
        </div>
      </div>
    </BaseNode>
  );
}
