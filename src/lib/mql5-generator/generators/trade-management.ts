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
  indicatorNodes: BuilderNode[],
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
      generateTrailingStopCode(node, data as TrailingStopNodeData, indicatorNodes, code);
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
  const group = "Breakeven Stop";
  // Add inputs based on trigger type
  if (data.trigger === "PIPS") {
    code.inputs.push(
      createInput(
        node,
        "triggerPips",
        "InpBETriggerPips",
        "double",
        data.triggerPips,
        "Breakeven Trigger (pips)",
        group
      )
    );
  } else if (data.trigger === "PERCENTAGE") {
    code.inputs.push(
      createInput(
        node,
        "triggerPercent",
        "InpBETriggerPercent",
        "double",
        data.triggerPercent,
        "Breakeven Trigger (% profit)",
        group
      )
    );
  } else if (data.trigger === "ATR") {
    code.inputs.push(
      createInput(
        node,
        "triggerAtrPeriod",
        "InpBEATRPeriod",
        "int",
        data.triggerAtrPeriod,
        "Breakeven ATR Period",
        group
      )
    );
    code.inputs.push(
      createInput(
        node,
        "triggerAtrMultiplier",
        "InpBEATRMultiplier",
        "double",
        data.triggerAtrMultiplier,
        "Breakeven ATR Multiplier",
        group
      )
    );
    code.globalVariables.push("int beATRHandle = INVALID_HANDLE;");
    code.globalVariables.push("double beATRBuffer[];");
    code.onInit.push("beATRHandle = iATR(_Symbol, PERIOD_CURRENT, InpBEATRPeriod);");
    code.onInit.push(
      'if(beATRHandle == INVALID_HANDLE) { Print("Failed to create ATR handle for Breakeven"); return(INIT_FAILED); }'
    );
    code.onDeinit.push("if(beATRHandle != INVALID_HANDLE) IndicatorRelease(beATRHandle);");
    code.onInit.push("ArraySetAsSeries(beATRBuffer, true);");
  }
  code.inputs.push(
    createInput(
      node,
      "lockPips",
      "InpBELockPips",
      "double",
      data.lockPips,
      "Breakeven Lock (pips above entry)",
      group
    )
  );

  code.onTick.push("// Breakeven Stop Management");

  if (data.trigger === "ATR") {
    code.onTick.push("if(CopyBuffer(beATRHandle, 0, 0, 1, beATRBuffer) < 1) return;");
  }

  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push(
    "      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
  );
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
    code.onTick.push(
      "            triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPoints * point);"
    );
    code.onTick.push("         else if(posType == POSITION_TYPE_SELL)");
    code.onTick.push(
      "            triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPoints * point);"
    );
  } else if (data.trigger === "PERCENTAGE") {
    code.onTick.push("         // Calculate position value and profit percentage");
    code.onTick.push(
      "         double contractSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);"
    );
    code.onTick.push("         double positionValue = positionVolume * contractSize * openPrice;");
    code.onTick.push("         double profitPercent = (positionProfit / positionValue) * 100.0;");
    code.onTick.push("         triggerReached = (profitPercent >= InpBETriggerPercent);");
  } else if (data.trigger === "ATR") {
    code.onTick.push(
      "         double triggerPoints = (beATRBuffer[0] / point) * InpBEATRMultiplier;"
    );
    code.onTick.push("         if(posType == POSITION_TYPE_BUY)");
    code.onTick.push(
      "            triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPoints * point);"
    );
    code.onTick.push("         else if(posType == POSITION_TYPE_SELL)");
    code.onTick.push(
      "            triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPoints * point);"
    );
  }

  code.onTick.push("");
  code.onTick.push("         if(triggerReached)");
  code.onTick.push("         {");
  code.onTick.push("            if(posType == POSITION_TYPE_BUY)");
  code.onTick.push("            {");
  code.onTick.push("               double newBE = openPrice + lockPoints * point;");
  code.onTick.push("               if(currentSL < newBE)");
  code.onTick.push(
    "                  trade.PositionModify(ticket, newBE, PositionGetDouble(POSITION_TP));"
  );
  code.onTick.push("            }");
  code.onTick.push("            else if(posType == POSITION_TYPE_SELL)");
  code.onTick.push("            {");
  code.onTick.push("               double newBE = openPrice - lockPoints * point;");
  code.onTick.push("               if(currentSL > newBE || currentSL == 0)");
  code.onTick.push(
    "                  trade.PositionModify(ticket, newBE, PositionGetDouble(POSITION_TP));"
  );
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}

