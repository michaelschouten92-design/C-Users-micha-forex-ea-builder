# Heartbeat Integration Contract

> Frozen contract. Changes require a docs/DECISIONS.md entry.
>
> Primary system: **Heartbeat Control Plane**
> Consumer: **EA / Bot Runtime**

---

## 1. Endpoint

```
POST /api/internal/heartbeat
```

Internal-only. Authenticated via `x-internal-api-key` header (timing-safe comparison).
Rate limited: 60 requests per minute per IP.

---

## 2. Request

### Headers (required)

| Header               | Value                        |
| -------------------- | ---------------------------- |
| `x-internal-api-key` | Server-side internal API key |
| `Content-Type`       | `application/json`           |

### Body

```json
{
  "strategyId": "strat_abc123"
}
```

| Field         | Type   | Required | Notes                                        |
| ------------- | ------ | -------- | -------------------------------------------- |
| `strategyId`  | string | yes      | Min length 1. Identifies the strategy.       |
| `instanceTag` | string | no       | Opaque client tag. Never logged or returned. |
| `accountId`   | string | no       | Opaque client tag. Never logged or returned. |

Optional fields (`instanceTag`, `accountId`) are accepted but **never stored, logged, or returned**.

---

## 3. Response

**Always HTTP 200** with a valid JSON body — even on DB errors.
The endpoint never returns 404, 500, or any other status for heartbeat decisions.

Pre-auth failures (401, 429, 400) use standard error shapes and are **not** heartbeat decisions.

### Body

```json
{
  "strategyId": "strat_abc123",
  "action": "RUN",
  "reasonCode": "OK",
  "serverTime": "2026-03-03T12:00:00.000Z"
}
```

| Field        | Type   | Guaranteed | Notes                                         |
| ------------ | ------ | ---------- | --------------------------------------------- |
| `strategyId` | string | always     | Echoed from request.                          |
| `action`     | enum   | always     | One of: `RUN`, `PAUSE`, `STOP`.               |
| `reasonCode` | enum   | always     | Stable enum string (see §4).                  |
| `serverTime` | string | always     | UTC ISO-8601. Authoritative server timestamp. |

### Response Headers

| Header          | Value      | Purpose                        |
| --------------- | ---------- | ------------------------------ |
| `Cache-Control` | `no-store` | Prevent stale control signals. |

---

## 4. Action Semantics

### `RUN`

Trading is allowed. All governance checks passed.

### `PAUSE`

Temporarily halt trading. Do not close positions unless local risk rules require it.
Resume polling — the state may resolve (suppression expires, risk clears, instance appears).

### `STOP`

Immediately disable the EA. This is a terminal or operator-mandated signal.
The EA should cease trading and require manual intervention to restart.

---

## 5. Reason Codes (stable enum)

```typescript
type HeartbeatReasonCode =
  | "OK" // All clear → RUN
  | "STRATEGY_HALTED" // Operator HALT → STOP
  | "STRATEGY_INVALIDATED" // Terminal lifecycle → STOP
  | "MONITORING_AT_RISK" // EDGE_AT_RISK lifecycle → PAUSE
  | "MONITORING_SUPPRESSED" // Time-bounded suppression → PAUSE
  | "NO_INSTANCE" // No LiveEAInstance found → PAUSE
  | "CONFIG_UNAVAILABLE" // Reserved for future use → PAUSE
  | "COMPUTATION_FAILED"; // DB/computation error → PAUSE
```

Reason codes are **stable strings**. They will not change without a DECISIONS.md entry.
They are never concatenated error messages or stack traces.

---

## 6. Decision Precedence

Evaluated top-to-bottom; first match wins:

| Priority | Condition                       | Action | Reason Code           |
| -------- | ------------------------------- | ------ | --------------------- |
| 1        | No LiveEAInstance found         | PAUSE  | NO_INSTANCE           |
| 2        | operatorHold = HALTED           | STOP   | STRATEGY_HALTED       |
| 3        | lifecycleState = INVALIDATED    | STOP   | STRATEGY_INVALIDATED  |
| 4        | lifecycleState = EDGE_AT_RISK   | PAUSE  | MONITORING_AT_RISK    |
| 5        | monitoringSuppressedUntil > now | PAUSE  | MONITORING_SUPPRESSED |
| 6        | (default)                       | RUN    | OK                    |

**Key invariant**: Operator authority (HALTED) is **orthogonal** to lifecycle state.
An operator HALT always produces STOP regardless of lifecycle, suppression, or risk flags.

---

## 7. Fail-Closed Design

| Failure Mode             | Behavior                         |
| ------------------------ | -------------------------------- |
| DB error                 | 200 + PAUSE + COMPUTATION_FAILED |
| No instance found        | 200 + PAUSE + NO_INSTANCE        |
| Network failure (client) | EA must default to PAUSE locally |
| Timeout (client)         | EA must default to PAUSE locally |

The server **never** returns RUN when uncertain. The client **must never** assume RUN on communication failure.

---

## 8. Client Requirements

1. **Poll, don't subscribe.** The heartbeat endpoint is a synchronous query.
2. **Default to PAUSE on failure.** Any network error, timeout, or non-200 response must be treated as PAUSE.
3. **Honor STOP immediately.** STOP is terminal — cease trading, require manual restart.
4. **No caching.** Always fetch a fresh decision. The `Cache-Control: no-store` header enforces this.
5. **Clock drift tolerance.** Use `serverTime` to detect clock drift > 30 seconds and log a warning.
6. **Poll interval.** Recommended: 15–60 seconds with jitter. Do not poll faster than 5 seconds.
7. **Backoff on errors.** On repeated failures, apply exponential backoff (max 5 minutes).

---

## 9. Security

- No secrets in responses. No internal IDs beyond `strategyId`.
- `instanceTag` and `accountId` are accepted but never returned or logged.
- Auth failures (401) use standard error shapes — no heartbeat decision body.
- Rate limited to prevent abuse (60 req/min/IP).

---

## 10. Proof Logging

Every heartbeat decision emits a best-effort `HEARTBEAT_DECISION_MADE` proof event.
This is observability — proof logging failure does **not** affect the returned decision.
