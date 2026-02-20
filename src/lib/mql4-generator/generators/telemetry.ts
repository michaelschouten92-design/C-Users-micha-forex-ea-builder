// MQL4 Telemetry Code Generator
// Adds WebRequest-based telemetry to exported EAs for live tracking

import type { GeneratedCode } from "../types";
import { generateTrackRecordCode } from "./track-record";

export interface TelemetryConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * Inject telemetry inputs, globals, OnInit, OnTick, and helper functions
 * into the generated MQL4 code.
 */
export function generateTelemetryCode(code: GeneratedCode, config: TelemetryConfig): void {
  // --- Inputs (sinput = non-optimizable) ---
  code.inputs.push(
    {
      name: "InpTelemetryKey",
      type: "string",
      value: `"${config.apiKey}"`,
      comment: "Telemetry API Key",
      isOptimizable: false,
      group: "Telemetry",
    },
    {
      name: "InpTelemetryURL",
      type: "string",
      value: `"${config.baseUrl}"`,
      comment: "Telemetry Server",
      isOptimizable: false,
      group: "Telemetry",
    },
    {
      name: "InpHeartbeatInterval",
      type: "int",
      value: 300,
      comment: "Heartbeat Interval (seconds)",
      isOptimizable: false,
      group: "Telemetry",
    }
  );

  // --- Global variables ---
  code.globalVariables.push(
    "datetime g_lastHeartbeat = 0;",
    "bool     g_telemetryEnabled = false;",
    "int      g_prevTotalTrades = 0;"
  );

  // --- OnInit ---
  code.onInit.push("g_telemetryEnabled = (StringLen(InpTelemetryKey) > 0 && !IsTesting());");

  // --- OnTick ---
  code.onTick.push("");
  code.onTick.push("//--- Telemetry heartbeat & trade detection");
  code.onTick.push("if(g_telemetryEnabled)");
  code.onTick.push("{");
  code.onTick.push("   if(TimeCurrent() - g_lastHeartbeat >= InpHeartbeatInterval)");
  code.onTick.push("   {");
  code.onTick.push("      TelemetrySendHeartbeat();");
  code.onTick.push("      g_lastHeartbeat = TimeCurrent();");
  code.onTick.push("   }");
  code.onTick.push("   int currentTotal = OrdersHistoryTotal();");
  code.onTick.push("   if(currentTotal != g_prevTotalTrades)");
  code.onTick.push("   {");
  code.onTick.push("      TelemetrySendTradeUpdate();");
  code.onTick.push("      g_prevTotalTrades = currentTotal;");
  code.onTick.push("   }");
  code.onTick.push("}");

  // --- Helper functions ---
  code.helperFunctions.push(buildSendHeartbeatMQL4());
  code.helperFunctions.push(buildSendTradeUpdateMQL4());
  code.helperFunctions.push(buildSendErrorMQL4());
  code.helperFunctions.push(buildJsonHelperMQL4());
  code.helperFunctions.push(buildHttpPostMQL4());

  // --- Track Record (event-sourced hash chain) ---
  generateTrackRecordCode(code, config);
}

function buildSendHeartbeatMQL4(): string {
  return `void TelemetrySendHeartbeat()
{
   double bal = AccountBalance();
   double eq  = AccountEquity();
   double dd  = (bal > 0) ? ((bal - eq) / bal * 100.0) : 0;
   int spread = (int)MarketInfo(Symbol(), MODE_SPREAD);

   // Count own positions
   int myOpen = 0;
   double myProfit = 0;
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderMagicNumber() != InpMagicNumber || OrderSymbol() != Symbol()) continue;
      if(OrderType() <= OP_SELL)
      {
         myOpen++;
         myProfit += OrderProfit();
      }
   }

   // Count history for total trades
   int totalDeals = 0;
   double totalPL = 0;
   for(int i = OrdersHistoryTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderMagicNumber() != InpMagicNumber || OrderSymbol() != Symbol()) continue;
      if(OrderType() <= OP_SELL)
      {
         totalDeals++;
         totalPL += OrderProfit();
      }
   }

   string accMode = IsDemo() ? "PAPER" : "LIVE";

   string json = "{"
      + TelemetryJsonPair("mode", accMode) + ","
      + TelemetryJsonPair("symbol", Symbol()) + ","
      + TelemetryJsonPair("timeframe", EnumToString((ENUM_TIMEFRAMES)Period())) + ","
      + TelemetryJsonPair("broker", AccountCompany()) + ","
      + TelemetryJsonPair("accountNumber", IntegerToString(AccountNumber())) + ","
      + TelemetryJsonNum("balance", bal) + ","
      + TelemetryJsonNum("equity", eq) + ","
      + TelemetryJsonInt("openTrades", myOpen) + ","
      + TelemetryJsonInt("totalTrades", totalDeals) + ","
      + TelemetryJsonNum("totalProfit", totalPL) + ","
      + TelemetryJsonNum("drawdown", dd) + ","
      + TelemetryJsonInt("spread", spread)
      + "}";

   TelemetryHttpPost("/heartbeat", json);
}`;
}

