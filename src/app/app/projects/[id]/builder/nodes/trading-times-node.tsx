"use client";

import type { NodeProps } from "@xyflow/react";
import type { TradingSessionNodeData } from "@/types/builder";
import { SESSION_TIMES } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: TradingSessionNodeData };

export function TradingTimesNode({ id, data, selected }: Props) {
  const sessionInfo = SESSION_TIMES[data.session];

  const isCustom = data.session === "CUSTOM";
  const displayStart = isCustom
    ? `${String(data.customStartHour ?? 8).padStart(2, "0")}:${String(data.customStartMinute ?? 0).padStart(2, "0")}`
    : sessionInfo.start;
  const displayEnd = isCustom
    ? `${String(data.customEndHour ?? 17).padStart(2, "0")}:${String(data.customEndMinute ?? 0).padStart(2, "0")}`
    : sessionInfo.end;

  return (
    <BaseNode
      id={id}
      selected={selected}
      category="timing"
      label={data.label}
      icon={NodeIcons.timing}
    >
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Session:</span>
          <span className="font-medium text-orange-400">{sessionInfo.label}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">
            Time ({(data.useServerTime ?? true) ? "Server" : "GMT"}):
          </span>
          <span className="font-medium">
            {displayStart} - {displayEnd}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Days:</span>
          <span className="font-medium">{data.tradeMondayToFriday ? "Mon-Fri" : "All days"}</span>
        </div>
      </div>
    </BaseNode>
  );
}