function generateTrailingStopCode(
  node: BuilderNode,
  data: TrailingStopNodeData,
  indicatorNodes: BuilderNode[],
  code: GeneratedCode
): void {
  if (data.method === "INDICATOR") {
    generateIndicatorTrailingStop(data, indicatorNodes, code);
    return;
  }

  const group = "Trailing Stop";

  // Method-specific inputs and setup
  if (data.method === "ATR_BASED") {
    code.inputs.push(
      createInput(
        node,
        "trailAtrPeriod",
        "InpTrailATRPeriod",
        "int",
        data.trailAtrPeriod,
        "Trail ATR Period",
        group
      )
    );
    code.inputs.push(
      createInput(
        node,
        "trailAtrMultiplier",
        "InpTrailATRMultiplier",
        "double",
        data.trailAtrMultiplier,
        "Trail ATR Multiplier",
        group
      )
    );
    code.globalVariables.push("int trailATRHandle = INVALID_HANDLE;");
    code.globalVariables.push("double trailATRBuffer[];");
    code.onInit.push("trailATRHandle = iATR(_Symbol, PERIOD_CURRENT, InpTrailATRPeriod);");
    code.onInit.push(
      'if(trailATRHandle == INVALID_HANDLE) { Print("Failed to create ATR handle for Trailing Stop"); return(INIT_FAILED); }'
    );
    code.onInit.push("ArraySetAsSeries(trailATRBuffer, true);");
    code.onDeinit.push("if(trailATRHandle != INVALID_HANDLE) IndicatorRelease(trailATRHandle);");
  } else if (data.method === "PERCENTAGE") {
    code.inputs.push(
      createInput(
        node,
        "trailPercent",
        "InpTrailPercent",
        "double",
        data.trailPercent,
        "Trail Distance (%)",
        group
      )
    );
  } else {
    // FIXED_PIPS
    code.inputs.push(
      createInput(
        node,
        "trailPips",
        "InpTrailPips",
        "double",
        data.trailPips,
        "Trail Distance (pips)",
        group
      )
    );
  }

  // Start-after threshold (shared by all non-indicator methods)
  code.inputs.push(
    createInput(
      node,
      "startAfterPips",
      "InpTrailStartPips",
      "double",
      data.startAfterPips,
      "Trail Start After (pips profit)",
      group
    )
  );

  code.onTick.push("// Trailing Stop Management");

  if (data.method === "ATR_BASED") {
    code.onTick.push("if(CopyBuffer(trailATRHandle, 0, 0, 1, trailATRBuffer) < 1) return;");
  }

  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push(
    "      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
  );
  code.onTick.push("      {");
  code.onTick.push("         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);");
  code.onTick.push("         double currentSL = PositionGetDouble(POSITION_SL);");
  code.onTick.push("         long posType = PositionGetInteger(POSITION_TYPE);");
  code.onTick.push("         double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);");
  code.onTick.push("         double startPoints = InpTrailStartPips * 10;");

  // Calculate trailPoints based on method
  if (data.method === "ATR_BASED") {
    code.onTick.push(
      "         double trailPoints = (trailATRBuffer[0] / point) * InpTrailATRMultiplier;"
    );
  } else if (data.method === "PERCENTAGE") {
    code.onTick.push(
      "         double trailPoints = (openPrice * InpTrailPercent / 100.0) / point;"
    );
  } else {
    // FIXED_PIPS
    code.onTick.push("         double trailPoints = InpTrailPips * 10;");
  }

  code.onTick.push("");
  code.onTick.push("         if(posType == POSITION_TYPE_BUY)");
  code.onTick.push("         {");
  code.onTick.push("            double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);");
  code.onTick.push("            if(bid >= openPrice + startPoints * point)");
  code.onTick.push("            {");
  code.onTick.push("               double newSL = bid - trailPoints * point;");
  code.onTick.push("               if(newSL > currentSL)");
  code.onTick.push("               {");
  code.onTick.push(
    "                  trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));"
  );
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
  code.onTick.push(
    "                  trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));"
  );
  code.onTick.push("               }");
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}

