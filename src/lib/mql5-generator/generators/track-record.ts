// MQL5 Track Record Code Generator
// Adds event-sourced, hash-chained track record to exported EAs

import type { GeneratedCode } from "../types";
import type { TelemetryConfig } from "./telemetry";

/**
 * Inject track record globals, OnInit, OnTick, OnDeinit, and helper functions
 * into the generated MQL5 code. Works alongside existing telemetry.
 */
export function generateTrackRecordCode(code: GeneratedCode, config: TelemetryConfig): void {
  // --- Inputs ---
  code.inputs.push({
    name: "InpTrackRecordURL",
    type: "string",
    value: config.baseUrl.replace("/api/telemetry", "/api/track-record"),
    comment: "Track Record Server",
    isOptimizable: false,
    group: "TrackRecord",
  });

  // --- Global variables ---
  code.globalVariables.push(
    "int      g_trSeqNo = 0;",
    'string   g_trLastHash = "0000000000000000000000000000000000000000000000000000000000000000";',
    "bool     g_trEnabled = false;",
    "bool     g_trSessionStartSent = false;",
    'string   g_trInstanceId = "";',
    "int      g_trPrevPositionCount = 0;",
    "datetime g_trLastSnapshot = 0;",
    "int      g_trSnapshotInterval = 300;",
    "// Track known positions for detecting opens/closes/modifications",
    "int      g_trKnownTickets[];",
    "double   g_trKnownSL[];",
    "double   g_trKnownTP[];",
    "double   g_trKnownLots[];"
  );

  // --- OnInit ---
  code.onInit.push(
    "g_trEnabled = (StringLen(InpTelemetryKey) > 0 && !MQLInfoInteger(MQL_TESTER));",
    "if(g_trEnabled) { TrackRecordLoadState(); TrackRecordSendSessionStart(); }"
  );

  // --- OnDeinit ---
  code.onDeinit.push(
    "if(g_trEnabled) { TrackRecordSendSessionEnd(reason); TrackRecordSaveState(); }"
  );

  // --- OnTick ---
  code.onTick.push("");
  code.onTick.push("//--- Track Record event detection");
  code.onTick.push("if(g_trEnabled)");
  code.onTick.push("{");
  code.onTick.push("   TrackRecordDetectTradeEvents();");
  code.onTick.push("   if(TimeCurrent() - g_trLastSnapshot >= g_trSnapshotInterval)");
  code.onTick.push("   {");
  code.onTick.push("      TrackRecordSendSnapshot();");
  code.onTick.push("      g_trLastSnapshot = TimeCurrent();");
  code.onTick.push("   }");
  code.onTick.push("}");

  // --- Helper functions ---
  code.helperFunctions.push(buildSHA256Helper());
  code.helperFunctions.push(buildCanonicalJsonHelpers());
  code.helperFunctions.push(buildHashChainHelpers());
  code.helperFunctions.push(buildStateHelpers());
  code.helperFunctions.push(buildEventDetection());
  code.helperFunctions.push(buildEventSenders());
  code.helperFunctions.push(buildTrackRecordHttpPost());
}

function buildSHA256Helper(): string {
  return `//+------------------------------------------------------------------+
//| SHA-256 using MQL5 native CryptEncode                            |
//+------------------------------------------------------------------+
string TrackRecordSHA256(string input)
{
   uchar data[];
   uchar hash[];
   StringToCharArray(input, data, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove null terminator
   ArrayResize(data, ArraySize(data) - 1);
   if(!CryptEncode(CRYPT_HASH_SHA256, data, hash, hash))
      return "";
   string result = "";
   for(int i = 0; i < ArraySize(hash); i++)
   {
      string hex = "";
      StringConcatenate(hex, IntegerToString(hash[i] >> 4, 1, '0'), IntegerToString(hash[i] & 0x0F, 1, '0'));
      // Manual hex conversion
      uchar hi = (uchar)(hash[i] >> 4);
      uchar lo = (uchar)(hash[i] & 0x0F);
      result += StringFormat("%c%c", hi < 10 ? '0'+hi : 'a'+hi-10, lo < 10 ? '0'+lo : 'a'+lo-10);
   }
   return result;
}`;
}

