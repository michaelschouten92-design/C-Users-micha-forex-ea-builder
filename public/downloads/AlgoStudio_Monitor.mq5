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
//| ENUMS                                                            |
//+------------------------------------------------------------------+
enum ENUM_MONITOR_MODE
{
   MODE_SYMBOL_ONLY  = 0,  // Current Symbol Only
   MODE_ACCOUNT_WIDE = 1   // Account Wide (all symbols)
};

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
input bool   InpExcludeManual = false;           // Exclude manual trades (magic=0);

// Deployment identity (optional — enables deployment discovery)
input string InpTrackedEaName = "";              // Name of the EA being monitored (optional)

// On-chart panel
input bool   InpShowPanel     = true;             // Show monitor panel on chart
input ENUM_BASE_CORNER InpPanelCorner = CORNER_RIGHT_UPPER; // Panel corner
input int    InpPanelX        = 16;               // Panel X offset (pixels)
input int    InpPanelY        = 28;               // Panel Y offset (pixels)

//+------------------------------------------------------------------+
//| CONSTANTS                                                        |
//+------------------------------------------------------------------+
#define GENESIS_HASH "0000000000000000000000000000000000000000000000000000000000000000"
#define MAX_QUEUE_SIZE 500
#define POISON_DROP_THRESHOLD 3
#define MAX_DISCOVERED_DEPLOYMENTS 50
#define STATE_FILE_PREFIX "AlgoStudio_Monitor_"
#define LOCK_GV_PREFIX "AS_MONITOR_LOCK_"
#define MONITOR_VERSION "1.0.0"
#define PANEL_PREFIX "AS_Panel_"
#define PANEL_FONT "Consolas"
#define PANEL_FONT_MONO "Consolas"

// Overlay layout constants
#define OVL_TITLE_FONT_SIZE   16
#define OVL_SUBTITLE_FONT_SIZE 10
#define OVL_LABEL_FONT_SIZE    9
#define OVL_VALUE_FONT_SIZE    9
#define OVL_SMALL_FONT_SIZE    8
#define OVL_ROW_HEIGHT        22
#define OVL_SECTION_GAP        8
#define OVL_LEFT_MARGIN       40
#define OVL_VALUE_X          160
#define OVL_BG_COLOR       C'14,14,20'
#define OVL_BORDER_COLOR   C'35,35,50'
#define OVL_TITLE_COLOR    C'120,120,170'
#define OVL_SUBTITLE_COLOR C'85,85,110'
#define OVL_LABEL_COLOR    C'80,80,105'
#define OVL_VALUE_COLOR    C'190,190,210'
#define OVL_DIM_COLOR      C'55,55,70'
#define OVL_GREEN          C'16,185,129'
#define OVL_YELLOW         C'245,158,11'
#define OVL_RED            C'239,68,68'

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
ulong  g_knownDeals[];       // History deal tickets we've already reported
int    g_knownDealCount = 0;
int    g_knownPositions[];   // Position tickets currently open
int    g_knownPosCount  = 0;

// Magic number filter
long   g_magicFilter[];
int    g_magicFilterCount = 0;

// Offline queue
string g_offlineQueue[];
int    g_queueRetryCount[];  // parallel array: permanent-failure retry count per queued event
int    g_queueCount = 0;

// State
bool   g_initialized = false;
bool   g_sessionStartSent = false;
bool   g_chainDegraded = false;    // True after event drop — chain stalled until resync
int    g_droppedEvents = 0;        // Cumulative dropped events (persisted across restarts)
string g_stateFile   = "";
string g_lockGV      = "";
bool   g_processingTrade = false;

// Panel / overlay state
datetime g_lastSuccessfulHb = 0;
string   g_panelError       = "";
bool     g_chartColorsSaved = false;
color    g_savedBg, g_savedFg, g_savedGrid, g_savedBullCandle, g_savedBearCandle;
color    g_savedChartUp, g_savedChartDown, g_savedVolumes, g_savedBullBody, g_savedBearBody;
bool     g_savedShowGrid    = true;

// Governance state (from heartbeat response — NOT persisted across restarts)
string   g_govAction     = "RUN";    // RUN | PAUSE | STOP
string   g_govReason     = "";       // reasonCode from backend
datetime g_govReceivedAt = 0;        // When last governance action was received

