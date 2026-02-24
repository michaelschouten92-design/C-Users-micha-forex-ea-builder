//+------------------------------------------------------------------+
//|                                        AlgoStudio_Monitor.mq5    |
//|                         AlgoStudio — External EA Monitor         |
//|                         https://algo-studio.com                  |
//+------------------------------------------------------------------+
//| Standalone monitor EA. Attach to any chart to send telemetry     |
//| for EAs that were not built with AlgoStudio's visual builder.    |
//|                                                                  |
//| This EA does NOT trade. It only observes and reports.            |
//+------------------------------------------------------------------+
#property copyright "AlgoStudio"
#property link      "https://algo-studio.com"
#property version   "1.00"
#property description "AlgoStudio Monitor — sends live telemetry for any EA."
#property description "Does NOT trade. Monitoring only."
#property strict

//+------------------------------------------------------------------+
//| INPUT PARAMETERS                                                 |
//+------------------------------------------------------------------+
input string InpApiKey        = "";              // API Key (from AlgoStudio dashboard)
input string InpBaseUrl       = "https://algo-studio.com"; // AlgoStudio Server URL
input int    InpHeartbeatSec  = 30;              // Heartbeat interval (seconds)
input int    InpSnapshotSec   = 300;             // Track-record snapshot interval (seconds)

// Monitoring scope
input ENUM_MONITOR_MODE InpMonitorMode = MODE_ACCOUNT_WIDE; // Monitoring Mode
input string InpMagicNumbers  = "";              // Magic numbers to track (comma-separated, empty=all)
input string InpCommentFilter = "";              // Comment substring filter (empty=all)
input bool   InpExcludeManual = false;           // Exclude manual trades (magic=0)

//+------------------------------------------------------------------+
//| ENUMS                                                            |
//+------------------------------------------------------------------+
enum ENUM_MONITOR_MODE
{
   MODE_SYMBOL_ONLY  = 0,  // Current Symbol Only
   MODE_ACCOUNT_WIDE = 1   // Account Wide (all symbols)
};

//+------------------------------------------------------------------+
//| CONSTANTS                                                        |
//+------------------------------------------------------------------+
#define GENESIS_HASH "0000000000000000000000000000000000000000000000000000000000000000"
#define MAX_QUEUE_SIZE 500
#define STATE_FILE_PREFIX "AlgoStudio_Monitor_"
#define LOCK_GV_PREFIX "AS_MONITOR_LOCK_"

//+------------------------------------------------------------------+
//| GLOBALS                                                          |
//+------------------------------------------------------------------+
// Track-record chain state
int    g_seqNo         = 0;
string g_lastHash      = GENESIS_HASH;
string g_instanceId    = "";

// Timing
datetime g_lastHeartbeat  = 0;
datetime g_lastSnapshot   = 0;
datetime g_sessionStart   = 0;

// Trade tracking
int    g_knownDeals[];       // History deal tickets we've already reported
int    g_knownDealCount = 0;
int    g_knownPositions[];   // Position tickets currently open
int    g_knownPosCount  = 0;

// Magic number filter
long   g_magicFilter[];
int    g_magicFilterCount = 0;

// Offline queue
string g_offlineQueue[];
int    g_queueCount = 0;

// State
bool   g_initialized = false;
string g_stateFile   = "";
string g_lockGV      = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   // Validate API key
   if(StringLen(InpApiKey) < 32)
   {
      Print("AlgoStudio Monitor: Invalid API key. Get one from https://algo-studio.com/app/live");
      return INIT_PARAMETERS_INCORRECT;
   }

   // Validate intervals
   if(InpHeartbeatSec < 10 || InpHeartbeatSec > 3600)
   {
      Print("AlgoStudio Monitor: Heartbeat interval must be 10-3600 seconds");
      return INIT_PARAMETERS_INCORRECT;
   }

   // Single-instance lock
   g_lockGV = LOCK_GV_PREFIX + StringSubstr(InpApiKey, 0, 8);
   if(GlobalVariableCheck(g_lockGV))
   {
      double lockTime = GlobalVariableGet(g_lockGV);
      // If lock is fresh (within 2 minutes), another instance is running
      if((double)TimeCurrent() - lockTime < 120)
      {
         Print("AlgoStudio Monitor: Another instance with this API key is already running.");
         return INIT_FAILED;
      }
   }
   GlobalVariableSet(g_lockGV, (double)TimeCurrent());

   // Parse magic number filter
   ParseMagicFilter();

   // Build state file path
   string keyPrefix = StringSubstr(InpApiKey, 0, 8);
   g_stateFile = STATE_FILE_PREFIX + keyPrefix + ".dat";

   // Load persisted state
   LoadState();

   // Set timer for heartbeats
   EventSetTimer(MathMin(InpHeartbeatSec, InpSnapshotSec));

   // Build initial position/deal snapshots
   BuildKnownPositions();
   BuildKnownDeals();

   g_sessionStart = TimeCurrent();
   g_initialized = true;

   // Sync chain state from server if we have an instanceId
   if(StringLen(g_instanceId) > 0 && g_seqNo > 0)
   {
      SyncChainState();
   }

   // Send SESSION_START
   SendSessionStart();

   Print("AlgoStudio Monitor: Initialized. Mode=",
         InpMonitorMode == MODE_ACCOUNT_WIDE ? "Account-Wide" : "Symbol-Only",
         " Heartbeat=", InpHeartbeatSec, "s Snapshot=", InpSnapshotSec, "s");

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(!g_initialized) return;

   // Send SESSION_END
   SendSessionEnd();

   // Flush offline queue
   FlushOfflineQueue();

   // Save state
   SaveState();

   // Release lock
   if(StringLen(g_lockGV) > 0)
      GlobalVariableDel(g_lockGV);

   EventKillTimer();

   Print("AlgoStudio Monitor: Shut down. Reason=", reason);
}

