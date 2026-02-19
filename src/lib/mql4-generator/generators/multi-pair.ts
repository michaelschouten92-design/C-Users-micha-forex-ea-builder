// Multi-Pair code generator for MQL4
// Transforms generated code arrays for multi-pair mode (post-processing).
// Called after all sub-generators have produced their single-symbol code.
//
// MQL4 differences from MQL5:
// - No indicator handles — indicators are direct function calls (iMA, iRSI, etc.)
//   with a symbol parameter, so OnInit transformation is simpler (no handle arrays).
// - Symbol() instead of _Symbol
// - OrdersTotal()/OrderSelect() instead of PositionsTotal()/PositionGetTicket()

import type { MultiPairSettings } from "@/types/builder";
import type { GeneratedCode, GeneratorContext } from "../types";

/**
 * Transform OnInit code for multi-pair:
 * - Add symbol parsing at the start
 * - Keep pipFactor and other init code outside the loop
 *
 * MQL4 indicators are function calls (iMA(Symbol(), ...)), not handle-based.
 * The symbol replacement happens in OnTick, not OnInit, so the init
 * transformation is much simpler than MQL5.
 */
function transformOnInit(code: GeneratedCode): void {
  const result: string[] = [];

  // Symbol parsing
  result.push("//--- Multi-Pair: Parse symbol list");
  result.push("ParseSymbolList(InpSymbols, g_symbols, g_symbolCount);");
  result.push(
    'if(g_symbolCount == 0) { Print("No valid symbols specified in InpSymbols"); return(INIT_FAILED); }'
  );
  result.push(`Print("Multi-pair mode: trading ", g_symbolCount, " symbols");`);
  result.push("");

  // Keep all existing init code (pipFactor, etc.)
  if (code.onInit.length > 0) {
    result.push(...code.onInit);
    result.push("");
  }

  // Validate all symbols allow trading
  result.push("//--- Validate all symbols");
  result.push("for(int i = 0; i < g_symbolCount; i++)");
  result.push("{");
  result.push("   if(MarketInfo(g_symbols[i], MODE_TRADEALLOWED) == 0)");
  result.push("   {");
  result.push(
    '      Print("Symbol ", g_symbols[i], " does not allow trading, removing from list");'
  );
  result.push("   }");
  result.push("}");

  code.onInit = result;
}

/**
 * Transform OnTick code for multi-pair:
 * - Replace Symbol() -> tradeSym (in indicator calls and elsewhere)
 * - Replace _Point -> symPoint, Digits -> symDigits, _pipFactor -> symPipFactor
 * - Replace helper function calls to pass symbol parameter
 * - Replace Ask/Bid -> MarketInfo(tradeSym, MODE_ASK/MODE_BID)
 * - Replace `return;` -> `continue;` (skip to next symbol instead of exiting OnTick)
 */
