# LIVE_MONITORING — System 2 Design

## 0. Existing Systems Audit Summary

**Lifecycle state machine** (`src/lib/strategy-lifecycle/transitions.ts`):
States: `DRAFT → BACKTESTED → VERIFIED → LIVE_MONITORING → EDGE_AT_RISK → INVALIDATED`

- `INVALIDATED` is terminal
- `EDGE_AT_RISK ↔ LIVE_MONITORING` recovery path exists

**Health evaluator** (`src/lib/strategy-health/evaluator.ts`):

- Already drives `PROVEN → RETIRED` (maps to `EDGE_AT_RISK`) and recovery
- Uses `lifecyclePhase` (legacy field) alongside `lifecycleState`
- Operates per `instanceId` (LiveEAInstance), not per `strategyId`
- Collects 30-day rolling live metrics, scores against backtest baseline
- CUSUM drift detection already built in (`thresholds.ts:100-108`)

**Verification service** (`src/domain/verification/verification-service.ts`):

- 3-phase pipeline: Trade Ingest → Config+Verdict → Proof+Transition
- Deterministic MC via seeded PRNG, config hash integrity
- Produces `snapshotHash`, `configVersion`, `thresholdsHash`

**TradeFact pipeline** (`src/domain/trade-ingest/`):

- Append-only facts with `(strategyId, source, sourceTicket)` uniqueness
- `buildTradeSnapshot()` → deterministic SHA-256 hash
- `deriveIntermediateResults()` → walkForward + MC inputs

**Proof chain** (`src/lib/proof/`):

- Hash-chained events per `recordId`, Serializable transactions
- `appendProofEvent()` — generic single-event append
- `appendVerificationRunProof()` — atomic 1-2 event append
- Existing types: `VERIFICATION_RUN_COMPLETED`, `VERIFICATION_PASSED`, `TRADE_FACTS_INGESTED`

**Entity relationship gap**:

- `TradeFact` keys on `strategyId` (StrategyIdentity.strategyId, e.g. "AS-abc123")
- `LiveEAInstance` keys on `id` (cuid), linked to `strategyVersionId`
- Health evaluator operates on `instanceId`
- Verification operates on `strategyId`
- MonitoringRun must bridge both: resolve `instanceId` → `strategyId` via `StrategyVersion → StrategyIdentity`

---

## 1. What a MonitoringRun Is

A **MonitoringRun** is a point-in-time evaluation of a live-monitored strategy that:

1. Loads the latest TradeFact snapshot (backtest + live)
2. Computes health metrics against the verified baseline
3. Applies deterministic rules to produce a `monitoringVerdict`
4. Decides if the lifecycle state should change
5. Writes an immutable proof event (fail-closed)

It is NOT a long-running process. It is a single synchronous evaluation, analogous to a verification run but lighter-weight and repeatable.

### Inputs

```
strategyId: string          — StrategyIdentity.strategyId
instanceId: string          — LiveEAInstance.id (for health data)
configVersion: string       — monitoring config version (e.g. "1.0.0")
currentLifecycleState: StrategyLifecycleState
```

Loaded from DB during execution (not passed as params):

- TradeFacts for strategy (all sources)
- HealthSnapshots for instance (recent window)
- Backtest baseline metrics
- Verification thresholds (reused from verification config)

### Outputs

```typescript
interface MonitoringRunResult {
  recordId: string; // UUID, proof chain key
  strategyId: string;
  monitoringVerdict: MonitoringVerdict; // "HEALTHY" | "AT_RISK" | "INVALIDATED"
  ruleResults: RuleResult[]; // per-rule pass/fail + measured values
  snapshotHash: string; // current TradeFact snapshot hash
  configVersion: string;
  decision: TransitionDecision; // TRANSITION | NO_TRANSITION
  timestamp: string; // ISO 8601
}
```

---

## 2. Monitoring Evaluation Model

### Rule Layer Design

Each rule is a pure function:

