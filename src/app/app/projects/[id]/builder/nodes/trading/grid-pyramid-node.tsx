"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { GridPyramidNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: GridPyramidNodeData };

export const GridPyramidNode = memo(function GridPyramidNode({ id, data, selected }: Props) {
  const modeLabel = data.gridMode === "GRID" ? "Grid" : "Pyramid";
  const directionLabel = {
    BUY_ONLY: "Buy only",
    SELL_ONLY: "Sell only",
    BOTH: "Both",
  }[data.direction];

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="trading"
      label={data.label}
      icon={NodeIcons.entry}
    >
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Mode:</span>
          <span className="font-medium text-green-400">{modeLabel}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Spacing:</span>
          <span className="font-medium">{data.gridSpacing} pips</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Levels:</span>
          <span className="font-medium">{data.maxGridLevels}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Direction:</span>
          <span className="font-medium">{directionLabel}</span>
        </div>
        {data.lotMultiplier !== 1.0 && (
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Lot x:</span>
            <span className="font-medium">{data.lotMultiplier}</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
});
