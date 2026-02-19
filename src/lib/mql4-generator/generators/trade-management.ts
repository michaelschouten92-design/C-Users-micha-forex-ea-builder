import type {
  BuilderNode,
  BreakevenStopNodeData,
  TrailingStopNodeData,
  PartialCloseNodeData,
  LockProfitNodeData,
  MultiLevelTPNodeData,
} from "@/types/builder";
import type { GeneratedCode } from "../types";
import { createInput } from "./shared";

export function generateTradeManagementCode(node: BuilderNode, code: GeneratedCode): void {
  const data = node.data;
  const managementType =
    ("managementType" in data ? data.managementType : null) ||
    ("tradeManagementType" in data ? data.tradeManagementType : null) ||
    node.type;

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
    case "multi-level-tp":
      generateMultiLevelTPCode(node, data as MultiLevelTPNodeData, code);
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
    // MQL4: no handle needed — use direct iATR() calls
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
    code.onTick.push("double beATRValue = iATR(Symbol(), PERIOD_CURRENT, InpBEATRPeriod, 0);");
  }

  code.onTick.push("for(int i = OrdersTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;");
  code.onTick.push("   if(OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())");
  code.onTick.push("   {");
  code.onTick.push("      double openPrice = OrderOpenPrice();");
  code.onTick.push("      double currentSL = OrderStopLoss();");
  code.onTick.push("      double positionProfit = OrderProfit();");
  code.onTick.push("      double positionVolume = OrderLots();");
  code.onTick.push("      int posType = OrderType();");
  code.onTick.push("      double point = MarketInfo(Symbol(), MODE_POINT);");
  code.onTick.push("      double lockPoints = InpBELockPips * _pipFactor;");
  code.onTick.push("");
  code.onTick.push("      bool triggerReached = false;");

  if (data.trigger === "PIPS") {
    code.onTick.push("      double triggerPoints = InpBETriggerPips * _pipFactor;");
    code.onTick.push("      if(posType == OP_BUY)");
    code.onTick.push("         triggerReached = (Bid >= openPrice + triggerPoints * point);");
    code.onTick.push("      else if(posType == OP_SELL)");
    code.onTick.push("         triggerReached = (Ask <= openPrice - triggerPoints * point);");
  } else if (data.trigger === "PERCENTAGE") {
    code.onTick.push("      // Trigger when unrealised profit reaches X% of account balance");
    code.onTick.push("      double beBalance = AccountBalance();");
    code.onTick.push(
      "      double profitPercent = (beBalance > 0) ? (positionProfit / beBalance) * 100.0 : 0;"
    );
    code.onTick.push("      triggerReached = (profitPercent >= InpBETriggerPercent);");
  } else if (data.trigger === "ATR") {
    code.onTick.push("      double triggerPoints = (beATRValue / point) * InpBEATRMultiplier;");
    code.onTick.push("      if(posType == OP_BUY)");
    code.onTick.push("         triggerReached = (Bid >= openPrice + triggerPoints * point);");
    code.onTick.push("      else if(posType == OP_SELL)");
    code.onTick.push("         triggerReached = (Ask <= openPrice - triggerPoints * point);");
  }

  code.onTick.push("");
  code.onTick.push("      if(triggerReached)");
  code.onTick.push("      {");
  code.onTick.push("         if(posType == OP_BUY)");
  code.onTick.push("         {");
  code.onTick.push("            double newBE = openPrice + lockPoints * point;");
  code.onTick.push("            if(currentSL < newBE)");
  code.onTick.push(
    "               OrderModify(OrderTicket(), OrderOpenPrice(), newBE, OrderTakeProfit(), 0);"
  );
  code.onTick.push("         }");
  code.onTick.push("         else if(posType == OP_SELL)");
  code.onTick.push("         {");
  code.onTick.push("            double newBE = openPrice - lockPoints * point;");
  code.onTick.push("            if(currentSL > newBE || currentSL == 0)");
  code.onTick.push(
    "               OrderModify(OrderTicket(), OrderOpenPrice(), newBE, OrderTakeProfit(), 0);"
  );
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
    // MQL4: no handle needed — use direct iATR() calls
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
    code.onTick.push(
      "double trailATRValue = iATR(Symbol(), PERIOD_CURRENT, InpTrailATRPeriod, 0);"
    );
  }

  code.onTick.push("for(int i = OrdersTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;");
  code.onTick.push("   if(OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())");
  code.onTick.push("   {");
  code.onTick.push("      double openPrice = OrderOpenPrice();");
  code.onTick.push("      double currentSL = OrderStopLoss();");
  code.onTick.push("      int posType = OrderType();");
  code.onTick.push("      double point = MarketInfo(Symbol(), MODE_POINT);");
  code.onTick.push("      double startPoints = InpTrailStartPips * _pipFactor;");

  // Calculate trailPoints based on method
  if (data.method === "ATR_BASED") {
    code.onTick.push("      double trailPoints = (trailATRValue / point) * InpTrailATRMultiplier;");
  } else if (data.method === "PERCENTAGE") {
    // Trail by percentage of current profit in points
    code.onTick.push("      double currentProfitPoints = 0;");
    code.onTick.push("      if(posType == OP_BUY)");
    code.onTick.push("         currentProfitPoints = (Bid - openPrice) / point;");
    code.onTick.push("      else");
    code.onTick.push("         currentProfitPoints = (openPrice - Ask) / point;");
    code.onTick.push(
      "      double trailPoints = MathMax(currentProfitPoints * (InpTrailPercent / 100.0), _pipFactor);"
    );
  } else {
    // FIXED_PIPS
    code.onTick.push("      double trailPoints = InpTrailPips * _pipFactor;");
  }

  code.onTick.push("");
  code.onTick.push("      if(posType == OP_BUY)");
  code.onTick.push("      {");
  code.onTick.push("         double bid = Bid;");
  code.onTick.push("         if(bid >= openPrice + startPoints * point)");
  code.onTick.push("         {");
  code.onTick.push("            double newSL = bid - trailPoints * point;");
  code.onTick.push("            if(newSL > currentSL)");
  code.onTick.push("            {");
  code.onTick.push(
    "               OrderModify(OrderTicket(), OrderOpenPrice(), newSL, OrderTakeProfit(), 0);"
  );
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("      else if(posType == OP_SELL)");
  code.onTick.push("      {");
  code.onTick.push("         double ask = Ask;");
  code.onTick.push("         if(ask <= openPrice - startPoints * point)");
  code.onTick.push("         {");
  code.onTick.push("            double newSL = ask + trailPoints * point;");
  code.onTick.push("            if(newSL < currentSL || currentSL == 0)");
  code.onTick.push("            {");
  code.onTick.push(
    "               OrderModify(OrderTicket(), OrderOpenPrice(), newSL, OrderTakeProfit(), 0);"
  );
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
  const rawData = data as Record<string, unknown>;
  const rMultipleTrigger = rawData._rMultipleTrigger as number | undefined;
  const triggerMethod = (rawData.triggerMethod as string) ?? "PIPS";
  if (rMultipleTrigger && rMultipleTrigger > 0) {
    // R-multiple trigger: use SL distance x R-multiple as pips trigger
    code.inputs.push(
      createInput(
        node,
        "_rMultipleTrigger",
        "InpTP1RMultiple",
        "double",
        rMultipleTrigger,
        "TP1 R-Multiple",
        group
      )
    );
  } else if (triggerMethod === "PERCENT") {
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
  if (!code.globalVariables.includes("int partialClosedTickets[];")) {
    code.globalVariables.push("int partialClosedTickets[];");

    code.helperFunctions
      .push(`//+------------------------------------------------------------------+
//| Check if ticket has been partially closed                         |
//+------------------------------------------------------------------+
bool IsPartialClosed(int ticket)
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
void MarkPartialClosed(int ticket)
{
   int size = ArraySize(partialClosedTickets);
   ArrayResize(partialClosedTickets, size + 1);
   partialClosedTickets[size] = ticket;
}

//+------------------------------------------------------------------+
//| Remove tickets for positions that no longer exist                 |
//+------------------------------------------------------------------+
void CleanPartialClosedTickets()
{
   for(int i = ArraySize(partialClosedTickets) - 1; i >= 0; i--)
   {
      bool found = false;
      for(int j = OrdersTotal() - 1; j >= 0; j--)
      {
         if(OrderSelect(j, SELECT_BY_POS, MODE_TRADES) && OrderTicket() == partialClosedTickets[i])
         { found = true; break; }
      }
      if(!found)
      {
         int last = ArraySize(partialClosedTickets) - 1;
         partialClosedTickets[i] = partialClosedTickets[last];
         ArrayResize(partialClosedTickets, last);
      }
   }
}`);
  }

  code.onTick.push("// Partial Close Management");
  code.onTick.push("CleanPartialClosedTickets();");
  code.onTick.push("for(int i = OrdersTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;");
  code.onTick.push("   if(OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())");
  code.onTick.push("   {");
  code.onTick.push("      double openPrice = OrderOpenPrice();");
  code.onTick.push("      double volume = OrderLots();");
  code.onTick.push("      int posType = OrderType();");
  code.onTick.push("      double point = MarketInfo(Symbol(), MODE_POINT);");
  code.onTick.push("      int ticket = OrderTicket();");
  code.onTick.push("      bool profitReached = false;");
  if (rMultipleTrigger && rMultipleTrigger > 0) {
    // R-multiple trigger: compare profit in points to SL distance x R-multiple
    code.onTick.push("      double openSL = OrderStopLoss();");
    code.onTick.push("      double slDistPoints = MathAbs(openPrice - openSL) / point;");
    code.onTick.push("      double triggerPoints = slDistPoints * InpTP1RMultiple;");
    code.onTick.push("      if(posType == OP_BUY && Bid >= openPrice + triggerPoints * point)");
    code.onTick.push("         profitReached = true;");
    code.onTick.push("      if(posType == OP_SELL && Ask <= openPrice - triggerPoints * point)");
    code.onTick.push("         profitReached = true;");
  } else if (triggerMethod === "PERCENT") {
    // Profit-based: trigger when position profit as % of balance reaches threshold
    code.onTick.push("      double posProfit = OrderProfit();");
    code.onTick.push("      double balance = AccountBalance();");
    code.onTick.push(
      "      if(balance > 0 && (posProfit / balance) * 100.0 >= InpPartialCloseTriggerPercent)"
    );
    code.onTick.push("         profitReached = true;");
  } else {
    code.onTick.push(
      "      double triggerPrice = InpPartialCloseTriggerPips * _pipFactor * point;"
    );
    code.onTick.push("      if(posType == OP_BUY && Bid >= openPrice + triggerPrice)");
    code.onTick.push("         profitReached = true;");
    code.onTick.push("      if(posType == OP_SELL && Ask <= openPrice - triggerPrice)");
    code.onTick.push("         profitReached = true;");
  }
  code.onTick.push("");
  code.onTick.push("      if(profitReached && !IsPartialClosed(ticket))");
  code.onTick.push("      {");
  code.onTick.push(
    "         double pcLotStep = MarketInfo(Symbol(), MODE_LOTSTEP);",
    "         double pcMinLot = MarketInfo(Symbol(), MODE_MINLOT);",
    "         double closeVolume = MathFloor(volume * InpPartialClosePercent / 100.0 / pcLotStep) * pcLotStep;",
    "         // Ensure remaining position meets minimum lot requirement",
    "         if(volume - closeVolume < pcMinLot) closeVolume = MathFloor((volume - pcMinLot) / pcLotStep) * pcLotStep;"
  );
  code.onTick.push("         if(closeVolume >= pcMinLot)");
  code.onTick.push("         {");
  code.onTick.push("            double cachedTP = OrderTakeProfit();");
  code.onTick.push("            double closePrice = (posType == OP_BUY) ? Bid : Ask;");
  code.onTick.push("            OrderClose(ticket, closeVolume, closePrice, InpMaxSlippage);");
  code.onTick.push("            // Re-select position after partial close (ticket may change)");
  code.onTick.push("            bool reselected = false;");
  code.onTick.push("            for(int pc=OrdersTotal()-1; pc>=0; pc--)");
  code.onTick.push("            {");
  code.onTick.push("               if(!OrderSelect(pc, SELECT_BY_POS, MODE_TRADES)) continue;");
  code.onTick.push(
    "               if(OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())"
  );
  code.onTick.push("               { ticket = OrderTicket(); reselected = true; break; }");
  code.onTick.push("            }");
  code.onTick.push("            MarkPartialClosed(ticket);");

  if (data.moveSLToBreakeven) {
    code.onTick.push("            // Move SL to breakeven after partial close");
    code.onTick.push("            if(reselected)");
    code.onTick.push(
      "               OrderModify(ticket, OrderOpenPrice(), openPrice, cachedTP, 0);"
    );
  }

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
      "Min Profit Threshold (pips)",
      group
    )
  );

  code.onTick.push("// Lock Profit Management");
  code.onTick.push("for(int i = OrdersTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;");
  code.onTick.push("   if(OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())");
  code.onTick.push("   {");
  code.onTick.push("      double openPrice = OrderOpenPrice();");
  code.onTick.push("      double currentSL = OrderStopLoss();");
  code.onTick.push("      int posType = OrderType();");
  code.onTick.push("      double point = MarketInfo(Symbol(), MODE_POINT);");
  code.onTick.push("      double checkPoints = InpLockCheckInterval * _pipFactor;");
  code.onTick.push("");
  code.onTick.push("      if(posType == OP_BUY)");
  code.onTick.push("      {");
  code.onTick.push("         double bid = Bid;");
  code.onTick.push("         double currentProfitPoints = (bid - openPrice) / point;");
  code.onTick.push("         if(currentProfitPoints > checkPoints)");
  code.onTick.push("         {");

  if (data.method === "PERCENTAGE") {
    code.onTick.push(
      "            double lockPoints = currentProfitPoints * (InpLockProfitPercent / 100.0);"
    );
  } else {
    code.onTick.push("            double lockPoints = InpLockProfitPips * _pipFactor;");
  }

  code.onTick.push("            double newSL = openPrice + lockPoints * point;");
  code.onTick.push("            if(newSL > currentSL)");
  code.onTick.push("            {");
  code.onTick.push(
    "               OrderModify(OrderTicket(), OrderOpenPrice(), newSL, OrderTakeProfit(), 0);"
  );
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("      else if(posType == OP_SELL)");
  code.onTick.push("      {");
  code.onTick.push("         double ask = Ask;");
  code.onTick.push("         double currentProfitPoints = (openPrice - ask) / point;");
  code.onTick.push("         if(currentProfitPoints > checkPoints)");
  code.onTick.push("         {");

  if (data.method === "PERCENTAGE") {
    code.onTick.push(
      "            double lockPoints = currentProfitPoints * (InpLockProfitPercent / 100.0);"
    );
  } else {
    code.onTick.push("            double lockPoints = InpLockProfitPips * _pipFactor;");
  }

  code.onTick.push("            double newSL = openPrice - lockPoints * point;");
  code.onTick.push("            if(newSL < currentSL || currentSL == 0)");
  code.onTick.push("            {");
  code.onTick.push(
    "               OrderModify(OrderTicket(), OrderOpenPrice(), newSL, OrderTakeProfit(), 0);"
  );
  code.onTick.push("            }");
  code.onTick.push("         }");
  code.onTick.push("      }");
  code.onTick.push("   }");
  code.onTick.push("}");
}