// Deployment discovery state (session-bound, evaluated once in OnInit)
bool     g_deploymentAware  = false;
string   g_deploySymbol     = "";
string   g_deployTimeframe  = "";
long     g_deployMagic      = 0;
string   g_deployEaName     = "";
string   g_deployFingerprint = "";  // SHA-256 of material config fields

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

   // Evaluate deployment discovery eligibility (session-bound — never re-evaluated)
   EvaluateDeploymentEligibility();

   if(InpMonitorMode != MODE_SYMBOL_ONLY)
      Print("AlgoStudio Monitor: Account-wide monitoring mode active — automatic deployment discovery enabled, baseline monitoring requires linking");

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
      // Restored an active chain — SESSION_START was already sent in a prior session.
      // Mark it so the guard in SendTrackRecordEvent doesn't block events.
      g_sessionStartSent = true;
   }

   // SESSION_START is deferred until after first heartbeat populates g_instanceId
   // (see SendHeartbeat — sends SESSION_START once g_instanceId is known)

   // Create on-chart panel
   if(InpShowPanel)
      PanelCreate();

   Print("AlgoStudio Monitor: Initialized. Mode=",
         InpMonitorMode == MODE_ACCOUNT_WIDE ? "Account-Wide" : "Symbol-Only",
         " Heartbeat=", InpHeartbeatSec, "s Snapshot=", InpSnapshotSec, "s",
         " Deployment=", g_deploymentAware ? "enabled" : "disabled");

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(!g_initialized) return;

   // Destroy panel
   PanelDestroy();

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

   // Heartbeat — always runs regardless of governance action
   // Runs before trade polling so that g_instanceId is populated (and
   // deferred SESSION_START sent) before any TRADE_OPEN/CLOSE events.
   if(now - g_lastHeartbeat >= InpHeartbeatSec)
   {
      SendHeartbeat();
      g_lastHeartbeat = now;
   }

   // Flush offline queue after heartbeat (instanceId may now be known)
   if(g_queueCount > 0)
      FlushOfflineQueue();

   // Poll for new trades (backup detection in case OnTradeTransaction missed something)
   PollTradeChanges();

   // Governance gate: PAUSE/STOP → skip trade polling and snapshots
   if(g_govAction != "RUN")
   {
      if(InpShowPanel)
         PanelUpdate();
      return;
   }

   // Snapshot for track record
   if(now - g_lastSnapshot >= InpSnapshotSec)
   {
      SendSnapshot();
      g_lastSnapshot = now;
   }

   // Update on-chart panel
   if(InpShowPanel)
      PanelUpdate();

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
   if(g_govAction != "RUN") return;  // Governance gate: no trade events when paused/stopped
   g_processingTrade = true;

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
      else if(entry == DEAL_ENTRY_INOUT)
      {
         // Partial fill via close-and-reopen (netting mode or partial close)
         SendTradeClose(dealTicket);
         BuildKnownPositions();
      }

      // Mark deal as known
      AddKnownDeal(dealTicket);
   }

   g_processingTrade = false;
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
//| Evaluate deployment discovery eligibility (session-bound)        |
//| All preconditions must be met. If any fails, deployment          |
//| discovery is disabled for the entire session (no re-evaluation). |
//+------------------------------------------------------------------+
void EvaluateDeploymentEligibility()
{
   g_deploymentAware = false;

   // 1. Must be SYMBOL_ONLY mode
   if(InpMonitorMode != MODE_SYMBOL_ONLY)
   {
      Print("AlgoStudio Monitor: Deployment discovery disabled (ACCOUNT_WIDE mode — use SYMBOL_ONLY with a single magic number for strategy monitoring)");
      return;
   }

   // 2. Must have exactly one magic number > 0
   if(g_magicFilterCount != 1)
   {
      Print("AlgoStudio Monitor: Deployment discovery disabled (requires exactly one magic number, got ",
            g_magicFilterCount, ")");
      return;
   }
   if(g_magicFilter[0] <= 0)
   {
      Print("AlgoStudio Monitor: Deployment discovery disabled (magic number must be > 0)");
      return;
   }

   // 3. Must have tracked EA name
   if(StringLen(InpTrackedEaName) == 0)
   {
      Print("AlgoStudio Monitor: Deployment discovery disabled (InpTrackedEaName is empty)");
      return;
   }

   // 4. Symbol must be non-empty (guaranteed in SYMBOL_ONLY, but defensive)
   if(StringLen(_Symbol) == 0)
   {
      Print("AlgoStudio Monitor: Deployment discovery disabled (empty symbol)");
      return;
   }

   // All preconditions met — store session-bound deployment identity
   g_deploymentAware = true;
   g_deploySymbol    = _Symbol;
   g_deployTimeframe = EnumToString((ENUM_TIMEFRAMES)Period());
   g_deployMagic     = g_magicFilter[0];
   g_deployEaName    = InpTrackedEaName;

   // Compute material fingerprint — canonical shape:
   // SYMBOL_UPPER:TIMEFRAME_UPPER:MAGIC:EA_NAME:COMMENT_FILTER:EXCLUDE_MANUAL
   string canonical = StringFormat("%s:%s:%d:%s:%s:%s",
      g_deploySymbol,
      g_deployTimeframe,
      g_deployMagic,
      g_deployEaName,
      InpCommentFilter,
      InpExcludeManual ? "true" : "false");
   g_deployFingerprint = SHA256(canonical);

   Print("AlgoStudio Monitor: Deployment discovery enabled. ",
         g_deploySymbol, ":", g_deployTimeframe, ":", IntegerToString(g_deployMagic),
         ":", g_deployEaName,
         " fingerprint=", StringSubstr(g_deployFingerprint, 0, 16), "...");
}

