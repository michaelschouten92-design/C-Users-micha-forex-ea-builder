"use client";

import type { NodeProps } from "@xyflow/react";
import type { PlaceBuyNodeData, PlaceSellNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

const methodLabels = {
  FIXED_LOT: "Fixed Lot",
  RISK_PERCENT: "Risk %",
};

type PlaceBuyProps = NodeProps & { data: PlaceBuyNodeData };

export function PlaceBuyNode({ id, data, selected }: PlaceBuyProps) {
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
      category={data.category === "trading" ? "trading" : "entry"}
      label={data.label}
      icon={
        <svg
          className="w-4 h-4 text-green-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
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
          <span className="font-medium text-green-400">{getValue()}</span>
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

type PlaceSellProps = NodeProps & { data: PlaceSellNodeData };

export function PlaceSellNode({ id, data, selected }: PlaceSellProps) {
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
      category={data.category === "trading" ? "trading" : "entry"}
      label={data.label}
      icon={
        <svg
          className="w-4 h-4 text-red-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 7l5 5 5-5M7 17l5-5 5 5" />
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
          <span className="font-medium text-red-400">{getValue()}</span>
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
