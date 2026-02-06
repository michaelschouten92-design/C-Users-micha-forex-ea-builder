import type {
  BuilderNode,
  BreakevenStopNodeData,
  TrailingStopNodeData,
  PartialCloseNodeData,
  LockProfitNodeData,
} from "@/types/builder";
import type { GeneratedCode } from "../types";
import { createInput } from "./shared";

export function generateTradeManagementCode(
  node: BuilderNode,
  code: GeneratedCode
): void {
  const data = node.data;
  const managementType = ("managementType" in data ? data.managementType : null) || node.type;

  code.onTick.push("");
  code.onTick.push("//--- Trade Management");

  switch (managementType) {
    case "breakeven-stop":
      generateBreakevenStopCode(node, data as BreakevenStopNodeData, code);
      break;
    case "trailing-stop":
      generateTrailingStopCode(node, data as TrailingStopNodeData, code);
      break;
    case "partial-close":
      generatePartialCloseCode(node, data as PartialCloseNodeData, code);
      break;
    case "lock-profit":
      generateLockProfitCode(node, data as LockProfitNodeData, code);
      break;
  }
}

function generateBreakevenStopCode(
  node: BuilderNode,
  data: BreakevenStopNodeData,
  code: GeneratedCode
): void {
  // Add inputs based on trigger type
  if (data.trigger === "PIPS") {
    code.inputs.push(createInput(node, "triggerPips", "InpBETriggerPips", "double", data.triggerPips, "Breakeven Trigger (pips)"));
  } else if (data.trigger === "PERCENTAGE") {
    code.inputs.push(createInput(node, "triggerPercent", "InpBETriggerPercent", "double", data.triggerPercent, "Breakeven Trigger (% profit)"));
  } else if (data.trigger === "ATR") {
    code.inputs.push(createInput(node, "triggerAtrPeriod", "InpBEATRPeriod", "int", data.triggerAtrPeriod, "Breakeven ATR Period"));
    code.inputs.push(createInput(node, "triggerAtrMultiplier", "InpBEATRMultiplier", "double", data.triggerAtrMultiplier, "Breakeven ATR Multiplier"));
    code.globalVariables.push("int beATRHandle;");
    code.globalVariables.push("double beATRBuffer[];");
    code.onInit.push("beATRHandle = iATR(_Symbol, PERIOD_CURRENT, InpBEATRPeriod);");
    code.onInit.push('if(beATRHandle == INVALID_HANDLE) { Print("Failed to create ATR handle for Breakeven"); return(INIT_FAILED); }');
    code.onInit.push("ArraySetAsSeries(beATRBuffer, true);");
  }
  code.inputs.push(createInput(node, "lockPips", "InpBELockPips", "double", data.lockPips, "Breakeven Lock (pips above entry)"));

  code.onTick.push("// Breakeven Stop Management");

  if (data.trigger === "ATR") {
    code.onTick.push("if(CopyBuffer(beATRHandle, 0, 0, 1, beATRBuffer) < 1) return;");
  }

  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push("      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)");
  code.onTick.push("      {");
  code.onTick.push("         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);");
  code.onTick.push("         double currentSL = PositionGetDouble(POSITION_SL);");
  code.onTick.push("         double positionProfit = PositionGetDouble(POSITION_PROFIT);");
  code.onTick.push("         double positionVolume = PositionGetDouble(POSITION_VOLUME);");
  code.onTick.push("         long posType = PositionGetInteger(POSITION_TYPE);");
  code.onTick.push("         double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);");
  code.onTick.push("         double lockPoints = InpBELockPips * 10;");
  code.onTick.push("");
  code.onTick.push("         bool triggerReached = false;");

  if (data.trigger === "PIPS") {
    code.onTick.push("         double triggerPoints = InpBETriggerPips * 10;");
    code.onTick.push("         if(posType == POSITION_TYPE_BUY)");
    code.onTick.push("            triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPoints * point);");
    code.onTick.push("         else if(posType == POSITION_TYPE_SELL)");
    code.onTick.push("            triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPoints * point);");
  } else if (data.trigger === "PERCENTAGE") {
    code.onTick.push("         // Calculate position value and profit percentage");
    code.onTick.push("         double contractSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);");
    code.onTick.push("         double positionValue = positionVolume * contractSize * openPrice;");
    code.onTick.push("         double profitPercent = (positionProfit / positionValue) * 100.0;");
    code.onTick.push("         triggerReached = (profitPercent >= InpBETriggerPercent);");
  } else if (data.trigger === "ATR") {
    code.onTick.push("         double triggerPoints = (beATRBuffer[0] / point) * InpBEATRMultiplier;");
    code.onTick.push("         if(posType == POSITION_TYPE_BUY)");
    code.onTick.push("            triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPoints * point);");
    code.onTick.push("         else if(posType == POSITION_TYPE_SELL)");
    code.onTick.push("            triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPoints * point);");
  }

  code.onTick.push("");
  code.onTick.push("         if(triggerReached)");
  code.onTick.push("         {");
  code.onTick.push("            if(posType == POSITION_TYPE_BUY)");
  code.onTick.push("            {");
  code.onTick.push("               double newBE = openPrice + lockPoints * point;");
  code.onTick.push("               if(currentSL < newBE)");
  code.onTick.push("                  trade.PositionModify(ticket, newBE, PositionGetDouble(POSITION_TP));");
  code.onTick.push("            }");
  code.onTick.push("            else if(posType == POSITION_TYPE_SELL)");
  code.onTick.push("            {");
  code.onTick.push("               double newBE = openPrice - lockPoints * point;");
  code.onTick.push("               if(currentSL > newBE || currentSL == 0)");
  code.onTick.push("                  trade.PositionModify(ticket, newBE, PositionGetDouble(POSITION_TP));");
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}

