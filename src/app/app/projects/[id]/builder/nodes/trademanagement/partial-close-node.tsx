"use client";

import type { NodeProps } from "@xyflow/react";
import type { PartialCloseNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: PartialCloseNodeData };

export function PartialCloseNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">Close:</span>
          <span className="font-medium text-purple-400">{data.closePercent}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">At profit:</span>
          <span className="font-medium">
            {(data.triggerMethod ?? "PIPS") === "PERCENT"
              ? `${data.triggerPercent ?? 1}%`
              : `${data.triggerPips} pips`}
          </span>
        </div>
        {data.moveSLToBreakeven && (
          <div className="text-xs text-purple-300">+ Move SL to breakeven</div>
        )}
      </div>
    </BaseNode>
  );
}
