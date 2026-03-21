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
//| PER-STRATEGY CONTEXT  (Milestone B — manifest mode)              |
//+------------------------------------------------------------------+
struct StrategyContext
{
   long     magicNumber;    // Primary routing key
   string   symbol;         // Chart symbol ("" = any symbol)
   string   timeframe;      // Timeframe string, e.g. "M15"
   string   eaName;         // Human label
   string   fingerprint;    // SHA-256 of material config fields
   string   instanceId;     // Server-assigned; populated after first heartbeat
   string   govAction;      // "RUN" | "PAUSE" | "STOP"
   string   govReason;      // reasonCode from last heartbeat response
   datetime govReceivedAt;  // When last governance state was received
   // Per-context chain state (Milestone C)
   int      seqNo;          // Chain sequence number for this context
   string   lastHash;       // Previous event hash for this context
   bool     sessionStartSent; // Per-context SESSION_START gate
   // Cached per-heartbeat stats (populated once per tick by PrecomputeContextStats)
   int      cachedTotalClosed;
   double   cachedTotalPL;
};

//+------------------------------------------------------------------+
//| DISCOVERY CANDIDATE  (internal — used by ScanActivityCandidates) |
//+------------------------------------------------------------------+
struct DiscoveryCandidate
{
   string symbol;
   long   magicNumber;
   string eaHint;          // From deal/position comment (bracket-stripped)
   int    tradeCount;      // closed DEAL_ENTRY_OUT count + open-position count
                           // (matches original DiscoverDeploymentsFromActivity JSON shape)
   bool   hasOpenPosition; // true if >= 1 open position (for noise filter)
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

// Strategy self-identification (single strategy — takes priority over auto-discovery)
// Set magic > 0 to make strategy visible immediately, before any trades.
input int    InpStrategyMagic     = 0;            // Strategy magic number (0=auto-discover)
input string InpStrategySymbol    = "";            // Strategy symbol (empty=chart symbol)
input string InpStrategyTimeframe = "";            // Strategy timeframe e.g. M15 (empty=chart TF)
input string InpStrategyLabel     = "";            // Strategy label (empty=EA name or magic)

// Multi-strategy manifest (Milestone B — takes priority over single-strategy inputs when non-empty)
// Format: magic|symbol|timeframe|label  (comma-separated for multiple strategies)
// Example: 12345|EURUSD|M15|MomentumV3,20001|XAUUSD|M5|ReversionX
input string InpStrategyManifest = "";           // Strategy manifest (magic|sym|tf|label, CSV)

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
#define MAX_MANIFEST_CONTEXTS 5
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
int    g_dealSelectFailures = 0;  // Cumulative HistoryDealSelect failures (session-only, not persisted)
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

// Multi-strategy manifest mode (Milestone B)
StrategyContext g_contexts[];
int    g_contextCount = 0;
bool   g_manifestMode = false;
datetime g_lastRediscovery = 0;           // Rate-limit auto-discovery re-scans

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

   // Parse multi-strategy manifest — sets g_manifestMode when InpStrategyManifest is non-empty
   ParseManifest();

   // Self-identification — creates a single context from InpStrategyMagic when set.
   // Runs only when no manifest was provided. Skips auto-discovery.
   if(!g_manifestMode)
      BuildSelfIdentifiedContext();

   // Auto-discovery fallback — runs only when no manifest or self-identification
   if(!g_manifestMode)
      AutoDiscoverContexts();

   // Legacy single-strategy deployment eligibility — skipped in manifest/auto-discovery mode
   if(!g_manifestMode)
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
   if(now - g_lastHeartbeat >= InpHeartbeatSec)
   {
      if(g_manifestMode)
      {
         // Account-level heartbeat first — updates base instance with
         // aggregated openTrades, totalTrades, totalProfit.
         SendHeartbeat();
         // Pre-compute per-context trade stats in a single history scan
         // (replaces N individual full scans inside SendContextHeartbeat).
         PrecomputeContextStats();
         // Per-context heartbeats — update each strategy context instance.
         // Per-context governance is stored in each context only —
         // g_govAction is NOT modified from manifest context responses.
         for(int i = 0; i < g_contextCount; i++)
            SendContextHeartbeat(g_contexts[i]);
      }
      else
      {
         // Legacy mode: single heartbeat with deferred SESSION_START.
         // Runs before trade polling so g_instanceId is populated before
         // any TRADE_OPEN/CLOSE events.
         SendHeartbeat();
      }
      g_lastHeartbeat = now;
   }

   // Flush offline queue after heartbeat (instanceId may now be known)
   if(g_queueCount > 0)
      FlushOfflineQueue();

   // Late discovery: re-scan for strategies when still in legacy mode.
   // Runs at most once per 60 seconds. Once a context is found, g_manifestMode
   // flips to true and this block never executes again.
   if(!g_manifestMode && g_contextCount == 0 && InpStrategyMagic <= 0
      && now - g_lastRediscovery >= 60)
   {
      g_lastRediscovery = now;
      AutoDiscoverContexts();
      if(g_manifestMode)
         Print("AlgoStudio Monitor: Late discovery activated — ",
               g_contextCount, " context(s) found.");
   }

   // Poll for new trades (backup detection in case OnTradeTransaction missed something)
   PollTradeChanges();

   // Governance gate: PAUSE/STOP → skip snapshots (legacy mode only)
   // In manifest mode, per-context governance is checked inside SendContextTrackRecordEvent.
   if(!g_manifestMode && g_govAction != "RUN")
   {
      if(InpShowPanel)
         PanelUpdate();
      return;
   }