//+------------------------------------------------------------------+
//| Discover deployment candidates from account-wide trade activity  |
//| Groups closed deals by symbol+magicNumber where magic > 0.       |
//| Returns JSON fragment: ,"discoveredDeployments":[...],"unattrib.."|
//| Returns empty string if not in ACCOUNT_WIDE mode or no activity. |
//+------------------------------------------------------------------+
string DiscoverDeploymentsFromActivity()
{
   if(InpMonitorMode != MODE_ACCOUNT_WIDE) return "";

   HistorySelect(0, TimeCurrent());
   int total = HistoryDealsTotal();

   // Parallel arrays for grouping (MQL5 has no hash maps)
   string  disc_symbols[];
   long    disc_magics[];
   string  disc_eaHints[];
   int     disc_counts[];
   int     discoveredCount = 0;
   int     unattributed = 0;

   ArrayResize(disc_symbols, MAX_DISCOVERED_DEPLOYMENTS);
   ArrayResize(disc_magics,  MAX_DISCOVERED_DEPLOYMENTS);
   ArrayResize(disc_eaHints, MAX_DISCOVERED_DEPLOYMENTS);
   ArrayResize(disc_counts,  MAX_DISCOVERED_DEPLOYMENTS);

   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      // Only count completed trades (DEAL_ENTRY_OUT)
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      // Skip balance/credit operations
      ENUM_DEAL_TYPE dtype = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(dtype == DEAL_TYPE_BALANCE || dtype == DEAL_TYPE_CREDIT ||
         dtype == DEAL_TYPE_CHARGE  || dtype == DEAL_TYPE_CORRECTION ||
         dtype == DEAL_TYPE_BONUS)
         continue;

      long   magic = (long)HistoryDealGetInteger(ticket, DEAL_MAGIC);
      string sym   = HistoryDealGetString(ticket, DEAL_SYMBOL);

      if(StringLen(sym) == 0) continue;

      // magic == 0 → unattributed (manual or no EA identity)
      if(magic == 0)
      {
         unattributed++;
         continue;
      }

      // Find existing group
      int idx = -1;
      for(int j = 0; j < discoveredCount; j++)
      {
         if(disc_symbols[j] == sym && disc_magics[j] == magic)
         {
            idx = j;
            break;
         }
      }

      if(idx >= 0)
      {
         disc_counts[idx]++;
      }
      else if(discoveredCount < MAX_DISCOVERED_DEPLOYMENTS)
      {
         disc_symbols[discoveredCount] = sym;
         disc_magics[discoveredCount]  = magic;
         disc_counts[discoveredCount]  = 1;
         // Use deal comment as EA name hint (first non-empty wins)
         string comment = HistoryDealGetString(ticket, DEAL_COMMENT);
         // Strip broker suffixes like "[sl]", "[tp]", position ticket refs
         if(StringFind(comment, "[") >= 0 || StringFind(comment, "#") >= 0)
            comment = "";
         disc_eaHints[discoveredCount] = comment;
         discoveredCount++;
      }
   }

   // Scan open positions — catches strategies before their first closed deal
   for(int p = PositionsTotal() - 1; p >= 0; p--)
   {
      ulong posTicket = PositionGetTicket(p);
      if(posTicket == 0) continue;
      if(!PositionSelectByTicket(posTicket)) continue;

      string sym   = PositionGetString(POSITION_SYMBOL);
      long   magic = (long)PositionGetInteger(POSITION_MAGIC);

      if(StringLen(sym) == 0) continue;

      if(magic == 0)
      {
         unattributed++;
         continue;
      }

      // Find existing group or create new
      int idx = -1;
      for(int j = 0; j < discoveredCount; j++)
      {
         if(disc_symbols[j] == sym && disc_magics[j] == magic)
         {
            idx = j;
            break;
         }
      }

      if(idx >= 0)
      {
         disc_counts[idx]++;
      }
      else if(discoveredCount < MAX_DISCOVERED_DEPLOYMENTS)
      {
         disc_symbols[discoveredCount] = sym;
         disc_magics[discoveredCount]  = magic;
         disc_counts[discoveredCount]  = 1;
         string comment = PositionGetString(POSITION_COMMENT);
         if(StringFind(comment, "[") >= 0 || StringFind(comment, "#") >= 0)
            comment = "";
         disc_eaHints[discoveredCount] = comment;
         discoveredCount++;
      }
   }

   if(discoveredCount == 0 && unattributed == 0) return "";

   // Build JSON fragment
   string json = ",\"discoveredDeployments\":[";
   for(int i = 0; i < discoveredCount; i++)
   {
      if(i > 0) json += ",";
      json += "{"
         + JStr("symbol", disc_symbols[i]) + ","
         + JInt("magicNumber", (int)disc_magics[i]) + ","
         + JStr("eaHint", disc_eaHints[i]) + ","
         + JInt("tradeCount", disc_counts[i])
         + "}";
   }
   json += "]";
   json += ",\"unattributedTradeCount\":" + IntegerToString(unattributed);

   return json;
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
      g_knownDeals[g_knownDealCount++] = ticket;
   }
   ArrayResize(g_knownDeals, g_knownDealCount);
}

void AddKnownDeal(ulong ticket)
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
   if(g_processingTrade) return; // Skip if OnTradeTransaction is active
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
         if(g_knownDeals[j] == ticket) { known = true; break; }
      }
      if(known) continue;

      // Check filters
      if(!PassesFilter(ticket)) continue;

      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);

      if(entry == DEAL_ENTRY_IN)
         SendTradeOpen(ticket);
      else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
         SendTradeClose(ticket);

      AddKnownDeal(ticket);
   }

   BuildKnownPositions();
}