```typescript
interface MonitoringRule {
  id: string; // e.g. "drawdown_breach"
  evaluate(ctx: MonitoringContext): RuleResult;
}

interface RuleResult {
  ruleId: string;
  passed: boolean;
  measured: number; // actual value
  threshold: number; // config threshold
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
}
```

Rules receive a `MonitoringContext` containing all pre-loaded data (no DB access in rules).

### Proposed Rules

**Rule 1: Drawdown Breach**

- Compare live max drawdown (from HealthSnapshot) vs verified backtest drawdown
- Threshold: `liveDD > verifiedDD * DRAWDOWN_MULTIPLIER` (e.g. 1.5×)
- Severity: CRITICAL

**Rule 2: Sharpe Degradation**

- Compare rolling 30-day live Sharpe vs backtest Sharpe
- Threshold: degradation > `MAX_LIVE_SHARPE_DEGRADATION_PCT` (e.g. 50%)
- Uses same methodology as verification D1 but on live data
- Severity: WARNING at 40%, CRITICAL at 60%

**Rule 3: Losing Streak**

- Count consecutive losing trades from recent TradeFacts (source=LIVE)
- Threshold: `consecutiveLosses > MAX_CONSECUTIVE_LOSSES` (e.g. 10)
- Severity: WARNING at threshold, CRITICAL at 2× threshold

**Rule 4: Inactivity Detection**

- Time since last TradeFact (source=LIVE) for this strategy
- Threshold: `daysSinceLastTrade > MAX_INACTIVITY_DAYS` (e.g. 14)
- Severity: WARNING

**Rule 5: CUSUM Drift Confirmation**

- Uses existing CUSUM drift detection from HealthSnapshot.driftDetected
- If drift detected for `N` consecutive snapshots → confirmed drift
- Threshold: `consecutiveDriftSnapshots > DRIFT_CONFIRMATION_COUNT` (e.g. 3)
- Severity: CRITICAL

### Rule Properties

All rules:

- **Deterministic**: same inputs → same outputs (no randomness)
- **Config-driven**: all thresholds from a versioned config object
- **Fail-closed**: rule evaluation error → treat as CRITICAL
- **Pure**: no side effects, no DB access, no logging

### Verdict Accumulation

```
if any rule severity == CRITICAL → monitoringVerdict = "AT_RISK"
if CRITICAL count >= INVALIDATION_THRESHOLD → monitoringVerdict = "INVALIDATED"
if all rules passed or only INFO/WARNING → monitoringVerdict = "HEALTHY"
```

The `INVALIDATION_THRESHOLD` (e.g. 3 CRITICAL rules simultaneously) prevents a single noisy signal from invalidating a strategy.

---

## 3. Lifecycle Transitions

### Transition: VERIFIED → LIVE_MONITORING

**Guard:** Manual or automatic when EA instance connects with a verified strategy.
**This transition already exists** — no new logic needed. The verification service produces `VERIFIED`, and the user/system activates monitoring.

### Transition: LIVE_MONITORING → EDGE_AT_RISK

**Guard (MonitoringRun):**

```
monitoringVerdict == "AT_RISK"
AND currentLifecycleState == "LIVE_MONITORING"
```

**Proof event:** `STRATEGY_EDGE_AT_RISK`

### Transition: EDGE_AT_RISK → INVALIDATED

**Guard (MonitoringRun):**

```
monitoringVerdict == "INVALIDATED"
AND currentLifecycleState == "EDGE_AT_RISK"
```

Cannot skip directly from `LIVE_MONITORING` to `INVALIDATED` via monitoring. The `VALID_LIFECYCLE_TRANSITIONS` map already allows `LIVE_MONITORING → INVALIDATED`, but the monitoring system should enforce a two-step process: first `AT_RISK`, then `INVALIDATED` if conditions persist. Direct `LIVE_MONITORING → INVALIDATED` remains available for manual retirement only.

**Proof event:** `STRATEGY_INVALIDATED`

