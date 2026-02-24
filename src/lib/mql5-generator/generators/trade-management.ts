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

  // Add SafePositionModify helper once (deduplicated across multiple management nodes)
  if (!code.helperFunctions.some((f) => f.includes("SafePositionModify"))) {
    code.helperFunctions.push(
      [
        "//+------------------------------------------------------------------+",
        "//| Modify position with freeze-level guard and error logging        |",
        "//| Note: PositionModify sets exact SL/TP prices (not market orders) |",
        "//| so deviation/slippage does not apply to this operation.          |",
        "//+------------------------------------------------------------------+",
        "bool SafePositionModify(CTrade &tradeObj, ulong ticket, double sl, double tp)",
        "{",
        "   if(!PositionSelectByTicket(ticket)) return false;",
        "   string sym = PositionGetString(POSITION_SYMBOL);",
        "   double freezeLvl = (double)SymbolInfoInteger(sym, SYMBOL_TRADE_FREEZE_LEVEL) * SymbolInfoDouble(sym, SYMBOL_POINT);",
        "   if(freezeLvl > 0)",
        "   {",
        "      long pType = PositionGetInteger(POSITION_TYPE);",
        "      double price = (pType == POSITION_TYPE_BUY) ? SymbolInfoDouble(sym, SYMBOL_BID) : SymbolInfoDouble(sym, SYMBOL_ASK);",
        "      if((sl > 0 && MathAbs(price - sl) < freezeLvl) || (tp > 0 && MathAbs(price - tp) < freezeLvl))",
        "         return false;",
        "   }",
        "   if(!tradeObj.PositionModify(ticket, sl, tp))",
        "   {",
        '      PrintFormat("PositionModify failed for ticket %I64u: error %d (%s), SL=%.5f, TP=%.5f",',
        "                  ticket, tradeObj.ResultRetcode(), tradeObj.ResultRetcodeDescription(), sl, tp);",
        "      return false;",
        "   }",
        "   return true;",
        "}",
      ].join("\n")
    );
  }

  // Initialize tracking arrays for consolidated position loop
  if (!code._managementCalls) code._managementCalls = [];
  if (!code._managementPreLoop) code._managementPreLoop = [];

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

/**
 * Generate the consolidated ManageOpenPositions() function that iterates
 * positions once and applies all active management rules.
 * Called after all management nodes have been processed.
 */
export function finalizeTradeManagement(code: GeneratedCode): void {
  const calls = code._managementCalls;
  if (!calls || calls.length === 0) return;

  // Add pre-loop code to onTick (CopyBuffer calls, etc.)
  const preLoop = code._managementPreLoop ?? [];

  code.onTick.push("");
  code.onTick.push("//--- Trade Management");
  code.onTick.push("ManageOpenPositions();");

  // Build the consolidated ManageOpenPositions function
  const lines: string[] = [
    "//+------------------------------------------------------------------+",
    "//| Iterate positions once and apply all management rules            |",
    "//+------------------------------------------------------------------+",
    "void ManageOpenPositions()",
    "{",
  ];

  // Pre-loop setup (CopyBuffer calls, throttled cleanup, etc.)
  for (const line of preLoop) {
    lines.push(`   ${line}`);
  }
  if (preLoop.length > 0) lines.push("");

  lines.push(
    "   for(int i = PositionsTotal() - 1; i >= 0; i--)",
    "   {",
    "      ulong ticket = PositionGetTicket(i);",
    "      if(!PositionSelectByTicket(ticket)) continue;",
    "      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;",
    "      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;",
    "",
    "      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);",
    "      double currentSL = PositionGetDouble(POSITION_SL);",
    "      double currentTP = PositionGetDouble(POSITION_TP);",
    "      double positionProfit = PositionGetDouble(POSITION_PROFIT);",
    "      double volume = PositionGetDouble(POSITION_VOLUME);",
    "      long posType = PositionGetInteger(POSITION_TYPE);",
    "      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);",
    ""
  );

  // Call each per-position management function
  for (const call of calls) {
    lines.push(`      ${call}`);
  }

  lines.push("   }", "}");

  code.helperFunctions.push(lines.join("\n"));
}

