"use client";

import type { NodeProps } from "@xyflow/react";
import type { CustomTimesNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: CustomTimesNodeData };

export function CustomTimesNode({ id, data, selected }: Props) {
  const activeDays = Object.entries(data.days)
    .filter(([, active]) => active)
    .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1, 3))
    .join(", ");

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  };

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
          <span className="text-zinc-500">Days:</span>
          <span className="font-medium text-orange-400 truncate max-w-[120px]">
            {activeDays || "None"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Time slots:</span>
          <span className="font-medium">{data.timeSlots.length}</span>
        </div>
        {data.timeSlots.length > 0 && (
          <div className="text-xs text-zinc-400">
            {formatTime(data.timeSlots[0].startHour, data.timeSlots[0].startMinute)} - {formatTime(data.timeSlots[0].endHour, data.timeSlots[0].endMinute)}
            {data.timeSlots.length > 1 && ` +${data.timeSlots.length - 1} more`}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