//+------------------------------------------------------------------+
//| Timer function — heartbeats & snapshots                          |
//+------------------------------------------------------------------+
void OnTimer()
{
   if(!g_initialized) return;

   // Refresh lock
   if(StringLen(g_lockGV) > 0)
      GlobalVariableSet(g_lockGV, (double)TimeCurrent());

   datetime now = TimeCurrent();

   // Flush offline queue first
   if(g_queueCount > 0)
      FlushOfflineQueue();

   // Poll for new trades (backup detection in case OnTradeTransaction missed something)
   PollTradeChanges();

   // Heartbeat
   if(now - g_lastHeartbeat >= InpHeartbeatSec)
   {
      SendHeartbeat();
      g_lastHeartbeat = now;
   }

   // Snapshot for track record
   if(now - g_lastSnapshot >= InpSnapshotSec)
   {
      SendSnapshot();
      g_lastSnapshot = now;
   }

   // Periodic state save (every 5 minutes)
   static datetime lastSave = 0;
   if(now - lastSave >= 300)
   {
      SaveState();
      lastSave = now;
   }
}

//+------------------------------------------------------------------+
//| Trade transaction handler — real-time detection                  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(!g_initialized) return;

   // We care about deal additions
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(dealTicket == 0) return;

      // Let history catch up
      Sleep(100);
      HistorySelect(0, TimeCurrent());

      if(!HistoryDealSelect(dealTicket)) return;

      // Check filters
      if(!PassesFilter(dealTicket)) return;

      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

      if(entry == DEAL_ENTRY_IN)
      {
         // New position opened
         SendTradeOpen(dealTicket);
         BuildKnownPositions();
      }
      else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
      {
         // Position closed
         SendTradeClose(dealTicket);
         BuildKnownPositions();
      }

      // Mark deal as known
      AddKnownDeal((int)dealTicket);
   }
}

//+------------------------------------------------------------------+
//| MAGIC NUMBER FILTER PARSING                                      |
//+------------------------------------------------------------------+
void ParseMagicFilter()
{
   g_magicFilterCount = 0;
   if(StringLen(InpMagicNumbers) == 0) return;

   string parts[];
   int count = StringSplit(InpMagicNumbers, ',', parts);
   ArrayResize(g_magicFilter, count);

   for(int i = 0; i < count; i++)
   {
      string trimmed = parts[i];
      StringTrimLeft(trimmed);
      StringTrimRight(trimmed);
      if(StringLen(trimmed) > 0)
      {
         g_magicFilter[g_magicFilterCount++] = StringToInteger(trimmed);
      }
   }
   ArrayResize(g_magicFilter, g_magicFilterCount);
}

//+------------------------------------------------------------------+
//| Check if a deal passes our filters                               |
//+------------------------------------------------------------------+
bool PassesFilter(ulong dealTicket)
{
   // Symbol filter
   if(InpMonitorMode == MODE_SYMBOL_ONLY)
   {
      string dealSymbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      if(dealSymbol != _Symbol) return false;
   }

   long magic = (long)HistoryDealGetInteger(dealTicket, DEAL_MAGIC);

   // Exclude manual trades
   if(InpExcludeManual && magic == 0) return false;

   // Magic number filter
   if(g_magicFilterCount > 0)
   {
      bool found = false;
      for(int i = 0; i < g_magicFilterCount; i++)
      {
         if(g_magicFilter[i] == magic) { found = true; break; }
      }
      if(!found) return false;
   }

   // Comment filter
   if(StringLen(InpCommentFilter) > 0)
   {
      string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
      if(StringFind(comment, InpCommentFilter) < 0) return false;
   }

   return true;
}

