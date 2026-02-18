"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { MaxSpreadNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: MaxSpreadNodeData };

export const MaxSpreadNode = memo(function MaxSpreadNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="timing"
      label={data.label}
      icon={NodeIcons.timing}
    >
      <div className="text-xs text-zinc-400">Max: {data.maxSpreadPips} pips</div>
    </BaseNode>
  );
});