function generateMultiLevelTPCode(
  node: BuilderNode,
  data: MultiLevelTPNodeData,
  code: GeneratedCode
): void {
  const group = "Multi-Level TP";

  code.inputs.push(
    createInput(
      node,
      "tp1Pips",
      "InpMLTP1Pips",
      "double",
      data.tp1Pips,
      "TP1 Distance (pips)",
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp1Percent",
      "InpMLTP1Percent",
      "double",
      data.tp1Percent,
      "TP1 Close %",
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp2Pips",
      "InpMLTP2Pips",
      "double",
      data.tp2Pips,
      "TP2 Distance (pips)",
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp2Percent",
      "InpMLTP2Percent",
      "double",
      data.tp2Percent,
      "TP2 Close %",
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp3Pips",
      "InpMLTP3Pips",
      "double",
      data.tp3Pips,
      "TP3 Distance (pips)",
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp3Percent",
      "InpMLTP3Percent",
      "double",
      data.tp3Percent,
      "TP3 Close %",
      group
    )
  );

  // Track TP state per ticket: 0=no TP hit, 1=TP1 hit, 2=TP2 hit, 3=TP3 hit
  code.globalVariables.push("int g_mltpTickets[];");
  code.globalVariables.push("int g_mltpLevels[];");
  code.globalVariables.push("int g_mltpCount = 0;");

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Get Multi-Level TP state for a ticket                            |
//+------------------------------------------------------------------+
int GetMLTPLevel(int ticket)
{
   for(int i = 0; i < g_mltpCount; i++)
   {
      if(g_mltpTickets[i] == ticket) return g_mltpLevels[i];
   }
   return 0;
}

//+------------------------------------------------------------------+
//| Set Multi-Level TP state for a ticket                            |
//+------------------------------------------------------------------+
void SetMLTPLevel(int ticket, int level)
{
   for(int i = 0; i < g_mltpCount; i++)
   {
      if(g_mltpTickets[i] == ticket) { g_mltpLevels[i] = level; return; }
   }
   int idx = g_mltpCount++;
   ArrayResize(g_mltpTickets, g_mltpCount);
   ArrayResize(g_mltpLevels, g_mltpCount);
   g_mltpTickets[idx] = ticket;
   g_mltpLevels[idx] = level;
}

//+------------------------------------------------------------------+
//| Clean up MLTP states for closed positions                        |
//+------------------------------------------------------------------+
void CleanMLTPStates()
{
   for(int i = g_mltpCount - 1; i >= 0; i--)
   {
      bool found = false;
      for(int j = OrdersTotal() - 1; j >= 0; j--)
      {
         if(OrderSelect(j, SELECT_BY_POS, MODE_TRADES) && OrderTicket() == g_mltpTickets[i])
         { found = true; break; }
      }
      if(!found)
      {
         int last = g_mltpCount - 1;
         g_mltpTickets[i] = g_mltpTickets[last];
         g_mltpLevels[i] = g_mltpLevels[last];
         g_mltpCount--;
         ArrayResize(g_mltpTickets, g_mltpCount);
         ArrayResize(g_mltpLevels, g_mltpCount);
      }
   }
}`);

  code.onTick.push("// Multi-Level TP Management");
  code.onTick.push("CleanMLTPStates();");
  code.onTick.push("for(int i = OrdersTotal() - 1; i >= 0; i--)");
  code.onTick.push("{");
  code.onTick.push("   if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;");
  code.onTick.push(
    "   if(OrderMagicNumber() != InpMagicNumber || OrderSymbol() != Symbol()) continue;"
  );
  code.onTick.push("");
  code.onTick.push("   double openPrice = OrderOpenPrice();");
  code.onTick.push("   double volume = OrderLots();");
  code.onTick.push("   int posType = OrderType();");
  code.onTick.push("   int ticket = OrderTicket();");
  code.onTick.push("   double point = MarketInfo(Symbol(), MODE_POINT);");
  code.onTick.push("   int tpLevel = GetMLTPLevel(ticket);");
  code.onTick.push("");
  code.onTick.push("   double profitPoints = 0;");
  code.onTick.push("   if(posType == OP_BUY)");
  code.onTick.push("      profitPoints = (Bid - openPrice) / point;");
  code.onTick.push("   else if(posType == OP_SELL)");
  code.onTick.push("      profitPoints = (openPrice - Ask) / point;");
  code.onTick.push("");
  code.onTick.push("   double tp1Points = InpMLTP1Pips * _pipFactor;");
  code.onTick.push("   double tp2Points = InpMLTP2Pips * _pipFactor;");
  code.onTick.push("   double tp3Points = InpMLTP3Pips * _pipFactor;");
  code.onTick.push("");
  code.onTick.push("   double pcLotStep = MarketInfo(Symbol(), MODE_LOTSTEP);");
  code.onTick.push("   double pcMinLot = MarketInfo(Symbol(), MODE_MINLOT);");
  code.onTick.push("");

  // TP1 check
  code.onTick.push("   // TP Level 1");
  code.onTick.push("   if(tpLevel < 1 && profitPoints >= tp1Points)");
  code.onTick.push("   {");
  code.onTick.push(
    "      double closeVol = MathFloor(volume * InpMLTP1Percent / 100.0 / pcLotStep) * pcLotStep;"
  );
  code.onTick.push(
    "      if(volume - closeVol < pcMinLot) closeVol = MathFloor((volume - pcMinLot) / pcLotStep) * pcLotStep;"
  );
  code.onTick.push("      if(closeVol >= pcMinLot)");
  code.onTick.push("      {");
  code.onTick.push("         double closePrice = (posType == OP_BUY) ? Bid : Ask;");
  code.onTick.push("         OrderClose(ticket, closeVol, closePrice, InpMaxSlippage);");
  code.onTick.push("         SetMLTPLevel(ticket, 1);");

  if (data.moveSLAfterTP1 === "BREAKEVEN" || data.moveSLAfterTP1 === "TRAIL") {
    code.onTick.push("         // Move SL to breakeven after TP1");
    code.onTick.push("         // Re-select order after partial close");
    code.onTick.push("         for(int pc = OrdersTotal() - 1; pc >= 0; pc--)");
    code.onTick.push("         {");
    code.onTick.push("            if(!OrderSelect(pc, SELECT_BY_POS, MODE_TRADES)) continue;");
    code.onTick.push(
      "            if(OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())"
    );
    code.onTick.push("            {");
    code.onTick.push(
      "               OrderModify(OrderTicket(), OrderOpenPrice(), openPrice, OrderTakeProfit(), 0);"
    );
    code.onTick.push("               break;");
    code.onTick.push("            }");
    code.onTick.push("         }");
  }

  code.onTick.push("      }");
  code.onTick.push("      continue;");
  code.onTick.push("   }");
  code.onTick.push("");

  // TP2 check
  code.onTick.push("   // TP Level 2");
  code.onTick.push("   if(tpLevel == 1 && profitPoints >= tp2Points)");
  code.onTick.push("   {");
  code.onTick.push(
    "      double closeVol = MathFloor(volume * InpMLTP2Percent / (InpMLTP2Percent + InpMLTP3Percent) / pcLotStep) * pcLotStep;"
  );
  code.onTick.push(
    "      if(volume - closeVol < pcMinLot) closeVol = MathFloor((volume - pcMinLot) / pcLotStep) * pcLotStep;"
  );
  code.onTick.push("      if(closeVol >= pcMinLot)");
  code.onTick.push("      {");
  code.onTick.push("         double closePrice = (posType == OP_BUY) ? Bid : Ask;");
  code.onTick.push("         OrderClose(ticket, closeVol, closePrice, InpMaxSlippage);");
  code.onTick.push("         SetMLTPLevel(ticket, 2);");
  code.onTick.push("      }");
  code.onTick.push("      continue;");
  code.onTick.push("   }");
  code.onTick.push("");

  // TP3 check: close remaining
  code.onTick.push("   // TP Level 3: close remaining position");
  code.onTick.push("   if(tpLevel == 2 && profitPoints >= tp3Points)");
  code.onTick.push("   {");
  code.onTick.push("      double closePrice = (posType == OP_BUY) ? Bid : Ask;");
  code.onTick.push("      OrderClose(ticket, volume, closePrice, InpMaxSlippage);");
  code.onTick.push("      SetMLTPLevel(ticket, 3);");
  code.onTick.push("   }");
  code.onTick.push("}");
}
