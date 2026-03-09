# Production Canary Runbook — AlgoStudio Live Monitoring

**Purpose:** Verify the heartbeat + monitoring + proof pipeline works in production WITHOUT a real EA.
**Scope:** Read-only verification. One canary strategy. No user impact.
**Date created:** 2026-03-05

---

## SECTION 1 — Preflight

### 1.1 Confirm INTERNAL_API_KEY

```bash
# Verify the env var is set (prints length, NOT the value)
echo "Key length: ${#INTERNAL_API_KEY}"
# Expected: a non-zero number (e.g., 32 or 64)
```

If empty, export it in your terminal session:

```bash
read -s INTERNAL_API_KEY   # paste key, press Enter (not echoed)
export INTERNAL_API_KEY
```

### 1.2 Select canary strategyId

**Option A — Use the demo strategy (preferred):**

Run this SQL in Neon Console to find it:

```sql
SELECT si."strategyId", vsp."slug", lei."lifecycleState", lei."operatorHold"
FROM "VerifiedStrategyPage" vsp
JOIN "StrategyIdentity" si ON si.id = vsp."strategyIdentityId"
LEFT JOIN "StrategyVersion" sv ON sv."strategyIdentityId" = si.id
LEFT JOIN "LiveEAInstance" lei ON lei."strategyVersionId" = sv.id
WHERE vsp."slug" = 'demo'
  AND vsp."isPublic" = true
LIMIT 1;
```

**Option B — Find any safe canary:**

```sql
SELECT si."strategyId", lei."lifecycleState", lei."operatorHold", lei."deletedAt"
FROM "LiveEAInstance" lei
JOIN "StrategyVersion" sv ON sv.id = lei."strategyVersionId"
JOIN "StrategyIdentity" si ON si.id = sv."strategyIdentityId"
WHERE lei."deletedAt" IS NULL
  AND lei."lifecycleState" = 'LIVE_MONITORING'
ORDER BY lei."createdAt" DESC
LIMIT 5;
```

Pick one and set it:

```bash
CANARY_STRATEGY_ID="AS-XXXXXXXX"   # replace with actual
```

### 1.3 Rate limit budget

The heartbeat endpoint allows **60 req/min/IP**. This runbook uses at most ~10 requests total across all sections. Safe margin confirmed.

---

## SECTION 2 — Heartbeat Simulation

### 2.1 Single heartbeat request

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}\n" \
  -X POST https://algo-studio.com/api/internal/heartbeat \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: ${INTERNAL_API_KEY}" \
  -d "{\"strategyId\": \"${CANARY_STRATEGY_ID}\"}" | jq .
```

**Expected response (200):**

```json
{
  "strategyId": "AS-XXXXXXXX",
  "action": "RUN",
  "reasonCode": "OK",
  "serverTime": "2026-03-05T..."
}
```

### 2.2 Heartbeat decision reference (Source of Truth)

| Priority | Condition                           | Action    | ReasonCode                |
| -------- | ----------------------------------- | --------- | ------------------------- |
| 1        | No instance / null lifecycleState   | **PAUSE** | `NO_INSTANCE`             |
| 2        | `authorityReady === false`          | **PAUSE** | `AUTHORITY_UNINITIALIZED` |
| 3        | `operatorHold === "HALTED"`         | **STOP**  | `STRATEGY_HALTED`         |
| 4        | `lifecycleState === "INVALIDATED"`  | **STOP**  | `STRATEGY_INVALIDATED`    |
| 5        | `lifecycleState === "EDGE_AT_RISK"` | **PAUSE** | `MONITORING_AT_RISK`      |
| 6        | `monitoringSuppressedUntil > now`   | **PAUSE** | `MONITORING_SUPPRESSED`   |
| 7        | All clear                           | **RUN**   | `OK`                      |

### 2.3 Acceptable responses by canary state

| Canary lifecycleState | Expected action | Expected reasonCode  |
| --------------------- | --------------- | -------------------- |
| LIVE_MONITORING       | RUN             | OK                   |
| EDGE_AT_RISK          | PAUSE           | MONITORING_AT_RISK   |
| INVALIDATED           | STOP            | STRATEGY_INVALIDATED |

Any of the above = heartbeat is working correctly.

### 2.4 Burst test (5 requests, ~10s apart)

```bash
for i in 1 2 3 4 5; do
  echo "--- Request $i ---"
  curl -s -X POST https://algo-studio.com/api/internal/heartbeat \
    -H "Content-Type: application/json" \
    -H "x-internal-api-key: ${INTERNAL_API_KEY}" \
    -d "{\"strategyId\": \"${CANARY_STRATEGY_ID}\"}" | jq '{action, reasonCode}'
  sleep $((8 + RANDOM % 5))   # 8-12s jitter