function generateBreakevenStopCode(
  node: BuilderNode,
  data: BreakevenStopNodeData,
  code: GeneratedCode
): void {
  const group = "Breakeven Stop";
  // Deduplicate when multiple breakeven nodes exist
  const existingBE = code.inputs.filter((i) => i.name.startsWith("InpBELockPips"));
  const beSuffix = existingBE.length > 0 ? `${existingBE.length + 1}` : "";

  // Add inputs based on trigger type
  if (data.trigger === "PIPS") {
    code.inputs.push(
      createInput(
        node,
        "triggerPips",
        `InpBETriggerPips${beSuffix}`,
        "double",
        data.triggerPips,
        `Breakeven Trigger (pips)${beSuffix ? ` ${beSuffix}` : ""}`,
        group
      )
    );
  } else if (data.trigger === "PERCENTAGE") {
    code.inputs.push(
      createInput(
        node,
        "triggerPercent",
        `InpBETriggerPercent${beSuffix}`,
        "double",
        data.triggerPercent,
        `Breakeven Trigger (% profit)${beSuffix ? ` ${beSuffix}` : ""}`,
        group
      )
    );
  } else if (data.trigger === "ATR") {
    code.inputs.push(
      createInput(
        node,
        "triggerAtrPeriod",
        `InpBEATRPeriod${beSuffix}`,
        "int",
        data.triggerAtrPeriod,
        `Breakeven ATR Period${beSuffix ? ` ${beSuffix}` : ""}`,
        group
      )
    );
    code.inputs.push(
      createInput(
        node,
        "triggerAtrMultiplier",
        `InpBEATRMultiplier${beSuffix}`,
        "double",
        data.triggerAtrMultiplier,
        `Breakeven ATR Multiplier${beSuffix ? ` ${beSuffix}` : ""}`,
        group
      )
    );
    code.globalVariables.push(`int beATRHandle${beSuffix} = INVALID_HANDLE;`);
    code.globalVariables.push(`double beATRBuffer${beSuffix}[];`);
    code.onInit.push(
      `beATRHandle${beSuffix} = iATR(_Symbol, PERIOD_CURRENT, InpBEATRPeriod${beSuffix});`
    );
    code.onInit.push(
      `if(beATRHandle${beSuffix} == INVALID_HANDLE) { Print("Failed to create ATR handle for Breakeven"); return(INIT_FAILED); }`
    );
    code.onDeinit.push(
      `if(beATRHandle${beSuffix} != INVALID_HANDLE) IndicatorRelease(beATRHandle${beSuffix});`
    );
    code.onInit.push(`ArraySetAsSeries(beATRBuffer${beSuffix}, true);`);
  }
  code.inputs.push(
    createInput(
      node,
      "lockPips",
      `InpBELockPips${beSuffix}`,
      "double",
      data.lockPips,
      `Breakeven Lock (pips above entry)${beSuffix ? ` ${beSuffix}` : ""}`,
      group
    )
  );

  // Pre-loop: CopyBuffer for ATR if needed
  if (data.trigger === "ATR") {
    code._managementPreLoop!.push(
      `bool beATRReady${beSuffix} = (CopyBuffer(beATRHandle${beSuffix}, 0, 0, 1, beATRBuffer${beSuffix}) >= 1);`
    );
  }

  // Build per-position helper function
  const fnLines: string[] = [
    "//+------------------------------------------------------------------+",
    "//| Check breakeven stop for a single position                       |",
    "//+------------------------------------------------------------------+",
    `void CheckBreakevenStop${beSuffix}(ulong ticket, double openPrice, double currentSL, double currentTP, double positionProfit, long posType, double point)`,
    "{",
    "   if(point <= 0) return;",
    "   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);",
    `   double lockPoints = InpBELockPips${beSuffix} * _pipFactor;`,
    "",
    "   bool triggerReached = false;",
  ];

  if (data.trigger === "PIPS") {
    fnLines.push(
      `   double triggerPoints = InpBETriggerPips${beSuffix} * _pipFactor;`,
      "   if(posType == POSITION_TYPE_BUY)",
      "      triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPoints * point);",
      "   else if(posType == POSITION_TYPE_SELL)",
      "      triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPoints * point);"
    );
  } else if (data.trigger === "PERCENTAGE") {
    fnLines.push(
      "   double beBalance = AccountInfoDouble(ACCOUNT_BALANCE);",
      "   double profitPercent = (beBalance > 0) ? (positionProfit / beBalance) * 100.0 : 0;",
      `   triggerReached = (profitPercent >= InpBETriggerPercent${beSuffix});`
    );
  } else if (data.trigger === "ATR") {
    fnLines.push(
      `   double triggerPoints = (beATRBuffer${beSuffix}[0] / point) * InpBEATRMultiplier${beSuffix};`,
      "   if(posType == POSITION_TYPE_BUY)",
      "      triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPoints * point);",
      "   else if(posType == POSITION_TYPE_SELL)",
      "      triggerReached = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPoints * point);"
    );
  }

  fnLines.push(
    "",
    "   if(triggerReached)",
    "   {",
    "      if(posType == POSITION_TYPE_BUY)",
    "      {",
    "         double newBE = NormalizeDouble(openPrice + lockPoints * point, digits);",
    "         if(currentSL < newBE)",
    "            SafePositionModify(trade, ticket, newBE, currentTP);",
    "      }",
    "      else if(posType == POSITION_TYPE_SELL)",
    "      {",
    "         double newBE = NormalizeDouble(openPrice - lockPoints * point, digits);",
    "         if(currentSL > newBE || currentSL == 0)",
    "            SafePositionModify(trade, ticket, newBE, currentTP);",
    "      }",
    "   }",
    "}"
  );

  code.helperFunctions.push(fnLines.join("\n"));
  if (data.trigger === "ATR") {
    code._managementCalls!.push(
      `if(beATRReady${beSuffix}) CheckBreakevenStop${beSuffix}(ticket, openPrice, currentSL, currentTP, positionProfit, posType, point);`
    );
  } else {
    code._managementCalls!.push(
      `CheckBreakevenStop${beSuffix}(ticket, openPrice, currentSL, currentTP, positionProfit, posType, point);`
    );
  }
}

