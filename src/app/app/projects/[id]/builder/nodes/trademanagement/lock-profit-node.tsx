"use client";

import type { NodeProps } from "@xyflow/react";
import type { LockProfitNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: LockProfitNodeData };

export function LockProfitNode({ id, data, selected }: Props) {
  const lockDisplay = data.method === "PERCENTAGE"
    ? `${data.lockPercent}% of profit`
    : `${data.lockPips} pips`;

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="trademanagement"
      label={data.label}
      icon={NodeIcons.tradeManagement}
    >
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Lock:</span>
          <span className="font-medium text-purple-400">{lockDisplay}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Check every:</span>
          <span className="font-medium">{data.checkIntervalPips} pips</span>
        </div>
      </div>
    </BaseNode>
  );
}
