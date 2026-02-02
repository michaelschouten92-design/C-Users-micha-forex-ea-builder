"use client";

import type { NodeProps } from "@xyflow/react";
import type { ADXNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: ADXNodeData };

export function ADXNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">Period:</span>
          <span className="font-medium">{data.period}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Trend Level:</span>
          <span className="font-medium">{data.trendLevel}</span>
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          ADX &gt; {data.trendLevel} = trending market
        </div>
      </div>
    </BaseNode>
  );
}
