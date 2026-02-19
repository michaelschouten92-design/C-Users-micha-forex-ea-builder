"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { FairValueGapNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: FairValueGapNodeData };

export const FairValueGapNode = memo(function FairValueGapNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">Min Gap:</span>
          <span className="font-medium">{data.minGapSize} pips</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Fill %:</span>
          <span className="font-medium">{data.fillPercentage}%</span>
        </div>
      </div>
    </BaseNode>
  );
});
