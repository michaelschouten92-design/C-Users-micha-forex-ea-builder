// Multi-Pair code generator for MQL5
// Transforms generated code arrays for multi-pair mode (post-processing).
// Called after all sub-generators have produced their single-symbol code.

import type { MultiPairSettings } from "@/types/builder";
import type { GeneratedCode, GeneratorContext } from "../types";

/**
 * Collects indicator handle variable names from global variable declarations.
 * Pattern: `int XYZHandle = INVALID_HANDLE;`
 */
function collectHandleNames(globals: string[]): string[] {
  const names: string[] = [];
  for (const line of globals) {
    const match = line.match(/^int (\w+Handle) = INVALID_HANDLE;$/);
    if (match) names.push(match[1]);
  }
  return names;
}

/**
 * Replace all occurrences of handle variable names with their global array-indexed version.
 * e.g. `ind0Handle` → `g_ind0Handle[sym]`
 */
function replaceHandleRefs(line: string, handleNames: string[]): string {
  let result = line;
  for (const h of handleNames) {
    result = result.replace(new RegExp(`\\b${h}\\b`, "g"), `g_${h}[sym]`);
  }
  return result;
}

/**
 * Transform OnInit code for multi-pair:
 * - Add symbol parsing at the start
 * - Convert handle declarations to arrays with resize
 * - Move handle creation + validation into a per-symbol loop
 * - Keep ArraySetAsSeries and other init code outside the loop
 */