function generateTrailingStopCode(
  node: BuilderNode,
  data: TrailingStopNodeData,
  code: GeneratedCode
): void {
  code.inputs.push(createInput(node, "trailPips", "InpTrailPips", "double", data.trailPips, "Trail Distance (pips)"));
  code.inputs.push(createInput(node, "startAfterPips", "InpTrailStartPips", "double", data.startAfterPips, "Trail Start After (pips profit)"));

  code.onTick.push("// Trailing Stop Management");
  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push("      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)");
  code.onTick.push("      {");
  code.onTick.push("         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);");
  code.onTick.push("         double currentSL = PositionGetDouble(POSITION_SL);");
  code.onTick.push("         long posType = PositionGetInteger(POSITION_TYPE);");
  code.onTick.push("         double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);");
  code.onTick.push("         double trailPoints = InpTrailPips * 10;");
  code.onTick.push("         double startPoints = InpTrailStartPips * 10;");
  code.onTick.push("");
  code.onTick.push("         if(posType == POSITION_TYPE_BUY)");
  code.onTick.push("         {");
  code.onTick.push("            double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);");
  code.onTick.push("            if(bid >= openPrice + startPoints * point)");
  code.onTick.push("            {");
  code.onTick.push("               double newSL = bid - trailPoints * point;");
  code.onTick.push("               if(newSL > currentSL)");
  code.onTick.push("               {");
  code.onTick.push("                  trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));");
  code.onTick.push("               }");
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("         else if(posType == POSITION_TYPE_SELL)");
  code.onTick.push("         {");
  code.onTick.push("            double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);");
  code.onTick.push("            if(ask <= openPrice - startPoints * point)");
  code.onTick.push("            {");
  code.onTick.push("               double newSL = ask + trailPoints * point;");
  code.onTick.push("               if(newSL < currentSL || currentSL == 0)");
  code.onTick.push("               {");
  code.onTick.push("                  trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));");
  code.onTick.push("               }");
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}

