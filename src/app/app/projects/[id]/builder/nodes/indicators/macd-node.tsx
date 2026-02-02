"use client";

import type { NodeProps } from "@xyflow/react";
import type { MACDNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: MACDNodeData };

export function MACDNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="indicator"
      label={data.label}
      icon={NodeIcons.indicator}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">Fast:</span>
          <span className="font-medium">{data.fastPeriod}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Slow:</span>
          <span className="font-medium">{data.slowPeriod}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Signal:</span>
          <span className="font-medium">{data.signalPeriod}</span>
        </div>
      </div>
    </BaseNode>
  );
}