function buildCanonicalJsonHelpers(): string {
  return `//+------------------------------------------------------------------+
//| Canonical JSON helpers for hash-chain consistency                 |
//+------------------------------------------------------------------+
string TRJsonStr(string key, string val)
{
   // Escape backslashes and quotes in value
   StringReplace(val, "\\\\", "\\\\\\\\");
   StringReplace(val, "\\"", "\\\\\\"");
   return "\\"" + key + "\\":\\"" + val + "\\"";
}

string TRJsonPrice(string key, double val)
{
   return "\\"" + key + "\\":" + DoubleToString(val, 8);
}

string TRJsonMoney(string key, double val)
{
   return "\\"" + key + "\\":" + DoubleToString(val, 2);
}

string TRJsonInt(string key, int val)
{
   return "\\"" + key + "\\":" + IntegerToString(val);
}

string TRJsonLong(string key, long val)
{
   return "\\"" + key + "\\":" + IntegerToString(val);
}`;
}

function buildHashChainHelpers(): string {
  return `//+------------------------------------------------------------------+
//| Hash chain: compute event hash from canonical JSON               |
//+------------------------------------------------------------------+
string TrackRecordComputeHash(string eventType, int seqNo, string prevHash,
                              long timestamp, string payloadFields)
{
   // Build canonical JSON: fields sorted alphabetically
   // Core fields + payload fields merged and sorted
   string canonical = "{";

   // We build an array of key:value pairs, sort, then join
   string pairs[];
   int pairCount = 0;

   // Add core fields
   ArrayResize(pairs, 20);
   pairs[pairCount++] = TRJsonStr("eaInstanceId", g_trInstanceId);
   pairs[pairCount++] = TRJsonStr("eventType", eventType);
   pairs[pairCount++] = TRJsonStr("prevHash", prevHash);
   pairs[pairCount++] = TRJsonInt("seqNo", seqNo);
   pairs[pairCount++] = TRJsonLong("timestamp", timestamp);

   // Add payload fields (already formatted as key:value strings)
   string payloadParts[];
   int numParts = StringSplit(payloadFields, '|', payloadParts);
   for(int i = 0; i < numParts; i++)
   {
      if(StringLen(payloadParts[i]) > 0)
      {
         if(pairCount >= ArraySize(pairs))
            ArrayResize(pairs, pairCount + 10);
         pairs[pairCount++] = payloadParts[i];
      }
   }
   ArrayResize(pairs, pairCount);

   // Sort pairs alphabetically (simple bubble sort - small array)
   for(int i = 0; i < pairCount - 1; i++)
   {
      for(int j = 0; j < pairCount - i - 1; j++)
      {
         if(StringCompare(pairs[j], pairs[j+1]) > 0)
         {
            string tmp = pairs[j];
            pairs[j] = pairs[j+1];
            pairs[j+1] = tmp;
         }
      }
   }

   for(int i = 0; i < pairCount; i++)
   {
      if(i > 0) canonical += ",";
      canonical += pairs[i];
   }
   canonical += "}";

   return TrackRecordSHA256(canonical);
}

void TrackRecordAdvanceChain(string eventHash)
{
   g_trSeqNo++;
   g_trLastHash = eventHash;
   TrackRecordSaveState();
}`;
}