   // Snapshots — per-context in manifest mode, global in legacy mode
   if(now - g_lastSnapshot >= InpSnapshotSec)
   {
      if(g_manifestMode)
      {
         for(int i = 0; i < g_contextCount; i++)
            SendContextSnapshot(i);
      }
      else
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
   // In manifest mode, per-context governance is checked in SendContextTrackRecordEvent.
   // In legacy mode, global governance gate still applies.
   if(!g_manifestMode && g_govAction != "RUN") return;
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
      bool accepted = false;

      if(entry == DEAL_ENTRY_IN)
      {
         // New position opened
         accepted = SendTradeOpen(dealTicket);
         BuildKnownPositions();
      }
      else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
      {
         // Position closed
         accepted = SendTradeClose(dealTicket);
         BuildKnownPositions();
      }
      else if(entry == DEAL_ENTRY_INOUT)
      {
         // Partial fill via close-and-reopen (netting mode or partial close)
         accepted = SendTradeClose(dealTicket);
         BuildKnownPositions();
      }

      // Only mark deal as known if event was accepted (sent or queued).
      // If context instanceId is not yet assigned, leave deal unmarked
      // so PollTradeChanges retries it after heartbeat assigns the instanceId.
      if(accepted)
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
//| PARSE STRATEGY MANIFEST  (Milestone B)                          |
//| Populates g_contexts[] from InpStrategyManifest.                 |
//| Sets g_manifestMode = true when at least one valid context loads.|
//| Format per entry: magic|symbol|timeframe|label                   |
//| Entries are comma-separated.                                     |
//+------------------------------------------------------------------+
void ParseManifest()
{
   g_contextCount = 0;
   g_manifestMode = false;
   if(StringLen(InpStrategyManifest) == 0) return;

   string tokens[];
   int tokenCount = StringSplit(InpStrategyManifest, ',', tokens);
   ArrayResize(g_contexts, tokenCount);

   for(int i = 0; i < tokenCount; i++)
   {
      StringTrimLeft(tokens[i]);
      StringTrimRight(tokens[i]);
      if(StringLen(tokens[i]) == 0) continue;

      string parts[];
      int partCount = StringSplit(tokens[i], '|', parts);
      if(partCount < 4)
      {
         Print("AlgoStudio Monitor: Skipping malformed manifest entry (need magic|sym|tf|label): '",
               tokens[i], "'");
         continue;
      }

      long magic = StringToInteger(parts[0]);
      if(magic <= 0)
      {
         Print("AlgoStudio Monitor: Skipping manifest entry — magic must be > 0: '", tokens[i], "'");
         continue;
      }

      StrategyContext ctx;
      ctx.magicNumber   = magic;
      ctx.symbol        = parts[1];
      ctx.timeframe     = parts[2];
      ctx.eaName        = parts[3];
      ctx.instanceId    = "";
      ctx.govAction     = "RUN";
      ctx.govReason     = "";
      ctx.govReceivedAt = 0;
      ctx.seqNo         = 0;
      ctx.lastHash      = GENESIS_HASH;
      ctx.sessionStartSent = false;

      // Fingerprint uses same material fields as single-context EvaluateDeploymentEligibility
      string canonical = StringFormat("%s:%s:%d:%s:%s:%s",
         ctx.symbol, ctx.timeframe, (int)ctx.magicNumber, ctx.eaName,
         InpCommentFilter, InpExcludeManual ? "true" : "false");
      ctx.fingerprint = SHA256(canonical);

      // Guard: max context count
      if(g_contextCount >= MAX_MANIFEST_CONTEXTS)
      {
         Print("AlgoStudio Monitor: Manifest limit (", MAX_MANIFEST_CONTEXTS,
               ") reached. Ignoring remaining entries.");
         break;
      }

      // Guard: duplicate fingerprint
      bool duplicate = false;
      for(int j = 0; j < g_contextCount; j++)
      {
         if(g_contexts[j].fingerprint == ctx.fingerprint)
         {
            Print("AlgoStudio Monitor: Skipping duplicate (fingerprint matches context [",
                  j, "] ", g_contexts[j].eaName, "): '", tokens[i], "'");
            duplicate = true;
            break;
         }
      }
      if(duplicate) continue;

      Print("AlgoStudio Monitor: Context [", g_contextCount, "] ",
            ctx.symbol, ":", ctx.timeframe,
            " magic=", ctx.magicNumber, " label=", ctx.eaName,
            " fingerprint=", StringSubstr(ctx.fingerprint, 0, 16), "...");

      g_contexts[g_contextCount++] = ctx;
   }

   ArrayResize(g_contexts, g_contextCount);

   if(g_contextCount > 0)
   {
      g_manifestMode = true;
      Print("AlgoStudio Monitor: Manifest mode active. ", g_contextCount, " context(s) loaded.");
   }
   else
   {
      Print("AlgoStudio Monitor: Manifest non-empty but no valid contexts parsed. "
            "Falling back to single-strategy mode.");
   }
}

//+------------------------------------------------------------------+
//| STRATEGY SELF-IDENTIFICATION                                     |
//| Builds a single context from InpStrategyMagic when set (> 0).   |
//| Uses explicit inputs (InpStrategySymbol, InpStrategyTimeframe,   |
//| InpStrategyLabel) with chart symbol/timeframe/EA name fallback.  |
//| Runs after ParseManifest, before AutoDiscoverContexts.           |
//| Sets g_manifestMode = true so auto-discovery is skipped.         |
//+------------------------------------------------------------------+
void BuildSelfIdentifiedContext()
{
   if(InpStrategyMagic <= 0) return;

   // Symbol: explicit input > chart symbol (normalized: trimmed + uppercase)
   string sym = InpStrategySymbol;
   StringTrimLeft(sym);
   StringTrimRight(sym);
   if(StringLen(sym) == 0) sym = _Symbol;
   StringToUpper(sym);
   if(StringLen(sym) == 0)
   {
      Print("AlgoStudio Monitor: Self-identification skipped — no symbol available.");
      return;
   }

   // Timeframe: explicit input > chart timeframe (normalized: trimmed + uppercase, strip PERIOD_ prefix)
   string tf;
   string rawInputTf = InpStrategyTimeframe;
   StringTrimLeft(rawInputTf);
   StringTrimRight(rawInputTf);
   if(StringLen(rawInputTf) > 0)
   {
      StringToUpper(rawInputTf);
      tf = rawInputTf;
   }
   else
   {
      string rawTf = EnumToString((ENUM_TIMEFRAMES)Period());
      tf = (StringFind(rawTf, "PERIOD_") == 0) ? StringSubstr(rawTf, 7) : rawTf;
   }

   // Label: explicit input > EA name > magic fallback
   string label = StringLen(InpStrategyLabel) > 0
                  ? InpStrategyLabel
                  : StringLen(InpTrackedEaName) > 0
                     ? InpTrackedEaName
                     : "Magic " + IntegerToString(InpStrategyMagic);

   StrategyContext ctx;
   ctx.magicNumber      = InpStrategyMagic;
   ctx.symbol           = sym;
   ctx.timeframe        = tf;
   ctx.eaName           = label;
   ctx.instanceId       = "";
   ctx.govAction        = "RUN";
   ctx.govReason        = "";
   ctx.govReceivedAt    = 0;
   ctx.seqNo            = 0;
   ctx.lastHash         = GENESIS_HASH;
   ctx.sessionStartSent = false;

   // Fingerprint: label-independent so renaming does not create a new context
   string canonical = StringFormat("%s:%s:%d:%s:%s",
      ctx.symbol, ctx.timeframe, (int)ctx.magicNumber,
      InpCommentFilter, InpExcludeManual ? "true" : "false");
   ctx.fingerprint = SHA256(canonical);

   ArrayResize(g_contexts, 1);
   g_contexts[0]  = ctx;
   g_contextCount = 1;
   g_manifestMode = true;

   Print("AlgoStudio Monitor: Self-identified strategy [0] ",
         ctx.symbol, ":", ctx.timeframe,
         " magic=", ctx.magicNumber, " label=", ctx.eaName,
         " fingerprint=", StringSubstr(ctx.fingerprint, 0, 16), "...");
}

//+------------------------------------------------------------------+
//| Automatic zero-config context discovery.                         |
//| Runs only when no manifest is provided.                          |
//| Scans full account history + open positions, applies noise       |
//| filter (tradeCount >= 2 OR hasOpenPosition), converts qualifying |
//| candidates into StrategyContext entries, and sets g_manifestMode.|
//+------------------------------------------------------------------+
void AutoDiscoverContexts()
{
   g_manifestMode = false;
   g_contextCount = 0;
   ArrayResize(g_contexts, 0);

   DiscoveryCandidate candidates[];
   int unattributed = 0;
   int found = ScanActivityCandidates(candidates, MAX_DISCOVERED_DEPLOYMENTS, unattributed);

   if(found == 0)
   {
      Print("AlgoStudio Monitor: Auto-discovery: no EA-attributed activity (magic > 0) found on this account.");
      return;
   }

   ArrayResize(g_contexts, MathMin(found, MAX_MANIFEST_CONTEXTS));

   for(int i = 0; i < found; i++)
   {
      // Noise filter: suppress candidates with zero evidence
      if(candidates[i].tradeCount < 1 && !candidates[i].hasOpenPosition)
         continue;

      // Cap
      if(g_contextCount >= MAX_MANIFEST_CONTEXTS)
      {
         Print("AlgoStudio Monitor: Auto-discovery limit (", MAX_MANIFEST_CONTEXTS,
               ") reached. Remaining candidates skipped.");
         break;
      }

      StrategyContext ctx;
      ctx.magicNumber   = candidates[i].magicNumber;
      ctx.symbol        = candidates[i].symbol;
      ctx.timeframe     = "";   // not recoverable from trade history
      ctx.eaName        = StringLen(candidates[i].eaHint) > 0
                          ? candidates[i].eaHint
                          : "Magic " + IntegerToString((int)candidates[i].magicNumber);
      ctx.instanceId    = "";
      ctx.govAction     = "RUN";
      ctx.govReason     = "";
      ctx.govReceivedAt = 0;
      ctx.seqNo         = 0;
      ctx.lastHash      = GENESIS_HASH;
      ctx.sessionStartSent = false;

      // AUTO fingerprint — intentionally different from manifest fingerprints.
      // timeframe is excluded (unknown). Backend scopes by base instance.
      string canonical = "AUTO:v1:" + ctx.symbol + ":"
                         + IntegerToString((int)ctx.magicNumber);
      ctx.fingerprint   = SHA256(canonical);

      // Dedup by fingerprint (same guard as ParseManifest)
      bool duplicate = false;
      for(int j = 0; j < g_contextCount; j++)
      {
         if(g_contexts[j].fingerprint == ctx.fingerprint)
         {
            duplicate = true;
            break;
         }
      }
      if(duplicate)
      {
         Print("AlgoStudio Monitor: Auto-discovery: skipping duplicate fingerprint — ",
               candidates[i].symbol, " magic=", candidates[i].magicNumber);
         continue;
      }

      Print("AlgoStudio Monitor: Auto-discovered [", g_contextCount, "] ",
            ctx.symbol, " magic=", ctx.magicNumber, " label=", ctx.eaName,
            " trades=", candidates[i].tradeCount,
            " openPos=", candidates[i].hasOpenPosition ? "yes" : "no",
            " fp=", StringSubstr(ctx.fingerprint, 0, 16), "...");

      g_contexts[g_contextCount++] = ctx;
   }

   ArrayResize(g_contexts, g_contextCount);

   if(g_contextCount > 0)
   {
      g_manifestMode = true;
      Print("AlgoStudio Monitor: Auto-discovery active. ", g_contextCount, " context(s) created.");
   }
   else
   {
      Print("AlgoStudio Monitor: Auto-discovery: all candidates filtered by noise filter. "
            "Falling back to single-strategy mode.");
   }
}

//+------------------------------------------------------------------+
//| Return worst-case governance across all contexts (display only). |
//| STOP > PAUSE > RUN.                                              |
//| Does NOT modify g_govAction — per-context governance is          |
//| authoritative per-context only in Milestone B.                  |
//+------------------------------------------------------------------+
string GetWorstContextGovAction()
{
   string worst = "RUN";
   for(int i = 0; i < g_contextCount; i++)
   {
      if(g_contexts[i].govAction == "STOP")  return "STOP";
      if(g_contexts[i].govAction == "PAUSE")   worst = "PAUSE";
   }
   return worst;
}

//+------------------------------------------------------------------+
//| Find matching strategy context for a deal's symbol + magic.      |
//| Returns index into g_contexts[] or -1 if no match.               |
//| Same matching rule as SendContextHeartbeat:                       |
//|   1. magicNumber must match exactly                               |
//|   2. if ctx.symbol is non-empty, symbol must match exactly        |
//+------------------------------------------------------------------+
int FindContextForDeal(string dealSymbol, long dealMagic)
{
   for(int i = 0; i < g_contextCount; i++)
   {
      if(g_contexts[i].magicNumber != dealMagic) continue;
      if(StringLen(g_contexts[i].symbol) > 0 &&
         g_contexts[i].symbol != dealSymbol) continue;
      return i;
   }
   return -1;
}

//+------------------------------------------------------------------+
//| Scan account activity into typed DiscoveryCandidate array.       |
//| Used by both DiscoverDeploymentsFromActivity() (JSON) and        |
//| AutoDiscoverContexts() (StrategyContext creation).               |
//| Returns number of candidates found.                              |
//+------------------------------------------------------------------+
int ScanActivityCandidates(DiscoveryCandidate &candidates[], int maxCount, int &unattributed)
{
   HistorySelect(0, TimeCurrent());
   int total = HistoryDealsTotal();

   ArrayResize(candidates, maxCount);
   int discoveredCount = 0;
   unattributed = 0;

   // Zero-init all slots
   for(int k = 0; k < maxCount; k++)
   {
      candidates[k].symbol         = "";
      candidates[k].magicNumber    = 0;
      candidates[k].eaHint         = "";
      candidates[k].tradeCount     = 0;
      candidates[k].hasOpenPosition = false;
   }

   // ── Closed deals ──────────────────────────────────────────────
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      ENUM_DEAL_TYPE dtype = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(dtype == DEAL_TYPE_BALANCE || dtype == DEAL_TYPE_CREDIT ||
         dtype == DEAL_TYPE_CHARGE  || dtype == DEAL_TYPE_CORRECTION ||
         dtype == DEAL_TYPE_BONUS)
         continue;

      long   magic = (long)HistoryDealGetInteger(ticket, DEAL_MAGIC);
      string sym   = HistoryDealGetString(ticket, DEAL_SYMBOL);

      if(StringLen(sym) == 0) continue;
      if(magic == 0) { unattributed++; continue; }

      int idx = -1;
      for(int j = 0; j < discoveredCount; j++)
         if(candidates[j].symbol == sym && candidates[j].magicNumber == magic) { idx = j; break; }

      if(idx >= 0)
      {
         candidates[idx].tradeCount++;
      }
      else if(discoveredCount < maxCount)
      {
         candidates[discoveredCount].symbol      = sym;
         candidates[discoveredCount].magicNumber = magic;
         candidates[discoveredCount].tradeCount  = 1;
         candidates[discoveredCount].hasOpenPosition = false;
         string comment = HistoryDealGetString(ticket, DEAL_COMMENT);
         if(StringFind(comment, "[") >= 0 || StringFind(comment, "#") >= 0) comment = "";
         candidates[discoveredCount].eaHint = comment;
         discoveredCount++;
      }
   }

   // ── Open positions (catches strategies before first closed deal) ──
   for(int p = PositionsTotal() - 1; p >= 0; p--)
   {
      ulong posTicket = PositionGetTicket(p);
      if(posTicket == 0) continue;
      if(!PositionSelectByTicket(posTicket)) continue;

      string sym   = PositionGetString(POSITION_SYMBOL);
      long   magic = (long)PositionGetInteger(POSITION_MAGIC);

      if(StringLen(sym) == 0) continue;
      if(magic == 0) { unattributed++; continue; }

      int idx = -1;
      for(int j = 0; j < discoveredCount; j++)
         if(candidates[j].symbol == sym && candidates[j].magicNumber == magic) { idx = j; break; }

      if(idx >= 0)
      {
         candidates[idx].tradeCount++;       // preserves original JSON tradeCount semantics
         candidates[idx].hasOpenPosition = true;
      }
      else if(discoveredCount < maxCount)
      {
         candidates[discoveredCount].symbol         = sym;
         candidates[discoveredCount].magicNumber    = magic;
         candidates[discoveredCount].tradeCount     = 1;
         candidates[discoveredCount].hasOpenPosition = true;
         string comment = PositionGetString(POSITION_COMMENT);
         if(StringFind(comment, "[") >= 0 || StringFind(comment, "#") >= 0) comment = "";
         candidates[discoveredCount].eaHint = comment;
         discoveredCount++;
      }
   }

   ArrayResize(candidates, discoveredCount);
   return discoveredCount;
}

//+------------------------------------------------------------------+
//| Discover deployment candidates from account-wide trade activity. |
//| Serializes ScanActivityCandidates() output to JSON fragment.     |
//| External JSON shape is unchanged from the original implementation.|
//| Returns empty string if not in ACCOUNT_WIDE mode or no activity. |
//+------------------------------------------------------------------+
string DiscoverDeploymentsFromActivity()
{
   if(InpMonitorMode != MODE_ACCOUNT_WIDE) return "";

   DiscoveryCandidate candidates[];
   int unattributed = 0;
   int discoveredCount = ScanActivityCandidates(candidates, MAX_DISCOVERED_DEPLOYMENTS, unattributed);

   if(discoveredCount == 0 && unattributed == 0) return "";

   string json = ",\"discoveredDeployments\":[";
   for(int i = 0; i < discoveredCount; i++)
   {
      if(i > 0) json += ",";
      json += "{"
         + JStr("symbol",      candidates[i].symbol) + ","
         + JInt("magicNumber", (int)candidates[i].magicNumber) + ","
         + JStr("eaHint",      candidates[i].eaHint) + ","
         + JInt("tradeCount",  candidates[i].tradeCount)
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
      bool accepted = false;

      if(entry == DEAL_ENTRY_IN)
         accepted = SendTradeOpen(ticket);
      else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
         accepted = SendTradeClose(ticket);

      // Only mark as known if accepted — retries on next poll if instanceId pending
      if(accepted)
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
string ComputeEventHash(string instanceId, string eventType, int seqNo, string prevHash,
                        long timestamp, string &payloadPairs[])
{
   // Collect all pairs: core fields + payload
   string pairs[];
   int count = 0;
   int payloadCount = ArraySize(payloadPairs);

   ArrayResize(pairs, 5 + payloadCount);

   // Core fields
   if(StringLen(instanceId) > 0)
      pairs[count++] = JStr("eaInstanceId", instanceId);
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

   string eventHash = ComputeEventHash(g_instanceId, eventType, nextSeq, g_lastHash, ts, payloadPairs);
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
//| PER-CONTEXT TRACK RECORD EVENT  (Milestone C)                    |
//| Uses context's own chain state (seqNo, lastHash, instanceId).    |
//| Includes context identity in ingest payload for backend routing. |
//| Automatically sends SESSION_START on first event for a context.  |
//+------------------------------------------------------------------+
bool SendContextTrackRecordEvent(int ctxIdx, string eventType,
                                 string payloadJson, string &payloadPairs[])
{
   // Context must have instanceId assigned by heartbeat
   if(StringLen(g_contexts[ctxIdx].instanceId) == 0)
   {
      Print("AlgoStudio Monitor [", g_contexts[ctxIdx].eaName,
            "]: Skipping ", eventType, " — instanceId not yet assigned");
      return false;
   }

   // Per-context governance gate
   if(g_contexts[ctxIdx].govAction != "RUN")
   {
      Print("AlgoStudio Monitor [", g_contexts[ctxIdx].eaName,
            "]: Skipping ", eventType, " — governance: ", g_contexts[ctxIdx].govAction);
      return false;
   }

   // Auto-send SESSION_START before first chain event for this context
   if(!g_contexts[ctxIdx].sessionStartSent && eventType != "SESSION_START")
   {
      SendContextSessionStart(ctxIdx);
      if(!g_contexts[ctxIdx].sessionStartSent)
         return false;  // SESSION_START failed — block subsequent events
   }

   int nextSeq = g_contexts[ctxIdx].seqNo + 1;
   long ts = (long)TimeGMT();

   string eventHash = ComputeEventHash(g_contexts[ctxIdx].instanceId,
                         eventType, nextSeq, g_contexts[ctxIdx].lastHash, ts, payloadPairs);
   if(StringLen(eventHash) == 0)
   {
      Print("AlgoStudio Monitor [", g_contexts[ctxIdx].eaName,
            "]: Failed to compute event hash");
      return false;
   }

   // Context identity for backend routing
   string contextJson = ",\"context\":{"
      + JStr("materialFingerprint", g_contexts[ctxIdx].fingerprint) + ","
      + JStr("timeframe", g_contexts[ctxIdx].timeframe)
      + "}";

   string json = "{"
      + "\"eventType\":\"" + eventType + "\","
      + "\"seqNo\":" + IntegerToString(nextSeq) + ","
      + "\"prevHash\":\"" + g_contexts[ctxIdx].lastHash + "\","
      + "\"eventHash\":\"" + eventHash + "\","
      + "\"timestamp\":" + IntegerToString(ts) + ","
      + "\"payload\":" + payloadJson
      + contextJson
      + "}";

   bool sent = HttpPost("/api/track-record/ingest", json);

   // Advance context chain state regardless of send outcome
   g_contexts[ctxIdx].seqNo = nextSeq;
   g_contexts[ctxIdx].lastHash = eventHash;

   if(!sent)
      EnqueueEvent(json);

   SaveState();
   return sent;
}

//+------------------------------------------------------------------+
//| Per-context SESSION_START  (Milestone C)                          |
//+------------------------------------------------------------------+
void SendContextSessionStart(int ctxIdx)
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   string broker = AccountInfoString(ACCOUNT_COMPANY);
   string account = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));

   ENUM_ACCOUNT_TRADE_MODE tradeMode = (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
   string mode = (tradeMode == ACCOUNT_TRADE_MODE_DEMO || tradeMode == ACCOUNT_TRADE_MODE_CONTEST)
                 ? "PAPER" : "LIVE";

   string symbol = g_contexts[ctxIdx].symbol;
   if(StringLen(symbol) == 0) symbol = "MULTI";
   string tf = g_contexts[ctxIdx].timeframe;
   if(StringLen(tf) == 0) tf = "NA";
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

   if(SendContextTrackRecordEvent(ctxIdx, "SESSION_START", payloadJson, payloadPairs))
      g_contexts[ctxIdx].sessionStartSent = true;
}

//+------------------------------------------------------------------+
//| Per-context SNAPSHOT  (Milestone C)                               |
//| Counts only positions matching this context's symbol + magic.    |
//+------------------------------------------------------------------+
void SendContextSnapshot(int ctxIdx)
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd  = (bal > 0) ? ((bal - eq) / bal * 100.0) : 0;
   if(dd < 0) dd = 0;

   // Count positions matching this context
   int openCount = 0;
   double unrealizedPnL = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      if((long)PositionGetInteger(POSITION_MAGIC) != g_contexts[ctxIdx].magicNumber) continue;
      if(StringLen(g_contexts[ctxIdx].symbol) > 0 &&
         PositionGetString(POSITION_SYMBOL) != g_contexts[ctxIdx].symbol) continue;
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

   SendContextTrackRecordEvent(ctxIdx, "SNAPSHOT", payloadJson, payloadPairs);
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

bool SendTradeOpen(ulong dealTicket)
{
   if(!HistoryDealSelect(dealTicket))
   {
      g_dealSelectFailures++;
      Print("AlgoStudio Monitor: WARNING — HistoryDealSelect failed for TRADE_OPEN deal #",
            dealTicket, " (total failures: ", g_dealSelectFailures, ")");
      return true; // can't select → don't retry (deal marked as known — event is lost)
   }

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

   // Per-context routing (Milestone C)
   // Returns false only when context matched but instanceId not yet assigned —
   // caller must NOT mark deal as known so PollTradeChanges retries after heartbeat.
   int ctxIdx = (g_contextCount > 0) ? FindContextForDeal(symbol, magic) : -1;
   bool accepted = true;
   if(ctxIdx >= 0)
      accepted = SendContextTrackRecordEvent(ctxIdx, "TRADE_OPEN", payloadJson, payloadPairs);
   else if(!g_manifestMode)
      SendTrackRecordEvent("TRADE_OPEN", payloadJson, payloadPairs);
   else
      Print("AlgoStudio Monitor: Unmatched TRADE_OPEN (", symbol, " magic=", magic,
            ") — no context found, skipping");

   Print("AlgoStudio Monitor: TRADE_OPEN ", direction, " ", symbol,
         " ", DoubleToString(lots, 2), " lots @ ", DoubleToString(price, 5));
   return accepted;
}

bool SendTradeClose(ulong dealTicket)
{
   if(!HistoryDealSelect(dealTicket))
   {
      g_dealSelectFailures++;
      Print("AlgoStudio Monitor: WARNING — HistoryDealSelect failed for TRADE_CLOSE deal #",
            dealTicket, " (total failures: ", g_dealSelectFailures, ")");
      return true; // can't select → don't retry (deal marked as known — event is lost)
   }

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

   // Per-context routing (Milestone C)
   // Returns false only when context matched but instanceId not yet assigned —
   // caller must NOT mark deal as known so PollTradeChanges retries after heartbeat.
   string sym = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   int ctxIdx = (g_contextCount > 0) ? FindContextForDeal(sym, magic) : -1;
   bool accepted = true;
   if(ctxIdx >= 0)
      accepted = SendContextTrackRecordEvent(ctxIdx, "TRADE_CLOSE", payloadJson, payloadPairs);
   else if(!g_manifestMode)
      SendTrackRecordEvent("TRADE_CLOSE", payloadJson, payloadPairs);
   else
      Print("AlgoStudio Monitor: Unmatched TRADE_CLOSE (", sym, " magic=", magic,
            ") — no context found, skipping");

   Print("AlgoStudio Monitor: TRADE_CLOSE ticket=", openTicket,
         " profit=", DoubleToString(profit, 2),
         " reason=", closeReason);
   return accepted;
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
      + (g_dealSelectFailures > 0 ? "," + JInt("dealSelectFailures", g_dealSelectFailures) : "")
      + (g_chainDegraded ? ",\"chainStalled\":true" : "")
      + deployJson
      + discoveryJson
      + "}";

   if(HttpPost("/api/telemetry/heartbeat", json))
   {
      g_lastSuccessfulHb = TimeCurrent();
      g_panelError = "";
      Print("AlgoStudio Monitor: Heartbeat OK — bal=", DoubleToString(bal, 2),
            " eq=", DoubleToString(eq, 2), " open=", myOpen, " closed=", totalClosed);

      // Deferred SESSION_START: send once after first successful heartbeat
      // populates g_instanceId (needed for correct canonical hash computation)
      if(!g_sessionStartSent && StringLen(g_instanceId) > 0)
      {
         SendSessionStart();
         g_sessionStartSent = true;
      }
   }
   else
   {
      Print("AlgoStudio Monitor: Heartbeat FAILED — ", g_panelError);
   }
}

//+------------------------------------------------------------------+
//| Pre-compute per-context closed trade stats in a single scan.    |
//| Called once per heartbeat tick, before the context heartbeat     |
//| loop. Populates cachedTotalClosed / cachedTotalPL on each ctx   |
//| so SendContextHeartbeat can skip its own full history scan.     |
//+------------------------------------------------------------------+
void PrecomputeContextStats()
{
   for(int c = 0; c < g_contextCount; c++)
   {
      g_contexts[c].cachedTotalClosed = 0;
      g_contexts[c].cachedTotalPL     = 0;
   }

   HistorySelect(0, TimeCurrent());
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong dTicket = HistoryDealGetTicket(i);
      if(dTicket == 0) continue;
      if(HistoryDealGetInteger(dTicket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      long   magic = (long)HistoryDealGetInteger(dTicket, DEAL_MAGIC);
      string sym   = HistoryDealGetString(dTicket, DEAL_SYMBOL);

      for(int c = 0; c < g_contextCount; c++)
      {
         if(g_contexts[c].magicNumber != magic) continue;
         if(StringLen(g_contexts[c].symbol) > 0 && g_contexts[c].symbol != sym) continue;
         g_contexts[c].cachedTotalClosed++;
         g_contexts[c].cachedTotalPL += HistoryDealGetDouble(dTicket, DEAL_PROFIT);
         break; // Each deal matches at most one context
      }
   }
}

//+------------------------------------------------------------------+
//| PER-CONTEXT HEARTBEAT  (Milestone B)                            |
//| Sends one heartbeat for a single strategy context.              |
//| Parses instanceId and governance from the response into ctx.    |
//| Does NOT send chain events — chain routing is in Milestone C    |
//| functions (SendContextTrackRecordEvent et al.).                 |
//+------------------------------------------------------------------+
void SendContextHeartbeat(StrategyContext &ctx)
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd  = (bal > 0) ? ((bal - eq) / bal * 100.0) : 0;
   if(dd < 0) dd = 0;

   // Use context symbol for spread lookup; fall back to chart symbol if empty
   string spreadSym = (StringLen(ctx.symbol) > 0) ? ctx.symbol : _Symbol;
   int spread = (int)SymbolInfoInteger(spreadSym, SYMBOL_SPREAD);

   ENUM_ACCOUNT_TRADE_MODE tradeMode = (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
   string accMode = (tradeMode == ACCOUNT_TRADE_MODE_DEMO || tradeMode == ACCOUNT_TRADE_MODE_CONTEST)
                    ? "PAPER" : "LIVE";

   // Per-context open position count (filtered by magic + symbol)
   int myOpen = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      if(StringLen(ctx.symbol) > 0 &&
         PositionGetString(POSITION_SYMBOL) != ctx.symbol) continue;
      if((long)PositionGetInteger(POSITION_MAGIC) != ctx.magicNumber) continue;
      myOpen++;
   }

   // Per-context closed trade stats — use cached values from PrecomputeContextStats()
   int    totalClosed = ctx.cachedTotalClosed;
   double totalPL     = ctx.cachedTotalPL;

   // Strategy deployment identity for this context
   string deployJson = ",\"deployment\":{"
      + JStr("symbol", ctx.symbol) + ","
      + JStr("timeframe", ctx.timeframe) + ","
      + JInt("magicNumber", (int)ctx.magicNumber) + ","
      + JStr("eaName", ctx.eaName) + ","
      + JStr("materialFingerprint", ctx.fingerprint)
      + "}";

   string json = "{"
      + JStr("mode", accMode) + ","
      + JStr("symbol", ctx.symbol) + ","
      + JStr("timeframe", ctx.timeframe) + ","
      + JStr("broker", AccountInfoString(ACCOUNT_COMPANY)) + ","
      + JStr("accountNumber", IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))) + ","
      + JMoney("balance", bal) + ","
      + JMoney("equity", eq) + ","
      + JInt("openTrades", myOpen) + ","
      + JInt("totalTrades", totalClosed) + ","
      + JMoney("totalProfit", totalPL) + ","
      + JMoney("drawdown", dd) + ","
      + JInt("spread", spread)
      + deployJson
      + "}";

