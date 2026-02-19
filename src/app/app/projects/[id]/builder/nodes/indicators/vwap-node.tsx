"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { VWAPNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: VWAPNodeData };

export const VWAPNode = memo(function VWAPNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">Reset:</span>
          <span className="font-medium capitalize">{data.resetPeriod}</span>
        </div>
      </div>
    </BaseNode>
  );
});