//+------------------------------------------------------------------+
//| SHA-256 HASHING (via CryptEncode)                                |
//+------------------------------------------------------------------+
string SHA256(string text)
{
   uchar data[];
   uchar key[];
   uchar hash[];

   int len = StringToCharArray(text, data, 0, WHOLE_ARRAY, CP_UTF8);
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
   // Block all non-SESSION_START events until SESSION_START has been sent.
   // This prevents chain corruption if a trade fires before g_instanceId is known.
   if(!g_sessionStartSent && eventType != "SESSION_START")
   {
      Print("AlgoStudio Monitor: Skipping ", eventType, " — SESSION_START not yet sent");
      return false;
   }

   int nextSeq = g_seqNo + 1;
   long ts = (long)TimeGMT();

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

   // Advance chain state regardless of send outcome.
   // Enqueue = local commit: queued events are part of the local chain,
   // so subsequent events chain correctly off them.
   g_seqNo = nextSeq;
   g_lastHash = eventHash;

   if(sent)
   {
      SaveState();
   }
   else
   {
      // Queue for later — state already advanced
      EnqueueEvent(json);
      SaveState();
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
   string accountMode = (ENUM_ACCOUNT_MARGIN_MODE)AccountInfoInteger(ACCOUNT_MARGIN_MODE) == ACCOUNT_MARGIN_MODE_RETAIL_HEDGING ? "HEDGING" : "NETTING";

   string payloadPairs[];
   ArrayResize(payloadPairs, 8);
   payloadPairs[0] = JStr("account", account);
   payloadPairs[1] = JStr("accountMode", accountMode);
   payloadPairs[2] = JMoney("balance", bal);
   payloadPairs[3] = JStr("broker", broker);
   payloadPairs[4] = JStr("eaVersion", "Monitor-1.0");
   payloadPairs[5] = JStr("mode", mode);
   payloadPairs[6] = JStr("symbol", symbol);
   payloadPairs[7] = JStr("timeframe", tf);

   string payloadJson = "{"
      + JStr("account", account) + ","
      + JStr("accountMode", accountMode) + ","
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
   if(!g_sessionStartSent) return;  // No SESSION_START sent, skip SESSION_END

   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq  = AccountInfoDouble(ACCOUNT_EQUITY);
   int uptime = (int)(TimeCurrent() - g_sessionStart);
   if(uptime < 0) uptime = 0;

   string payloadPairs[];
   ArrayResize(payloadPairs, 4);
   payloadPairs[0] = JMoney("finalBalance", bal);
   payloadPairs[1] = JMoney("finalEquity", eq);
   payloadPairs[2] = JStr("reason", "DEINIT");
   payloadPairs[3] = JInt("uptimeSeconds", uptime);

   string payloadJson = "{"
      + JMoney("finalBalance", bal) + ","
      + JMoney("finalEquity", eq) + ","
      + JStr("reason", "DEINIT") + ","
      + JInt("uptimeSeconds", uptime)
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
   long   magic    = (long)HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
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
   ArrayResize(payloadPairs, 7);
   payloadPairs[0] = JStr("direction", direction);
   payloadPairs[1] = JMoney("lots", lots);
   payloadPairs[2] = JInt("magicNumber", (int)magic);
   payloadPairs[3] = JPrice("openPrice", price);
   payloadPairs[4] = JPrice("sl", sl);
   payloadPairs[5] = JStr("symbol", symbol);
   payloadPairs[6] = JStr("ticket", ticket);

   int pairIdx = 7;
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
      + JInt("magicNumber", (int)magic) + ","
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
   long   magic     = (long)HistoryDealGetInteger(dealTicket, DEAL_MAGIC);

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
   ArrayResize(payloadPairs, 7);
   payloadPairs[0] = JPrice("closePrice", closePrice);
   payloadPairs[1] = JStr("closeReason", closeReason);
   payloadPairs[2] = JMoney("commission", commission);
   payloadPairs[3] = JInt("magicNumber", (int)magic);
   payloadPairs[4] = JMoney("profit", profit);
   payloadPairs[5] = JMoney("swap", swap);
   payloadPairs[6] = JStr("ticket", openTicket);

   string payloadJson = "{"
      + JPrice("closePrice", closePrice) + ","
      + JStr("closeReason", closeReason) + ","
      + JMoney("commission", commission) + ","
      + JInt("magicNumber", (int)magic) + ","
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

   // Build optional deployment object (only when deployment-aware — SYMBOL_ONLY mode)
   string deployJson = "";
   if(g_deploymentAware)
   {
      deployJson = ",\"deployment\":{"
         + JStr("symbol", g_deploySymbol) + ","
         + JStr("timeframe", g_deployTimeframe) + ","
         + JInt("magicNumber", (int)g_deployMagic) + ","
         + JStr("eaName", g_deployEaName) + ","
         + JStr("materialFingerprint", g_deployFingerprint)
         + "}";
   }

   // Automatic deployment discovery (ACCOUNT_WIDE mode only)
   string discoveryJson = DiscoverDeploymentsFromActivity();

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
      + (g_droppedEvents > 0 ? "," + JInt("droppedEvents", g_droppedEvents) : "")
      + (g_chainDegraded ? ",\"chainStalled\":true" : "")
      + deployJson
      + discoveryJson
      + "}";

   if(HttpPost("/api/telemetry/heartbeat", json))
   {
      g_lastSuccessfulHb = TimeCurrent();
      g_panelError = "";

      // Deferred SESSION_START: send once after first successful heartbeat
      // populates g_instanceId (needed for correct canonical hash computation)
      if(!g_sessionStartSent && StringLen(g_instanceId) > 0)
      {
         SendSessionStart();
         g_sessionStartSent = true;
      }
   }
}

//+------------------------------------------------------------------+
//| HTTP POST with retry + exponential backoff                       |
//| Returns HTTP status code (200-599), or -1 for network failure.   |
//| Callers decide how to interpret the status.                      |
//+------------------------------------------------------------------+
int HttpPostEx(string endpoint, string jsonBody)
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
      int res = WebRequest("POST", url, headers, 3000, postData, resultData, resultHeaders);

      if(res == -1)
      {
         int err = GetLastError();
         if(err == 4014)
         {
            g_panelError = "WebRequest not allowed — check Options";
            Print("AlgoStudio Monitor: Add ", InpBaseUrl, " to Tools > Options > Expert Advisors > Allow WebRequest");
            return -1;  // Config error — don't retry
         }
         if(attempt < maxRetries) continue;
         g_panelError = "Network error (" + IntegerToString(err) + ")";
         return -1;
      }

      // 429 or 5xx — retry
      if(res == 429 || res >= 500)
      {
         if(attempt < maxRetries) continue;
         g_panelError = "HTTP " + IntegerToString(res);
         return res;
      }

      // Always parse response for governance fields + instanceId
      string response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);

      if(StringLen(g_instanceId) == 0)
         ParseInstanceId(response);

      // Parse governance action from heartbeat responses
      if(StringFind(endpoint, "/heartbeat") >= 0)
         ParseGovernanceAction(response);

      return res;
   }

   return -1;
}