### Transition: EDGE_AT_RISK → LIVE_MONITORING (Recovery)

**Guard (MonitoringRun):**

```
monitoringVerdict == "HEALTHY"
AND currentLifecycleState == "EDGE_AT_RISK"
AND consecutiveHealthyRuns >= RECOVERY_CONSECUTIVE_HEALTHY (e.g. 3)
```

Recovery requires sustained health — a single healthy run is not sufficient.

**Proof event:** `STRATEGY_RECOVERED`

### State-Transition Matrix (Monitoring Only)

| Current State   | Verdict             | Transition        | Proof Event                                      |
| --------------- | ------------------- | ----------------- | ------------------------------------------------ |
| LIVE_MONITORING | HEALTHY             | NO_TRANSITION     | MONITORING_RUN_COMPLETED                         |
| LIVE_MONITORING | AT_RISK             | → EDGE_AT_RISK    | MONITORING_RUN_COMPLETED + STRATEGY_EDGE_AT_RISK |
| EDGE_AT_RISK    | AT_RISK             | NO_TRANSITION     | MONITORING_RUN_COMPLETED                         |
| EDGE_AT_RISK    | INVALIDATED         | → INVALIDATED     | MONITORING_RUN_COMPLETED + STRATEGY_INVALIDATED  |
| EDGE_AT_RISK    | HEALTHY (sustained) | → LIVE_MONITORING | MONITORING_RUN_COMPLETED + STRATEGY_RECOVERED    |
| EDGE_AT_RISK    | HEALTHY (single)    | NO_TRANSITION     | MONITORING_RUN_COMPLETED                         |

---

## 4. Proof Integration

### New Proof Event Types

**MONITORING_RUN_COMPLETED** (always, every run):

```typescript
{
  eventType: "MONITORING_RUN_COMPLETED",
  recordId: string,                    // MonitoringRun UUID
  strategyId: string,
  monitoringVerdict: "HEALTHY" | "AT_RISK" | "INVALIDATED",
  ruleResults: RuleResult[],           // all rules with measured/threshold
  snapshotHash: string,                // current TradeFact snapshot
  configVersion: string,               // monitoring config version
  timestamp: string,
}
```

**STRATEGY_EDGE_AT_RISK** (on transition to EDGE_AT_RISK):

```typescript
{
  eventType: "STRATEGY_EDGE_AT_RISK",
  recordId: string,                    // same recordId as run
  strategyId: string,
  triggeringRules: string[],           // ruleIds that triggered CRITICAL
  snapshotHash: string,
  configVersion: string,
  timestamp: string,
}
```

**STRATEGY_RECOVERED** (on transition back to LIVE_MONITORING):

```typescript
{
  eventType: "STRATEGY_RECOVERED",
  recordId: string,
  strategyId: string,
  consecutiveHealthyRuns: number,
  snapshotHash: string,
  configVersion: string,
  timestamp: string,
}
```

**STRATEGY_INVALIDATED** (on terminal transition):

```typescript
{
  eventType: "STRATEGY_INVALIDATED",
  recordId: string,
  strategyId: string,
  triggeringRules: string[],
  snapshotHash: string,
  configVersion: string,
  timestamp: string,
}
```

### Chain Model

Each MonitoringRun gets its own `recordId` (UUID). Events for a single run are chained together (sequence 1, 2) exactly like verification runs use `appendVerificationRunProof()`. A new `appendMonitoringRunProof()` function follows the same pattern.

### Payload Whitelist

New keys to add to `PAYLOAD_WHITELIST` in the proof audit UI:

```
"monitoringVerdict", "ruleResults", "triggeringRules", "consecutiveHealthyRuns"
```

---

## 5. Execution Model

### Recommendation: **B — Event-driven (after ingest)**

**Why event-driven over interval polling:**

1. **Natural trigger point exists.** The webhook-ingest pipeline (C5) and import-csv route already produce `TRADE_FACTS_INGESTED` proof events. A monitoring run should fire after each new batch of live trade facts is ingested — this is the moment when the data changes.