   string response = "";
   int status = HttpPostCore("/api/telemetry/heartbeat", json, response);

   if(status >= 200 && status < 300)
   {
      g_lastSuccessfulHb = TimeCurrent();
      g_panelError = "";
      Print("AlgoStudio Monitor [", ctx.eaName, "]: Heartbeat OK — bal=",
            DoubleToString(bal, 2), " eq=", DoubleToString(eq, 2),
            " open=", myOpen, " closed=", totalClosed);

      // Assign instanceId once (stable after first server assignment)
      if(StringLen(ctx.instanceId) == 0)
      {
         string id = ParseJsonString(response, "instanceId");
         if(StringLen(id) > 0)
         {
            ctx.instanceId = id;
            Print("AlgoStudio Monitor [", ctx.eaName, "]: instanceId assigned: ", id);
         }
      }

      // Parse governance into this context
      string action = ParseJsonString(response, "action");
      if(action == "RUN" || action == "PAUSE" || action == "STOP")
      {
         if(action != ctx.govAction)
         {
            Print("AlgoStudio Monitor [", ctx.eaName, "]: Governance: ",
                  ctx.govAction, " -> ", action);
            ctx.govReason = "";
         }
         ctx.govAction     = action;
         ctx.govReceivedAt = TimeCurrent();
      }
      else if(StringLen(action) == 0)
      {
         // No governance field — default to RUN (fail-safe)
         ctx.govAction = "RUN";
         ctx.govReason = "";
      }
      // Unrecognized value: keep previous action

      string reason = ParseJsonString(response, "reasonCode");
      if(StringLen(reason) > 0)
         ctx.govReason = reason;
   }
   else if(status != -1)
   {
      // HTTP error (not a network failure) — surface in panel
      g_panelError = "HTTP " + IntegerToString(status) + " [" + ctx.eaName + "]";
      Print("AlgoStudio Monitor [", ctx.eaName, "]: Heartbeat FAILED — HTTP ", status);
   }
   else
   {
      Print("AlgoStudio Monitor [", ctx.eaName, "]: Heartbeat FAILED — ", g_panelError);
   }
}

