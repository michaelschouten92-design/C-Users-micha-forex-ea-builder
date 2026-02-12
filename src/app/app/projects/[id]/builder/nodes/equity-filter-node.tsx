"use client";

import type { NodeProps } from "@xyflow/react";
import type { EquityFilterNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: EquityFilterNodeData };

export function EquityFilterNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="timing"
      label={data.label}
      icon={NodeIcons.timing}
    >
      <div className="text-xs text-zinc-400">Max DD: {data.maxDrawdownPercent}%</div>
    </BaseNode>
  );
}