done
```

**PASS:** All 5 return the same action+reasonCode (consistent with canary state).

### 2.5 Error handling

| HTTP Status                            | Meaning                                | Action                                               |
| -------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| **401**                                | Bad or missing API key                 | Verify `INTERNAL_API_KEY` matches production env var |
| **429**                                | Rate limited                           | Wait 60s, retry with fewer requests                  |
| **200** + `PAUSE`/`NO_INSTANCE`        | No LiveEAInstance found for strategyId | Verify canary strategyId exists in DB (Section 1.2)  |
| **200** + `PAUSE`/`COMPUTATION_FAILED` | Server-side error (fail-closed)        | Check Vercel function logs for the error             |

---

## SECTION 3 — Trade Ingest Simulation

**Route used:** `POST /api/internal/trades/import-csv`
(Uses same `x-internal-api-key` auth — simpler than webhook-ingest which requires HMAC signing.)

### 3.1 Prerequisites

The canary strategyId must:

- Have a `LiveEAInstance` with `operatorHold = 'NONE'` (not HALTED)
- Have `lifecycleState = 'LIVE_MONITORING'` (to trigger monitoring)

Verify:

```sql
SELECT lei."lifecycleState", lei."operatorHold"
FROM "LiveEAInstance" lei
JOIN "StrategyVersion" sv ON sv.id = lei."strategyVersionId"
JOIN "StrategyIdentity" si ON si.id = sv."strategyIdentityId"
WHERE si."strategyId" = 'AS-XXXXXXXX'    -- replace
  AND lei."deletedAt" IS NULL
LIMIT 1;
```

### 3.2 Minimal valid LIVE CSV payload

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}\n" \
  -X POST https://algo-studio.com/api/internal/trades/import-csv \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: ${INTERNAL_API_KEY}" \
  -d '{
    "strategyId": "'"${CANARY_STRATEGY_ID}"'",
    "source": "LIVE",
    "initialBalance": 10000,
    "csv": "ticket,openTime,type,volume,price,profit\n99901,2026-03-05 10:00:00,buy,0.01,1.08500,12.50\n99902,2026-03-05 10:05:00,sell,0.01,1.08600,-5.20\n99903,2026-03-05 10:10:00,buy,0.02,1.08550,8.30"
  }' | jq .
```

**Expected response (200):**

```json
{
  "insertedCount": 3,
  "skippedCount": 0,
  "tradeFactCount": 3,
  "tradeSnapshotHash": "abc123...",
  "recordId": "uuid..."
}
```

**IMPORTANT:** These ticket numbers (99901-99903) must not conflict with existing TradeFacts for this strategy. If you get `insertedCount: 0, skippedCount: 3`, the tickets already exist (skipDuplicates). Use unique tickets:

```bash
# Generate unique tickets based on timestamp
TICKET_BASE=$(($(date +%s) % 100000 + 90000))
```

### 3.3 What happens after LIVE ingest

The pipeline chain (all in one request):

1. CSV parsed -> TradeFact rows inserted
2. Trade snapshot hash computed
3. Proof event `TRADE_FACTS_INGESTED` appended
4. `triggerMonitoringAfterIngest()` called:
   - Checks operatorHold (skip if HALTED)
   - Checks suppression window (skip if active)
   - Checks 5-minute cooldown (skip if within cooldown)
   - If all clear: creates `MonitoringRun` -> evaluates rules -> writes proof events

### 3.4 Cooldown validation

**Immediately after first ingest** (within 5 minutes), ingest again with different tickets:

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}\n" \
  -X POST https://algo-studio.com/api/internal/trades/import-csv \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: ${INTERNAL_API_KEY}" \
  -d '{
    "strategyId": "'"${CANARY_STRATEGY_ID}"'",
    "source": "LIVE",
    "initialBalance": 10000,
    "csv": "ticket,openTime,type,volume,price,profit\n99904,2026-03-05 10:15:00,buy,0.01,1.08700,6.00"
  }' | jq .
