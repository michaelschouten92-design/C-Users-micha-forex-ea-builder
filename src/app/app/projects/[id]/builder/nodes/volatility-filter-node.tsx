"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { VolatilityFilterNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: VolatilityFilterNodeData };

export const VolatilityFilterNode = memo(function VolatilityFilterNode({
  id,
  data,
  selected,
}: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="timing"
      label={data.label}
      icon={NodeIcons.timing}
    >
      <div className="text-xs text-zinc-400">
        <div>
          ATR({data.atrPeriod}) {data.atrTimeframe}
        </div>
        <div>
          {data.minAtrPips}–{data.maxAtrPips} pips
        </div>
      </div>
    </BaseNode>
  );
});