//+------------------------------------------------------------------+
//| Check if a position passes our filters                           |
//+------------------------------------------------------------------+
bool PositionPassesFilter(ulong posTicket)
{
   if(!PositionSelectByTicket(posTicket)) return false;

   if(InpMonitorMode == MODE_SYMBOL_ONLY)
   {
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) return false;
   }

   long magic = (long)PositionGetInteger(POSITION_MAGIC);
   if(InpExcludeManual && magic == 0) return false;

   if(g_magicFilterCount > 0)
   {
      bool found = false;
      for(int i = 0; i < g_magicFilterCount; i++)
      {
         if(g_magicFilter[i] == magic) { found = true; break; }
      }
      if(!found) return false;
   }

   if(StringLen(InpCommentFilter) > 0)
   {
      string comment = PositionGetString(POSITION_COMMENT);
      if(StringFind(comment, InpCommentFilter) < 0) return false;
   }

   return true;
}

//+------------------------------------------------------------------+
//| BUILD KNOWN POSITIONS SNAPSHOT                                   |
//+------------------------------------------------------------------+
void BuildKnownPositions()
{
   g_knownPosCount = 0;
   int total = PositionsTotal();
   ArrayResize(g_knownPositions, total);

   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionPassesFilter(ticket)) continue;
      g_knownPositions[g_knownPosCount++] = (int)ticket;
   }
   ArrayResize(g_knownPositions, g_knownPosCount);
}

//+------------------------------------------------------------------+
//| BUILD KNOWN DEALS SNAPSHOT                                       |
//+------------------------------------------------------------------+
void BuildKnownDeals()
{
   HistorySelect(0, TimeCurrent());
   int total = HistoryDealsTotal();
   g_knownDealCount = 0;
   ArrayResize(g_knownDeals, total);

   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      g_knownDeals[g_knownDealCount++] = (int)ticket;
   }
   ArrayResize(g_knownDeals, g_knownDealCount);
}

void AddKnownDeal(int ticket)
{
   for(int i = 0; i < g_knownDealCount; i++)
      if(g_knownDeals[i] == ticket) return;

   g_knownDealCount++;
   ArrayResize(g_knownDeals, g_knownDealCount);
   g_knownDeals[g_knownDealCount - 1] = ticket;
}

//+------------------------------------------------------------------+
//| POLL FOR TRADE CHANGES (backup detection)                        |
//+------------------------------------------------------------------+
void PollTradeChanges()
{
   HistorySelect(0, TimeCurrent());
   int total = HistoryDealsTotal();

   for(int i = total - 1; i >= MathMax(0, total - 20); i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      // Already known?
      bool known = false;
      for(int j = 0; j < g_knownDealCount; j++)
      {
         if(g_knownDeals[j] == (int)ticket) { known = true; break; }
      }
      if(known) continue;

      // Check filters
      if(!PassesFilter(ticket)) continue;

      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);

      if(entry == DEAL_ENTRY_IN)
         SendTradeOpen(ticket);
      else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
         SendTradeClose(ticket);

      AddKnownDeal((int)ticket);
   }

   BuildKnownPositions();
}

