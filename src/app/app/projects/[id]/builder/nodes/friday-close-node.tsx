"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { FridayCloseFilterNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: FridayCloseFilterNodeData };

export const FridayCloseNode = memo(function FridayCloseNode({ id, data, selected }: Props) {
  const h = String(data.closeHour ?? 17).padStart(2, "0");
  const m = String(data.closeMinute ?? 0).padStart(2, "0");
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="timing"
      label={data.label}
      icon={NodeIcons.timing}
      showGlobalBadge
    >
      <div className="text-xs text-zinc-400">
        Friday {h}:{m}
      </div>
    </BaseNode>
  );
});
