"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { OrderBlockNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: OrderBlockNodeData };

export const OrderBlockNode = memo(function OrderBlockNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">Lookback:</span>
          <span className="font-medium">{data.lookbackPeriod} bars</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Min Size:</span>
          <span className="font-medium">{data.minBlockSize} pips</span>
        </div>
      </div>
    </BaseNode>
  );
});
