"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { PlaceBuyNodeData, PlaceSellNodeData } from "@/types/builder";
import { BaseNode } from "./base-node";

function formatSL(data: Record<string, unknown>): string {
  const method = data.slMethod as string;
  if (method === "FIXED_PIPS") return `${data.slFixedPips} pips`;
  if (method === "ATR_BASED") return `${data.slAtrMultiplier}x ATR(${data.slAtrPeriod})`;
  if (method === "PERCENT") return `${data.slPercent}%`;
  if (method === "INDICATOR") return "Indicator";
  if (method === "RANGE_OPPOSITE") return "Range opposite";
  return "\u2014";
}

function formatTP(data: Record<string, unknown>): string {
  const method = data.tpMethod as string;
  if (method === "FIXED_PIPS") return `${data.tpFixedPips} pips`;
  if (method === "RISK_REWARD") return `${data.tpRiskRewardRatio}R`;
  if (method === "ATR_BASED") return `${data.tpAtrMultiplier}x ATR(${data.tpAtrPeriod})`;
  return "\u2014";
}

const methodLabels = {
  FIXED_LOT: "Fixed Lot",
  RISK_PERCENT: "Risk %",
};

const orderTypeLabels: Record<string, string> = {
  MARKET: "Market",
  STOP: "Stop",
  LIMIT: "Limit",
};

type PlaceBuyProps = NodeProps & { data: PlaceBuyNodeData };

export const PlaceBuyNode = memo(function PlaceBuyNode({ id, data, selected }: PlaceBuyProps) {
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
        {data.orderType && data.orderType !== "MARKET" && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Order:</span>
            <span className="font-medium text-amber-400">Buy{orderTypeLabels[data.orderType]}</span>
          </div>
        )}
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
        <div className="flex justify-between">
          <span className="text-zinc-500">SL:</span>
          <span className="font-medium">
            {formatSL(data as unknown as Record<string, unknown>)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">TP:</span>
          <span className="font-medium">
            {formatTP(data as unknown as Record<string, unknown>)}
          </span>
        </div>
      </div>
    </BaseNode>
  );
});

type PlaceSellProps = NodeProps & { data: PlaceSellNodeData };

export const PlaceSellNode = memo(function PlaceSellNode({ id, data, selected }: PlaceSellProps) {
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
        {data.orderType && data.orderType !== "MARKET" && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Order:</span>
            <span className="font-medium text-amber-400">
              Sell{orderTypeLabels[data.orderType]}
            </span>
          </div>
        )}
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
        <div className="flex justify-between">
          <span className="text-zinc-500">SL:</span>
          <span className="font-medium">
            {formatSL(data as unknown as Record<string, unknown>)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">TP:</span>
          <span className="font-medium">
            {formatTP(data as unknown as Record<string, unknown>)}
          </span>
        </div>
      </div>
    </BaseNode>
  );
});
