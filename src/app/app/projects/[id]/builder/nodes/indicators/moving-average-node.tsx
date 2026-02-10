"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { MovingAverageNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: MovingAverageNodeData };

export const MovingAverageNode = memo(function MovingAverageNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">Method:</span>
          <span className="font-medium">{data.method}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Period:</span>
          <span className="font-medium">{data.period}</span>
        </div>
      </div>
    </BaseNode>
  );
});