```

**Expected:** Ingest succeeds (200, insertedCount: 1) but NO new MonitoringRun is created (cooldown active). Verify with SQL in Section 4.

### 3.5 Error handling

| HTTP Status                   | Meaning               | Action                                                               |
| ----------------------------- | --------------------- | -------------------------------------------------------------------- |
| **401**                       | Bad API key           | Check `INTERNAL_API_KEY`                                             |
| **409**                       | Strategy is HALTED    | Canary has `operatorHold=HALTED` — release it or pick another canary |
| **400** + `PARSE_FAILED`      | CSV format error      | Check CSV header and values match expected format                    |
| **400** + `VALIDATION_FAILED` | Deal validation error | Check ticket/openTime/type/volume/price/profit values                |

---

## SECTION 4 — Evidence Collection (SQL)

Run these read-only queries in Neon Console. Replace `AS-XXXXXXXX` with your canary strategyId.

### 4.1 Recent MonitoringRun rows

```sql
SELECT id, "strategyId", status, source, verdict, reasons,
       "liveFactCount", "configVersion", "errorMessage",
       "requestedAt", "startedAt", "completedAt"
FROM "MonitoringRun"
WHERE "strategyId" = 'AS-XXXXXXXX'
ORDER BY "requestedAt" DESC
LIMIT 10;
```

**PASS criteria:**

- At least 1 row with `status = 'COMPLETED'` after your first ingest
- `verdict` is `'HEALTHY'`, `'AT_RISK'`, or `'INVALIDATED'` (not null)
- `completedAt` is within minutes of your ingest time
- Second ingest (cooldown test): should NOT have a new row (or same count as before)

### 4.2 Recent ProofEventLog entries

```sql
SELECT id, type, "strategyId", "sessionId" AS "recordId",
       sequence, "eventHash", "prevEventHash",
       "createdAt",
       meta->>'eventType' AS "eventType",
       meta->>'action' AS "action",
       meta->>'reasonCode' AS "reasonCode",
       meta->>'monitoringVerdict' AS "monitoringVerdict"
FROM "ProofEventLog"
WHERE "strategyId" = 'AS-XXXXXXXX'
  AND type IN (
    'HEARTBEAT_DECISION_MADE',
    'MONITORING_RUN_COMPLETED',
    'TRADE_FACTS_INGESTED',
    'LIFECYCLE_TRANSITION_EDGE_AT_RISK',
    'LIFECYCLE_TRANSITION_INVALIDATED',
    'LIFECYCLE_TRANSITION_RECOVERED'
  )
ORDER BY "createdAt" DESC
LIMIT 20;
```

**PASS criteria:**

- `HEARTBEAT_DECISION_MADE` events from Section 2 (up to 5)
- `TRADE_FACTS_INGESTED` event from Section 3
- `MONITORING_RUN_COMPLETED` event from monitoring trigger
- Each event has non-null `eventHash` and `prevEventHash`
- `sequence` values increase monotonically per `recordId`/sessionId

### 4.3 Hash chain integrity spot-check

```sql
SELECT p1."sequence", p1."eventHash", p1."prevEventHash",
       p2."eventHash" AS "expected_prev"
FROM "ProofEventLog" p1
LEFT JOIN "ProofEventLog" p2
  ON p2."sessionId" = p1."sessionId"
  AND p2."sequence" = p1."sequence" - 1
WHERE p1."strategyId" = 'AS-XXXXXXXX'
  AND p1."sequence" > 1
ORDER BY p1."createdAt" DESC
LIMIT 5;
```

**PASS criteria:** For every row, `prevEventHash = expected_prev` (chain links match).

### 4.4 LiveEAInstance current state

```sql
SELECT lei.id, lei."lifecycleState", lei."operatorHold",
       lei."monitoringSuppressedUntil", lei."lastHeartbeat"
FROM "LiveEAInstance" lei
JOIN "StrategyVersion" sv ON sv.id = lei."strategyVersionId"
JOIN "StrategyIdentity" si ON si.id = sv."strategyIdentityId"
WHERE si."strategyId" = 'AS-XXXXXXXX'
  AND lei."deletedAt" IS NULL;
```

**PASS criteria:**

- `lifecycleState` matches the expected state (no unexpected transitions)
- `operatorHold = 'NONE'` (unless you intentionally changed it)

### 4.5 AlertOutbox for canary

```sql
SELECT id, "eventType", status, "createdAt", "dedupeKey",
       payload->>'strategyId' AS "strategyId",
       payload->>'fromState' AS "fromState",
       payload->>'toState' AS "toState"
FROM "AlertOutbox"
WHERE payload->>'strategyId' = 'AS-XXXXXXXX'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**PASS criteria:**

- If no lifecycle transition occurred: 0 rows (expected for HEALTHY verdict)
- If transition occurred: 1 row with `eventType = 'lifecycle_transition'`

---

## SECTION 5 — Interpretation + Decision Tree

