"use client";

import type { NodeProps } from "@xyflow/react";
import type { SupportResistanceNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: SupportResistanceNodeData };

export function SupportResistanceNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="priceaction"
      label={data.label}
      icon={NodeIcons.priceaction}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">Timeframe:</span>
          <span className="font-medium">{data.timeframe}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Lookback:</span>
          <span className="font-medium">{data.lookbackPeriod} bars</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Touches:</span>
          <span className="font-medium">{data.touchCount}</span>
        </div>
      </div>
    </BaseNode>
  );
}
