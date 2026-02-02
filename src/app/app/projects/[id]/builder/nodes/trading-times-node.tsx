"use client";

import type { NodeProps } from "@xyflow/react";
import type { TradingTimesNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: TradingTimesNodeData };

function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function TradingTimesNode({ id, data, selected }: Props) {
  return (
    <BaseNode
      id={id}
      selected={selected}
      category="timing"
      label={data.label}
      icon={NodeIcons.timing}
    >
      <div className="space-y-1">
        {data.mode === "ALWAYS" ? (
          <div className="text-xs text-zinc-400">
            Trade at any time (24/7)
          </div>
        ) : (
          <>
            {data.sessions.map((session, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-zinc-500">Session {i + 1}:</span>
                <span className="font-medium text-orange-400">
                  {formatTime(session.startHour, session.startMinute)} - {formatTime(session.endHour, session.endMinute)}
                </span>
              </div>
            ))}
            {data.sessions.length === 0 && (
              <div className="text-xs text-zinc-500">No sessions defined</div>
            )}
          </>
        )}
        <div className="flex justify-between text-xs mt-1">
          <span className="text-zinc-500">Days:</span>
          <span className="font-medium">
            {data.tradeMondayToFriday ? "Mon-Fri" : "All days"}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}