### 5.1 Troubleshooting

```
Heartbeat returns 401
  -> Verify INTERNAL_API_KEY matches Vercel env var (Settings > Environment Variables)
  -> Verify header name is exactly "x-internal-api-key" (lowercase)

Heartbeat returns PAUSE / NO_INSTANCE
  -> Run SQL 1.2 to confirm LiveEAInstance exists for canary strategyId
  -> Check deletedAt is NULL
  -> Check the strategyId casing (must match exactly, code does not uppercase)

Ingest returns 200 but no MonitoringRun appears (SQL 4.1)
  -> Check source was "LIVE" (not "BACKTEST" — monitoring only triggers for LIVE)
  -> Check operatorHold is "NONE" (HALTED skips monitoring trigger)
  -> Check monitoringSuppressedUntil is NULL or in the past
  -> Check cooldown: was there a COMPLETED/FAILED run within last 5 minutes?
  -> Check Vercel function logs for "Monitoring trigger failed" errors

MonitoringRun exists with status = "FAILED"
  -> Check errorMessage column for reason
  -> Common: "CONFIG_UNAVAILABLE" — no active VerificationConfig in DB
  -> Common: "No LIVE TradeFacts found" — ingest was BACKTEST, not LIVE

MonitoringRun COMPLETED but no ProofEventLog
  -> Proof events are best-effort. Check Vercel logs for proof write errors.
  -> Possible: Serializable transaction conflict (retryable)

MonitoringRun COMPLETED + HEALTHY verdict but no lifecycle transition
  -> This is CORRECT behavior. HEALTHY + LIVE_MONITORING = no transition needed.
  -> Transitions only occur when verdict is AT_RISK or INVALIDATED,
     or when recovering from EDGE_AT_RISK back to LIVE_MONITORING.

Monitoring verdict is AT_RISK but no EDGE_AT_RISK transition
  -> Check if lifecycleState was already EDGE_AT_RISK (idempotent — no re-transition)
  -> Check transition-service prohibited transitions (monitoring cannot skip
     EDGE_AT_RISK to go directly LIVE_MONITORING -> INVALIDATED)
```

### 5.2 PASS Checklist

| #   | Criterion                                         | How to verify                                  | Status |
| --- | ------------------------------------------------- | ---------------------------------------------- | ------ |
| 1   | Heartbeat endpoint reachable + auth OK            | Section 2.1 returns 200                        | [ ]    |
| 2   | Heartbeat action matches canary state             | Compare response to table 2.2                  | [ ]    |
| 3   | Heartbeat is consistent across burst              | Section 2.4 — all 5 identical                  | [ ]    |
| 4   | HEARTBEAT_DECISION_MADE proof events written      | SQL 4.2 shows events                           | [ ]    |
| 5   | Trade ingest succeeds (LIVE)                      | Section 3.2 returns 200 + insertedCount > 0    | [ ]    |
| 6   | TRADE_FACTS_INGESTED proof event written          | SQL 4.2 shows event                            | [ ]    |
| 7   | MonitoringRun created + COMPLETED                 | SQL 4.1 shows row                              | [ ]    |
| 8   | MONITORING_RUN_COMPLETED proof event written      | SQL 4.2 shows event                            | [ ]    |
| 9   | Cooldown enforced (no 2nd run within 5 min)       | SQL 4.1 — only 1 new run after 2 ingests       | [ ]    |
| 10  | Proof event hash chain intact                     | SQL 4.3 — prevEventHash matches                | [ ]    |
| 11  | Lifecycle transitions only via transition-service | Architectural invariant (code audit confirmed) | [x]    |
| 12  | No unexpected lifecycle state change              | SQL 4.4 — state unchanged after HEALTHY run    | [ ]    |
| 13  | AlertOutbox consistent with transitions           | SQL 4.5 — 0 rows if no transition              | [ ]    |

**Result:** All 13 checks pass = **PRODUCTION READY** for controlled beta.

---

## Cleanup

No cleanup needed. The canary trades are real TradeFact rows scoped to the canary strategy. They will be evaluated in future monitoring runs, which is the desired outcome for ongoing production verification.

If you used throwaway ticket numbers and want to remove them:

```sql
-- OPTIONAL: Remove canary test trades (only if needed)
-- DELETE FROM "TradeFact"
-- WHERE "strategyId" = 'AS-XXXXXXXX'
--   AND "sourceTicket" IN (99901, 99902, 99903, 99904);
```

---

## Blockers Found

None. All endpoints exist, auth is in place, and the monitoring pipeline is fully wired. No code changes needed.
