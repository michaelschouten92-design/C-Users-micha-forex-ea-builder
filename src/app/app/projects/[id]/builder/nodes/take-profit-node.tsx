"use client";

import type { NodeProps } from "@xyflow/react";
import type { TakeProfitNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: TakeProfitNodeData };

const methodLabels = {
  FIXED_PIPS: "Fixed Pips",
  RISK_REWARD: "Risk:Reward",
  ATR_BASED: "ATR-Based",
};

export function TakeProfitNode({ id, data, selected }: Props) {
  const getValue = () => {
    switch (data.method) {
      case "FIXED_PIPS":
        return `${data.fixedPips} pips`;
      case "RISK_REWARD":
        return `1:${data.riskRewardRatio}`;
      case "ATR_BASED":
        return `ATR(${data.atrPeriod}) x ${data.atrMultiplier}`;
    }
  };

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="trading"
      label={data.label}
      icon={NodeIcons.takeProfit}
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
          <span className="font-medium">{getValue()}</span>
        </div>
      </div>
    </BaseNode>
  );
}
