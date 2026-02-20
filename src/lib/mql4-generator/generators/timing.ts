// MQL4 Timing Code Generator
// Differences from MQL5: OrderClose/OrderSelect instead of CTrade/PositionGetTicket

import type {
  BuilderNode,
  TradingSessionNodeData,
  CustomTimesNodeData,
  TradingDays,
} from "@/types/builder";
import { SESSION_TIMES } from "@/types/builder";
import type { GeneratedCode } from "../types";

export function generateTimingCode(node: BuilderNode, code: GeneratedCode): void {
  generateSingleTimingCode(node, "isTradingTime", code);
  const closeOnEnd = hasCloseOnSessionEnd([node]);
  if (closeOnEnd) {
    generateCloseOnSessionEndBlock(code);
  } else {
    code.onTick.push("if(!isTradingTime) return;");
  }
  code.onTick.push("");
}

export function generateMultipleTimingCode(nodes: BuilderNode[], code: GeneratedCode): void {
  if (nodes.length === 1) {
    generateTimingCode(nodes[0], code);
    return;
  }

  nodes.forEach((node, index) => {
    generateSingleTimingCode(node, `isTradingTime${index}`, code);
  });

  const vars = nodes.map((_, i) => `isTradingTime${i}`);
  code.onTick.push(`bool isTradingTime = ${vars.join(" || ")};`);
  const closeOnEnd = hasCloseOnSessionEnd(nodes);
  if (closeOnEnd) {
    generateCloseOnSessionEndBlock(code);
  } else {
    code.onTick.push("if(!isTradingTime) return;");
  }
  code.onTick.push("");
}

function generateSingleTimingCode(node: BuilderNode, varName: string, code: GeneratedCode): void {
  const data = node.data;
  const timingType = ("timingType" in data ? data.timingType : null) || node.type;

  switch (timingType) {
    case "always":
      generateAlwaysCode(varName, code);
      break;
    case "custom-times":
      generateCustomTimesCode(data as CustomTimesNodeData, varName, code);
      break;
    case "trading-session":
    default:
      generateTradingSessionCode(data as TradingSessionNodeData, varName, code);
      break;
  }
}

function generateAlwaysCode(varName: string, code: GeneratedCode): void {
  code.onTick.push("// Timing: Always (no time restrictions)");
  code.onTick.push(`bool ${varName} = true;`);
  code.onTick.push("");
}

function generateCustomTimesCode(
  data: CustomTimesNodeData,
  varName: string,
  code: GeneratedCode
): void {
  code.onTick.push("// Custom Trading Times");
  code.onTick.push(`bool ${varName} = false;`);

  const needsTimeDecl = !code.onTick.some((l) => l.includes("MqlDateTime dt;"));
  const timeSource = (data.useServerTime ?? true) ? "TimeCurrent()" : "TimeGMT()";
  if (needsTimeDecl) {
    code.onTick.push("MqlDateTime dt;");
    code.onTick.push(
      `TimeToStruct(${timeSource}, dt); // Using ${(data.useServerTime ?? true) ? "broker server" : "GMT"} time`
    );
    code.onTick.push("int currentMinutes = dt.hour * 60 + dt.min;");
  } else {
    // Always re-call TimeToStruct for each timing block to avoid stale dt struct
    code.onTick.push(
      `TimeToStruct(${timeSource}, dt); // Refresh for ${(data.useServerTime ?? true) ? "server" : "GMT"} time`
    );
    code.onTick.push("currentMinutes = dt.hour * 60 + dt.min;");
  }
  code.onTick.push("");

  const dayMap: Record<keyof TradingDays, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const days = data.days ?? {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  };
  const activeDays = Object.entries(days)
    .filter(([, active]) => active)
    .map(([day]) => dayMap[day as keyof TradingDays]);

  if (activeDays.length === 0) {
    code.onTick.push("// No trading days selected");
    return;
  }

  const daySuffix = varName.replace("timingOK", "");
  if (activeDays.length === 7) {
    code.onTick.push("// Trading all days");
    code.onTick.push(`bool isDayAllowed${daySuffix} = true;`);
  } else {
    const dayConditions = activeDays.map((d) => `dt.day_of_week == ${d}`).join(" || ");
    code.onTick.push(`bool isDayAllowed${daySuffix} = (${dayConditions});`);
  }

  code.onTick.push("");
  code.onTick.push(`if(isDayAllowed${daySuffix})`);
  code.onTick.push("{");

  const timeSlots = data.timeSlots ?? [];
  if (timeSlots.length === 0) {
    code.onTick.push(`   ${varName} = true; // No time slots defined, trade all day`);
  } else {
    const slotConditions = timeSlots.map((slot) => {
      const startMinutes = slot.startHour * 60 + slot.startMinute;
      const endMinutes = slot.endHour * 60 + slot.endMinute;

      if (endMinutes > startMinutes) {
        return `(currentMinutes >= ${startMinutes} && currentMinutes < ${endMinutes})`;
      } else {
        return `(currentMinutes >= ${startMinutes} || currentMinutes < ${endMinutes})`;
      }
    });

    code.onTick.push(`   // Time slots (${(data.useServerTime ?? true) ? "Server Time" : "GMT"})`);
    timeSlots.forEach((slot, i) => {
      const startStr = `${slot.startHour.toString().padStart(2, "0")}:${slot.startMinute.toString().padStart(2, "0")}`;
      const endStr = `${slot.endHour.toString().padStart(2, "0")}:${slot.endMinute.toString().padStart(2, "0")}`;
      code.onTick.push(`   // Slot ${i + 1}: ${startStr} - ${endStr}`);
    });
    code.onTick.push(`   if(${slotConditions.join(" || ")}) ${varName} = true;`);
  }

  code.onTick.push("}");
  code.onTick.push("");
}

