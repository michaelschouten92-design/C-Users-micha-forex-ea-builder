"use client";

import type { NodeProps } from "@xyflow/react";
import type { AlwaysNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: AlwaysNodeData };

export function AlwaysNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="timing"
      label={data.label}
      icon={NodeIcons.timing}
    >
      <div className="text-xs text-zinc-400">
        Trading enabled at all times
      </div>
    </BaseNode>
  );
}
