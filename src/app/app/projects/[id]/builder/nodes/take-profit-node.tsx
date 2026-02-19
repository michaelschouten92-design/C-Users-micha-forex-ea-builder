"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { TakeProfitNodeData, TPLevel } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: TakeProfitNodeData };

const METHOD_LABELS: Record<string, string> = {
  FIXED_PIPS: "Fixed Pips",
  RISK_REWARD: "Risk:Reward",
  ATR_BASED: "ATR-Based",
};

function formatTPValue(
  method: string,
  level: { fixedPips: number; riskRewardRatio: number; atrPeriod: number; atrMultiplier: number }
): string {
  switch (method) {
    case "FIXED_PIPS":
      return `${level.fixedPips} pips`;
    case "RISK_REWARD":
      return `1:${level.riskRewardRatio}`;
    case "ATR_BASED":
      return `ATR(${level.atrPeriod}) x ${level.atrMultiplier}`;
    default:
      return "";
  }
}

export const TakeProfitNode = memo(function TakeProfitNode({ id, data, selected }: Props) {
  const hasMultipleTP = data.multipleTPEnabled && data.tpLevels && data.tpLevels.length > 1;

  return (
    <BaseNode
      id={id}
      selected={selected}
      category={data.category === "trading" ? "trading" : "riskmanagement"}
      label={data.label}
      icon={NodeIcons.takeProfit}
      inputHandles={1}
      outputHandles={1}
    >
      <div className="space-y-1">
        {hasMultipleTP ? (
          data.tpLevels!.map((level: TPLevel, i: number) => (
            <div key={i} className="flex justify-between text-[11px]">
              <span className="text-zinc-500">
                TP{i + 1} ({level.closePercent}%):
              </span>
              <span className="font-medium">{formatTPValue(level.method, level)}</span>
            </div>
          ))
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-zinc-500">Method:</span>
              <span className="font-medium">{METHOD_LABELS[data.method]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Value:</span>
              <span className="font-medium">{formatTPValue(data.method, data)}</span>
            </div>
          </>
        )}
      </div>
    </BaseNode>
  );
});