//+------------------------------------------------------------------+
//| SHA-256 HASHING (via CryptEncode)                                |
//+------------------------------------------------------------------+
string SHA256(string input)
{
   uchar data[];
   uchar key[];
   uchar hash[];

   int len = StringToCharArray(input, data, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove null terminator added by StringToCharArray
   if(len > 0) ArrayResize(data, len - 1);

   if(!CryptEncode(CRYPT_HASH_SHA256, data, key, hash))
   {
      Print("AlgoStudio Monitor: SHA-256 failed");
      return "";
   }

   string result = "";
   for(int i = 0; i < ArraySize(hash); i++)
      result += StringFormat("%02x", hash[i]);
   return result;
}

//+------------------------------------------------------------------+
//| CANONICAL JSON HELPERS                                           |
//+------------------------------------------------------------------+
string JStr(string key, string val)
{
   StringReplace(val, "\\", "\\\\");
   StringReplace(val, "\"", "\\\"");
   return "\"" + key + "\":\"" + val + "\"";
}

string JPrice(string key, double val)
{
   return "\"" + key + "\":" + DoubleToString(val, 8);
}

string JMoney(string key, double val)
{
   return "\"" + key + "\":" + DoubleToString(val, 2);
}

string JInt(string key, int val)
{
   return "\"" + key + "\":" + IntegerToString(val);
}

string JLong(string key, long val)
{
   return "\"" + key + "\":" + IntegerToString(val);
}

//+------------------------------------------------------------------+
//| COMPUTE EVENT HASH (canonical JSON, sorted alphabetically)       |
//+------------------------------------------------------------------+
string ComputeEventHash(string eventType, int seqNo, string prevHash,
                        long timestamp, string &payloadPairs[])
{
   // Collect all pairs: core fields + payload
   string pairs[];
   int count = 0;
   int payloadCount = ArraySize(payloadPairs);

   ArrayResize(pairs, 5 + payloadCount);

   // Core fields
   if(StringLen(g_instanceId) > 0)
      pairs[count++] = JStr("eaInstanceId", g_instanceId);
   pairs[count++] = JStr("eventType", eventType);
   pairs[count++] = JStr("prevHash", prevHash);
   pairs[count++] = JInt("seqNo", seqNo);
   pairs[count++] = JLong("timestamp", timestamp);

   // Payload pairs
   for(int i = 0; i < payloadCount; i++)
   {
      if(StringLen(payloadPairs[i]) > 0)
      {
         if(count >= ArraySize(pairs))
            ArrayResize(pairs, count + 10);
         pairs[count++] = payloadPairs[i];
      }
   }
   ArrayResize(pairs, count);

   // Sort alphabetically (bubble sort — small array)
   for(int i = 0; i < count - 1; i++)
   {
      for(int j = 0; j < count - i - 1; j++)
      {
         if(StringCompare(pairs[j], pairs[j + 1]) > 0)
         {
            string tmp = pairs[j];
            pairs[j] = pairs[j + 1];
            pairs[j + 1] = tmp;
         }
      }
   }

   // Build canonical JSON
   string canonical = "{";
   for(int i = 0; i < count; i++)
   {
      if(i > 0) canonical += ",";
      canonical += pairs[i];
   }
   canonical += "}";

   return SHA256(canonical);
}

//+------------------------------------------------------------------+
//| BUILD & SEND TRACK RECORD EVENT                                  |
//+------------------------------------------------------------------+
bool SendTrackRecordEvent(string eventType, string payloadJson, string &payloadPairs[])
{
   int nextSeq = g_seqNo + 1;
   long ts = (long)TimeCurrent();

   string eventHash = ComputeEventHash(eventType, nextSeq, g_lastHash, ts, payloadPairs);
   if(StringLen(eventHash) == 0)
   {
      Print("AlgoStudio Monitor: Failed to compute event hash");
      return false;
   }

   string json = "{"
      + "\"eventType\":\"" + eventType + "\","
      + "\"seqNo\":" + IntegerToString(nextSeq) + ","
      + "\"prevHash\":\"" + g_lastHash + "\","
      + "\"eventHash\":\"" + eventHash + "\","
      + "\"timestamp\":" + IntegerToString(ts) + ","
      + "\"payload\":" + payloadJson
      + "}";

   bool sent = HttpPost("/api/track-record/ingest", json);

   if(sent)
   {
      g_seqNo = nextSeq;
      g_lastHash = eventHash;
      SaveState();
   }
   else
   {
      // Queue for later
      EnqueueEvent(json);
   }

   return sent;
}

//+------------------------------------------------------------------+
//| EVENT SENDERS                                                    |
//+------------------------------------------------------------------+
void SendSessionStart()
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   string broker = AccountInfoString(ACCOUNT_COMPANY);
   string account = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));

   ENUM_ACCOUNT_TRADE_MODE tradeMode = (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
   string mode = (tradeMode == ACCOUNT_TRADE_MODE_DEMO || tradeMode == ACCOUNT_TRADE_MODE_CONTEST)
                 ? "PAPER" : "LIVE";

   string symbol = (InpMonitorMode == MODE_SYMBOL_ONLY) ? _Symbol : "MULTI";
   string tf = EnumToString((ENUM_TIMEFRAMES)Period());

   string payloadPairs[];
   ArrayResize(payloadPairs, 7);
   payloadPairs[0] = JStr("account", account);
   payloadPairs[1] = JMoney("balance", bal);
   payloadPairs[2] = JStr("broker", broker);
   payloadPairs[3] = JStr("eaVersion", "Monitor-1.0");
   payloadPairs[4] = JStr("mode", mode);
   payloadPairs[5] = JStr("symbol", symbol);
   payloadPairs[6] = JStr("timeframe", tf);

   string payloadJson = "{"
      + JStr("account", account) + ","
      + JMoney("balance", bal) + ","
      + JStr("broker", broker) + ","
      + JStr("eaVersion", "Monitor-1.0") + ","
      + JStr("mode", mode) + ","
      + JStr("symbol", symbol) + ","
      + JStr("timeframe", tf)
      + "}";

   SendTrackRecordEvent("SESSION_START", payloadJson, payloadPairs);
}