//+------------------------------------------------------------------+
//| HttpPost — convenience wrapper returning bool (success = 2xx)    |
//+------------------------------------------------------------------+
bool HttpPost(string endpoint, string jsonBody)
{
   int status = HttpPostEx(endpoint, jsonBody);
   return (status >= 200 && status < 300);
}

//+------------------------------------------------------------------+
//| Parse instanceId from JSON response                              |
//+------------------------------------------------------------------+
void ParseInstanceId(string response)
{
   string id = ParseJsonString(response, "instanceId");
   if(StringLen(id) > 0)
   {
      g_instanceId = id;
      SaveState();
   }
}

//+------------------------------------------------------------------+
//| Parse governance action + reasonCode from heartbeat response     |
//| Scans for "action":"..." and "reasonCode":"..." independently.   |
//| If action is missing or unrecognized, defaults to RUN.           |
//+------------------------------------------------------------------+
void ParseGovernanceAction(string response)
{
   // Parse action
   string action = ParseJsonString(response, "action");
   if(action == "RUN" || action == "PAUSE" || action == "STOP")
   {
      if(action != g_govAction)
      {
         Print("AlgoStudio Monitor: Governance action changed: ", g_govAction, " -> ", action);
         g_govReason = "";  // Clear stale reason on action change
      }
      g_govAction = action;
      g_govReceivedAt = TimeCurrent();
   }
   else if(StringLen(action) == 0)
   {
      // No action field — defensive default to RUN
      g_govAction = "RUN";
      g_govReason = "";
   }
   // else: unrecognized value — keep previous action (fail-safe)

   // Parse reasonCode (informational)
   string reason = ParseJsonString(response, "reasonCode");
   if(StringLen(reason) > 0)
      g_govReason = reason;
}

//+------------------------------------------------------------------+
//| Extract a string value from JSON by key name.                    |
//| Looks for "key":"value" pattern. Returns "" if not found.        |
//| Independent of key order — scans full response string.           |
//+------------------------------------------------------------------+
string ParseJsonString(string json, string key)
{
   string needle = "\"" + key + "\":\"";
   int pos = StringFind(json, needle);
   if(pos < 0) return "";

   int valStart = pos + StringLen(needle);
   int valEnd = StringFind(json, "\"", valStart);
   if(valEnd <= valStart) return "";

   return StringSubstr(json, valStart, valEnd - valStart);
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
   int res = WebRequest("GET", url, headers, 3000, postData, resultData, resultHeaders);

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

   g_chainDegraded = false;
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
      g_droppedEvents++;
      g_chainDegraded = true;
      // Shift array left
      for(int i = 0; i < g_queueCount - 1; i++)
      {
         g_offlineQueue[i] = g_offlineQueue[i + 1];
         g_queueRetryCount[i] = g_queueRetryCount[i + 1];
      }
      g_queueCount--;
   }

   ArrayResize(g_offlineQueue, g_queueCount + 1);
   ArrayResize(g_queueRetryCount, g_queueCount + 1);
   g_offlineQueue[g_queueCount] = json;
   g_queueRetryCount[g_queueCount] = 0;
   g_queueCount++;

   // Persist queue to file
   SaveOfflineQueue();
}

