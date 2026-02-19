"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { MarketStructureNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: MarketStructureNodeData };

export const MarketStructureNode = memo(function MarketStructureNode({
  id,
  data,
  selected,
}: Props) {
  const features: string[] = [];
  if (data.detectBOS) features.push("BOS");
  if (data.detectChoCh) features.push("ChoCh");
  const featureLabel = features.length > 0 ? features.join(", ") : "None";

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="priceaction"
      label={data.label}
      icon={NodeIcons.priceaction}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">Timeframe:</span>
          <span className="font-medium">{data.timeframe}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Swing:</span>
          <span className="font-medium">{data.swingStrength} bars</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Detect:</span>
          <span className="font-medium">{featureLabel}</span>
        </div>
      </div>
    </BaseNode>
  );
});