function generateTrailingStopCode(
  node: BuilderNode,
  data: TrailingStopNodeData,
  code: GeneratedCode
): void {
  const group = "Trailing Stop";
  // Deduplicate when multiple trailing stop nodes exist
  const existingTrail = code.inputs.filter((i) => i.name.startsWith("InpTrailStartPips"));
  const tsSuffix = existingTrail.length > 0 ? `${existingTrail.length + 1}` : "";

  // Method-specific inputs and setup
  if (data.method === "ATR_BASED") {
    code.inputs.push(
      createInput(
        node,
        "trailAtrPeriod",
        `InpTrailATRPeriod${tsSuffix}`,
        "int",
        data.trailAtrPeriod,
        `Trail ATR Period${tsSuffix ? ` ${tsSuffix}` : ""}`,
        group
      )
    );
    code.inputs.push(
      createInput(
        node,
        "trailAtrMultiplier",
        `InpTrailATRMultiplier${tsSuffix}`,
        "double",
        data.trailAtrMultiplier,
        `Trail ATR Multiplier${tsSuffix ? ` ${tsSuffix}` : ""}`,
        group
      )
    );
    code.globalVariables.push(`int trailATRHandle${tsSuffix} = INVALID_HANDLE;`);
    code.globalVariables.push(`double trailATRBuffer${tsSuffix}[];`);
    code.onInit.push(
      `trailATRHandle${tsSuffix} = iATR(_Symbol, PERIOD_CURRENT, InpTrailATRPeriod${tsSuffix});`
    );
    code.onInit.push(
      `if(trailATRHandle${tsSuffix} == INVALID_HANDLE) { Print("Failed to create ATR handle for Trailing Stop"); return(INIT_FAILED); }`
    );
    code.onInit.push(`ArraySetAsSeries(trailATRBuffer${tsSuffix}, true);`);
    code.onDeinit.push(
      `if(trailATRHandle${tsSuffix} != INVALID_HANDLE) IndicatorRelease(trailATRHandle${tsSuffix});`
    );
  } else if (data.method === "PERCENTAGE") {
    code.inputs.push(
      createInput(
        node,
        "trailPercent",
        `InpTrailPercent${tsSuffix}`,
        "double",
        data.trailPercent,
        `Trail Distance (%)${tsSuffix ? ` ${tsSuffix}` : ""}`,
        group
      )
    );
  } else {
    // FIXED_PIPS
    code.inputs.push(
      createInput(
        node,
        "trailPips",
        `InpTrailPips${tsSuffix}`,
        "double",
        data.trailPips,
        `Trail Distance (pips)${tsSuffix ? ` ${tsSuffix}` : ""}`,
        group
      )
    );
  }

  // Start-after threshold (shared by all non-indicator methods)
  code.inputs.push(
    createInput(
      node,
      "startAfterPips",
      `InpTrailStartPips${tsSuffix}`,
      "double",
      data.startAfterPips,
      `Trail Start After (pips profit)${tsSuffix ? ` ${tsSuffix}` : ""}`,
      group
    )
  );

  // Pre-loop: CopyBuffer for ATR if needed
  if (data.method === "ATR_BASED") {
    code._managementPreLoop!.push(
      `bool trailATRReady${tsSuffix} = (CopyBuffer(trailATRHandle${tsSuffix}, 0, 0, 1, trailATRBuffer${tsSuffix}) >= 1);`
    );
  }

  // Build per-position helper function
  const fnLines: string[] = [
    "//+------------------------------------------------------------------+",
    "//| Check trailing stop for a single position                        |",
    "//+------------------------------------------------------------------+",
    `void CheckTrailingStop${tsSuffix}(ulong ticket, double openPrice, double currentSL, double currentTP, long posType, double point)`,
    "{",
    "   if(point <= 0) return;",
    "   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);",
    `   double startPoints = InpTrailStartPips${tsSuffix} * _pipFactor;`,
  ];

  if (data.method === "ATR_BASED") {
    fnLines.push(
      `   double trailPoints = (trailATRBuffer${tsSuffix}[0] / point) * InpTrailATRMultiplier${tsSuffix};`
    );
  } else if (data.method === "PERCENTAGE") {
    fnLines.push(
      "   double currentProfitPoints = 0;",
      "   if(posType == POSITION_TYPE_BUY)",
      "      currentProfitPoints = (SymbolInfoDouble(_Symbol, SYMBOL_BID) - openPrice) / point;",
      "   else",
      "      currentProfitPoints = (openPrice - SymbolInfoDouble(_Symbol, SYMBOL_ASK)) / point;",
      `   double trailPoints = MathMax(currentProfitPoints * (InpTrailPercent${tsSuffix} / 100.0), _pipFactor);`
    );
  } else {
    // FIXED_PIPS
    fnLines.push(`   double trailPoints = InpTrailPips${tsSuffix} * _pipFactor;`);
  }

  fnLines.push(
    "",
    "   if(posType == POSITION_TYPE_BUY)",
    "   {",
    "      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);",
    "      if(bid >= openPrice + startPoints * point)",
    "      {",
    "         double newSL = NormalizeDouble(bid - trailPoints * point, digits);",
    "         if(newSL > currentSL)",
    "         {",
    "            SafePositionModify(trade, ticket, newSL, currentTP);",
    "         }",
    "      }",
    "   }",
    "   else if(posType == POSITION_TYPE_SELL)",
    "   {",
    "      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);",
    "      if(ask <= openPrice - startPoints * point)",
    "      {",
    "         double newSL = NormalizeDouble(ask + trailPoints * point, digits);",
    "         if(newSL < currentSL || currentSL == 0)",
    "         {",
    "            SafePositionModify(trade, ticket, newSL, currentTP);",
    "         }",
    "      }",
    "   }",
    "}"
  );

  code.helperFunctions.push(fnLines.join("\n"));
  if (data.method === "ATR_BASED") {
    code._managementCalls!.push(
      `if(trailATRReady${tsSuffix}) CheckTrailingStop${tsSuffix}(ticket, openPrice, currentSL, currentTP, posType, point);`
    );
  } else {
    code._managementCalls!.push(
      `CheckTrailingStop${tsSuffix}(ticket, openPrice, currentSL, currentTP, posType, point);`
    );
  }
}