2. **No wasted computation.** Interval polling (e.g. every 15 min) would fire even when no new data exists. A strategy with no new trades doesn't need re-evaluation.

3. **Lower latency to detection.** Event-driven reacts immediately when new live data arrives. A 15-min poll adds up to 15 min of detection lag.

4. **Simpler infrastructure.** No cron job, no scheduler, no background worker. The ingest pipeline calls `triggerMonitoringRun()` as the last step after proof event persistence succeeds.

5. **Backpressure built in.** The rate limiter on the ingest endpoint (30 req/min for webhook) naturally limits monitoring run frequency.

### Execution Flow

```
Webhook/CSV Ingest
  → runCsvIngestPipeline() succeeds
  → TRADE_FACTS_INGESTED proof event written
  → triggerMonitoringRunIfEligible(strategyId)
       ├─ Check: lifecycleState ∈ {LIVE_MONITORING, EDGE_AT_RISK}?
       ├─ Check: source includes LIVE facts? (skip backtest-only ingests)
       ├─ Check: cooldown (e.g. 1 run per 5 min per strategy)?
       └─ If eligible → runMonitoringEvaluation(strategyId)
```

**Edge case — backtest-only ingests:** If `source == "BACKTEST"`, monitoring should NOT trigger. Only `LIVE` trade fact ingests trigger monitoring runs.

**Cooldown:** Even though the event trigger is precise, we add a per-strategy cooldown (e.g. 5 minutes) to prevent rapid-fire evaluations if multiple webhook batches arrive in quick succession.

### Integration Point

The trigger lives in `runCsvIngestPipeline()` as a post-success hook, NOT in the route handler. This ensures:

- Both import-csv and webhook-ingest benefit
- The trigger only fires after successful proof persistence
- The monitoring run itself is fire-and-forget (errors logged, not propagated to caller)

```typescript
// In runCsvIngestPipeline, after appendProofEvent succeeds:
if (source === "LIVE") {
  triggerMonitoringRunIfEligible(strategyId).catch((err) => {
    log.error({ err, strategyId }, "Monitoring trigger failed (non-fatal)");
  });
}
```

The monitoring run itself is fail-closed internally (proof write failure → logged error, no false positive), but its invocation from the ingest pipeline is fire-and-forget (ingest success is not dependent on monitoring success).

---

## 6. Architecture Diagram

```
                           ┌──────────────────────────┐
                           │   Webhook / CSV Import    │
                           │   POST /api/internal/     │
                           │   trades/webhook-ingest   │
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │  runCsvIngestPipeline()   │
                           │  ─────────────────────    │
                           │  1. parseCsvDeals         │
                           │  2. ingestTradeFactsFrom  │
                           │     Deals (skipDupes)     │
                           │  3. buildTradeSnapshot    │
                           │  4. appendProofEvent      │
                           │     (TRADE_FACTS_INGESTED)│
                           └────────────┬─────────────┘
                                        │
                                        │ source == "LIVE" ?
                                        ▼
                           ┌──────────────────────────┐
                           │  triggerMonitoringRun     │
                           │  IfEligible()             │
                           │  ─────────────────────    │
                           │  • state ∈ {LIVE_MON,     │
                           │    EDGE_AT_RISK} ?        │
                           │  • cooldown check         │
                           │  • fire-and-forget        │
                           └────────────┬─────────────┘
                                        │
                                        ▼
          ┌─────────────────────────────────────────────────────┐
          │              runMonitoringEvaluation()              │
          │  ───────────────────────────────────────────────    │
          │                                                     │
          │  Phase 0: Load Context                              │
          │  ├─ TradeFacts (all, sorted)                        │
          │  ├─ buildTradeSnapshot → snapshotHash               │
          │  ├─ HealthSnapshots (recent N)                      │
          │  ├─ Backtest baseline                               │
          │  └─ Monitoring config (versioned, hash-checked)     │
          │                                                     │
          │  Phase 1: Evaluate Rules                            │
          │  ├─ Drawdown breach                                 │
          │  ├─ Sharpe degradation                              │
          │  ├─ Losing streak                                   │
          │  ├─ Inactivity                                      │
          │  └─ CUSUM drift confirmation                        │
          │  → Accumulate → monitoringVerdict                   │
          │                                                     │
          │  Phase 2: Decide Transition                         │
          │  ├─ decideMonitoringTransition(verdict, state)      │
          │  └─ Check recovery consecutive count                │
          │                                                     │
          │  Phase 3: Persist Proof (fail-closed)               │
          │  ├─ MONITORING_RUN_COMPLETED (always)               │
          │  └─ STRATEGY_EDGE_AT_RISK / RECOVERED /             │
          │     INVALIDATED (if transition)                     │
          │                                                     │
          │  Phase 4: Apply Lifecycle Transition                │
          │  └─ performLifecycleTransition() (only after proof) │
          └─────────────────────────────────────────────────────┘
```