void SendSessionEnd()
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq  = AccountInfoDouble(ACCOUNT_EQUITY);

   string payloadPairs[];
   ArrayResize(payloadPairs, 2);
   payloadPairs[0] = JMoney("balance", bal);
   payloadPairs[1] = JMoney("equity", eq);

   string payloadJson = "{"
      + JMoney("balance", bal) + ","
      + JMoney("equity", eq)
      + "}";

   SendTrackRecordEvent("SESSION_END", payloadJson, payloadPairs);
}

void SendSnapshot()
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd  = (bal > 0) ? ((bal - eq) / bal * 100.0) : 0;
   if(dd < 0) dd = 0;

   // Count filtered open positions
   int openCount = 0;
   double unrealizedPnL = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionPassesFilter(ticket)) continue;
      openCount++;
      unrealizedPnL += PositionGetDouble(POSITION_PROFIT)
                     + PositionGetDouble(POSITION_SWAP);
   }

   string payloadPairs[];
   ArrayResize(payloadPairs, 5);
   payloadPairs[0] = JMoney("balance", bal);
   payloadPairs[1] = JMoney("drawdown", dd);
   payloadPairs[2] = JMoney("equity", eq);
   payloadPairs[3] = JInt("openTrades", openCount);
   payloadPairs[4] = JMoney("unrealizedPnL", unrealizedPnL);

   string payloadJson = "{"
      + JMoney("balance", bal) + ","
      + JMoney("drawdown", dd) + ","
      + JMoney("equity", eq) + ","
      + JInt("openTrades", openCount) + ","
      + JMoney("unrealizedPnL", unrealizedPnL)
      + "}";

   SendTrackRecordEvent("SNAPSHOT", payloadJson, payloadPairs);
}

void SendTradeOpen(ulong dealTicket)
{
   if(!HistoryDealSelect(dealTicket)) return;

   string symbol   = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   double price    = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double lots     = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   long   dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   string ticket   = IntegerToString(dealTicket);

   string direction = (dealType == DEAL_TYPE_BUY) ? "BUY" : "SELL";

   // Try to get SL/TP from the position
   double sl = 0, tp = 0;
   long posId = (long)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   if(PositionSelectByTicket((ulong)posId))
   {
      sl = PositionGetDouble(POSITION_SL);
      tp = PositionGetDouble(POSITION_TP);
   }

   string payloadPairs[];
   ArrayResize(payloadPairs, 6);
   payloadPairs[0] = JStr("direction", direction);
   payloadPairs[1] = JMoney("lots", lots);
   payloadPairs[2] = JPrice("openPrice", price);
   payloadPairs[3] = JPrice("sl", sl);
   payloadPairs[4] = JStr("symbol", symbol);
   payloadPairs[5] = JStr("ticket", ticket);

   int pairIdx = 6;
   if(tp != 0)
   {
      ArrayResize(payloadPairs, pairIdx + 1);
      payloadPairs[pairIdx++] = JPrice("tp", tp);
   }
   else
   {
      ArrayResize(payloadPairs, pairIdx + 1);
      payloadPairs[pairIdx++] = JPrice("tp", 0);
   }

   string payloadJson = "{"
      + JStr("direction", direction) + ","
      + JMoney("lots", lots) + ","
      + JPrice("openPrice", price) + ","
      + JPrice("sl", sl) + ","
      + JStr("symbol", symbol) + ","
      + JStr("ticket", ticket) + ","
      + JPrice("tp", tp)
      + "}";

   SendTrackRecordEvent("TRADE_OPEN", payloadJson, payloadPairs);

   Print("AlgoStudio Monitor: TRADE_OPEN ", direction, " ", symbol,
         " ", DoubleToString(lots, 2), " lots @ ", DoubleToString(price, 5));
}

