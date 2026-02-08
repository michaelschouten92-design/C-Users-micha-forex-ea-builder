"use client";

import type { NodeProps } from "@xyflow/react";
import type { CandlestickPatternNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "../base-node";

type Props = NodeProps & { data: CandlestickPatternNodeData };

const patternLabels: Record<string, string> = {
  ENGULFING_BULLISH: "Bullish Engulfing",
  ENGULFING_BEARISH: "Bearish Engulfing",
  DOJI: "Doji",
  HAMMER: "Hammer",
  SHOOTING_STAR: "Shooting Star",
  MORNING_STAR: "Morning Star",
  EVENING_STAR: "Evening Star",
  THREE_WHITE_SOLDIERS: "3 White Soldiers",
  THREE_BLACK_CROWS: "3 Black Crows",
};

export function CandlestickPatternNode({ id, data, selected }: Props) {
  const patterns = data.patterns ?? [];
  const displayPatterns = patterns
    .slice(0, 2)
    .map((p) => patternLabels[p] || p)
    .join(", ");
  const moreCount = patterns.length > 2 ? ` +${patterns.length - 2}` : "";

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="priceaction"
      label={data.label}
      icon={NodeIcons.priceaction}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">Timeframe:</span>
          <span className="font-medium">{data.timeframe}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Patterns:</span>
          <span
            className="font-medium text-right truncate max-w-[100px]"
            title={patterns.map((p) => patternLabels[p]).join(", ")}
          >
            {displayPatterns}
            {moreCount}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}