function hasCloseOnSessionEnd(nodes: BuilderNode[]): boolean {
  return nodes.some((n) => {
    const data = n.data;
    return "closeOnSessionEnd" in data && data.closeOnSessionEnd === true;
  });
}

function generateCloseOnSessionEndBlock(code: GeneratedCode): void {
  code.onTick.push("if(!isTradingTime)");
  code.onTick.push("{");
  code.onTick.push("   // Close all positions when trading session ends");
  code.onTick.push("   for(int i = OrdersTotal() - 1; i >= 0; i--)");
  code.onTick.push("   {");
  code.onTick.push("      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;");
  code.onTick.push(
    "      if(OrderMagicNumber() != InpMagicNumber || OrderSymbol() != Symbol()) continue;"
  );
  code.onTick.push("      if(OrderType() == OP_BUY)");
  code.onTick.push(
    "         OrderClose(OrderTicket(), OrderLots(), Bid, InpMaxSlippage, clrGreen);"
  );
  code.onTick.push("      else if(OrderType() == OP_SELL)");
  code.onTick.push("         OrderClose(OrderTicket(), OrderLots(), Ask, InpMaxSlippage, clrRed);");
  code.onTick.push("   }");
  code.onTick.push("   return;");
  code.onTick.push("}");
}

function generateTradingSessionCode(
  data: TradingSessionNodeData,
  varName: string,
  code: GeneratedCode
): void {
  const sessionInfo = SESSION_TIMES[data.session];

  const isCustom = data.session === "CUSTOM";
  const startHour = isCustom
    ? (data.customStartHour ?? 8)
    : Number(sessionInfo.start.split(":")[0]);
  const startMin = isCustom
    ? (data.customStartMinute ?? 0)
    : Number(sessionInfo.start.split(":")[1]);
  const endHour = isCustom ? (data.customEndHour ?? 17) : Number(sessionInfo.end.split(":")[0]);
  const endMin = isCustom ? (data.customEndMinute ?? 0) : Number(sessionInfo.end.split(":")[1]);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const timeLabel = (data.useServerTime ?? true) ? "Server Time" : "GMT";
  const displayStart = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
  const displayEnd = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
  code.onTick.push(
    `// Trading Session: ${sessionInfo.label} (${displayStart} - ${displayEnd} ${timeLabel})`
  );
  code.onTick.push(`bool ${varName} = false;`);

  const needsTimeDecl2 = !code.onTick.some((l) => l.includes("MqlDateTime dt;"));
  const timeSource2 = (data.useServerTime ?? true) ? "TimeCurrent()" : "TimeGMT()";
  if (needsTimeDecl2) {
    code.onTick.push("MqlDateTime dt;");
    code.onTick.push(
      `TimeToStruct(${timeSource2}, dt); // Using ${(data.useServerTime ?? true) ? "broker server" : "GMT"} time`
    );
    code.onTick.push("int currentMinutes = dt.hour * 60 + dt.min;");
  } else {
    // Always re-call TimeToStruct for each timing block to avoid stale dt struct
    code.onTick.push(
      `TimeToStruct(${timeSource2}, dt); // Refresh for ${(data.useServerTime ?? true) ? "server" : "GMT"} time`
    );
    code.onTick.push("currentMinutes = dt.hour * 60 + dt.min;");
  }

  const days = data.tradingDays ?? {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  };
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const activeDays = Object.entries(days)
    .filter(([, active]) => active)
    .map(([day]) => dayMap[day]);
  const allDays = activeDays.length === 7;

  if (!allDays) {
    if (activeDays.length === 0) {
      code.onTick.push("// No trading days selected");
      code.onTick.push("");
      return;
    }
    const isWeekdays =
      activeDays.length === 5 &&
      [1, 2, 3, 4, 5].every((d) => activeDays.includes(d)) &&
      !activeDays.includes(0) &&
      !activeDays.includes(6);
    if (isWeekdays) {
      code.onTick.push("// Only trade on weekdays (Mon-Fri)");
      code.onTick.push("if(dt.day_of_week >= 1 && dt.day_of_week <= 5)");
    } else {
      const dayConditions = activeDays.map((d) => `dt.day_of_week == ${d}`).join(" || ");
      code.onTick.push(`// Day-of-week filter`);
      code.onTick.push(`if(${dayConditions})`);
    }
    code.onTick.push("{");
  }

  if (endMinutes > startMinutes) {
    code.onTick.push(
      `   if(currentMinutes >= ${startMinutes} && currentMinutes < ${endMinutes}) ${varName} = true;`
    );
  } else {
    code.onTick.push(
      `   if(currentMinutes >= ${startMinutes} || currentMinutes < ${endMinutes}) ${varName} = true;`
    );
  }

  if (!allDays) {
    code.onTick.push("}");
  }

  code.onTick.push("");
}
