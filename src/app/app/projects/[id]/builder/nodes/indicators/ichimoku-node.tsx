"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { IchimokuNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: IchimokuNodeData };

export const IchimokuNode = memo(function IchimokuNode({ id, data, selected }: Props) {
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
          <span className="text-zinc-500">Timeframe:</span>
          <span className="font-medium">{data.timeframe}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Tenkan/Kijun/Senkou:</span>
          <span className="font-medium">
            {data.tenkanPeriod}/{data.kijunPeriod}/{data.senkouBPeriod}
          </span>
        </div>
      </div>
    </BaseNode>
  );
});