void FlushOfflineQueue()
{
   if(g_queueCount == 0) return;

   int consumed = 0;
   bool stopped = false;
   for(int i = 0; i < g_queueCount && !stopped; i++)
   {
      int status = HttpPostEx("/api/track-record/ingest", g_offlineQueue[i]);

      if(status >= 200 && status < 300)
      {
         // Success — event accepted by server
         consumed++;
      }
      else if(status == 409)
      {
         // Duplicate/already-past — server already has this or a later event.
         Print("AlgoStudio Monitor: Queued event skipped (409 duplicate/past). Removing from queue.");
         consumed++;
      }
      else if(status == -1 || status == 429 || status >= 500)
      {
         // Network failure, rate limit, or server error — stop flush, retry later
         stopped = true;
      }
      else
      {
         // Permanent client error (400, 422, etc. — not 409, not 429)
         g_queueRetryCount[i]++;
         if(g_queueRetryCount[i] >= POISON_DROP_THRESHOLD)
         {
            Print("AlgoStudio Monitor: Dropping poison queued event after ",
                  g_queueRetryCount[i], " permanent failures (last status: ", status,
                  "). Event discarded to unblock queue.");
            g_droppedEvents++;
            g_chainDegraded = true;
            consumed++;
         }
         else
         {
            Print("AlgoStudio Monitor: Queued event got permanent error ", status,
                  " (attempt ", g_queueRetryCount[i], "/", POISON_DROP_THRESHOLD,
                  "). Stopping flush, will retry.");
            stopped = true;
         }
      }
   }

   if(consumed > 0)
   {
      Print("AlgoStudio Monitor: Flushed ", consumed, "/", g_queueCount, " queued events.");
      // Remove consumed events (accepted + skipped + dropped)
      for(int i = consumed; i < g_queueCount; i++)
      {
         g_offlineQueue[i - consumed] = g_offlineQueue[i];
         g_queueRetryCount[i - consumed] = g_queueRetryCount[i];
      }
      g_queueCount -= consumed;
      ArrayResize(g_offlineQueue, g_queueCount);
      ArrayResize(g_queueRetryCount, g_queueCount);
      SaveOfflineQueue();
   }
   else if(stopped)
   {
      // Retry counts may have been incremented — persist without removing events
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
      // Replace newlines in JSON (shouldn't be any, but safety)
      string line = g_offlineQueue[i];
      StringReplace(line, "\n", "\\n");
      StringReplace(line, "\r", "\\r");
      // Format: retryCount|jsonPayload
      FileWriteString(handle, IntegerToString(g_queueRetryCount[i]) + "|" + line + "\n");
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
   ArrayResize(g_queueRetryCount, g_queueCount);

   for(int i = 0; i < g_queueCount && !FileIsEnding(handle); i++)
   {
      string line = FileReadString(handle);
      // Parse format: retryCount|jsonPayload (backward-compat: no pipe = old format, retryCount=0)
      int pipePos = StringFind(line, "|");
      if(pipePos > 0)
      {
         g_queueRetryCount[i] = (int)StringToInteger(StringSubstr(line, 0, pipePos));
         line = StringSubstr(line, pipePos + 1);
      }
      else
      {
         g_queueRetryCount[i] = 0;
      }
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
   FileWriteString(handle, IntegerToString(g_droppedEvents) + "\n");
   FileWriteString(handle, (g_chainDegraded ? "1" : "0") + "\n");

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
         // Lines 4-5: hardening state (optional — backward compatible with older state files)
         if(!FileIsEnding(handle))
         {
            g_droppedEvents = (int)StringToInteger(FileReadString(handle));
         }
         if(!FileIsEnding(handle))
         {
            g_chainDegraded = (FileReadString(handle) == "1");
         }
         FileClose(handle);

         Print("AlgoStudio Monitor: Restored state. seqNo=", g_seqNo,
               " instanceId=", StringLen(g_instanceId) > 0 ? g_instanceId : "(pending)",
               (g_droppedEvents > 0 ? " droppedEvents=" + IntegerToString(g_droppedEvents) : ""),
               (g_chainDegraded ? " CHAIN_DEGRADED" : ""));
      }
   }

   // Load offline queue
   LoadOfflineQueue();
}

//+------------------------------------------------------------------+
//| ON-CHART MONITOR OVERLAY                                         |
//+------------------------------------------------------------------+

/** Save original chart colors so they can be restored on deinit. */
void SaveChartColors()
{
   g_savedBg          = (color)ChartGetInteger(0, CHART_COLOR_BACKGROUND);
   g_savedFg          = (color)ChartGetInteger(0, CHART_COLOR_FOREGROUND);
   g_savedGrid        = (color)ChartGetInteger(0, CHART_COLOR_GRID);
   g_savedBullCandle  = (color)ChartGetInteger(0, CHART_COLOR_CANDLE_BULL);
   g_savedBearCandle  = (color)ChartGetInteger(0, CHART_COLOR_CANDLE_BEAR);
   g_savedChartUp     = (color)ChartGetInteger(0, CHART_COLOR_CHART_UP);
   g_savedChartDown   = (color)ChartGetInteger(0, CHART_COLOR_CHART_DOWN);
   g_savedVolumes     = (color)ChartGetInteger(0, CHART_COLOR_VOLUME);
   g_savedBullBody    = (color)ChartGetInteger(0, CHART_COLOR_CHART_UP);
   g_savedBearBody    = (color)ChartGetInteger(0, CHART_COLOR_CHART_DOWN);
   g_savedShowGrid    = (bool)ChartGetInteger(0, CHART_SHOW_GRID);
   g_chartColorsSaved = true;
}

