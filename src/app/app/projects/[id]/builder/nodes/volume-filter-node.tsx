"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { VolumeFilterNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: VolumeFilterNodeData };

const MODE_LABELS: Record<string, string> = {
  ABOVE_AVERAGE: "Above Avg",
  BELOW_AVERAGE: "Below Avg",
  SPIKE: "Spike",
};

export const VolumeFilterNode = memo(function VolumeFilterNode({ id, data, selected }: Props) {
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
        <div>
          Vol SMA({data.volumePeriod}) x{data.volumeMultiplier}
        </div>
        <div>{MODE_LABELS[data.filterMode] ?? data.filterMode}</div>
      </div>
    </BaseNode>
  );
});