void SendTradeClose(ulong dealTicket)
{
   if(!HistoryDealSelect(dealTicket)) return;

   string ticket    = IntegerToString(dealTicket);
   double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double profit    = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   double swap      = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);

   // Determine close reason from comment
   string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
   string closeReason = "EA";
   if(StringFind(comment, "tp") >= 0 || StringFind(comment, "TP") >= 0)
      closeReason = "TP";
   else if(StringFind(comment, "sl") >= 0 || StringFind(comment, "SL") >= 0)
      closeReason = "SL";
   else if(StringFind(comment, "so") >= 0 || StringFind(comment, "SO") >= 0)
      closeReason = "SO"; // Stop-out

   // Find original open deal for the position ticket
   long posId = (long)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   string openTicket = IntegerToString(posId);

   string payloadPairs[];
   ArrayResize(payloadPairs, 6);
   payloadPairs[0] = JPrice("closePrice", closePrice);
   payloadPairs[1] = JStr("closeReason", closeReason);
   payloadPairs[2] = JMoney("commission", commission);
   payloadPairs[3] = JMoney("profit", profit);
   payloadPairs[4] = JMoney("swap", swap);
   payloadPairs[5] = JStr("ticket", openTicket);

   string payloadJson = "{"
      + JPrice("closePrice", closePrice) + ","
      + JStr("closeReason", closeReason) + ","
      + JMoney("commission", commission) + ","
      + JMoney("profit", profit) + ","
      + JMoney("swap", swap) + ","
      + JStr("ticket", openTicket)
      + "}";

   SendTrackRecordEvent("TRADE_CLOSE", payloadJson, payloadPairs);

   Print("AlgoStudio Monitor: TRADE_CLOSE ticket=", openTicket,
         " profit=", DoubleToString(profit, 2),
         " reason=", closeReason);
}

//+------------------------------------------------------------------+
//| HEARTBEAT (telemetry endpoint — separate from track record)      |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd  = (bal > 0) ? ((bal - eq) / bal * 100.0) : 0;
   if(dd < 0) dd = 0;

   int spread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);

   ENUM_ACCOUNT_TRADE_MODE tradeMode = (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
   string accMode = (tradeMode == ACCOUNT_TRADE_MODE_DEMO || tradeMode == ACCOUNT_TRADE_MODE_CONTEST)
                    ? "PAPER" : "LIVE";

   // Count filtered positions and history
   int myOpen = 0;
   double unrealizedPnL = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionPassesFilter(ticket)) continue;
      myOpen++;
      unrealizedPnL += PositionGetDouble(POSITION_PROFIT);
   }

   HistorySelect(0, TimeCurrent());
   int totalClosed = 0;
   double totalPL = 0;
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong dTicket = HistoryDealGetTicket(i);
      if(dTicket == 0) continue;
      if(!PassesFilter(dTicket)) continue;
      if(HistoryDealGetInteger(dTicket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      totalClosed++;
      totalPL += HistoryDealGetDouble(dTicket, DEAL_PROFIT);
   }

   string symbol = (InpMonitorMode == MODE_SYMBOL_ONLY) ? _Symbol : "";
   string tf = (InpMonitorMode == MODE_SYMBOL_ONLY) ? EnumToString((ENUM_TIMEFRAMES)Period()) : "";

   string json = "{"
      + JStr("mode", accMode) + ","
      + (StringLen(symbol) > 0 ? JStr("symbol", symbol) + "," : "")
      + (StringLen(tf) > 0 ? JStr("timeframe", tf) + "," : "")
      + JStr("broker", AccountInfoString(ACCOUNT_COMPANY)) + ","
      + JStr("accountNumber", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))) + ","
      + JMoney("balance", bal) + ","
      + JMoney("equity", eq) + ","
      + JInt("openTrades", myOpen) + ","
      + JInt("totalTrades", totalClosed) + ","
      + JMoney("totalProfit", totalPL) + ","
      + JMoney("drawdown", dd) + ","
      + JInt("spread", spread)
      + "}";

   HttpPost("/api/telemetry/heartbeat", json);
}

//+------------------------------------------------------------------+
//| HTTP POST with retry + exponential backoff                       |
//+------------------------------------------------------------------+
bool HttpPost(string endpoint, string jsonBody)
{
   string url = InpBaseUrl + endpoint;
   string headers = "Content-Type: application/json\r\nX-EA-Key: " + InpApiKey;

   uchar postData[];
   uchar resultData[];
   string resultHeaders;

   int len = StringToCharArray(jsonBody, postData, 0, WHOLE_ARRAY, CP_UTF8);
   if(len > 0) ArrayResize(postData, len - 1);  // Remove null terminator

   int maxRetries = 3;
   int baseDelayMs = 1000;

   for(int attempt = 0; attempt <= maxRetries; attempt++)
   {
      if(attempt > 0)
      {
         int delayMs = baseDelayMs * (1 << (attempt - 1));
         int jitterMs = MathRand() % 500;
         Sleep(delayMs + jitterMs);
      }

      ResetLastError();
      int res = WebRequest("POST", url, headers, 10000, postData, resultData, resultHeaders);

      if(res == -1)
      {
         int err = GetLastError();
         if(err == 4014)
         {
            Print("AlgoStudio Monitor: Add ", InpBaseUrl, " to Tools > Options > Expert Advisors > Allow WebRequest");
            return false;  // Config error — don't retry
         }
         if(attempt < maxRetries) continue;
         return false;
      }

      // 429 or 5xx — retry
      if(res == 429 || res >= 500)
      {
         if(attempt < maxRetries) continue;
         return false;
      }

      // Parse instanceId from response if we don't have one
      if(StringLen(g_instanceId) == 0)
      {
         string response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
         ParseInstanceId(response);
      }

      return (res >= 200 && res < 300);
   }

   return false;
}