/** Dim chart so the overlay dominates. */
void ApplyChartCosmetics()
{
   ChartSetInteger(0, CHART_COLOR_BACKGROUND, OVL_BG_COLOR);
   ChartSetInteger(0, CHART_COLOR_FOREGROUND, C'35,35,45');
   ChartSetInteger(0, CHART_COLOR_GRID,       OVL_BG_COLOR);
   ChartSetInteger(0, CHART_SHOW_GRID, false);
   ChartSetInteger(0, CHART_COLOR_CANDLE_BULL, C'28,28,38');
   ChartSetInteger(0, CHART_COLOR_CANDLE_BEAR, C'28,28,38');
   ChartSetInteger(0, CHART_COLOR_CHART_UP,    C'28,28,38');
   ChartSetInteger(0, CHART_COLOR_CHART_DOWN,  C'28,28,38');
   ChartSetInteger(0, CHART_COLOR_VOLUME,     C'28,28,38');
}

/** Restore original chart colors. */
void RestoreChartColors()
{
   if(!g_chartColorsSaved) return;
   ChartSetInteger(0, CHART_COLOR_BACKGROUND,  g_savedBg);
   ChartSetInteger(0, CHART_COLOR_FOREGROUND,  g_savedFg);
   ChartSetInteger(0, CHART_COLOR_GRID,        g_savedGrid);
   ChartSetInteger(0, CHART_SHOW_GRID,         g_savedShowGrid);
   ChartSetInteger(0, CHART_COLOR_CANDLE_BULL, g_savedBullCandle);
   ChartSetInteger(0, CHART_COLOR_CANDLE_BEAR, g_savedBearCandle);
   ChartSetInteger(0, CHART_COLOR_CHART_UP,    g_savedChartUp);
   ChartSetInteger(0, CHART_COLOR_CHART_DOWN,  g_savedChartDown);
   ChartSetInteger(0, CHART_COLOR_VOLUME,     g_savedVolumes);
}

/** Create a text label on the overlay. Always CORNER_LEFT_UPPER. */
void OvlLabel(string suffix, int x, int y, string text, color clr, int fontSize)
{
   string name = PANEL_PREFIX + suffix;
   ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetString(0, name, OBJPROP_FONT, PANEL_FONT_MONO);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fontSize);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_BACK, false);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
}

/** Create all overlay objects. */
void PanelCreate()
{
   SaveChartColors();
   ApplyChartCosmetics();

   int chartW = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   int chartH = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);

   // Full-chart background
   string bgName = PANEL_PREFIX + "BG";
   ObjectCreate(0, bgName, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, bgName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, bgName, OBJPROP_XDISTANCE, 0);
   ObjectSetInteger(0, bgName, OBJPROP_YDISTANCE, 0);
   ObjectSetInteger(0, bgName, OBJPROP_XSIZE, chartW);
   ObjectSetInteger(0, bgName, OBJPROP_YSIZE, chartH);
   ObjectSetInteger(0, bgName, OBJPROP_BGCOLOR, OVL_BG_COLOR);
   ObjectSetInteger(0, bgName, OBJPROP_BORDER_COLOR, OVL_BORDER_COLOR);
   ObjectSetInteger(0, bgName, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, bgName, OBJPROP_WIDTH, 0);
   ObjectSetInteger(0, bgName, OBJPROP_BACK, false);
   ObjectSetInteger(0, bgName, OBJPROP_SELECTABLE, false);

   // Accent line under title
   string accentName = PANEL_PREFIX + "Accent";
   ObjectCreate(0, accentName, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, accentName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, accentName, OBJPROP_XDISTANCE, OVL_LEFT_MARGIN);
   ObjectSetInteger(0, accentName, OBJPROP_YDISTANCE, 52);
   ObjectSetInteger(0, accentName, OBJPROP_XSIZE, 200);
   ObjectSetInteger(0, accentName, OBJPROP_YSIZE, 1);
   ObjectSetInteger(0, accentName, OBJPROP_BGCOLOR, OVL_BORDER_COLOR);
   ObjectSetInteger(0, accentName, OBJPROP_BORDER_COLOR, OVL_BORDER_COLOR);
   ObjectSetInteger(0, accentName, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, accentName, OBJPROP_BACK, false);
   ObjectSetInteger(0, accentName, OBJPROP_SELECTABLE, false);

   // Title
   OvlLabel("Title", OVL_LEFT_MARGIN, 20, "ALGOSTUDIO MONITOR v" + MONITOR_VERSION, OVL_TITLE_COLOR, OVL_TITLE_FONT_SIZE);

   // Subtitle — mode / scope
   string subtitle;
   if(InpMonitorMode == MODE_ACCOUNT_WIDE)
      subtitle = "Account-wide portfolio mode";
   else
   {
      subtitle = _Symbol + "  " + EnumToString((ENUM_TIMEFRAMES)Period());
      if(StringLen(InpTrackedEaName) > 0)
         subtitle = subtitle + "  —  " + InpTrackedEaName;
   }
   OvlLabel("Subtitle", OVL_LEFT_MARGIN, 58, subtitle, OVL_SUBTITLE_COLOR, OVL_SUBTITLE_FONT_SIZE);

   // Info rows — labels (left) and values (right)
   int y = 92;
   string rowNames[] = {"Status", "Governance", "Heartbeat", "Instance", "Account", "Queue", "Last error"};
   for(int i = 0; i < 7; i++)
   {
      OvlLabel("L" + IntegerToString(i), OVL_LEFT_MARGIN, y, rowNames[i], OVL_LABEL_COLOR, OVL_LABEL_FONT_SIZE);
      OvlLabel("V" + IntegerToString(i), OVL_VALUE_X, y, "", OVL_VALUE_COLOR, OVL_VALUE_FONT_SIZE);
      y += OVL_ROW_HEIGHT;
   }

   PanelUpdate();
   ChartRedraw(0);
}

