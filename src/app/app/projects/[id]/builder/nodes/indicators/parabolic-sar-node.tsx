"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { ParabolicSARNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: ParabolicSARNodeData };

export const ParabolicSARNode = memo(function ParabolicSARNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">Step:</span>
          <span className="font-medium">{data.step}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Maximum:</span>
          <span className="font-medium">{data.maximum}</span>
        </div>
      </div>
    </BaseNode>
  );
});