function generateIndicatorTrailingStop(
  data: TrailingStopNodeData,
  indicatorNodes: BuilderNode[],
  code: GeneratedCode
): void {
  // Find the connected indicator node
  let connectedIndicator: BuilderNode | undefined;
  if (data.indicatorNodeId) {
    connectedIndicator = indicatorNodes.find((n) => n.id === data.indicatorNodeId);
  }

  if (!connectedIndicator) {
    // Fallback: no indicator connected, warn user and skip
    code.onTick.push("// Indicator Trailing Stop: no indicator connected");
    code.onTick.push("static bool trailWarnShown = false;");
    code.onTick.push(
      'if(!trailWarnShown) { Print("Warning: Indicator trailing stop has no indicator connected. Connect an indicator (e.g. Moving Average) to enable trailing."); trailWarnShown = true; }'
    );
    return;
  }

  const indIndex = indicatorNodes.indexOf(connectedIndicator);
  const varPrefix = `ind${indIndex}`;
  const indData = connectedIndicator.data;
  const indType = "indicatorType" in indData ? indData.indicatorType : null;

  code.onTick.push("// Indicator-Based Trailing Stop");
  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push(
    "      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
  );
  code.onTick.push("      {");
  code.onTick.push("         double currentSL = PositionGetDouble(POSITION_SL);");
  code.onTick.push("         long posType = PositionGetInteger(POSITION_TYPE);");

  if (indType === "moving-average") {
    // Use MA value as trailing SL
    code.onTick.push(`         double maValue = ${varPrefix}Buffer[0];`);
    code.onTick.push("");
    code.onTick.push(
      "         if(posType == POSITION_TYPE_BUY && maValue < SymbolInfoDouble(_Symbol, SYMBOL_BID))"
    );
    code.onTick.push("         {");
    code.onTick.push("            double newSL = NormalizeDouble(maValue, _Digits);");
    code.onTick.push("            if(newSL > currentSL)");
    code.onTick.push(
      "               trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));"
    );
    code.onTick.push("         }");
    code.onTick.push(
      "         else if(posType == POSITION_TYPE_SELL && maValue > SymbolInfoDouble(_Symbol, SYMBOL_ASK))"
    );
    code.onTick.push("         {");
    code.onTick.push("            double newSL = NormalizeDouble(maValue, _Digits);");
    code.onTick.push("            if(newSL < currentSL || currentSL == 0)");
    code.onTick.push(
      "               trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));"
    );
    code.onTick.push("         }");
  } else {
    code.onTick.push(`         // Indicator type '${indType}' not supported for trailing stop`);
  }

  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}