/** Resize the overlay background to match current chart dimensions. */
void PanelResize()
{
   int chartW = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   int chartH = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);

   string bgName = PANEL_PREFIX + "BG";
   ObjectSetInteger(0, bgName, OBJPROP_XSIZE, chartW);
   ObjectSetInteger(0, bgName, OBJPROP_YSIZE, chartH);
   ChartRedraw(0);
}

/** Update overlay values every timer tick. */
void PanelUpdate()
{
   // Row 0: Status — derived from heartbeat recency
   string status;
   color  statusClr;
   if(g_lastSuccessfulHb == 0)
   {
      status = "Offline";
      statusClr = OVL_RED;
   }
   else
   {
      long elapsed = (long)TimeCurrent() - (long)g_lastSuccessfulHb;
      if(elapsed <= 10)
      {
         status = "Connected";
         statusClr = OVL_GREEN;
      }
      else if(elapsed <= 60)
      {
         status = "Delayed";
         statusClr = OVL_YELLOW;
      }
      else
      {
         status = "Offline";
         statusClr = OVL_RED;
      }
   }
   PanelSetValue(0, status, statusClr);

   // Row 1: Governance — action from backend heartbeat response
   string govLabel;
   color  govClr;
   if(g_govAction == "RUN")
   {
      govLabel = "RUN";
      govClr = OVL_GREEN;
   }
   else if(g_govAction == "PAUSE")
   {
      govLabel = "PAUSED";
      if(StringLen(g_govReason) > 0)
         govLabel = govLabel + "  " + g_govReason;
      if(StringLen(govLabel) > 40)
         govLabel = StringSubstr(govLabel, 0, 37) + "...";
      govClr = OVL_YELLOW;
   }
   else
   {
      govLabel = "STOPPED";
      if(StringLen(g_govReason) > 0)
         govLabel = govLabel + "  " + g_govReason;
      if(StringLen(govLabel) > 40)
         govLabel = StringSubstr(govLabel, 0, 37) + "...";
      govClr = OVL_RED;
   }
   PanelSetValue(1, govLabel, govClr);

   // Row 2: Heartbeat — human-readable elapsed
   string hbText;
   if(g_lastSuccessfulHb == 0)
   {
      hbText = "never";
   }
   else
   {
      long elapsed = (long)TimeCurrent() - (long)g_lastSuccessfulHb;
      if(elapsed < 60)
         hbText = IntegerToString(elapsed) + "s ago";
      else if(elapsed < 3600)
         hbText = IntegerToString(elapsed / 60) + "m ago";
      else
         hbText = IntegerToString(elapsed / 3600) + "h ago";
   }
   PanelSetValue(2, hbText, OVL_VALUE_COLOR);

   // Row 3: Instance
   string instLabel = "(pending)";
   if(StringLen(g_instanceId) > 0)
      instLabel = g_instanceId;
   PanelSetValue(3, instLabel, OVL_VALUE_COLOR);

   // Row 4: Account — login | server
   string acctText = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))
                   + "  " + AccountInfoString(ACCOUNT_SERVER);
   PanelSetValue(4, acctText, OVL_DIM_COLOR);

   // Row 5: Queue — only show count when non-zero
   if(g_queueCount > 0)
      PanelSetValue(5, IntegerToString(g_queueCount) + " queued", OVL_YELLOW);
   else
      PanelSetValue(5, "—", OVL_DIM_COLOR);

   // Row 6: Last error
   if(StringLen(g_panelError) > 0)
   {
      string errText = g_panelError;
      if(StringLen(errText) > 50)
         errText = StringSubstr(errText, 0, 47) + "...";
      PanelSetValue(6, errText, OVL_RED);
   }
   else
   {
      PanelSetValue(6, "—", OVL_DIM_COLOR);
   }

   ChartRedraw(0);
}

/** Set an overlay value label's text and color. */
void PanelSetValue(int row, string text, color clr)
{
   string name = PANEL_PREFIX + "V" + IntegerToString(row);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
}

/** Remove all overlay objects and restore chart colors. */
void PanelDestroy()
{
   int total = ObjectsTotal(0, 0, -1);
   for(int i = total - 1; i >= 0; i--)
   {
      string name = ObjectName(0, i, 0, -1);
      if(StringFind(name, PANEL_PREFIX) == 0)
         ObjectDelete(0, name);
   }
   RestoreChartColors();
   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//| CHART EVENT — resize overlay on chart dimension changes          |
//+------------------------------------------------------------------+
void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
{
   if(id == CHARTEVENT_CHART_CHANGE && InpShowPanel)
      PanelResize();
}

//+------------------------------------------------------------------+
//| TICK FUNCTION (not used for trading, just keeps EA alive)        |
//+------------------------------------------------------------------+
void OnTick()
{
   // No-op — all logic is timer-based and event-based
}
//+------------------------------------------------------------------+