//+------------------------------------------------------------------+
//| HTTP TRANSPORT CORE — retry + backoff, returns response body.   |
//| Pure transport: no global state side-effects.                   |
//| Callers are responsible for parsing the response.               |
//+------------------------------------------------------------------+
int HttpPostCore(string endpoint, string jsonBody, string &responseBody)
{
   responseBody = "";
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
            Print("AlgoStudio Monitor: Add ", InpBaseUrl,
                  " to Tools > Options > Expert Advisors > Allow WebRequest");
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

      responseBody = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      return res;
   }

   return -1;
}

//+------------------------------------------------------------------+
//| Legacy HttpPostEx — wraps HttpPostCore and updates global state. |
//| Used by chain event senders (SendTrackRecordEvent) and queue     |
//| flush (FlushOfflineQueue). Legacy single-context heartbeat also  |
//| routes through here so its global ParseInstanceId /             |
//| ParseGovernanceAction side-effects are preserved unchanged.     |
//+------------------------------------------------------------------+
int HttpPostEx(string endpoint, string jsonBody)
{
   string response = "";
   int status = HttpPostCore(endpoint, jsonBody, response);

   if(status >= 200 && status < 300)
   {
      if(StringLen(g_instanceId) == 0)
         ParseInstanceId(response);

      // Parse governance action from heartbeat responses
      if(StringFind(endpoint, "/heartbeat") >= 0)
         ParseGovernanceAction(response);
   }

   return status;
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
   string tmpFile = queueFile + ".tmp";

   int handle = FileOpen(tmpFile, FILE_WRITE | FILE_TXT | FILE_COMMON);
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

   // Promote temp to live — preserves previous queue file on failure.
   if(!FileCopy(tmpFile, FILE_COMMON, queueFile, FILE_COMMON | FILE_REWRITE))
      Print("AlgoStudio Monitor: WARNING — queue file promotion failed.");

   FileDelete(tmpFile, FILE_COMMON);
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

   // Write to temp file first, then copy over live file.
   // Crash during temp write leaves the live file intact.
   string tmpFile = g_stateFile + ".tmp";

   int handle = FileOpen(tmpFile, FILE_WRITE | FILE_TXT | FILE_COMMON);
   if(handle == INVALID_HANDLE) return;

   FileWriteString(handle, IntegerToString(g_seqNo) + "\n");
   FileWriteString(handle, g_lastHash + "\n");
   FileWriteString(handle, g_instanceId + "\n");
   FileWriteString(handle, IntegerToString(g_droppedEvents) + "\n");
   FileWriteString(handle, (g_chainDegraded ? "1" : "0") + "\n");

   // Per-context chain state (Milestone C)
   // Format: count on line 6, then one line per context: fingerprint|seqNo|lastHash|instanceId|sessionStartSent
   FileWriteString(handle, IntegerToString(g_contextCount) + "\n");
   for(int i = 0; i < g_contextCount; i++)
   {
      FileWriteString(handle, g_contexts[i].fingerprint
         + "|" + IntegerToString(g_contexts[i].seqNo)
         + "|" + g_contexts[i].lastHash
         + "|" + g_contexts[i].instanceId
         + "|" + (g_contexts[i].sessionStartSent ? "1" : "0")
         + "\n");
   }

   FileClose(handle);

   // Promote temp to live via FileCopy (not guaranteed atomic, but crash
   // during temp write leaves the live file intact — significant improvement
   // over direct truncate-on-open). If copy fails, previous state is preserved.
   if(!FileCopy(tmpFile, FILE_COMMON, g_stateFile, FILE_COMMON | FILE_REWRITE))
      Print("AlgoStudio Monitor: WARNING — state file promotion failed, previous state preserved.");

   FileDelete(tmpFile, FILE_COMMON);
}

