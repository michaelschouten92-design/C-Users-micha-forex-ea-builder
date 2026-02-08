"use client";

import type { NodeProps } from "@xyflow/react";
import type { CustomTimesNodeData } from "@/types/builder";
import { BaseNode, NodeIcons } from "./base-node";

type Props = NodeProps & { data: CustomTimesNodeData };

export function CustomTimesNode({ id, data, selected }: Props) {
  const days = data.days ?? {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  };
  const timeSlots = data.timeSlots ?? [];

  const activeDays = Object.entries(days)
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
          <span className="font-medium">{timeSlots.length}</span>
        </div>
        {timeSlots.length > 0 && (
          <div className="text-xs text-zinc-400">
            {formatTime(timeSlots[0].startHour, timeSlots[0].startMinute)} -{" "}
            {formatTime(timeSlots[0].endHour, timeSlots[0].endMinute)}
            {timeSlots.length > 1 && ` +${timeSlots.length - 1} more`}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