function transformOnInit(code: GeneratedCode, handleNames: string[]): void {
  const handleCreationLines: string[] = [];
  const handleValidationLines: string[] = [];
  const arraySetAsSeriesLines: string[] = [];
  const otherLines: string[] = [];

  // Indicator function prefixes in MQL5
  const indicatorFunctions = [
    "iMA(",
    "iRSI(",
    "iMACD(",
    "iBands(",
    "iATR(",
    "iADX(",
    "iStochastic(",
    "iCCI(",
    "iOBV(",
    "iCustom(",
    "iIchimoku(",
    "iBearsPower(",
    "iBullsPower(",
    "iChaikin(",
    "iDEMA(",
    "iForce(",
    "iFractals(",
    "iGator(",
    "iMFI(",
    "iSAR(",
    "iTEMA(",
    "iWPR(",
    "iVIDyA(",
    "iVolumes(",
  ];

  for (const line of code.onInit) {
    const isHandleCreation = handleNames.some(
      (h) => line.includes(`${h} =`) && indicatorFunctions.some((fn) => line.includes(fn))
    );
    const isHandleValidation = handleNames.some((h) => line.includes(`${h} == INVALID_HANDLE`));
    const isArraySetAsSeries = line.includes("ArraySetAsSeries(");

    if (isHandleCreation) {
      let transformed = replaceHandleRefs(line, handleNames);
      transformed = transformed.replace(/_Symbol/g, "g_symbols[sym]");
      handleCreationLines.push(transformed);
    } else if (isHandleValidation) {
      let transformed = replaceHandleRefs(line, handleNames);
      // Enhance error messages to include symbol name
      transformed = transformed.replace(/Print\("([^"]+)"\)/, 'Print("$1 for ", g_symbols[sym])');
      handleValidationLines.push(transformed);
    } else if (isArraySetAsSeries) {
      arraySetAsSeriesLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  // Rebuild OnInit
  const result: string[] = [];

  // Symbol parsing
  result.push("//--- Multi-Pair: Parse symbol list");
  result.push("ParseSymbolList(InpSymbols, g_symbols, g_symbolCount);");
  result.push(
    'if(g_symbolCount == 0) { Print("No valid symbols specified in InpSymbols"); return(INIT_FAILED); }'
  );
  result.push(`Print("Multi-pair mode: trading ", g_symbolCount, " symbols");`);
  result.push("");

  // Resize handle arrays
  if (handleNames.length > 0) {
    result.push("//--- Resize indicator handle arrays");
    for (const h of handleNames) {
      result.push(`ArrayResize(g_${h}, g_symbolCount);`);
      result.push(`ArrayInitialize(g_${h}, INVALID_HANDLE);`);
    }
    result.push("");
  }

  // Non-handle init code (pipFactor, etc.)
  if (otherLines.length > 0) {
    result.push(...otherLines);
    result.push("");
  }

  // ArraySetAsSeries (outside loop, buffer shapes don't change per symbol)
  if (arraySetAsSeriesLines.length > 0) {
    result.push(...arraySetAsSeriesLines);
    result.push("");
  }

  // Handle creation in per-symbol loop
  if (handleCreationLines.length > 0) {
    result.push("//--- Create indicator handles for each symbol");
    result.push("for(int sym = 0; sym < g_symbolCount; sym++)");
    result.push("{");
    // Interleave creation + validation (they come in pairs from the generators)
    for (let i = 0; i < handleCreationLines.length; i++) {
      result.push(`   ${handleCreationLines[i]}`);
      if (i < handleValidationLines.length) {
        result.push(`   ${handleValidationLines[i]}`);
      }
    }
    result.push("}");
  }

  // Validate all symbols allow trading
  result.push("");
  result.push("//--- Validate all symbols");
  result.push("for(int i = 0; i < g_symbolCount; i++)");
  result.push("{");
  result.push(
    "   if(SymbolInfoInteger(g_symbols[i], SYMBOL_TRADE_MODE) != SYMBOL_TRADE_MODE_FULL)"
  );
  result.push("   {");
  result.push(
    '      Print("Symbol ", g_symbols[i], " does not allow full trading, removing from list");'
  );
  result.push("   }");
  result.push("}");

  code.onInit = result;
}

/**
 * Transform OnTick code for multi-pair:
 * - Replace _Symbol → tradeSym
 * - Replace _Point → symPoint, _Digits → symDigits, _pipFactor → symPipFactor
 * - Replace handle references with array-indexed versions
 * - Replace function calls to pass symbol parameter
 * - Replace `return;` → `continue;` (skip to next symbol instead of exiting OnTick)
 */
function transformOnTick(code: GeneratedCode, handleNames: string[]): void {
  code.onTick = code.onTick.map((line) => {
    let t = line;

    // Replace predefined symbol variables
    t = t.replace(/_Symbol/g, "tradeSym");
    t = t.replace(/\b_Point\b/g, "symPoint");
    t = t.replace(/\b_Digits\b/g, "symDigits");
    t = t.replace(/\b_pipFactor\b/g, "symPipFactor");

    // Replace handle references with array-indexed versions
    t = replaceHandleRefs(t, handleNames);

    // Replace helper function calls to include symbol parameter
    t = t.replace(/\bCountPositions\(\)/g, "CountPositions(tradeSym)");
    t = t.replace(/\bCountPositionsByType\(/g, "CountPositionsByType(tradeSym, ");
    t = t.replace(/\bOpenBuy\(/g, "OpenBuy(tradeSym, ");
    t = t.replace(/\bOpenSell\(/g, "OpenSell(tradeSym, ");
    t = t.replace(/\bCloseAllPositions\(\)/g, "CloseAllPositions(tradeSym)");
    t = t.replace(/\bCloseBuyPositions\(\)/g, "CloseBuyPositions(tradeSym)");
    t = t.replace(/\bCloseSellPositions\(\)/g, "CloseSellPositions(tradeSym)");
    t = t.replace(/\bCalculateLotSize\(/g, "CalculateLotSize(tradeSym, ");

    // Replace return; → continue; (skip to next symbol, don't exit OnTick)
    t = t.replace(/\breturn;/g, "continue;");

    return t;
  });
}

/**
 * Transform OnDeinit code for multi-pair:
 * - Wrap handle release in a per-symbol loop
 */
function transformOnDeinit(code: GeneratedCode, handleNames: string[]): void {
  if (handleNames.length === 0) return;

  const handleReleaseLines: string[] = [];
  const otherLines: string[] = [];

  for (const line of code.onDeinit) {
    if (handleNames.some((h) => line.includes(h))) {
      handleReleaseLines.push(replaceHandleRefs(line, handleNames));
    } else {
      otherLines.push(line);
    }
  }

  const result: string[] = [...otherLines];
  if (handleReleaseLines.length > 0) {
    result.push("//--- Release indicator handles for all symbols");
    result.push("for(int sym = 0; sym < g_symbolCount; sym++)");
    result.push("{");
    for (const line of handleReleaseLines) {
      result.push(`   ${line}`);
    }
    result.push("}");
  }

  code.onDeinit = result;
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

  // 2. Detect handle variable names from globals
  const handleNames = collectHandleNames(code.globalVariables);

  // Transform globals: handle declarations → arrays
  code.globalVariables = code.globalVariables.map((line) => {
    const match = line.match(/^int (\w+Handle) = INVALID_HANDLE;$/);
    if (match) return `int g_${match[1]}[];`;
    return line;
  });

  // Add multi-pair globals at the start
  code.globalVariables.unshift("string g_symbols[];", "int g_symbolCount = 0;");

  // 3. Transform OnInit (handle creation → per-symbol loop)
  transformOnInit(code, handleNames);

  // 4. Transform OnTick (symbol references + function calls)
  transformOnTick(code, handleNames);

  // 5. Transform OnDeinit (handle release → per-symbol loop)
  transformOnDeinit(code, handleNames);

  // 6. Add multi-pair helper functions
  code.helperFunctions.push(generateMultiPairHelpers());
}

/**
 * Generate multi-pair utility functions (ParseSymbolList, CountAllPositions).
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
//| Count all positions across all symbols for this EA                |
//+------------------------------------------------------------------+
int CountAllPositions()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         count++;
   }
   return count;
}`;
}
