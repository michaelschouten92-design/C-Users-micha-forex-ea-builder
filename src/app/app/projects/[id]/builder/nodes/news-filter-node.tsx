"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { NewsFilterNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: NewsFilterNodeData };

export const NewsFilterNode = memo(function NewsFilterNode({ id, data, selected }: Props) {
  const impacts: string[] = [];
  if (data.highImpact) impacts.push("High");
  if (data.mediumImpact) impacts.push("Med");
  if (data.lowImpact) impacts.push("Low");

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="timing"
      label={data.label}
      icon={NodeIcons.timing}
    >
      <div className="text-xs text-zinc-400">
        ±{data.hoursBefore}/{data.hoursAfter}h | {impacts.join(", ") || "None"}
      </div>
    </BaseNode>
  );
});
