"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { MultiLevelTPNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: MultiLevelTPNodeData };

export const MultiLevelTPNode = memo(function MultiLevelTPNode({ id, data, selected }: Props) {
  const slLabel = {
    BREAKEVEN: "BE after TP1",
    TRAIL: "Trail after TP1",
    NONE: "No SL move",
  }[data.moveSLAfterTP1];

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="trademanagement"
      label={data.label}
      icon={NodeIcons.tradeManagement}
    >
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">TP1:</span>
          <span className="font-medium text-purple-400">
            {data.tp1Pips}p / {data.tp1Percent}%
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">TP2:</span>
          <span className="font-medium text-purple-400">
            {data.tp2Pips}p / {data.tp2Percent}%
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">TP3:</span>
          <span className="font-medium text-purple-400">
            {data.tp3Pips}p / {data.tp3Percent}%
          </span>
        </div>
        <div className="text-xs text-purple-300">{slLabel}</div>
      </div>
    </BaseNode>
  );
});
