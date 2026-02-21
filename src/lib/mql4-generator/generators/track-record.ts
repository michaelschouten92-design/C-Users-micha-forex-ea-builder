// MQL4 Track Record Code Generator
// Adds event-sourced, hash-chained track record to exported EAs
// MQL4 lacks native CryptEncode — uses embedded SHA-256 implementation

import type { GeneratedCode } from "../types";
import type { TelemetryConfig } from "./telemetry";

/**
 * Inject track record globals, OnInit, OnTick, OnDeinit, and helper functions
 * into the generated MQL4 code.
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
    "datetime g_trLastSnapshot = 0;",
    "int      g_trSnapshotInterval = 300;",
    "// Track known orders for detecting opens/closes/modifications",
    "int      g_trKnownTickets[];",
    "double   g_trKnownSL[];",
    "double   g_trKnownTP[];",
    "double   g_trKnownLots[];"
  );

  // --- OnInit ---
  code.onInit.push(
    "g_trEnabled = (StringLen(InpTelemetryKey) > 0 && !IsTesting());",
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
  code.helperFunctions.push(buildSHA256PureMQL4());
  code.helperFunctions.push(buildCanonicalJsonHelpersMQL4());
  code.helperFunctions.push(buildHashChainHelpersMQL4());
  code.helperFunctions.push(buildStateHelpersMQL4());
  code.helperFunctions.push(buildEventDetectionMQL4());
  code.helperFunctions.push(buildEventSendersMQL4());
  code.helperFunctions.push(buildTrackRecordHttpPostMQL4());
}

function buildSHA256PureMQL4(): string {
  // Pure MQL4 SHA-256 implementation (no CryptEncode available)
  return `//+------------------------------------------------------------------+
//| Pure MQL4 SHA-256 Implementation                                 |
//+------------------------------------------------------------------+
uint g_sha256_k[64] = {
   0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
   0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
   0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
   0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
   0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
   0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
   0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
   0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

uint SHA256_ROTR(uint x, int n) { return (x >> n) | (x << (32 - n)); }
uint SHA256_CH(uint x, uint y, uint z) { return (x & y) ^ (~x & z); }
uint SHA256_MAJ(uint x, uint y, uint z) { return (x & y) ^ (x & z) ^ (y & z); }
uint SHA256_EP0(uint x) { return SHA256_ROTR(x,2) ^ SHA256_ROTR(x,13) ^ SHA256_ROTR(x,22); }
uint SHA256_EP1(uint x) { return SHA256_ROTR(x,6) ^ SHA256_ROTR(x,11) ^ SHA256_ROTR(x,25); }
uint SHA256_SIG0(uint x) { return SHA256_ROTR(x,7) ^ SHA256_ROTR(x,18) ^ (x >> 3); }
uint SHA256_SIG1(uint x) { return SHA256_ROTR(x,17) ^ SHA256_ROTR(x,19) ^ (x >> 10); }

string TrackRecordSHA256(string input)
{
   uchar data[];
   StringToCharArray(input, data, 0, WHOLE_ARRAY, CP_UTF8);
   int dataLen = ArraySize(data) - 1; // exclude null terminator
   ArrayResize(data, dataLen);

   // Pre-processing: padding
   int bitLen = dataLen * 8;
   int padLen = dataLen + 1; // +1 for 0x80
   while(padLen % 64 != 56) padLen++;
   padLen += 8; // length field

   uchar padded[];
   ArrayResize(padded, padLen);
   ArrayInitialize(padded, 0);
   for(int i = 0; i < dataLen; i++) padded[i] = data[i];
   padded[dataLen] = 0x80;

   // Append length in bits (big-endian, 64-bit)
   long bitLen64 = (long)bitLen;
   for(int i = 0; i < 8; i++)
      padded[padLen - 1 - i] = (uchar)((bitLen64 >> (i * 8)) & 0xFF);

   // Initialize hash values
   uint h0=0x6a09e667, h1=0xbb67ae85, h2=0x3c6ef372, h3=0xa54ff53a;
   uint h4=0x510e527f, h5=0x9b05688c, h6=0x1f83d9ab, h7=0x5be0cd19;

   // Process each 64-byte chunk
   for(int chunk = 0; chunk < padLen; chunk += 64)
   {
      uint w[64];
      for(int i = 0; i < 16; i++)
      {
         w[i] = ((uint)padded[chunk+i*4] << 24) | ((uint)padded[chunk+i*4+1] << 16) |
                ((uint)padded[chunk+i*4+2] << 8) | ((uint)padded[chunk+i*4+3]);
      }
      for(int i = 16; i < 64; i++)
         w[i] = SHA256_SIG1(w[i-2]) + w[i-7] + SHA256_SIG0(w[i-15]) + w[i-16];

      uint a=h0, b=h1, c=h2, d=h3, e=h4, f=h5, g=h6, h=h7;
      for(int i = 0; i < 64; i++)
      {
         uint t1 = h + SHA256_EP1(e) + SHA256_CH(e,f,g) + g_sha256_k[i] + w[i];
         uint t2 = SHA256_EP0(a) + SHA256_MAJ(a,b,c);
         h=g; g=f; f=e; e=d+t1; d=c; c=b; b=a; a=t1+t2;
      }
      h0+=a; h1+=b; h2+=c; h3+=d; h4+=e; h5+=f; h6+=g; h7+=h;
   }

   // Convert to hex string
   string result = "";
   uint hashVals[8];
   hashVals[0]=h0; hashVals[1]=h1; hashVals[2]=h2; hashVals[3]=h3;
   hashVals[4]=h4; hashVals[5]=h5; hashVals[6]=h6; hashVals[7]=h7;
   for(int i = 0; i < 8; i++)
   {
      for(int j = 3; j >= 0; j--)
      {
         uchar b2 = (uchar)((hashVals[i] >> (j*8)) & 0xFF);
         uchar hi = (uchar)(b2 >> 4);
         uchar lo = (uchar)(b2 & 0x0F);
         result += StringFormat("%c%c", hi < 10 ? '0'+hi : 'a'+hi-10, lo < 10 ? '0'+lo : 'a'+lo-10);
      }
   }
   return result;
}`;
}

function buildCanonicalJsonHelpersMQL4(): string {
  return `//+------------------------------------------------------------------+
//| Canonical JSON helpers for hash-chain consistency (MQL4)         |
//+------------------------------------------------------------------+
string TRJsonStr(string key, string val)
{
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

function buildHashChainHelpersMQL4(): string {
  return `//+------------------------------------------------------------------+
//| Hash chain: compute event hash from canonical JSON (MQL4)        |
//+------------------------------------------------------------------+
string TrackRecordComputeHash(string eventType, int seqNo, string prevHash,
                              long timestamp, string payloadFields)
{
   string canonical = "{";
   string pairs[];
   int pairCount = 0;

   ArrayResize(pairs, 20);
   pairs[pairCount++] = TRJsonStr("eaInstanceId", g_trInstanceId);
   pairs[pairCount++] = TRJsonStr("eventType", eventType);
   pairs[pairCount++] = TRJsonStr("prevHash", prevHash);
   pairs[pairCount++] = TRJsonInt("seqNo", seqNo);
   pairs[pairCount++] = TRJsonLong("timestamp", timestamp);

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

   // Bubble sort
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

function buildStateHelpersMQL4(): string {
  return `//+------------------------------------------------------------------+
//| Persistent state: save/load seqNo and lastHash (MQL4)            |
//+------------------------------------------------------------------+
void TrackRecordSaveState()
{
   GlobalVariableSet("ASTR_TRSeqNo_" + IntegerToString(InpMagicNumber), (double)g_trSeqNo);

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

   double gvSeq = GlobalVariableGet("ASTR_TRSeqNo_" + IntegerToString(InpMagicNumber));
   if((int)gvSeq > g_trSeqNo)
      g_trSeqNo = (int)gvSeq;

   // If no instance ID, try to recover from server
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

function buildEventDetectionMQL4(): string {
  return `//+------------------------------------------------------------------+
//| Detect trade events: opens, closes, modifications (MQL4)         |
//+------------------------------------------------------------------+
void TrackRecordDetectTradeEvents()
{
   int currentTickets[];
   double currentSL[];
   double currentTP[];
   double currentLots[];
   int currentCount = 0;

   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderMagicNumber() != InpMagicNumber) continue;
      if(OrderSymbol() != Symbol()) continue;
      if(OrderType() > OP_SELL) continue;

      int sz = ArraySize(currentTickets);
      ArrayResize(currentTickets, sz + 1);
      ArrayResize(currentSL, sz + 1);
      ArrayResize(currentTP, sz + 1);
      ArrayResize(currentLots, sz + 1);
      currentTickets[sz] = OrderTicket();
      currentSL[sz] = OrderStopLoss();
      currentTP[sz] = OrderTakeProfit();
      currentLots[sz] = OrderLots();
      currentCount++;
   }

   // Detect new positions
   for(int i = 0; i < currentCount; i++)
   {
      bool found = false;
      for(int j = 0; j < ArraySize(g_trKnownTickets); j++)
      {
         if(g_trKnownTickets[j] == currentTickets[i])
         {
            found = true;
            if(MathAbs(g_trKnownSL[j] - currentSL[i]) > Point ||
               MathAbs(g_trKnownTP[j] - currentTP[i]) > Point)
            {
               TrackRecordSendTradeModify(currentTickets[i],
                  currentSL[i], currentTP[i], g_trKnownSL[j], g_trKnownTP[j]);
               g_trKnownSL[j] = currentSL[i];
               g_trKnownTP[j] = currentTP[i];
            }
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
         if(!OrderSelect(currentTickets[i], SELECT_BY_TICKET)) continue;
         string dir = (OrderType() == OP_BUY) ? "BUY" : "SELL";
         TrackRecordSendTradeOpen(currentTickets[i],
            OrderSymbol(), dir, currentLots[i],
            OrderOpenPrice(), currentSL[i], currentTP[i]);
      }
   }

   // Detect closed positions
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
         // Find in history
         if(OrderSelect(g_trKnownTickets[j], SELECT_BY_TICKET, MODE_HISTORY))
         {
            double profit = OrderProfit();
            double swap = OrderSwap();
            double commission = OrderCommission();
            double closePrice = OrderClosePrice();
            TrackRecordSendTradeClose(g_trKnownTickets[j], closePrice, profit, swap, commission, "EA");
         }
      }
   }

   // Update known
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
}`;
}

function buildEventSendersMQL4(): string {
  return `//+------------------------------------------------------------------+
//| Send track record events (MQL4)                                  |
//+------------------------------------------------------------------+
void TrackRecordSendSessionStart()
{
   int nextSeq = g_trSeqNo + 1;
   long ts = (long)TimeCurrent();
   string mode = IsDemo() ? "PAPER" : "LIVE";

   string payload =
      TRJsonStr("account", IntegerToString(AccountNumber())) + "|" +
      TRJsonMoney("balance", AccountBalance()) + "|" +
      TRJsonStr("broker", AccountCompany()) + "|" +
      TRJsonStr("eaVersion", "1.0") + "|" +
      TRJsonStr("mode", mode) + "|" +
      TRJsonStr("symbol", Symbol()) + "|" +
      TRJsonStr("timeframe", EnumToString((ENUM_TIMEFRAMES)Period()));

   string hash = TrackRecordComputeHash("SESSION_START", nextSeq, g_trLastHash, ts, payload);

   string json = "{"
      + "\\"eventType\\":\\"SESSION_START\\","
      + "\\"seqNo\\":" + IntegerToString(nextSeq) + ","
      + "\\"prevHash\\":\\"" + g_trLastHash + "\\","
      + "\\"eventHash\\":\\"" + hash + "\\","
      + "\\"timestamp\\":" + IntegerToString(ts) + ","
      + "\\"payload\\":{"
      + TRJsonStr("account", IntegerToString(AccountNumber())) + ","
      + TRJsonMoney("balance", AccountBalance()) + ","
      + TRJsonStr("broker", AccountCompany()) + ","
      + TRJsonStr("eaVersion", "1.0") + ","
      + TRJsonStr("mode", mode) + ","
      + TRJsonStr("symbol", Symbol()) + ","
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
      TRJsonMoney("finalBalance", AccountBalance()) + "|" +
      TRJsonMoney("finalEquity", AccountEquity()) + "|" +
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
      + TRJsonMoney("finalBalance", AccountBalance()) + ","
      + TRJsonMoney("finalEquity", AccountEquity()) + ","
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
   double bal = AccountBalance();
   double eq = AccountEquity();
   double unrealized = eq - bal;
   double dd = (bal > 0) ? ((bal - eq) / bal * 100.0) : 0;
   if(dd < 0) dd = 0;

   int openCount = 0;
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderMagicNumber() != InpMagicNumber || OrderSymbol() != Symbol()) continue;
      if(OrderType() <= OP_SELL) openCount++;
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

   double closePrice = 0;
   double profit = 0;
   // Check recent history for this partial close
   for(int i = OrdersHistoryTotal() - 1; i >= MathMax(0, OrdersHistoryTotal() - 10); i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderTicket() == ticket || OrderMagicNumber() == InpMagicNumber)
      {
         closePrice = OrderClosePrice();
         profit = OrderProfit();
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

function buildTrackRecordHttpPostMQL4(): string {
  return `//+------------------------------------------------------------------+
//| Track Record HTTP POST — returns true on success (MQL4)          |
//+------------------------------------------------------------------+
bool TrackRecordHttpPost(string endpoint, string jsonBody)
{
   string url = InpTrackRecordURL + endpoint;
   string headers = "Content-Type: application/json\\r\\nX-EA-Key: " + InpTelemetryKey;
   char postData[];
   char resultData[];
   string resultHeaders;

   StringToCharArray(jsonBody, postData, 0, WHOLE_ARRAY, CP_UTF8);
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
   return (res >= 200 && res < 300);
}`;
}