function generatePartialCloseCode(
  node: BuilderNode,
  data: PartialCloseNodeData,
  code: GeneratedCode
): void {
  const group = "Partial Close";
  code.inputs.push(
    createInput(
      node,
      "closePercent",
      "InpPartialClosePercent",
      "double",
      data.closePercent,
      "Partial Close %",
      group
    )
  );
  const triggerMethod = ((data as Record<string, unknown>).triggerMethod as string) ?? "PIPS";
  if (triggerMethod === "PERCENT") {
    code.inputs.push(
      createInput(
        node,
        "triggerPercent",
        "InpPartialCloseTriggerPercent",
        "double",
        ((data as Record<string, unknown>).triggerPercent as number) ?? 1,
        "Partial Close Trigger (%)",
        group
      )
    );
  } else {
    code.inputs.push(
      createInput(
        node,
        "triggerPips",
        "InpPartialCloseTriggerPips",
        "double",
        data.triggerPips,
        "Partial Close Trigger (pips)",
        group
      )
    );
  }
  // Only declare shared globals/helpers once (avoid duplicates with multiple partial close nodes)
  if (!code.globalVariables.includes("ulong partialClosedTickets[];")) {
    code.globalVariables.push("ulong partialClosedTickets[];");

    code.helperFunctions
      .push(`//+------------------------------------------------------------------+
//| Check if ticket has been partially closed                         |
//+------------------------------------------------------------------+
bool IsPartialClosed(ulong ticket)
{
   for(int i = ArraySize(partialClosedTickets) - 1; i >= 0; i--)
   {
      if(partialClosedTickets[i] == ticket) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Mark ticket as partially closed                                   |
//+------------------------------------------------------------------+
void MarkPartialClosed(ulong ticket)
{
   int size = ArraySize(partialClosedTickets);
   ArrayResize(partialClosedTickets, size + 1);
   partialClosedTickets[size] = ticket;
}`);
  }

  code.onTick.push("// Partial Close Management");
  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push(
    "      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
  );
  code.onTick.push("      {");
  code.onTick.push("         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);");
  code.onTick.push("         double volume = PositionGetDouble(POSITION_VOLUME);");
  code.onTick.push("         long posType = PositionGetInteger(POSITION_TYPE);");
  code.onTick.push("         double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);");
  if (triggerMethod === "PERCENT") {
    code.onTick.push(
      "         double triggerPrice = openPrice * InpPartialCloseTriggerPercent / 100.0;"
    );
  } else {
    code.onTick.push("         double triggerPrice = InpPartialCloseTriggerPips * 10 * point;");
  }
  code.onTick.push("");
  code.onTick.push("         bool profitReached = false;");
  code.onTick.push(
    "         if(posType == POSITION_TYPE_BUY && SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPrice)"
  );
  code.onTick.push("            profitReached = true;");
  code.onTick.push(
    "         if(posType == POSITION_TYPE_SELL && SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPrice)"
  );
  code.onTick.push("            profitReached = true;");
  code.onTick.push("");
  code.onTick.push("         if(profitReached && !IsPartialClosed(ticket))");
  code.onTick.push("         {");
  code.onTick.push(
    "            double closeVolume = NormalizeDouble(volume * InpPartialClosePercent / 100.0, 2);"
  );
  code.onTick.push("            if(closeVolume >= SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN))");
  code.onTick.push("            {");
  code.onTick.push("               trade.PositionClosePartial(ticket, closeVolume);");
  code.onTick.push("               MarkPartialClosed(ticket);");

  if (data.moveSLToBreakeven) {
    code.onTick.push("               // Move SL to breakeven after partial close");
    code.onTick.push("               if(posType == POSITION_TYPE_BUY)");
    code.onTick.push(
      "                  trade.PositionModify(ticket, openPrice, PositionGetDouble(POSITION_TP));"
    );
    code.onTick.push("               else");
    code.onTick.push(
      "                  trade.PositionModify(ticket, openPrice, PositionGetDouble(POSITION_TP));"
    );
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
  const group = "Lock Profit";
  if (data.method === "PERCENTAGE") {
    code.inputs.push(
      createInput(
        node,
        "lockPercent",
        "InpLockProfitPercent",
        "double",
        data.lockPercent,
        "Lock Profit %",
        group
      )
    );
  } else {
    code.inputs.push(
      createInput(
        node,
        "lockPips",
        "InpLockProfitPips",
        "double",
        data.lockPips,
        "Lock Profit (pips)",
        group
      )
    );
  }
  code.inputs.push(
    createInput(
      node,
      "checkIntervalPips",
      "InpLockCheckInterval",
      "double",
      data.checkIntervalPips,
      "Check Interval (pips)",
      group
    )
  );

  code.onTick.push("// Lock Profit Management");
  code.onTick.push("for(int i = PositionsTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   ulong ticket = PositionGetTicket(i);");
  code.onTick.push("   if(PositionSelectByTicket(ticket))");
  code.onTick.push("   {");
  code.onTick.push(
    "      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)"
  );
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
    code.onTick.push(
      "               double lockPoints = currentProfitPoints * (InpLockProfitPercent / 100.0);"
    );
  } else {
    code.onTick.push("               double lockPoints = InpLockProfitPips * 10;");
  }

  code.onTick.push("               double newSL = openPrice + lockPoints * point;");
  code.onTick.push("               if(newSL > currentSL)");
  code.onTick.push("               {");
  code.onTick.push(
    "                  trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));"
  );
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
    code.onTick.push(
      "               double lockPoints = currentProfitPoints * (InpLockProfitPercent / 100.0);"
    );
  } else {
    code.onTick.push("               double lockPoints = InpLockProfitPips * 10;");
  }

  code.onTick.push("               double newSL = openPrice - lockPoints * point;");
  code.onTick.push("               if(newSL < currentSL || currentSL == 0)");
  code.onTick.push("               {");
  code.onTick.push(
    "                  trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));"
  );
  code.onTick.push("               }");
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}
