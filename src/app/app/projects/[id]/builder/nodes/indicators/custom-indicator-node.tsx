"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { CustomIndicatorNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: CustomIndicatorNodeData };

export const CustomIndicatorNode = memo(function CustomIndicatorNode({
  id,
  data,
  selected,
}: Props) {
  const displayName = data.indicatorName || "(not set)";
  const paramCount = data.params?.length ?? 0;

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
          <span className="text-[#A1A1AA]">Timeframe:</span>
          <span className="font-medium">{data.timeframe}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#A1A1AA]">Indicator:</span>
          <span className="font-medium truncate max-w-[100px]" title={data.indicatorName}>
            {displayName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#A1A1AA]">Buffer:</span>
          <span className="font-medium">{data.bufferIndex}</span>
        </div>
        {paramCount > 0 && (
          <div className="flex justify-between">
            <span className="text-[#A1A1AA]">Params:</span>
            <span className="font-medium">{paramCount}</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
});