function generatePartialCloseCode(
  node: BuilderNode,
  data: PartialCloseNodeData,
  code: GeneratedCode
): void {
  code.inputs.push(createInput(node, "closePercent", "InpPartialClosePercent", "double", data.closePercent, "Partial Close %"));
  code.inputs.push(createInput(node, "triggerPips", "InpPartialCloseTriggerPips", "double", data.triggerPips, "Partial Close Trigger (pips)"));
  code.globalVariables.push("bool partialCloseDone[];");

  code.onInit.push("ArrayResize(partialCloseDone, 100);");
  code.onInit.push("ArrayInitialize(partialCloseDone, false);");

  code.onTick.push("// Partial Close Management");
  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push("      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)");
  code.onTick.push("      {");
  code.onTick.push("         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);");
  code.onTick.push("         double volume = PositionGetDouble(POSITION_VOLUME);");
  code.onTick.push("         long posType = PositionGetInteger(POSITION_TYPE);");
  code.onTick.push("         double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);");
  code.onTick.push("         double triggerPoints = InpPartialCloseTriggerPips * 10;");
  code.onTick.push("");
  code.onTick.push("         bool profitReached = false;");
  code.onTick.push("         if(posType == POSITION_TYPE_BUY && SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPoints * point)");
  code.onTick.push("            profitReached = true;");
  code.onTick.push("         if(posType == POSITION_TYPE_SELL && SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPoints * point)");
  code.onTick.push("            profitReached = true;");
  code.onTick.push("");
  code.onTick.push("         int ticketIndex = (int)(ticket % 100);");
  code.onTick.push("         if(profitReached && !partialCloseDone[ticketIndex])");
  code.onTick.push("         {");
  code.onTick.push("            double closeVolume = NormalizeDouble(volume * InpPartialClosePercent / 100.0, 2);");
  code.onTick.push("            if(closeVolume >= SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN))");
  code.onTick.push("            {");
  code.onTick.push("               trade.PositionClosePartial(ticket, closeVolume);");
  code.onTick.push("               partialCloseDone[ticketIndex] = true;");

  if (data.moveSLToBreakeven) {
    code.onTick.push("               // Move SL to breakeven after partial close");
    code.onTick.push("               if(posType == POSITION_TYPE_BUY)");
    code.onTick.push("                  trade.PositionModify(ticket, openPrice, PositionGetDouble(POSITION_TP));");
    code.onTick.push("               else");
    code.onTick.push("                  trade.PositionModify(ticket, openPrice, PositionGetDouble(POSITION_TP));");
  }

  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}

function generateLockProfitCode(
  node: BuilderNode,
  data: LockProfitNodeData,
  code: GeneratedCode
): void {
  if (data.method === "PERCENTAGE") {
    code.inputs.push(createInput(node, "lockPercent", "InpLockProfitPercent", "double", data.lockPercent, "Lock Profit %"));
  } else {
    code.inputs.push(createInput(node, "lockPips", "InpLockProfitPips", "double", data.lockPips, "Lock Profit (pips)"));
  }
  code.inputs.push(createInput(node, "checkIntervalPips", "InpLockCheckInterval", "double", data.checkIntervalPips, "Check Interval (pips)"));

  code.onTick.push("// Lock Profit Management");
  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push("      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)");
  code.onTick.push("      {");
  code.onTick.push("         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);");
  code.onTick.push("         double currentSL = PositionGetDouble(POSITION_SL);");
  code.onTick.push("         long posType = PositionGetInteger(POSITION_TYPE);");
  code.onTick.push("         double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);");
  code.onTick.push("         double checkPoints = InpLockCheckInterval * 10;");
  code.onTick.push("");
  code.onTick.push("         if(posType == POSITION_TYPE_BUY)");
  code.onTick.push("         {");
  code.onTick.push("            double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);");
  code.onTick.push("            double currentProfitPoints = (bid - openPrice) / point;");
  code.onTick.push("            if(currentProfitPoints > checkPoints)");
  code.onTick.push("            {");

  if (data.method === "PERCENTAGE") {
    code.onTick.push("               double lockPoints = currentProfitPoints * (InpLockProfitPercent / 100.0);");
  } else {
    code.onTick.push("               double lockPoints = InpLockProfitPips * 10;");
  }

  code.onTick.push("               double newSL = openPrice + lockPoints * point;");
  code.onTick.push("               if(newSL > currentSL)");
  code.onTick.push("               {");
  code.onTick.push("                  trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));");
  code.onTick.push("               }");
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("         else if(posType == POSITION_TYPE_SELL)");
  code.onTick.push("         {");
  code.onTick.push("            double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);");
  code.onTick.push("            double currentProfitPoints = (openPrice - ask) / point;");
  code.onTick.push("            if(currentProfitPoints > checkPoints)");
  code.onTick.push("            {");

  if (data.method === "PERCENTAGE") {
    code.onTick.push("               double lockPoints = currentProfitPoints * (InpLockProfitPercent / 100.0);");
  } else {
    code.onTick.push("               double lockPoints = InpLockProfitPips * 10;");
  }

  code.onTick.push("               double newSL = openPrice - lockPoints * point;");
  code.onTick.push("               if(newSL < currentSL || currentSL == 0)");
  code.onTick.push("               {");
  code.onTick.push("                  trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));");
  code.onTick.push("               }");
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}
