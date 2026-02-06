"use client";

import type { NodeProps } from "@xyflow/react";
import type { TrailingStopNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: TrailingStopNodeData };

export function TrailingStopNode({ id, data, selected }: Props) {
  const methodDisplay = {
    FIXED_PIPS: `${data.trailPips} pips`,
    ATR_BASED: `${data.trailAtrMultiplier}x ATR`,
    PERCENTAGE: `${data.trailPercent}%`,
  }[data.method];

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
          <span className="text-zinc-500">Trail:</span>
          <span className="font-medium text-purple-400">{methodDisplay}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Start after:</span>
          <span className="font-medium">{data.startAfterPips} pips</span>
        </div>
      </div>
    </BaseNode>
  );
}
