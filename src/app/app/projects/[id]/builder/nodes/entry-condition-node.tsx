"use client";

import type { NodeProps } from "@xyflow/react";
import type { EntryConditionNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: EntryConditionNodeData };

const directionColors = {
  BUY: "text-green-400 bg-green-900/50",
  SELL: "text-red-400 bg-red-900/50",
  BOTH: "text-purple-400 bg-purple-900/50",
};

export function EntryConditionNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="condition"
      label={data.label}
      icon={NodeIcons.entry}
    >
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-zinc-500">Direction:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${directionColors[data.direction]}`}>
            {data.direction}
          </span>
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
