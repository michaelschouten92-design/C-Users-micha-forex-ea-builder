# Architecture Decision Records

## ADR-001: AI Strategy Insights is an Advisory Feature, Not a Core System

**Status:** Accepted
**Date:** 2026-02-28

### Context

The AI Strategy Insights feature (formerly "AI Strategy Doctor") uses Claude to analyze backtest results and surface weaknesses, overfitting signals, and risk observations. During an architectural review against FOUNDATION.md, we found the feature produced a competing deployment signal ("Live Trading Readiness: READY / NEEDS_WORK / NOT_RECOMMENDED") that conflicted with the Verification Engine's `PreLiveVerdict` — the authoritative deployment gate.

### Decision

1. **Classification:** AI Strategy Insights is a **supporting advisory feature**, not a core system. It provides educational analysis to help traders understand their strategy — it does not gate deployment.

2. **No deployment verdicts:** The AI prompt must never produce deployment-readiness verdicts (READY, NEEDS_WORK, NOT_RECOMMENDED) or language that implies it controls whether a strategy should go live. Deployment readiness is exclusively owned by the Verification Engine (`computePreLiveVerdict`).

3. **Import boundary:** AI Strategy Insights (`src/lib/ai-strategy-doctor.ts`) must never be imported by, or provide signal input to, the 5 core systems defined in FOUNDATION.md:
   - Health Score Engine
   - Monte Carlo Validator
   - Verification Engine
   - Track Record System
   - Health Monitor

4. **UI language:** All user-facing copy must frame the feature as "insights" and "analysis", not "diagnosis" or "readiness assessment". An advisory disclaimer is included in the feature description.

### Consequences

- The AI feature remains useful for educational analysis without creating conflicting authority.
- The Verification Engine remains the single source of truth for deployment decisions.
- Future AI features must follow the same boundary: advisory features cannot produce signals that overlap with core system outputs.

## ADR-002: Week 1 Trust Hardening — Observability and State Machine Guarantees

**Status:** Accepted
**Date:** 2026-02-28

### Context

During the first week of production hardening, an audit revealed three classes of reliability gaps:

1. **Silent catch blocks** — 50+ `catch {}` and `.catch(() => {})` handlers across 37 files swallowed errors without logging or alerting. Failures in critical paths (trade ingestion, health evaluation, alert delivery) were invisible to monitoring.
2. **Unlogged outbox transitions** — The notification outbox cron processed entries through 7 state transitions (PENDING → PROCESSING → SENT/FAILED/DEAD) with no structured logging, making delivery failures difficult to diagnose.
3. **Ad-hoc subscription mutations** — 8 Stripe webhook handlers, 2 admin routes, and 3 cron jobs each performed raw `subscription.update()` calls with no shared validation, no transition logging, and a duplicated `statusMap` in 3 locations.

### Decisions

#### 1. Silent catch removal

Every silent catch was replaced with `logger.error({ err, ...context }, message)` plus `Sentry.captureException()`. The pattern applies everywhere: API route error boundaries, fire-and-forget async work, and JSON parse paths.

**Rule:** No catch block may discard an error without logging it. Bare `catch {}` and `.catch(() => {})` are prohibited.

Key commits: `567a7d7` (37 files, wholesale replacement), `37afdf7` (track-record ingest route).

#### 2. Outbox transition logging

A centralized `transitionOutboxEntry(id, from, to, reason)` function now wraps every outbox status change, atomically updating the database and emitting a structured log with `{ outboxId, from, to, reason }`. A companion `logBulkTransition()` handles batch SQL operations. The valid state machine is documented inline:

```
PENDING  → PROCESSING (claimed by cron)
FAILED   → PROCESSING (retry, nextRetryAt due)
PROCESSING → SENT     (delivery success — terminal)
PROCESSING → FAILED   (delivery failure)
PROCESSING → DEAD     (max attempts — terminal)
PROCESSING → FAILED   (crash recovery / cron timeout)
```

Key file: `src/app/api/cron/process-outbox/route.ts`. Commit: `9af222c`.

#### 3. Subscription state machine and logging

A new `src/lib/subscription/transitions.ts` module provides:

- **`VALID_STATUS_TRANSITIONS`** — an exhaustive adjacency table for all 9 `SubscriptionStatus` values. Invalid transitions emit `logger.warn` but never block (Stripe remains source of truth).
- **`transitionSubscription(db, userId, from, to, reason)`** — performs DB update + validation + structured log (`{ userId, fromStatus, toStatus, fromTier, toTier, reason }`) in one call.
- **`logSubscriptionTransition()`** — log-only variant for upsert/batch paths where the DB write already occurred atomically.

All 13 callsites (webhook handlers, cron jobs, admin routes) now go through this module instead of raw updates.

Key file: `src/lib/subscription/transitions.ts`. Commit: `d37ecb1`.

### Consequences

- Every error in the system is now observable via structured logs and Sentry — silent failures are no longer possible.
- Outbox and subscription state changes produce queryable audit trails (`from`, `to`, `reason` fields) for debugging delivery and billing issues.
- Invalid subscription transitions are detected and warned on, catching webhook ordering bugs without blocking Stripe reconciliation.
- New state-changing modules must follow the same pattern: centralized transition function with structured logging and a documented state machine.
