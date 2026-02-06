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
          <span className="text-zinc-500">Timeframe:</span>
          <span className="font-medium">{data.timeframe}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Periods:</span>
          <span className="font-medium">{data.fastPeriod}/{data.slowPeriod}/{data.signalPeriod}</span>
        </div>
      </div>
    </BaseNode>
  );
}