function buildSendTradeUpdateMQL4(): string {
  return `void TelemetrySendTradeUpdate()
{
   int total = OrdersHistoryTotal();

   // Send last few closed trades
   for(int i = MathMax(0, total - 5); i < total; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderMagicNumber() != InpMagicNumber) continue;
      if(OrderSymbol() != Symbol()) continue;
      if(OrderType() > OP_SELL) continue;

      string dealType = (OrderType() == OP_BUY) ? "BUY" : "SELL";

      string accMode = IsDemo() ? "PAPER" : "LIVE";

      string json = "{"
         + TelemetryJsonPair("mode", accMode) + ","
         + TelemetryJsonPair("ticket", IntegerToString(OrderTicket())) + ","
         + TelemetryJsonPair("symbol", OrderSymbol()) + ","
         + TelemetryJsonPair("type", dealType) + ","
         + TelemetryJsonNum("openPrice", OrderOpenPrice()) + ","
         + TelemetryJsonNum("closePrice", OrderClosePrice()) + ","
         + TelemetryJsonNum("lots", OrderLots()) + ","
         + TelemetryJsonNum("profit", OrderProfit()) + ","
         + TelemetryJsonPair("openTime", TimeToString(OrderOpenTime())) + ","
         + TelemetryJsonPair("closeTime", TimeToString(OrderCloseTime()))
         + "}";

      TelemetryHttpPost("/trade", json);
   }
}`;
}

function buildSendErrorMQL4(): string {
  return `void TelemetrySendError(int code, string msg, string ctx)
{
   if(!g_telemetryEnabled) return;

   string json = "{"
      + TelemetryJsonInt("errorCode", code) + ","
      + TelemetryJsonPair("message", msg) + ","
      + TelemetryJsonPair("context", ctx)
      + "}";

   TelemetryHttpPost("/error", json);
}`;
}

function buildJsonHelperMQL4(): string {
  return `string TelemetryJsonPair(string key, string val)
{
   // Escape backslashes and quotes in value
   StringReplace(val, "\\\\", "\\\\\\\\");
   StringReplace(val, "\\"", "\\\\\\"");
   return "\\"" + key + "\\":\\"" + val + "\\"";
}

string TelemetryJsonNum(string key, double val)
{
   return "\\"" + key + "\\":" + DoubleToString(val, 2);
}

string TelemetryJsonInt(string key, int val)
{
   return "\\"" + key + "\\":" + IntegerToString(val);
}`;
}

function buildHttpPostMQL4(): string {
  return `void TelemetryHttpPost(string endpoint, string jsonBody)
{
   string url = InpTelemetryURL + endpoint;
   string headers = "Content-Type: application/json\\r\\nX-EA-Key: " + InpTelemetryKey;
   char postData[];
   char result[];
   string resultHeaders;

   StringToCharArray(jsonBody, postData, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove null terminator
   ArrayResize(postData, ArraySize(postData) - 1);

   int res = WebRequest("POST", url, headers, 2000, postData, result, resultHeaders);
   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4014)
         Print("Telemetry: Add ", url, " to Tools > Options > Expert Advisors > Allow WebRequest");
      else
         Print("Telemetry: WebRequest failed, error ", err);
   }
}`;
}