void LoadState()
{
   string prefix = "ASM_" + StringSubstr(InpApiKey, 0, 8) + "_";

   // Try GlobalVariables first (faster, more current)
   if(GlobalVariableCheck(prefix + "seqNo"))
   {
      g_seqNo = (int)GlobalVariableGet(prefix + "seqNo");
   }

   // Load full state from file (needed for hash + instanceId).
   // If the live file is missing or structurally invalid (empty, truncated,
   // corrupt hash on line 2), try the temp file as fallback — covers the
   // scenario where a crash occurred after temp write but before promotion,
   // or during a FileCopy that left the live file incomplete.
   string stateSource = g_stateFile;
   string tmpFile = g_stateFile + ".tmp";
   bool needFallback = !FileIsExist(g_stateFile, FILE_COMMON);
   if(!needFallback)
   {
      // Structural validation: line 1 = seqNo, line 2 = 64-char hash.
      // If hash is missing or wrong length, the file is corrupt.
      int probe = FileOpen(g_stateFile, FILE_READ | FILE_TXT | FILE_COMMON);
      if(probe == INVALID_HANDLE)
      {
         needFallback = true;
      }
      else
      {
         string probeLine1 = FileIsEnding(probe) ? "" : FileReadString(probe);
         string probeLine2 = FileIsEnding(probe) ? "" : FileReadString(probe);
         FileClose(probe);
         if(StringLen(probeLine2) != 64)
            needFallback = true;
      }
   }
   if(needFallback && FileIsExist(tmpFile, FILE_COMMON))
   {
      stateSource = tmpFile;
      Print("AlgoStudio Monitor: Live state file missing or corrupt — recovering from temp file.");
   }

   if(FileIsExist(stateSource, FILE_COMMON))
   {
      int handle = FileOpen(stateSource, FILE_READ | FILE_TXT | FILE_COMMON);
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
         // Per-context chain state restoration (Milestone C)
         if(!FileIsEnding(handle))
         {
            int savedCtxCount = (int)StringToInteger(FileReadString(handle));
            for(int c = 0; c < savedCtxCount && !FileIsEnding(handle); c++)
            {
               string line = FileReadString(handle);
               // Parse: fingerprint|seqNo|lastHash|instanceId|sessionStartSent
               string parts[];
               int partCount = StringSplit(line, '|', parts);
               if(partCount < 5) continue;

               string fp = parts[0];
               // Match to current context by fingerprint
               for(int j = 0; j < g_contextCount; j++)
               {
                  if(g_contexts[j].fingerprint == fp)
                  {
                     g_contexts[j].seqNo    = (int)StringToInteger(parts[1]);
                     if(StringLen(parts[2]) == 64)
                        g_contexts[j].lastHash = parts[2];
                     if(StringLen(parts[3]) > 0)
                        g_contexts[j].instanceId = parts[3];
                     g_contexts[j].sessionStartSent = (parts[4] == "1");
                     Print("AlgoStudio Monitor: Restored context [", g_contexts[j].eaName,
                           "] seqNo=", g_contexts[j].seqNo,
                           " instanceId=", StringLen(g_contexts[j].instanceId) > 0
                              ? g_contexts[j].instanceId : "(pending)");
                     break;
                  }
               }
            }
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

   // Row 1: Governance
   // Manifest mode: worst-case across contexts (display only; does not gate runtime).
   // Legacy mode: terminal-level g_govAction from backend heartbeat response.
   string displayGov = g_manifestMode ? GetWorstContextGovAction() : g_govAction;
   string govLabel;
   color  govClr;
   if(displayGov == "RUN")
   {
      govLabel = "RUN";
      govClr = OVL_GREEN;
   }
   else if(displayGov == "PAUSE")
   {
      govLabel = "PAUSED";
      if(!g_manifestMode && StringLen(g_govReason) > 0)
         govLabel = govLabel + "  " + g_govReason;
      if(StringLen(govLabel) > 40)
         govLabel = StringSubstr(govLabel, 0, 37) + "...";
      govClr = OVL_YELLOW;
   }
   else
   {
      govLabel = "STOPPED";
      if(!g_manifestMode && StringLen(g_govReason) > 0)
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

   // Row 3: Instance — context count in manifest mode, instanceId in legacy mode
   string instLabel;
   if(g_manifestMode)
      instLabel = IntegerToString(g_contextCount) + " context" + (g_contextCount != 1 ? "s" : "");
   else
   {
      instLabel = "(pending)";
      if(StringLen(g_instanceId) > 0)
         instLabel = g_instanceId;
   }
   PanelSetValue(3, instLabel, OVL_VALUE_COLOR);

   // Row 4: Account — login | server
   string acctText = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))
                   + "  " + AccountInfoString(ACCOUNT_SERVER);
   PanelSetValue(4, acctText, OVL_DIM_COLOR);

   // Row 5: Queue + deal-select failures
   if(g_queueCount > 0 || g_dealSelectFailures > 0)
   {
      string diagParts = "";
      if(g_queueCount > 0)
         diagParts = IntegerToString(g_queueCount) + " queued";
      if(g_dealSelectFailures > 0)
         diagParts += (StringLen(diagParts) > 0 ? "  " : "")
                    + IntegerToString(g_dealSelectFailures) + " deal-sel fail";
      PanelSetValue(5, diagParts, OVL_YELLOW);
   }
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