---

## 7. Invariant Checklist

| #   | Invariant                                                 | Enforcement                                                                  |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| I1  | Same TradeFact set → same snapshotHash                    | `buildTradeSnapshot` uses deterministic sort + SHA-256                       |
| I2  | All rules are pure functions (no IO, no randomness)       | Rules receive `MonitoringContext`, no DB/logger access                       |
| I3  | Rule evaluation error → treated as CRITICAL (fail-closed) | try/catch in rule runner, error → `{ passed: false, severity: "CRITICAL" }`  |
| I4  | Proof event written BEFORE lifecycle transition           | Phase 3 before Phase 4, same ordering as verification-service                |
| I5  | Proof write failure → no transition, no success claim     | `appendMonitoringRunProof` error propagates, Phase 4 never reached           |
| I6  | configVersion + snapshotHash in every proof event         | Mandatory fields in all 4 event type payloads                                |
| I7  | No direct LIVE_MONITORING → INVALIDATED via monitoring    | `decideMonitoringTransition` only allows → EDGE_AT_RISK from LIVE_MONITORING |
| I8  | Recovery requires N consecutive HEALTHY runs              | Counter loaded from recent MonitoringRun proof events, not transient state   |
| I9  | Backtest-only ingests do not trigger monitoring           | Source check before trigger (`source === "LIVE"`)                            |
| I10 | Per-strategy cooldown prevents rapid-fire evaluations     | Timestamp check against last MONITORING_RUN_COMPLETED event                  |
| I11 | Monitoring trigger is fire-and-forget from ingest         | `.catch()` wrapper, ingest success independent of monitoring                 |
| I12 | No secrets or trade data in logs                          | Same pino redact config as existing routes                                   |

---

## 8. Implementation Roadmap

### Step 1: Monitoring Config + Constants

- Create `src/domain/monitoring/constants.ts` with versioned thresholds
- Define `MonitoringConfig` type with all rule thresholds
- Config version starts at `"1.0.0"`

### Step 2: Monitoring Rules (Pure Functions)

- Create `src/domain/monitoring/rules/` directory
- One file per rule: `drawdown-breach.ts`, `sharpe-degradation.ts`, `losing-streak.ts`, `inactivity.ts`, `cusum-drift.ts`
- Create `src/domain/monitoring/types.ts` with `MonitoringContext`, `RuleResult`, `MonitoringVerdict`
- Create `src/domain/monitoring/evaluate-rules.ts` — rule runner with verdict accumulation
- Unit tests for each rule + verdict accumulation

### Step 3: Monitoring Transition Logic

- Create `src/domain/monitoring/decide-transition.ts`
- Pure function: `(verdict, currentState, consecutiveHealthyCount) → TransitionDecision`
- Unit tests covering all cells in the state-transition matrix

### Step 4: Monitoring Proof Events