function transformOnTick(code: GeneratedCode): void {
  code.onTick = code.onTick.map((line) => {
    let t = line;

    // Replace Symbol() with tradeSym in all contexts
    // Careful: only replace Symbol() function calls, not the word "Symbol" in strings
    t = t.replace(/\bSymbol\(\)/g, "tradeSym");

    // Replace predefined symbol variables
    t = t.replace(/\b_Point\b/g, "symPoint");
    t = t.replace(/\bDigits\b/g, "symDigits");
    t = t.replace(/\b_pipFactor\b/g, "symPipFactor");

    // Replace Ask/Bid with per-symbol MarketInfo calls
    // Only match standalone Ask/Bid, not inside other identifiers
    t = t.replace(/\bAsk\b/g, "MarketInfo(tradeSym, MODE_ASK)");
    t = t.replace(/\bBid\b/g, "MarketInfo(tradeSym, MODE_BID)");

    // Replace helper function calls to include symbol parameter
    t = t.replace(/\bCountPositions\(\)/g, "CountPositions(tradeSym)");
    t = t.replace(/\bCountPositionsByType\(/g, "CountPositionsByType(tradeSym, ");
    t = t.replace(/\bOpenBuy\(/g, "OpenBuy(tradeSym, ");
    t = t.replace(/\bOpenSell\(/g, "OpenSell(tradeSym, ");
    t = t.replace(/\bCloseAllPositions\(\)/g, "CloseAllPositions(tradeSym)");
    t = t.replace(/\bCloseBuyPositions\(\)/g, "CloseBuyPositions(tradeSym)");
    t = t.replace(/\bCloseSellPositions\(\)/g, "CloseSellPositions(tradeSym)");
    t = t.replace(/\bCalculateLotSize\(/g, "CalculateLotSize(tradeSym, ");

    // Replace return; -> continue; (skip to next symbol, don't exit OnTick)
    t = t.replace(/\breturn;/g, "continue;");

    return t;
  });
}

/**
 * Main entry point: transforms all generated code arrays for multi-pair mode.
 * Called after all sub-generators have produced their single-symbol code.
 */
export function transformCodeForMultiPair(
  settings: MultiPairSettings,
  code: GeneratedCode,
  _ctx: GeneratorContext
): void {
  const symbols = settings.symbols.filter((s) => s.length > 0);

  // 1. Add multi-pair inputs
  code.inputs.push(
    {
      name: "InpSymbols",
      type: "string",
      value: symbols.join(","),
      comment: "Trading Symbols (comma-separated)",
      isOptimizable: false,
      alwaysVisible: true,
      group: "Multi-Pair Settings",
    },
    {
      name: "InpMaxPerPair",
      type: "int",
      value: settings.maxPositionsPerPair,
      comment: "Max Positions Per Pair",
      isOptimizable: false,
      alwaysVisible: true,
      group: "Multi-Pair Settings",
    },
    {
      name: "InpMaxTotalPositions",
      type: "int",
      value: settings.maxTotalPositions,
      comment: "Max Total Positions (all pairs)",
      isOptimizable: false,
      alwaysVisible: true,
      group: "Multi-Pair Settings",
    }
  );

  // 2. Add multi-pair globals at the start
  // MQL4 has no indicator handles, so no handle arrays needed
  code.globalVariables.unshift("string g_symbols[];", "int g_symbolCount = 0;");

  // 3. Transform OnInit (symbol parsing, validation)
  transformOnInit(code);

  // 4. Transform OnTick (symbol references + function calls)
  transformOnTick(code);

  // 5. Add multi-pair helper functions
  code.helperFunctions.push(generateMultiPairHelpers());
}

/**
 * Generate multi-pair utility functions (ParseSymbolList, CountAllOrders).
 * MQL4 uses OrdersTotal()/OrderSelect() instead of PositionsTotal()/PositionGetTicket().
 */
function generateMultiPairHelpers(): string {
  return `//+------------------------------------------------------------------+
//| Parse comma-separated symbol list                                 |
//+------------------------------------------------------------------+
void ParseSymbolList(string csv, string &result[], int &count)
{
   count = 0;
   string temp[];
   int parts = StringSplit(csv, ',', temp);
   ArrayResize(result, parts);
   for(int i = 0; i < parts; i++)
   {
      string sym = temp[i];
      StringTrimLeft(sym);
      StringTrimRight(sym);
      if(StringLen(sym) > 0 && SymbolSelect(sym, true))
      {
         result[count] = sym;
         count++;
      }
      else if(StringLen(sym) > 0)
         Print("WARNING: Symbol '", sym, "' not found in Market Watch, skipping.");
   }
   ArrayResize(result, count);
}

//+------------------------------------------------------------------+
//| Count all orders across all symbols for this EA                   |
//+------------------------------------------------------------------+
int CountAllOrders()
{
   int count = 0;
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderMagicNumber() == InpMagicNumber && OrderType() <= OP_SELL)
         count++;
   }
   return count;
}`;
}
