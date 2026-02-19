"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { ConditionNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: ConditionNodeData };

const OPERATOR_LABELS: Record<ConditionNodeData["conditionType"], string> = {
  GREATER_THAN: ">",
  LESS_THAN: "<",
  GREATER_EQUAL: ">=",
  LESS_EQUAL: "<=",
  EQUAL: "==",
  CROSSES_ABOVE: "Crosses Above",
  CROSSES_BELOW: "Crosses Below",
};

export const ConditionNode = memo(function ConditionNode({ id, data, selected }: Props) {
  return (
    <div className="relative">
      <BaseNode
        id={id}
        selected={selected}
        category="indicator"
        label={data.label}
        icon={NodeIcons.indicator}
        inputHandles={1}
        outputHandles={0}
      >
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Operator:</span>
            <span className="font-medium">{OPERATOR_LABELS[data.conditionType]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Threshold:</span>
            <span className="font-medium">{data.threshold}</span>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-[10px]">
          <span className="text-[#10B981] font-medium">True</span>
          <span className="text-[#EF4444] font-medium">False</span>
        </div>
      </BaseNode>
      {/* Two output handles: True (left) and False (right) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        title="True output"
        className="!w-3 !h-3 !bg-[#10B981] !border-2 !border-[#0F172A] hover:!bg-[#22D3EE] transition-colors duration-200"
        style={{ left: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        title="False output"
        className="!w-3 !h-3 !bg-[#EF4444] !border-2 !border-[#0F172A] hover:!bg-[#22D3EE] transition-colors duration-200"
        style={{ left: "70%" }}
      />
    </div>
  );
});
