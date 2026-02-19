"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { RSINodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: RSINodeData };

export const RSINode = memo(function RSINode({ id, data, selected }: Props) {
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
          <span className="text-[#94A3B8]">Timeframe:</span>
          <span className="font-medium">{data.timeframe}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Period:</span>
          <span className="font-medium">{data.period}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]" title="Overbought / Oversold">
            OB/OS:
          </span>
          <span className="font-medium">
            {data.overboughtLevel}/{data.oversoldLevel}
          </span>
        </div>
      </div>
    </BaseNode>
  );
});