- Add `appendMonitoringRunProof()` to `src/lib/proof/events.ts` (or a new file)
- Atomic 1-2 event append (same pattern as `appendVerificationRunProof`)
- Update `PAYLOAD_WHITELIST` in proof audit UI
- Tests for chaining, atomicity, fail-closed

### Step 5: MonitoringRun Orchestrator

- Create `src/domain/monitoring/run-monitoring-evaluation.ts`
- 4-phase pipeline: Load Context → Evaluate Rules → Persist Proof → Apply Transition
- Resolves `strategyId` from instance's `strategyVersionId → StrategyIdentity.strategyId`
- Integration tests with mocked DB/proof

### Step 6: Event-Driven Trigger

- Create `src/domain/monitoring/trigger.ts` with `triggerMonitoringRunIfEligible()`
- Eligibility checks: lifecycle state, source, cooldown
- Integrate into `runCsvIngestPipeline` as post-success fire-and-forget hook
- Tests for eligibility logic

### Step 7: Alerts Integration

- Wire monitoring verdicts to existing `triggerAlert()` system
- Alert types: `MONITORING_AT_RISK`, `MONITORING_RECOVERED`, `MONITORING_INVALIDATED`
- Reuse existing flapping detection from strategy-status

### Step 8: Internal API (Optional)

- `POST /api/internal/monitoring/run` — manual trigger for testing
- `GET /api/internal/monitoring/history?strategyId=` — recent monitoring runs
- Both use API key auth (same as other internal routes)

---

## 9. Risks & Mitigations

| Risk                                                                                                                              | Impact                                                     | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Health evaluator conflict** — existing `evaluateHealth()` already drives `EDGE_AT_RISK` transitions via legacy `lifecyclePhase` | Dual systems fighting over same lifecycle state            | Step 5 must reconcile: monitoring system becomes the authority for `LIVE_MONITORING ↔ EDGE_AT_RISK ↔ INVALIDATED` transitions. Existing health evaluator's `updateLifecyclePhase()` should be gated to NOT perform lifecycle transitions when `lifecycleState ∈ {LIVE_MONITORING, EDGE_AT_RISK}` — only MonitoringRun handles those states. Health evaluator continues for `NEW/PROVING/PROVEN/RETIRED` phase management. |
| **Entity ID mismatch** — TradeFact uses `strategyId`, HealthSnapshot uses `instanceId`                                            | MonitoringRun needs both                                   | Resolver in Phase 0: `instanceId → strategyVersionId → strategyIdentityId → strategyId`. Cache the mapping per run.                                                                                                                                                                                                                                                                                                       |
| **Missing live TradeFacts** — strategy may be in LIVE_MONITORING but only have backtest facts                                     | Rules produce misleading results                           | Phase 0 pre-check: if no `source=LIVE` TradeFacts exist, skip monitoring (log warning).                                                                                                                                                                                                                                                                                                                                   |
| **Cooldown vs detection speed** — too aggressive cooldown delays anomaly detection                                                | Late risk detection                                        | 5-min cooldown is aggressive enough. Even with 30 req/min webhook rate limit, one evaluation per 5 min is sufficient.                                                                                                                                                                                                                                                                                                     |
| **Config drift** — monitoring config changes between runs                                                                         | Different runs use different thresholds                    | Store `configVersion` in every proof event. Config loading uses same integrity-check pattern as verification config.                                                                                                                                                                                                                                                                                                      |
| **Proof chain scope** — each MonitoringRun gets its own recordId chain                                                            | Cannot query "all monitoring events for a strategy" easily | Use `strategyId` filter + `type LIKE 'MONITORING_%'` for strategy-level queries. Individual run integrity verified per recordId.                                                                                                                                                                                                                                                                                          |
| **Recovery counter persistence** — consecutive healthy count must survive restarts                                                | Transient counter resets, premature recovery               | Count from recent `MONITORING_RUN_COMPLETED` proof events where `monitoringVerdict === "HEALTHY"`, not from in-memory state. This is tamper-evident (proof chain) and restart-safe.                                                                                                                                                                                                                                       |
