"use client";

import type { NodeProps } from "@xyflow/react";
import type { BollingerBandsNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: BollingerBandsNodeData };

export function BollingerBandsNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">Deviation:</span>
          <span className="font-medium">{data.deviation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Price:</span>
          <span className="font-medium">{data.appliedPrice}</span>
        </div>
      </div>
    </BaseNode>
  );
}
