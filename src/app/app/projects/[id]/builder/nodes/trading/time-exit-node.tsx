"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { TimeExitNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: TimeExitNodeData };

export const TimeExitNode = memo(function TimeExitNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category={data.category === "trading" ? "trading" : "riskmanagement"}
      label={data.label}
      icon={NodeIcons.exit}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">After:</span>
          <span className="font-medium">{data.exitAfterBars} bars</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Timeframe:</span>
          <span className="font-medium">{data.exitTimeframe}</span>
        </div>
      </div>
    </BaseNode>
  );
});
