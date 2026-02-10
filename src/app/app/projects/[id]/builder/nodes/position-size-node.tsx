"use client";

import type { NodeProps } from "@xyflow/react";
import type { PositionSizeNodeData } from "@/types/builder";
import { BaseNode } from "./base-node";

const methodLabels = {
  FIXED_LOT: "Fixed Lot",
  RISK_PERCENT: "Risk %",
};

type PositionSizeProps = NodeProps & { data: PositionSizeNodeData };

export function PositionSizeNode({ id, data, selected }: PositionSizeProps) {
  const getValue = () => {
    switch (data.method) {
      case "FIXED_LOT":
        return `${data.fixedLot} lots`;
      case "RISK_PERCENT":
        return `${data.riskPercent}%`;
    }
  };

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="riskmanagement"
      label={data.label}
      icon={
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
          />
        </svg>
      }
      inputHandles={1}
      outputHandles={1}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">Method:</span>
          <span className="font-medium">{methodLabels[data.method]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Value:</span>
          <span className="font-medium text-rose-400">{getValue()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Range:</span>
          <span className="font-medium">
            {data.minLot} - {data.maxLot}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}
