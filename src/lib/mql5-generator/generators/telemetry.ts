// MQL5 Telemetry Code Generator
// Adds WebRequest-based telemetry to exported EAs for live tracking

import type { GeneratedCode } from "../types";

export interface TelemetryConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * Inject telemetry inputs, globals, OnInit, OnTick, and helper functions
 * into the generated MQL5 code.
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
  code.onInit.push(
    "g_telemetryEnabled = (StringLen(InpTelemetryKey) > 0 && !MQLInfoInteger(MQL_TESTER));"
  );

  // --- OnTick (appended at the end via a special array) ---
  // We use helperFunctions for the actual functions, and add tick logic via onTick
  code.onTick.push("");
  code.onTick.push("//--- Telemetry heartbeat & trade detection");
  code.onTick.push("if(g_telemetryEnabled)");
  code.onTick.push("{");
  code.onTick.push("   if(TimeCurrent() - g_lastHeartbeat >= InpHeartbeatInterval)");
  code.onTick.push("   {");
  code.onTick.push("      TelemetrySendHeartbeat();");
  code.onTick.push("      g_lastHeartbeat = TimeCurrent();");
  code.onTick.push("   }");
  code.onTick.push("   int currentTotal = (int)HistoryDealsTotal();");
  code.onTick.push("   if(currentTotal != g_prevTotalTrades)");
  code.onTick.push("   {");
  code.onTick.push("      TelemetrySendTradeUpdate();");
  code.onTick.push("      g_prevTotalTrades = currentTotal;");
  code.onTick.push("   }");
  code.onTick.push("}");

  // --- Helper functions ---
  code.helperFunctions.push(buildSendHeartbeatMQL5());
  code.helperFunctions.push(buildSendTradeUpdateMQL5());
  code.helperFunctions.push(buildSendErrorMQL5());
  code.helperFunctions.push(buildJsonHelperMQL5());
  code.helperFunctions.push(buildHttpPostMQL5());
}

function buildSendHeartbeatMQL5(): string {
  return `void TelemetrySendHeartbeat()
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd  = (bal > 0) ? ((bal - eq) / bal * 100.0) : 0;
   int openPos = PositionsTotal();
   int spread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);

   // Count own positions
   int myOpen = 0;
   double myProfit = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber
         && PositionGetString(POSITION_SYMBOL) == _Symbol)
      {
         myOpen++;
         myProfit += PositionGetDouble(POSITION_PROFIT);
      }
   }

   // Count history deals for total trades
   HistorySelect(0, TimeCurrent());
   int totalDeals = 0;
   double totalPL = 0;
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong dTicket = HistoryDealGetTicket(i);
      if(dTicket > 0 && HistoryDealGetInteger(dTicket, DEAL_MAGIC) == InpMagicNumber
         && HistoryDealGetString(dTicket, DEAL_SYMBOL) == _Symbol
         && HistoryDealGetInteger(dTicket, DEAL_ENTRY) == DEAL_ENTRY_OUT)
      {
         totalDeals++;
         totalPL += HistoryDealGetDouble(dTicket, DEAL_PROFIT);
      }
   }

   string json = "{"
      + TelemetryJsonPair("symbol", _Symbol) + ","
      + TelemetryJsonPair("timeframe", EnumToString((ENUM_TIMEFRAMES)Period())) + ","
      + TelemetryJsonPair("broker", AccountInfoString(ACCOUNT_COMPANY)) + ","
      + TelemetryJsonPair("accountNumber", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))) + ","
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

function buildSendTradeUpdateMQL5(): string {
  return `void TelemetrySendTradeUpdate()
{
   HistorySelect(0, TimeCurrent());
   int total = HistoryDealsTotal();

   // Send last few closed deals
   for(int i = MathMax(0, total - 5); i < total; i++)
   {
      ulong dTicket = HistoryDealGetTicket(i);
      if(dTicket == 0) continue;
      if(HistoryDealGetInteger(dTicket, DEAL_MAGIC) != InpMagicNumber) continue;
      if(HistoryDealGetString(dTicket, DEAL_SYMBOL) != _Symbol) continue;
      if(HistoryDealGetInteger(dTicket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      string dealType = (HistoryDealGetInteger(dTicket, DEAL_TYPE) == DEAL_TYPE_BUY) ? "BUY" : "SELL";

      string json = "{"
         + TelemetryJsonPair("ticket", IntegerToString(dTicket)) + ","
         + TelemetryJsonPair("symbol", HistoryDealGetString(dTicket, DEAL_SYMBOL)) + ","
         + TelemetryJsonPair("type", dealType) + ","
         + TelemetryJsonNum("openPrice", HistoryDealGetDouble(dTicket, DEAL_PRICE)) + ","
         + TelemetryJsonNum("closePrice", HistoryDealGetDouble(dTicket, DEAL_PRICE)) + ","
         + TelemetryJsonNum("lots", HistoryDealGetDouble(dTicket, DEAL_VOLUME)) + ","
         + TelemetryJsonNum("profit", HistoryDealGetDouble(dTicket, DEAL_PROFIT)) + ","
         + TelemetryJsonPair("openTime", TimeToString(HistoryDealGetInteger(dTicket, DEAL_TIME))) + ","
         + TelemetryJsonPair("closeTime", TimeToString(HistoryDealGetInteger(dTicket, DEAL_TIME)))
         + "}";

      TelemetryHttpPost("/trade", json);
   }
}`;
}

function buildSendErrorMQL5(): string {
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

function buildJsonHelperMQL5(): string {
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

function buildHttpPostMQL5(): string {
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