function buildStateHelpers(): string {
  return `//+------------------------------------------------------------------+
//| Persistent state: save/load seqNo and lastHash across restarts   |
//+------------------------------------------------------------------+
void TrackRecordSaveState()
{
   // GlobalVariable for quick recovery
   GlobalVariableSet("ASTR_TRSeqNo_" + IntegerToString(InpMagicNumber), (double)g_trSeqNo);

   // File backup (survives terminal restart)
   string fileName = "AlgoStudio_TR_" + IntegerToString(InpMagicNumber) + ".dat";
   int handle = FileOpen(fileName, FILE_WRITE|FILE_TXT);
   if(handle != INVALID_HANDLE)
   {
      FileWriteString(handle, IntegerToString(g_trSeqNo) + "\\n");
      FileWriteString(handle, g_trLastHash + "\\n");
      FileWriteString(handle, g_trInstanceId + "\\n");
      FileClose(handle);
   }
}

void TrackRecordLoadState()
{
   // Try file first
   string fileName = "AlgoStudio_TR_" + IntegerToString(InpMagicNumber) + ".dat";
   int handle = FileOpen(fileName, FILE_READ|FILE_TXT);
   if(handle != INVALID_HANDLE)
   {
      string seqStr = FileReadString(handle);
      g_trSeqNo = (int)StringToInteger(seqStr);
      g_trLastHash = FileReadString(handle);
      g_trInstanceId = FileReadString(handle);
      FileClose(handle);
   }

   // Cross-check with GlobalVariable
   double gvSeq = GlobalVariableGet("ASTR_TRSeqNo_" + IntegerToString(InpMagicNumber));
   if((int)gvSeq > g_trSeqNo)
      g_trSeqNo = (int)gvSeq;

   // If no instance ID, try to get from server
   if(StringLen(g_trInstanceId) == 0)
      TrackRecordRecoverFromServer();
}

void TrackRecordRecoverFromServer()
{
   if(StringLen(g_trInstanceId) == 0)
   {
      Print("TrackRecord: Cannot recover — no instance ID available.");
      return;
   }

   string url = InpTrackRecordURL + "/state/" + g_trInstanceId;
   string headers = "Content-Type: application/json\\r\\nX-EA-Key: " + InpTelemetryKey;

   char data[];
   char result[];
   string resultHeaders;

   int res = WebRequest("GET", url, headers, 5000, data, result, resultHeaders);

   if(res != 200)
   {
      Print("TrackRecord: Recovery failed, status ", res, ". Starting fresh.");
      return;
   }

   string response = CharArrayToString(result);

   // Parse lastSeqNo
   int seqPos = StringFind(response, "\\"lastSeqNo\\":");
   if(seqPos >= 0)
   {
      int valStart = seqPos + 12;
      int valEnd = StringFind(response, ",", valStart);
      if(valEnd < 0) valEnd = StringFind(response, "}", valStart);
      string seqStr = StringSubstr(response, valStart, valEnd - valStart);
      g_trSeqNo = (int)StringToInteger(seqStr);
   }

   // Parse lastEventHash
   int hashPos = StringFind(response, "\\"lastEventHash\\":\\"");
   if(hashPos >= 0)
   {
      int valStart = hashPos + 17;
      g_trLastHash = StringSubstr(response, valStart, 64);
   }

   if(g_trSeqNo > 0)
      Print("TrackRecord: Recovered from server. SeqNo=", g_trSeqNo, " Hash=", StringSubstr(g_trLastHash, 0, 8), "...");
}`;
}

