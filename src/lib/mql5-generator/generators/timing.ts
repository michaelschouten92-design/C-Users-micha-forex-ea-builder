import type {
  BuilderNode,
  TradingSessionNodeData,
  CustomTimesNodeData,
  TradingDays,
} from "@/types/builder";
import { SESSION_TIMES } from "@/types/builder";
import type { GeneratedCode } from "../types";

export function generateTimingCode(
  node: BuilderNode,
  code: GeneratedCode
): void {
  const data = node.data;

  // Determine timing type
  const timingType = ("timingType" in data ? data.timingType : null) || node.type;

  switch (timingType) {
    case "always":
      generateAlwaysCode(code);
      break;
    case "custom-times":
      generateCustomTimesCode(data as CustomTimesNodeData, code);
      break;
    case "trading-session":
    default:
      generateTradingSessionCode(data as TradingSessionNodeData, code);
      break;
  }
}

function generateAlwaysCode(code: GeneratedCode): void {
  code.onTick.push("// Timing: Always (no time restrictions)");
  code.onTick.push("bool isTradingTime = true;");
  code.onTick.push("");
}

function generateCustomTimesCode(
  data: CustomTimesNodeData,
  code: GeneratedCode
): void {
  code.onTick.push("// Custom Trading Times");
  code.onTick.push("bool isTradingTime = false;");
  code.onTick.push("MqlDateTime dt;");
  if (data.useServerTime) {
    code.onTick.push("TimeToStruct(TimeCurrent(), dt); // Using broker server time");
  } else {
    code.onTick.push("TimeToStruct(TimeGMT(), dt);");
  };
  code.onTick.push("int currentMinutes = dt.hour * 60 + dt.min;");
  code.onTick.push("");

  // Generate day of week conditions
  const dayMap: Record<keyof TradingDays, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const activeDays = Object.entries(data.days)
    .filter(([, active]) => active)
    .map(([day]) => dayMap[day as keyof TradingDays]);

  if (activeDays.length === 0) {
    code.onTick.push("// No trading days selected");
    code.onTick.push("if(!isTradingTime) return;");
    code.onTick.push("");
    return;
  }

  if (activeDays.length === 7) {
    code.onTick.push("// Trading all days");
    code.onTick.push("bool isDayAllowed = true;");
  } else {
    const dayConditions = activeDays.map(d => `dt.day_of_week == ${d}`).join(" || ");
    code.onTick.push(`bool isDayAllowed = (${dayConditions});`);
  }

  code.onTick.push("");
  code.onTick.push("if(isDayAllowed)");
  code.onTick.push("{");

  // Generate time slot conditions
  if (data.timeSlots.length === 0) {
    code.onTick.push("   isTradingTime = true; // No time slots defined, trade all day");
  } else {
    const slotConditions = data.timeSlots.map((slot) => {
      const startMinutes = slot.startHour * 60 + slot.startMinute;
      const endMinutes = slot.endHour * 60 + slot.endMinute;

      if (endMinutes > startMinutes) {
        // Normal slot (same day)
        return `(currentMinutes >= ${startMinutes} && currentMinutes < ${endMinutes})`;
      } else {
        // Overnight slot (spans midnight)
        return `(currentMinutes >= ${startMinutes} || currentMinutes < ${endMinutes})`;
      }
    });

    code.onTick.push(`   // Time slots (${data.useServerTime ? "Server Time" : "GMT"})`);
    data.timeSlots.forEach((slot, i) => {
      const startStr = `${slot.startHour.toString().padStart(2, "0")}:${slot.startMinute.toString().padStart(2, "0")}`;
      const endStr = `${slot.endHour.toString().padStart(2, "0")}:${slot.endMinute.toString().padStart(2, "0")}`;
      code.onTick.push(`   // Slot ${i + 1}: ${startStr} - ${endStr}`);
    });
    code.onTick.push(`   if(${slotConditions.join(" || ")}) isTradingTime = true;`);
  }

  code.onTick.push("}");
  code.onTick.push("");
  code.onTick.push("if(!isTradingTime) return; // Outside trading time");
  code.onTick.push("");
}

function generateTradingSessionCode(
  data: TradingSessionNodeData,
  code: GeneratedCode
): void {
  const sessionInfo = SESSION_TIMES[data.session];

  // Parse session times
  const [startHour, startMin] = sessionInfo.start.split(":").map(Number);
  const [endHour, endMin] = sessionInfo.end.split(":").map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const timeLabel = data.useServerTime ? "Server Time" : "GMT";
  code.onTick.push(`// Trading Session: ${sessionInfo.label} (${sessionInfo.start} - ${sessionInfo.end} ${timeLabel})`);
  code.onTick.push("bool isTradingTime = false;");
  code.onTick.push("MqlDateTime dt;");
  if (data.useServerTime) {
    code.onTick.push("TimeToStruct(TimeCurrent(), dt); // Using broker server time");
  } else {
    code.onTick.push("TimeToStruct(TimeGMT(), dt);");
  }
  code.onTick.push("int currentMinutes = dt.hour * 60 + dt.min;");

  if (data.tradeMondayToFriday) {
    code.onTick.push("// Only trade on weekdays (Mon-Fri)");
    code.onTick.push("if(dt.day_of_week >= 1 && dt.day_of_week <= 5)");
    code.onTick.push("{");
  }

  if (endMinutes > startMinutes) {
    // Normal session (same day)
    code.onTick.push(`   if(currentMinutes >= ${startMinutes} && currentMinutes < ${endMinutes}) isTradingTime = true;`);
  } else {
    // Overnight session (spans midnight) - e.g., Sydney 22:00-07:00
    code.onTick.push(`   if(currentMinutes >= ${startMinutes} || currentMinutes < ${endMinutes}) isTradingTime = true;`);
  }

  if (data.tradeMondayToFriday) {
    code.onTick.push("}");
  }

  code.onTick.push("");
  code.onTick.push("if(!isTradingTime) return; // Outside trading session");
  code.onTick.push("");
}
