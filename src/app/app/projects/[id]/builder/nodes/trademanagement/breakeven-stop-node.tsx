"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { BreakevenStopNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: BreakevenStopNodeData };

export const BreakevenStopNode = memo(function BreakevenStopNode({ id, data, selected }: Props) {
  const triggerDisplay = {
    PIPS: `${data.triggerPips} pips profit`,
    ATR: `${data.triggerAtrMultiplier}x ATR profit`,
    PERCENTAGE: `${data.triggerPercent}% profit`,
  }[data.trigger];

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
          <span className="text-zinc-500">Trigger:</span>
          <span className="font-medium text-purple-400">{triggerDisplay}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Lock:</span>
          <span className="font-medium">+{data.lockPips} pips</span>
        </div>
      </div>
    </BaseNode>
  );
});