function buildEventDetection(): string {
  return `//+------------------------------------------------------------------+
//| Detect trade events: opens, closes, modifications                |
//+------------------------------------------------------------------+
void TrackRecordDetectTradeEvents()
{
   // Scan current positions
   int currentTickets[];
   double currentSL[];
   double currentTP[];
   double currentLots[];
   int currentCount = 0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;

      int sz = ArraySize(currentTickets);
      ArrayResize(currentTickets, sz + 1);
      ArrayResize(currentSL, sz + 1);
      ArrayResize(currentTP, sz + 1);
      ArrayResize(currentLots, sz + 1);
      currentTickets[sz] = (int)ticket;
      currentSL[sz] = PositionGetDouble(POSITION_SL);
      currentTP[sz] = PositionGetDouble(POSITION_TP);
      currentLots[sz] = PositionGetDouble(POSITION_VOLUME);
      currentCount++;
   }

   // Detect new positions (in current but not in known)
   for(int i = 0; i < currentCount; i++)
   {
      bool found = false;
      for(int j = 0; j < ArraySize(g_trKnownTickets); j++)
      {
         if(g_trKnownTickets[j] == currentTickets[i])
         {
            found = true;
            // Check for modifications
            if(MathAbs(g_trKnownSL[j] - currentSL[i]) > _Point ||
               MathAbs(g_trKnownTP[j] - currentTP[i]) > _Point)
            {
               TrackRecordSendTradeModify(currentTickets[i],
                  currentSL[i], currentTP[i], g_trKnownSL[j], g_trKnownTP[j]);
               g_trKnownSL[j] = currentSL[i];
               g_trKnownTP[j] = currentTP[i];
            }
            // Check for partial close
            if(MathAbs(g_trKnownLots[j] - currentLots[i]) > 0.001 &&
               currentLots[i] < g_trKnownLots[j])
            {
               double closedLots = g_trKnownLots[j] - currentLots[i];
               TrackRecordSendPartialClose(currentTickets[i], closedLots, currentLots[i]);
               g_trKnownLots[j] = currentLots[i];
            }
            break;
         }
      }
      if(!found)
      {
         // New position opened
         string dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         TrackRecordSendTradeOpen(currentTickets[i],
            PositionGetString(POSITION_SYMBOL), dir,
            currentLots[i],
            PositionGetDouble(POSITION_PRICE_OPEN),
            currentSL[i], currentTP[i]);
      }
   }

   // Detect closed positions (in known but not in current)
   for(int j = 0; j < ArraySize(g_trKnownTickets); j++)
   {
      bool found = false;
      for(int i = 0; i < currentCount; i++)
      {
         if(currentTickets[i] == g_trKnownTickets[j])
         {
            found = true;
            break;
         }
      }
      if(!found)
      {
         // Position was closed — find in history
         TrackRecordDetectClose(g_trKnownTickets[j]);
      }
   }

   // Update known positions
   ArrayResize(g_trKnownTickets, currentCount);
   ArrayResize(g_trKnownSL, currentCount);
   ArrayResize(g_trKnownTP, currentCount);
   ArrayResize(g_trKnownLots, currentCount);
   for(int i = 0; i < currentCount; i++)
   {
      g_trKnownTickets[i] = currentTickets[i];
      g_trKnownSL[i] = currentSL[i];
      g_trKnownTP[i] = currentTP[i];
      g_trKnownLots[i] = currentLots[i];
   }
}

void TrackRecordDetectClose(int ticket)
{
   // Search deal history for this position's closing deal
   HistorySelect(0, TimeCurrent());
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong dTicket = HistoryDealGetTicket(i);
      if(dTicket == 0) continue;
      if(HistoryDealGetInteger(dTicket, DEAL_MAGIC) != InpMagicNumber) continue;
      if(HistoryDealGetInteger(dTicket, DEAL_POSITION_ID) != ticket) continue;
      if(HistoryDealGetInteger(dTicket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      double profit = HistoryDealGetDouble(dTicket, DEAL_PROFIT);
      double swap = HistoryDealGetDouble(dTicket, DEAL_SWAP);
      double commission = HistoryDealGetDouble(dTicket, DEAL_COMMISSION);
      double closePrice = HistoryDealGetDouble(dTicket, DEAL_PRICE);

      // Determine close reason
      ENUM_DEAL_REASON reason = (ENUM_DEAL_REASON)HistoryDealGetInteger(dTicket, DEAL_REASON);
      string closeReason = "EA";
      if(reason == DEAL_REASON_SL) closeReason = "SL";
      else if(reason == DEAL_REASON_TP) closeReason = "TP";
      else if(reason == DEAL_REASON_SO) closeReason = "SO";

      TrackRecordSendTradeClose(ticket, closePrice, profit, swap, commission, closeReason);
      return;
   }
}`;
}