function generatePartialCloseCode(
  node: BuilderNode,
  data: PartialCloseNodeData,
  code: GeneratedCode
): void {
  const group = "Partial Close";
  // Deduplicate input name when multiple partial-close nodes exist
  const existingPartialInputs = code.inputs.filter((i) =>
    i.name.startsWith("InpPartialClosePercent")
  );
  const pcSuffix = existingPartialInputs.length > 0 ? `${existingPartialInputs.length + 1}` : "";
  code.inputs.push(
    createInput(
      node,
      "closePercent",
      `InpPartialClosePercent${pcSuffix}`,
      "double",
      data.closePercent,
      `Partial Close %${pcSuffix ? ` (${pcSuffix})` : ""}`,
      group
    )
  );
  const rawData = data as Record<string, unknown>;
  const rMultipleTrigger = rawData._rMultipleTrigger as number | undefined;
  const triggerMethod = (rawData.triggerMethod as string) ?? "PIPS";
  if (rMultipleTrigger && rMultipleTrigger > 0) {
    // R-multiple trigger: use SL distance × R-multiple as pips trigger
    code.inputs.push(
      createInput(
        node,
        "_rMultipleTrigger",
        `InpTP1RMultiple${pcSuffix}`,
        "double",
        rMultipleTrigger,
        `TP1 R-Multiple${pcSuffix ? ` (${pcSuffix})` : ""}`,
        group
      )
    );
  } else if (triggerMethod === "PERCENT") {
    code.inputs.push(
      createInput(
        node,
        "triggerPercent",
        `InpPartialCloseTriggerPercent${pcSuffix}`,
        "double",
        ((data as Record<string, unknown>).triggerPercent as number) ?? 1,
        `Partial Close Trigger (%)${pcSuffix ? ` (${pcSuffix})` : ""}`,
        group
      )
    );
  } else {
    code.inputs.push(
      createInput(
        node,
        "triggerPips",
        `InpPartialCloseTriggerPips${pcSuffix}`,
        "double",
        data.triggerPips,
        `Partial Close Trigger (pips)${pcSuffix ? ` (${pcSuffix})` : ""}`,
        group
      )
    );
  }
  // Each partial-close node gets its own tracking array and helpers (suffixed by pcSuffix)
  code.globalVariables.push(`ulong partialClosedTickets${pcSuffix}[];`);

  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Check if ticket has been partially closed (${pcSuffix || "default"})                |
//+------------------------------------------------------------------+
bool IsPartialClosed${pcSuffix}(ulong ticket)
{
   for(int i = ArraySize(partialClosedTickets${pcSuffix}) - 1; i >= 0; i--)
   {
      if(partialClosedTickets${pcSuffix}[i] == ticket) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Mark ticket as partially closed (${pcSuffix || "default"})                          |
//+------------------------------------------------------------------+
void MarkPartialClosed${pcSuffix}(ulong ticket)
{
   int size = ArraySize(partialClosedTickets${pcSuffix});
   ArrayResize(partialClosedTickets${pcSuffix}, size + 1);
   partialClosedTickets${pcSuffix}[size] = ticket;
}

//+------------------------------------------------------------------+
//| Remove tickets for positions that no longer exist (${pcSuffix || "default"})        |
//+------------------------------------------------------------------+
void CleanPartialClosedTickets${pcSuffix}()
{
   for(int i = ArraySize(partialClosedTickets${pcSuffix}) - 1; i >= 0; i--)
   {
      if(!PositionSelectByTicket(partialClosedTickets${pcSuffix}[i]))
      {
         int last = ArraySize(partialClosedTickets${pcSuffix}) - 1;
         partialClosedTickets${pcSuffix}[i] = partialClosedTickets${pcSuffix}[last];
         ArrayResize(partialClosedTickets${pcSuffix}, last);
      }
   }
}`);

  // Throttle CleanPartialClosedTickets: only every 100 ticks (one counter per suffix)
  if (!code._managementPreLoop!.some((l) => l.includes(`CleanPartialClosedTickets${pcSuffix}()`))) {
    code._managementPreLoop!.push(
      `static int _cleanTickCounter${pcSuffix} = 0;`,
      `if(++_cleanTickCounter${pcSuffix} >= 100)`,
      "{",
      `   CleanPartialClosedTickets${pcSuffix}();`,
      `   _cleanTickCounter${pcSuffix} = 0;`,
      "}"
    );
  }

  // Build per-position helper function
  const fnLines: string[] = [
    "//+------------------------------------------------------------------+",
    "//| Check partial close for a single position                        |",
    "//+------------------------------------------------------------------+",
    `void CheckPartialClose${pcSuffix}(ulong ticket, double openPrice, double volume, long posType, double point)`,
    "{",
    "   bool profitReached = false;",
  ];

  if (rMultipleTrigger && rMultipleTrigger > 0) {
    fnLines.push(
      "   double openSL = PositionGetDouble(POSITION_SL);",
      "   if(openSL == 0) return; // R-multiple trigger requires a defined SL",
      "   double slDistPoints = MathAbs(openPrice - openSL) / point;",
      `   double triggerPoints = slDistPoints * InpTP1RMultiple${pcSuffix};`,
      "   if(posType == POSITION_TYPE_BUY && SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPoints * point)",
      "      profitReached = true;",
      "   if(posType == POSITION_TYPE_SELL && SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPoints * point)",
      "      profitReached = true;"
    );
  } else if (triggerMethod === "PERCENT") {
    fnLines.push(
      "   double posProfit = PositionGetDouble(POSITION_PROFIT);",
      "   double balance = AccountInfoDouble(ACCOUNT_BALANCE);",
      `   if(balance > 0 && (posProfit / balance) * 100.0 >= InpPartialCloseTriggerPercent${pcSuffix})`,
      "      profitReached = true;"
    );
  } else {
    fnLines.push(
      `   double triggerPrice = InpPartialCloseTriggerPips${pcSuffix} * _pipFactor * point;`,
      "   if(posType == POSITION_TYPE_BUY && SymbolInfoDouble(_Symbol, SYMBOL_BID) >= openPrice + triggerPrice)",
      "      profitReached = true;",
      "   if(posType == POSITION_TYPE_SELL && SymbolInfoDouble(_Symbol, SYMBOL_ASK) <= openPrice - triggerPrice)",
      "      profitReached = true;"
    );
  }

  fnLines.push(
    "",
    `   if(profitReached && !IsPartialClosed${pcSuffix}(ticket))`,
    "   {",
    "      double pcLotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);",
    "      double pcMinLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);",
    `      double closeVolume = MathFloor(volume * InpPartialClosePercent${pcSuffix} / 100.0 / pcLotStep) * pcLotStep;`,
    "      // Ensure remaining position meets minimum lot requirement",
    "      if(volume - closeVolume < pcMinLot) closeVolume = MathFloor((volume - pcMinLot) / pcLotStep) * pcLotStep;",
    "      if(closeVolume >= pcMinLot)",
    "      {",
    "         double cachedTP = PositionGetDouble(POSITION_TP);",
    "         trade.PositionClosePartial(ticket, closeVolume);",
    "         // Re-select position after partial close (ticket may change on hedging brokers)",
    "         if(!PositionSelectByTicket(ticket))",
    "         {",
    "            // Ticket changed - find the remaining position by magic + symbol",
    "            for(int pc=PositionsTotal()-1; pc>=0; pc--)",
    "            {",
    "               ulong pcTk = PositionGetTicket(pc);",
    "               if(pcTk > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)",
    "               { ticket = pcTk; break; }",
    "            }",
    "         }",
    `         MarkPartialClosed${pcSuffix}(ticket);`
  );

  if (data.moveSLToBreakeven) {
    fnLines.push(
      "         // Move SL to breakeven after partial close (only if current SL is worse)",
      "         double curSLpc = PositionGetDouble(POSITION_SL);",
      "         if(posType == POSITION_TYPE_BUY && curSLpc < openPrice)",
      "            SafePositionModify(trade, ticket, NormalizeDouble(openPrice, (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)), cachedTP);",
      "         else if(posType == POSITION_TYPE_SELL && (curSLpc > openPrice || curSLpc == 0))",
      "            SafePositionModify(trade, ticket, NormalizeDouble(openPrice, (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)), cachedTP);"
    );
  }

  fnLines.push("      }", "   }", "}");

  code.helperFunctions.push(fnLines.join("\n"));
  code._managementCalls!.push(
    `CheckPartialClose${pcSuffix}(ticket, openPrice, volume, posType, point);`
  );
}

function generateLockProfitCode(
  node: BuilderNode,
  data: LockProfitNodeData,
  code: GeneratedCode
): void {
  const group = "Lock Profit";
  // Deduplicate when multiple lock-profit nodes exist
  const existingLock = code.inputs.filter((i) => i.name.startsWith("InpLockCheckInterval"));
  const lpSuffix = existingLock.length > 0 ? `${existingLock.length + 1}` : "";

  if (data.method === "PERCENTAGE") {
    code.inputs.push(
      createInput(
        node,
        "lockPercent",
        `InpLockProfitPercent${lpSuffix}`,
        "double",
        data.lockPercent,
        `Lock Profit %${lpSuffix ? ` ${lpSuffix}` : ""}`,
        group
      )
    );
  } else {
    code.inputs.push(
      createInput(
        node,
        "lockPips",
        `InpLockProfitPips${lpSuffix}`,
        "double",
        data.lockPips,
        `Lock Profit (pips)${lpSuffix ? ` ${lpSuffix}` : ""}`,
        group
      )
    );
  }
  code.inputs.push(
    createInput(
      node,
      "checkIntervalPips",
      `InpLockCheckInterval${lpSuffix}`,
      "double",
      data.checkIntervalPips,
      `Min Profit Threshold (pips)${lpSuffix ? ` ${lpSuffix}` : ""}`,
      group
    )
  );

  // Build per-position helper function
  const fnLines: string[] = [
    "//+------------------------------------------------------------------+",
    "//| Check lock profit for a single position                          |",
    "//+------------------------------------------------------------------+",
    `void CheckLockProfit${lpSuffix}(ulong ticket, double openPrice, double currentSL, double currentTP, long posType, double point)`,
    "{",
    "   if(point <= 0) return;",
    "   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);",
    `   double checkPoints = InpLockCheckInterval${lpSuffix} * _pipFactor;`,
    "",
    "   if(posType == POSITION_TYPE_BUY)",
    "   {",
    "      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);",
    "      double currentProfitPoints = (bid - openPrice) / point;",
    "      if(currentProfitPoints > checkPoints)",
    "      {",
  ];

  if (data.method === "PERCENTAGE") {
    fnLines.push(
      `         double lockPoints = currentProfitPoints * (InpLockProfitPercent${lpSuffix} / 100.0);`
    );
  } else {
    fnLines.push(`         double lockPoints = InpLockProfitPips${lpSuffix} * _pipFactor;`);
  }

  fnLines.push(
    "         double newSL = NormalizeDouble(openPrice + lockPoints * point, digits);",
    "         // Guard: SL must stay below bid to avoid immediate stop-out",
    "         if(newSL > currentSL && newSL < bid)",
    "         {",
    "            SafePositionModify(trade, ticket, newSL, currentTP);",
    "         }",
    "      }",
    "   }",
    "   else if(posType == POSITION_TYPE_SELL)",
    "   {",
    "      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);",
    "      double currentProfitPoints = (openPrice - ask) / point;",
    "      if(currentProfitPoints > checkPoints)",
    "      {"
  );

  if (data.method === "PERCENTAGE") {
    fnLines.push(
      `         double lockPoints = currentProfitPoints * (InpLockProfitPercent${lpSuffix} / 100.0);`
    );
  } else {
    fnLines.push(`         double lockPoints = InpLockProfitPips${lpSuffix} * _pipFactor;`);
  }

  fnLines.push(
    "         double newSL = NormalizeDouble(openPrice - lockPoints * point, digits);",
    "         // Guard: SL must stay above ask to avoid immediate stop-out",
    "         if((newSL < currentSL || currentSL == 0) && newSL > ask)",
    "         {",
    "            SafePositionModify(trade, ticket, newSL, currentTP);",
    "         }",
    "      }",
    "   }",
    "}"
  );

  code.helperFunctions.push(fnLines.join("\n"));
  code._managementCalls!.push(
    `CheckLockProfit${lpSuffix}(ticket, openPrice, currentSL, currentTP, posType, point);`
  );
}

function generateMultiLevelTPCode(
  node: BuilderNode,
  data: MultiLevelTPNodeData,
  code: GeneratedCode
): void {
  const group = "Multi-Level TP";

  // Deduplicate when multiple multi-level TP nodes exist
  const existingMLTP = code.inputs.filter((i) => i.name.startsWith("InpMLTP1Pips"));
  const mltpSuffix = existingMLTP.length > 0 ? `${existingMLTP.length + 1}` : "";

  code.inputs.push(
    createInput(
      node,
      "tp1Pips",
      `InpMLTP1Pips${mltpSuffix}`,
      "double",
      data.tp1Pips,
      `TP1 Distance (pips)${mltpSuffix ? ` ${mltpSuffix}` : ""}`,
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp1Percent",
      `InpMLTP1Percent${mltpSuffix}`,
      "double",
      data.tp1Percent,
      `TP1 Close %${mltpSuffix ? ` ${mltpSuffix}` : ""}`,
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp2Pips",
      `InpMLTP2Pips${mltpSuffix}`,
      "double",
      data.tp2Pips,
      `TP2 Distance (pips)${mltpSuffix ? ` ${mltpSuffix}` : ""}`,
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp2Percent",
      `InpMLTP2Percent${mltpSuffix}`,
      "double",
      data.tp2Percent,
      `TP2 Close %${mltpSuffix ? ` ${mltpSuffix}` : ""}`,
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp3Pips",
      `InpMLTP3Pips${mltpSuffix}`,
      "double",
      data.tp3Pips,
      `TP3 Distance (pips)${mltpSuffix ? ` ${mltpSuffix}` : ""}`,
      group
    )
  );
  code.inputs.push(
    createInput(
      node,
      "tp3Percent",
      `InpMLTP3Percent${mltpSuffix}`,
      "double",
      data.tp3Percent,
      `TP3 Close %${mltpSuffix ? ` ${mltpSuffix}` : ""}`,
      group
    )
  );

  // Track TP state per position: 0=no TP hit, 1=TP1 hit, 2=TP2 hit, 3=TP3 hit
  if (!code.globalVariables.some((v) => v.includes("SMLTPState"))) {
    code.globalVariables.push("struct SMLTPState { ulong ticket; int level; };");
    code.globalVariables.push("SMLTPState g_mltpStates[];");
    code.globalVariables.push("int g_mltpCount = 0;");
  }

  if (!code.helperFunctions.some((f) => f.includes("GetMLTPLevel"))) {
    code.helperFunctions
      .push(`//+------------------------------------------------------------------+
//| Get Multi-Level TP state for a ticket                            |
//+------------------------------------------------------------------+
int GetMLTPLevel(ulong ticket)
{
   for(int i = 0; i < g_mltpCount; i++)
   {
      if(g_mltpStates[i].ticket == ticket) return g_mltpStates[i].level;
   }
   return 0;
}

//+------------------------------------------------------------------+
//| Set Multi-Level TP state for a ticket                            |
//+------------------------------------------------------------------+
void SetMLTPLevel(ulong ticket, int level)
{
   for(int i = 0; i < g_mltpCount; i++)
   {
      if(g_mltpStates[i].ticket == ticket) { g_mltpStates[i].level = level; return; }
   }
   int idx = g_mltpCount++;
   ArrayResize(g_mltpStates, g_mltpCount);
   g_mltpStates[idx].ticket = ticket;
   g_mltpStates[idx].level = level;
}

//+------------------------------------------------------------------+
//| Clean up MLTP states for closed positions                        |
//+------------------------------------------------------------------+
void CleanMLTPStates()
{
   for(int i = g_mltpCount - 1; i >= 0; i--)
   {
      if(!PositionSelectByTicket(g_mltpStates[i].ticket))
      {
         int last = g_mltpCount - 1;
         g_mltpStates[i] = g_mltpStates[last];
         g_mltpCount--;
         ArrayResize(g_mltpStates, g_mltpCount);
      }
   }
}`);
  }

  // Throttle CleanMLTPStates: only every 100 ticks (push once)
  if (!code._managementPreLoop!.some((l) => l.includes("CleanMLTPStates()"))) {
    code._managementPreLoop!.push(
      "static int _cleanMLTPCounter = 0;",
      "if(++_cleanMLTPCounter >= 100)",
      "{",
      "   CleanMLTPStates();",
      "   _cleanMLTPCounter = 0;",
      "}"
    );
  }

  // Build per-position helper function
  const fnLines: string[] = [
    "//+------------------------------------------------------------------+",
    "//| Check multi-level TP for a single position                       |",
    "//+------------------------------------------------------------------+",
    `void CheckMultiLevelTP${mltpSuffix}(ulong ticket, double openPrice, double volume, long posType, double point)`,
    "{",
    "   if(point <= 0) return;",
    "   int tpLevel = GetMLTPLevel(ticket);",
    "",
    "   double profitPoints = 0;",
    "   if(posType == POSITION_TYPE_BUY)",
    "      profitPoints = (SymbolInfoDouble(_Symbol, SYMBOL_BID) - openPrice) / point;",
    "   else if(posType == POSITION_TYPE_SELL)",
    "      profitPoints = (openPrice - SymbolInfoDouble(_Symbol, SYMBOL_ASK)) / point;",
    "",
    `   double tp1Points = InpMLTP1Pips${mltpSuffix} * _pipFactor;`,
    `   double tp2Points = InpMLTP2Pips${mltpSuffix} * _pipFactor;`,
    `   double tp3Points = InpMLTP3Pips${mltpSuffix} * _pipFactor;`,
    "",
    "   double pcLotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);",
    "   double pcMinLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);",
    "",
    "   // TP Level 1",
    "   if(tpLevel < 1 && profitPoints >= tp1Points)",
    "   {",
    `      double closeVol = MathFloor(volume * InpMLTP1Percent${mltpSuffix} / 100.0 / pcLotStep) * pcLotStep;`,
    "      if(volume - closeVol < pcMinLot) closeVol = MathFloor((volume - pcMinLot) / pcLotStep) * pcLotStep;",
    "      if(closeVol >= pcMinLot)",
    "      {",
    "         trade.PositionClosePartial(ticket, closeVol);",
    "         SetMLTPLevel(ticket, 1);",
  ];

  if (data.moveSLAfterTP1 === "BREAKEVEN" || data.moveSLAfterTP1 === "TRAIL") {
    fnLines.push(
      "         // Move SL to breakeven after TP1",
      "         if(PositionSelectByTicket(ticket))",
      "            SafePositionModify(trade, ticket, NormalizeDouble(openPrice, (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)), PositionGetDouble(POSITION_TP));"
    );
  }

  fnLines.push(
    "      }",
    "      return;",
    "   }",
    "",
    "   // TP Level 2",
    "   if(tpLevel == 1 && profitPoints >= tp2Points)",
    "   {",
    `      double tp2Denom = InpMLTP2Percent${mltpSuffix} + InpMLTP3Percent${mltpSuffix};`,
    `      double closeVol = (tp2Denom > 0) ? MathFloor(volume * InpMLTP2Percent${mltpSuffix} / tp2Denom / pcLotStep) * pcLotStep : 0;`,
    "      if(volume - closeVol < pcMinLot) closeVol = MathFloor((volume - pcMinLot) / pcLotStep) * pcLotStep;",
    "      if(closeVol >= pcMinLot)",
    "      {",
    "         trade.PositionClosePartial(ticket, closeVol);",
    "         SetMLTPLevel(ticket, 2);",
    "      }",
    "      return;",
    "   }",
    "",
    "   // TP Level 3: close remaining position",
    "   if(tpLevel == 2 && profitPoints >= tp3Points)",
    "   {",
    "      trade.PositionClose(ticket);",
    "      SetMLTPLevel(ticket, 3);",
    "   }",
    "}"
  );

  code.helperFunctions.push(fnLines.join("\n"));
  code._managementCalls!.push(
    `CheckMultiLevelTP${mltpSuffix}(ticket, openPrice, volume, posType, point);`
  );
}