//+------------------------------------------------------------------+
//| Parse instanceId from JSON response                              |
//+------------------------------------------------------------------+
void ParseInstanceId(string response)
{
   int pos = StringFind(response, "\"instanceId\":\"");
   if(pos < 0) return;

   int valStart = pos + 14;
   int valEnd = StringFind(response, "\"", valStart);
   if(valEnd > valStart)
   {
      g_instanceId = StringSubstr(response, valStart, valEnd - valStart);
      SaveState();
   }
}

//+------------------------------------------------------------------+
//| SYNC CHAIN STATE FROM SERVER                                     |
//+------------------------------------------------------------------+
void SyncChainState()
{
   if(StringLen(g_instanceId) == 0) return;

   string url = InpBaseUrl + "/api/track-record/state/" + g_instanceId;
   string headers = "X-EA-Key: " + InpApiKey;

   uchar postData[];  // empty for GET
   uchar resultData[];
   string resultHeaders;

   ResetLastError();
   int res = WebRequest("GET", url, headers, 10000, postData, resultData, resultHeaders);

   if(res < 200 || res >= 300) return;

   string response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);

   // Parse lastSeqNo
   int seqPos = StringFind(response, "\"lastSeqNo\":");
   if(seqPos >= 0)
   {
      int valStart = seqPos + 12;
      // Find end of number
      int valEnd = valStart;
      while(valEnd < StringLen(response))
      {
         ushort ch = StringGetCharacter(response, valEnd);
         if(ch < '0' || ch > '9') break;
         valEnd++;
      }
      if(valEnd > valStart)
      {
         int serverSeq = (int)StringToInteger(StringSubstr(response, valStart, valEnd - valStart));
         if(serverSeq > g_seqNo)
         {
            Print("AlgoStudio Monitor: Server ahead (seq=", serverSeq, " vs local=", g_seqNo, "). Syncing.");
            g_seqNo = serverSeq;
         }
      }
   }

   // Parse lastEventHash
   int hashPos = StringFind(response, "\"lastEventHash\":\"");
   if(hashPos >= 0)
   {
      int valStart = hashPos + 17;
      int valEnd = StringFind(response, "\"", valStart);
      if(valEnd > valStart)
      {
         string serverHash = StringSubstr(response, valStart, valEnd - valStart);
         if(StringLen(serverHash) == 64)
         {
            g_lastHash = serverHash;
         }
      }
   }

   SaveState();
   Print("AlgoStudio Monitor: Chain synced. seqNo=", g_seqNo, " hash=", StringSubstr(g_lastHash, 0, 16), "...");
}

//+------------------------------------------------------------------+
//| OFFLINE QUEUE — store events when network fails                  |
//+------------------------------------------------------------------+
void EnqueueEvent(string json)
{
   if(g_queueCount >= MAX_QUEUE_SIZE)
   {
      Print("AlgoStudio Monitor: Offline queue full (", MAX_QUEUE_SIZE, "). Dropping oldest event.");
      // Shift array left
      for(int i = 0; i < g_queueCount - 1; i++)
         g_offlineQueue[i] = g_offlineQueue[i + 1];
      g_queueCount--;
   }

   ArrayResize(g_offlineQueue, g_queueCount + 1);
   g_offlineQueue[g_queueCount] = json;
   g_queueCount++;

   // Persist queue to file
   SaveOfflineQueue();
}

void FlushOfflineQueue()
{
   if(g_queueCount == 0) return;

   int sent = 0;
   for(int i = 0; i < g_queueCount; i++)
   {
      bool ok = HttpPost("/api/track-record/ingest", g_offlineQueue[i]);
      if(!ok) break;  // Stop on first failure
      sent++;
   }

   if(sent > 0)
   {
      Print("AlgoStudio Monitor: Flushed ", sent, "/", g_queueCount, " queued events.");
      // Remove sent events
      for(int i = sent; i < g_queueCount; i++)
         g_offlineQueue[i - sent] = g_offlineQueue[i];
      g_queueCount -= sent;
      ArrayResize(g_offlineQueue, g_queueCount);
      SaveOfflineQueue();
   }
}

