"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { BBSqueezeNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: BBSqueezeNodeData };

export const BBSqueezeNode = memo(function BBSqueezeNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">BB/KC:</span>
          <span className="font-medium">
            {data.bbPeriod}/{data.kcPeriod}
          </span>
        </div>
      </div>
    </BaseNode>
  );
});