function buildEventSenders(): string {
  return `//+------------------------------------------------------------------+
//| Send track record events                                         |
//+------------------------------------------------------------------+
void TrackRecordSendSessionStart()
{
   int nextSeq = g_trSeqNo + 1;
   long ts = (long)TimeCurrent();

   ENUM_ACCOUNT_TRADE_MODE tradeMode = (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
   string mode = (tradeMode == ACCOUNT_TRADE_MODE_DEMO || tradeMode == ACCOUNT_TRADE_MODE_CONTEST) ? "PAPER" : "LIVE";

   string payload =
      TRJsonStr("account", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))) + "|" +
      TRJsonMoney("balance", AccountInfoDouble(ACCOUNT_BALANCE)) + "|" +
      TRJsonStr("broker", AccountInfoString(ACCOUNT_COMPANY)) + "|" +
      TRJsonStr("eaVersion", "1.0") + "|" +
      TRJsonStr("mode", mode) + "|" +
      TRJsonStr("symbol", _Symbol) + "|" +
      TRJsonStr("timeframe", EnumToString((ENUM_TIMEFRAMES)Period()));

   string hash = TrackRecordComputeHash("SESSION_START", nextSeq, g_trLastHash, ts, payload);

   // Build JSON body for HTTP POST
   string json = "{"
      + "\\"eventType\\":\\"SESSION_START\\","
      + "\\"seqNo\\":" + IntegerToString(nextSeq) + ","
      + "\\"prevHash\\":\\"" + g_trLastHash + "\\","
      + "\\"eventHash\\":\\"" + hash + "\\","
      + "\\"timestamp\\":" + IntegerToString(ts) + ","
      + "\\"payload\\":{"
      + TRJsonStr("account", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))) + ","
      + TRJsonMoney("balance", AccountInfoDouble(ACCOUNT_BALANCE)) + ","
      + TRJsonStr("broker", AccountInfoString(ACCOUNT_COMPANY)) + ","
      + TRJsonStr("eaVersion", "1.0") + ","
      + TRJsonStr("mode", mode) + ","
      + TRJsonStr("symbol", _Symbol) + ","
      + TRJsonStr("timeframe", EnumToString((ENUM_TIMEFRAMES)Period()))
      + "}}";

   if(TrackRecordHttpPost("/ingest", json))
   {
      g_trSeqNo = nextSeq;
      g_trLastHash = hash;
      g_trSessionStartSent = true;
      TrackRecordSaveState();
   }
}

void TrackRecordSendSessionEnd(int reason)
{
   if(!g_trSessionStartSent) return;

   int nextSeq = g_trSeqNo + 1;
   long ts = (long)TimeCurrent();

   string reasonStr = "UNKNOWN";
   if(reason == REASON_REMOVE) reasonStr = "REMOVED";
   else if(reason == REASON_RECOMPILE) reasonStr = "RECOMPILE";
   else if(reason == REASON_CHARTCLOSE) reasonStr = "CHART_CLOSE";
   else if(reason == REASON_CHARTCHANGE) reasonStr = "CHART_CHANGE";
   else if(reason == REASON_PARAMETERS) reasonStr = "PARAMS_CHANGE";
   else if(reason == REASON_ACCOUNT) reasonStr = "ACCOUNT_CHANGE";

   string payload =
      TRJsonMoney("finalBalance", AccountInfoDouble(ACCOUNT_BALANCE)) + "|" +
      TRJsonMoney("finalEquity", AccountInfoDouble(ACCOUNT_EQUITY)) + "|" +
      TRJsonStr("reason", reasonStr) + "|" +
      TRJsonInt("uptimeSeconds", 0);

   string hash = TrackRecordComputeHash("SESSION_END", nextSeq, g_trLastHash, ts, payload);

   string json = "{"
      + "\\"eventType\\":\\"SESSION_END\\","
      + "\\"seqNo\\":" + IntegerToString(nextSeq) + ","
      + "\\"prevHash\\":\\"" + g_trLastHash + "\\","
      + "\\"eventHash\\":\\"" + hash + "\\","
      + "\\"timestamp\\":" + IntegerToString(ts) + ","
      + "\\"payload\\":{"
      + TRJsonMoney("finalBalance", AccountInfoDouble(ACCOUNT_BALANCE)) + ","
      + TRJsonMoney("finalEquity", AccountInfoDouble(ACCOUNT_EQUITY)) + ","
      + TRJsonStr("reason", reasonStr) + ","
      + TRJsonInt("uptimeSeconds", 0)
      + "}}";

   if(TrackRecordHttpPost("/ingest", json))
   {
      g_trSeqNo = nextSeq;
      g_trLastHash = hash;
      TrackRecordSaveState();
   }
}

void TrackRecordSendSnapshot()
{
   int nextSeq = g_trSeqNo + 1;
   long ts = (long)TimeCurrent();

   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double unrealized = eq - bal;
   double dd = (bal > 0) ? ((bal - eq) / bal * 100.0) : 0;
   if(dd < 0) dd = 0;

   int openCount = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber
         && PositionGetString(POSITION_SYMBOL) == _Symbol)
         openCount++;
   }

   string payload =
      TRJsonMoney("balance", bal) + "|" +
      TRJsonMoney("drawdown", dd) + "|" +
      TRJsonMoney("equity", eq) + "|" +
      TRJsonInt("openTrades", openCount) + "|" +
      TRJsonMoney("unrealizedPnL", unrealized);

   string hash = TrackRecordComputeHash("SNAPSHOT", nextSeq, g_trLastHash, ts, payload);

   string json = "{"
      + "\\"eventType\\":\\"SNAPSHOT\\","
      + "\\"seqNo\\":" + IntegerToString(nextSeq) + ","
      + "\\"prevHash\\":\\"" + g_trLastHash + "\\","
      + "\\"eventHash\\":\\"" + hash + "\\","
      + "\\"timestamp\\":" + IntegerToString(ts) + ","
      + "\\"payload\\":{"
      + TRJsonMoney("balance", bal) + ","
      + TRJsonMoney("drawdown", dd) + ","
      + TRJsonMoney("equity", eq) + ","
      + TRJsonInt("openTrades", openCount) + ","
      + TRJsonMoney("unrealizedPnL", unrealized)
      + "}}";

   if(TrackRecordHttpPost("/ingest", json))
   {
      g_trSeqNo = nextSeq;
      g_trLastHash = hash;
      TrackRecordSaveState();
   }
}

void TrackRecordSendTradeOpen(int ticket, string symbol, string dir,
                              double lots, double openPrice, double sl, double tp)
{
   int nextSeq = g_trSeqNo + 1;
   long ts = (long)TimeCurrent();

   string payload =
      TRJsonStr("direction", dir) + "|" +
      TRJsonMoney("lots", lots) + "|" +
      TRJsonPrice("openPrice", openPrice) + "|" +
      TRJsonPrice("sl", sl) + "|" +
      TRJsonStr("symbol", symbol) + "|" +
      TRJsonStr("ticket", IntegerToString(ticket)) + "|" +
      TRJsonPrice("tp", tp);

   string hash = TrackRecordComputeHash("TRADE_OPEN", nextSeq, g_trLastHash, ts, payload);

   string json = "{"
      + "\\"eventType\\":\\"TRADE_OPEN\\","
      + "\\"seqNo\\":" + IntegerToString(nextSeq) + ","
      + "\\"prevHash\\":\\"" + g_trLastHash + "\\","
      + "\\"eventHash\\":\\"" + hash + "\\","
      + "\\"timestamp\\":" + IntegerToString(ts) + ","
      + "\\"payload\\":{"
      + TRJsonStr("direction", dir) + ","
      + TRJsonMoney("lots", lots) + ","
      + TRJsonPrice("openPrice", openPrice) + ","
      + TRJsonPrice("sl", sl) + ","
      + TRJsonStr("symbol", symbol) + ","
      + TRJsonStr("ticket", IntegerToString(ticket)) + ","
      + TRJsonPrice("tp", tp)
      + "}}";

   if(TrackRecordHttpPost("/ingest", json))
   {
      g_trSeqNo = nextSeq;
      g_trLastHash = hash;
      TrackRecordSaveState();
   }
}

void TrackRecordSendTradeClose(int ticket, double closePrice, double profit,
                               double swap, double commission, string closeReason)
{
   int nextSeq = g_trSeqNo + 1;
   long ts = (long)TimeCurrent();

   string payload =
      TRJsonPrice("closePrice", closePrice) + "|" +
      TRJsonStr("closeReason", closeReason) + "|" +
      TRJsonMoney("commission", commission) + "|" +
      TRJsonMoney("profit", profit) + "|" +
      TRJsonMoney("swap", swap) + "|" +
      TRJsonStr("ticket", IntegerToString(ticket));

   string hash = TrackRecordComputeHash("TRADE_CLOSE", nextSeq, g_trLastHash, ts, payload);

   string json = "{"
      + "\\"eventType\\":\\"TRADE_CLOSE\\","
      + "\\"seqNo\\":" + IntegerToString(nextSeq) + ","
      + "\\"prevHash\\":\\"" + g_trLastHash + "\\","
      + "\\"eventHash\\":\\"" + hash + "\\","
      + "\\"timestamp\\":" + IntegerToString(ts) + ","
      + "\\"payload\\":{"
      + TRJsonPrice("closePrice", closePrice) + ","
      + TRJsonStr("closeReason", closeReason) + ","
      + TRJsonMoney("commission", commission) + ","
      + TRJsonMoney("profit", profit) + ","
      + TRJsonMoney("swap", swap) + ","
      + TRJsonStr("ticket", IntegerToString(ticket))
      + "}}";

   if(TrackRecordHttpPost("/ingest", json))
   {
      g_trSeqNo = nextSeq;
      g_trLastHash = hash;
      TrackRecordSaveState();
   }
}

void TrackRecordSendTradeModify(int ticket, double newSL, double newTP,
                                double oldSL, double oldTP)
{
   int nextSeq = g_trSeqNo + 1;
   long ts = (long)TimeCurrent();

   string payload =
      TRJsonPrice("newSL", newSL) + "|" +
      TRJsonPrice("newTP", newTP) + "|" +
      TRJsonPrice("oldSL", oldSL) + "|" +
      TRJsonPrice("oldTP", oldTP) + "|" +
      TRJsonStr("ticket", IntegerToString(ticket));

   string hash = TrackRecordComputeHash("TRADE_MODIFY", nextSeq, g_trLastHash, ts, payload);

   string json = "{"
      + "\\"eventType\\":\\"TRADE_MODIFY\\","
      + "\\"seqNo\\":" + IntegerToString(nextSeq) + ","
      + "\\"prevHash\\":\\"" + g_trLastHash + "\\","
      + "\\"eventHash\\":\\"" + hash + "\\","
      + "\\"timestamp\\":" + IntegerToString(ts) + ","
      + "\\"payload\\":{"
      + TRJsonPrice("newSL", newSL) + ","
      + TRJsonPrice("newTP", newTP) + ","
      + TRJsonPrice("oldSL", oldSL) + ","
      + TRJsonPrice("oldTP", oldTP) + ","
      + TRJsonStr("ticket", IntegerToString(ticket))
      + "}}";

   if(TrackRecordHttpPost("/ingest", json))
   {
      g_trSeqNo = nextSeq;
      g_trLastHash = hash;
      TrackRecordSaveState();
   }
}

void TrackRecordSendPartialClose(int ticket, double closedLots, double remainingLots)
{
   int nextSeq = g_trSeqNo + 1;
   long ts = (long)TimeCurrent();

   // Get close details from history
   double closePrice = 0;
   double profit = 0;
   HistorySelect(TimeCurrent() - 60, TimeCurrent());
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong dTicket = HistoryDealGetTicket(i);
      if(dTicket == 0) continue;
      if(HistoryDealGetInteger(dTicket, DEAL_POSITION_ID) == ticket)
      {
         closePrice = HistoryDealGetDouble(dTicket, DEAL_PRICE);
         profit = HistoryDealGetDouble(dTicket, DEAL_PROFIT);
         break;
      }
   }

   string payload =
      TRJsonMoney("closedLots", closedLots) + "|" +
      TRJsonPrice("closePrice", closePrice) + "|" +
      TRJsonMoney("profit", profit) + "|" +
      TRJsonMoney("remainingLots", remainingLots) + "|" +
      TRJsonStr("ticket", IntegerToString(ticket));

   string hash = TrackRecordComputeHash("PARTIAL_CLOSE", nextSeq, g_trLastHash, ts, payload);

   string json = "{"
      + "\\"eventType\\":\\"PARTIAL_CLOSE\\","
      + "\\"seqNo\\":" + IntegerToString(nextSeq) + ","
      + "\\"prevHash\\":\\"" + g_trLastHash + "\\","
      + "\\"eventHash\\":\\"" + hash + "\\","
      + "\\"timestamp\\":" + IntegerToString(ts) + ","
      + "\\"payload\\":{"
      + TRJsonMoney("closedLots", closedLots) + ","
      + TRJsonPrice("closePrice", closePrice) + ","
      + TRJsonMoney("profit", profit) + ","
      + TRJsonMoney("remainingLots", remainingLots) + ","
      + TRJsonStr("ticket", IntegerToString(ticket))
      + "}}";

   if(TrackRecordHttpPost("/ingest", json))
   {
      g_trSeqNo = nextSeq;
      g_trLastHash = hash;
      TrackRecordSaveState();
   }
}`;
}

function buildTrackRecordHttpPost(): string {
  return `//+------------------------------------------------------------------+
//| Track Record HTTP POST — returns true on success                 |
//+------------------------------------------------------------------+
bool TrackRecordHttpPost(string endpoint, string jsonBody)
{
   string url = InpTrackRecordURL + endpoint;
   string headers = "Content-Type: application/json\\r\\nX-EA-Key: " + InpTelemetryKey;
   char postData[];
   char resultData[];
   string resultHeaders;

   StringToCharArray(jsonBody, postData, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove null terminator
   ArrayResize(postData, ArraySize(postData) - 1);

   int res = WebRequest("POST", url, headers, 5000, postData, resultData, resultHeaders);
   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4014)
         Print("TrackRecord: Add ", url, " to Tools > Options > Expert Advisors > Allow WebRequest");
      else
         Print("TrackRecord: WebRequest failed, error ", err);
      return false;
   }

   // Parse response to get instanceId if needed
   string response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
   if(StringLen(g_trInstanceId) == 0)
   {
      // Try to extract instanceId from response headers or save from first successful call
   }

   return (res >= 200 && res < 300);
}`;
}