void SaveOfflineQueue()
{
   string queueFile = STATE_FILE_PREFIX + StringSubstr(InpApiKey, 0, 8) + "_queue.dat";
   int handle = FileOpen(queueFile, FILE_WRITE | FILE_TXT | FILE_COMMON);
   if(handle == INVALID_HANDLE) return;

   FileWriteString(handle, IntegerToString(g_queueCount) + "\n");
   for(int i = 0; i < g_queueCount; i++)
   {
      // Base64-like encoding: replace newlines in JSON (shouldn't be any, but safety)
      string line = g_offlineQueue[i];
      StringReplace(line, "\n", "\\n");
      StringReplace(line, "\r", "\\r");
      FileWriteString(handle, line + "\n");
   }
   FileClose(handle);
}

void LoadOfflineQueue()
{
   string queueFile = STATE_FILE_PREFIX + StringSubstr(InpApiKey, 0, 8) + "_queue.dat";
   if(!FileIsExist(queueFile, FILE_COMMON)) return;

   int handle = FileOpen(queueFile, FILE_READ | FILE_TXT | FILE_COMMON);
   if(handle == INVALID_HANDLE) return;

   string countStr = FileReadString(handle);
   g_queueCount = (int)StringToInteger(countStr);
   if(g_queueCount < 0) g_queueCount = 0;
   if(g_queueCount > MAX_QUEUE_SIZE) g_queueCount = MAX_QUEUE_SIZE;
   ArrayResize(g_offlineQueue, g_queueCount);

   for(int i = 0; i < g_queueCount && !FileIsEnding(handle); i++)
   {
      string line = FileReadString(handle);
      StringReplace(line, "\\n", "\n");
      StringReplace(line, "\\r", "\r");
      g_offlineQueue[i] = line;
   }

   FileClose(handle);

   if(g_queueCount > 0)
      Print("AlgoStudio Monitor: Loaded ", g_queueCount, " queued events from disk.");
}

//+------------------------------------------------------------------+
//| PERSISTENT STATE — GlobalVariables + file backup                 |
//+------------------------------------------------------------------+
void SaveState()
{
   // GlobalVariables (fast, survives EA restart within same terminal session)
   string prefix = "ASM_" + StringSubstr(InpApiKey, 0, 8) + "_";
   GlobalVariableSet(prefix + "seqNo", (double)g_seqNo);
   // Hash stored in file (too long for GV)

   // File backup (survives terminal restart)
   int handle = FileOpen(g_stateFile, FILE_WRITE | FILE_TXT | FILE_COMMON);
   if(handle == INVALID_HANDLE) return;

   FileWriteString(handle, IntegerToString(g_seqNo) + "\n");
   FileWriteString(handle, g_lastHash + "\n");
   FileWriteString(handle, g_instanceId + "\n");

   FileClose(handle);
}

void LoadState()
{
   string prefix = "ASM_" + StringSubstr(InpApiKey, 0, 8) + "_";

   // Try GlobalVariables first (faster, more current)
   if(GlobalVariableCheck(prefix + "seqNo"))
   {
      g_seqNo = (int)GlobalVariableGet(prefix + "seqNo");
   }

   // Load full state from file (needed for hash + instanceId)
   if(FileIsExist(g_stateFile, FILE_COMMON))
   {
      int handle = FileOpen(g_stateFile, FILE_READ | FILE_TXT | FILE_COMMON);
      if(handle != INVALID_HANDLE)
      {
         if(!FileIsEnding(handle))
         {
            int fileSeqNo = (int)StringToInteger(FileReadString(handle));
            // Use the higher of GV and file seqNo
            if(fileSeqNo > g_seqNo) g_seqNo = fileSeqNo;
         }
         if(!FileIsEnding(handle))
         {
            string hash = FileReadString(handle);
            if(StringLen(hash) == 64)
               g_lastHash = hash;
         }
         if(!FileIsEnding(handle))
         {
            string instId = FileReadString(handle);
            if(StringLen(instId) > 0)
               g_instanceId = instId;
         }
         FileClose(handle);

         Print("AlgoStudio Monitor: Restored state. seqNo=", g_seqNo,
               " instanceId=", StringLen(g_instanceId) > 0 ? g_instanceId : "(pending)");
      }
   }

   // Load offline queue
   LoadOfflineQueue();
}

//+------------------------------------------------------------------+
//| TICK FUNCTION (not used for trading, just keeps EA alive)        |
//+------------------------------------------------------------------+
void OnTick()
{
   // No-op — all logic is timer-based and event-based
}
//+------------------------------------------------------------------+
