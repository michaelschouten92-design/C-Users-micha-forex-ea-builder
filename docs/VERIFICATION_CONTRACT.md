# Verification Verdict Contract

> Frozen contract. Changes require a docs/DECISIONS.md entry per CONTRIBUTING.md §9.
>
> Primary system: **Verification Engine**
> Secondary system: **Lifecycle State Machine**

---

## 1. Verdict Type

```typescript
type VerificationVerdict = "READY" | "UNCERTAIN" | "NOT_DEPLOYABLE";
```

Source: FOUNDATION.md §7.
These are the only three values. The verdict is a discrete signal, not a spectrum.

---

## 2. Reason Codes

Every verdict carries one or more reason codes explaining why the decision was reached.
Free-text reasons are prohibited in the pure computation layer.

```typescript
type ReasonCode =
  // NOT_DEPLOYABLE reasons
  | "INSUFFICIENT_DATA"
  | "WALK_FORWARD_DEGRADATION_EXTREME"
  | "RUIN_PROBABILITY_EXCEEDED"
  | "COMPOSITE_BELOW_MINIMUM"
  | "COMPUTATION_FAILED"
  | "INVALID_SCORE"
  | "INCOMPLETE_ANALYSIS"
  // READY reasons
  | "ALL_CHECKS_PASSED"
  // UNCERTAIN reasons
  | "COMPOSITE_IN_UNCERTAIN_BAND"
  | "WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE";
```

Rules:

- Every verdict has at least one reason code.
- `NOT_DEPLOYABLE` may carry multiple codes (e.g., both `RUIN_PROBABILITY_EXCEEDED` and `COMPOSITE_BELOW_MINIMUM`).
- `READY` always carries exactly `ALL_CHECKS_PASSED`.
- An optional `displayText: string` field exists in the adapter/record layer for UI consumption. It is never present in the pure verdict output.

---

## 3. Required Inputs

```typescript
interface VerificationInput {
  strategyId: string;
  strategyVersion: number;
  tradeHistory: TradeRecord[];
  backtestParameters: BacktestParameters;
  intermediateResults?: {
    robustnessScores?: { composite: number };
  };
}
```

All inputs are plain data. No `Request` objects, no React context, no framework types.
The adapter layer (PR#5) assembles this from whatever source format the caller provides.

`intermediateResults` is optional enrichment — see §4.4.

---

## 4. Intermediate Results and Lazy Computation

The verification runner computes intermediate results in stages.
Each decision rule declares exactly which intermediate results it requires.
The runner may skip computation of stages that no remaining rule needs.

### Stage Definitions

```typescript
interface WalkForwardResult {
  sharpeDegradationPct: number;
  outOfSampleTradeCount: number;
}

interface MonteCarloResult {
  ruinProbability: number;
}

interface RobustnessScores {
  composite: number; // 0.0–1.0
}
```

### Stage Dependencies per Rule

| Rule | Requires                            | Stage                   |
| ---- | ----------------------------------- | ----------------------- |
| D0   | `tradeHistory.length`               | None (input validation) |
| D1   | `WalkForwardResult`                 | Walk-forward analysis   |
| D2   | `MonteCarloResult`                  | Monte Carlo simulation  |
| D3   | `RobustnessScores`                  | Robustness scoring      |
| D4   | `RobustnessScores` + no D1/D2 flags | Robustness scoring      |
| D5   | All stages complete                 | —                       |

### Completeness Validation

Before the runner evaluates D3–D5, it validates that all required stages produced results.
If any stage is missing or returned a partial result:

- The runner does **not** proceed to rules that depend on it.
- Verdict: `NOT_DEPLOYABLE`, reason code: `INCOMPLETE_ANALYSIS`.

A stage "produced results" means: all fields in the stage interface are present,
finite, and non-negative. `NaN`, `Infinity`, negative values, or missing fields
fail the completeness check.

### Pre-computed Stage Scores (`intermediateResults`)

The runner/adapter layer may attach pre-computed stage scores to `VerificationInput`
via the optional `intermediateResults` field. This allows the pure decision function
to consume scores without computing them itself.

Rules:

- `intermediateResults` is **not** a required base input. Callers may omit it entirely.
- When omitted, the decision function treats all stage scores as not-yet-run (defaults apply, e.g., `composite` defaults to `0`).
- When present, the decision function reads values directly and must still behave deterministically — same `intermediateResults` always produces the same verdict.
- Only the runner/adapter layer populates `intermediateResults`. The pure function never writes to it.

---

## 5. Deterministic Decision Rules

The verdict is computed by a pure function. Same input always produces the same output.
No randomness, no external state, no time dependency, no `computedAt` in the pure layer.

### Decision Cascade

Evaluated top to bottom. First matching NOT_DEPLOYABLE rule adds its reason code.
All NOT_DEPLOYABLE rules are evaluated (not short-circuited after first match) so the
verdict carries every applicable reason code. READY and UNCERTAIN are mutually exclusive
and evaluated only after all NOT_DEPLOYABLE rules pass.

| #   | Condition                                                                                                                      | Verdict          | Reason Code                           | Notes                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| D0  | `tradeCount < MIN_TRADE_COUNT`                                                                                                 | `NOT_DEPLOYABLE` | `INSUFFICIENT_DATA`                   | Hard gate. No analysis runs. Short-circuits all subsequent rules.                                                                  |
| D1a | `walkForward.sharpeDegradationPct > MAX_SHARPE_DEGRADATION_PCT` AND `walkForward.outOfSampleTradeCount >= MIN_OOS_TRADE_COUNT` | `NOT_DEPLOYABLE` | `WALK_FORWARD_DEGRADATION_EXTREME`    | Degradation is statistically meaningful — sufficient OOS trades to trust the signal.                                               |
| D1b | `walkForward.sharpeDegradationPct > MAX_SHARPE_DEGRADATION_PCT` AND `walkForward.outOfSampleTradeCount < MIN_OOS_TRADE_COUNT`  | `UNCERTAIN`      | `WALK_FORWARD_FLAGGED_NOT_CONCLUSIVE` | Degradation detected but OOS sample too small. Flag, don't reject. Prevents over-triggering on unstable Sharpe from thin OOS data. |
| D1c | `walkForward.sharpeDegradationPct > EXTREME_SHARPE_DEGRADATION_PCT` (regardless of OOS count)                                  | `NOT_DEPLOYABLE` | `WALK_FORWARD_DEGRADATION_EXTREME`    | Override: if degradation is extreme (e.g., >80%), reject even with thin OOS. No plausible edge survives this.                      |
| D2  | `monteCarlo.ruinProbability > RUIN_PROBABILITY_CEILING`                                                                        | `NOT_DEPLOYABLE` | `RUIN_PROBABILITY_EXCEEDED`           | Unacceptable probability of ruin under simulated stress.                                                                           |
| D3  | `robustnessScores.composite < NOT_DEPLOYABLE_THRESHOLD`                                                                        | `NOT_DEPLOYABLE` | `COMPOSITE_BELOW_MINIMUM`             | Composite score below minimum bar.                                                                                                 |
| D4  | `robustnessScores.composite >= READY_CONFIDENCE_THRESHOLD` AND no NOT_DEPLOYABLE flags AND no UNCERTAIN flags                  | `READY`          | `ALL_CHECKS_PASSED`                   | All checks pass with high confidence.                                                                                              |
| D5  | Everything else                                                                                                                | `UNCERTAIN`      | `COMPOSITE_IN_UNCERTAIN_BAND`         | Passes minimum bars but doesn't clear the confidence threshold.                                                                    |

### D1 Guard Logic (Amendment 4)

The walk-forward degradation check has a three-tier structure to handle unstable Sharpe:

```
if sharpeDegradation > EXTREME_SHARPE_DEGRADATION_PCT:
    → NOT_DEPLOYABLE (D1c: extreme, regardless of sample)
else if sharpeDegradation > MAX_SHARPE_DEGRADATION_PCT:
    if outOfSampleTradeCount >= MIN_OOS_TRADE_COUNT:
        → NOT_DEPLOYABLE (D1a: statistically meaningful)
    else:
        → UNCERTAIN (D1b: flagged, not conclusive)
else:
    → pass (no flag)
```

### Reason Code Accumulation

```
reasonCodes = []

evaluate D0 → if triggered, return immediately (no analysis to run)
evaluate D1a/D1b/D1c → append applicable code
evaluate D2 → append if triggered
evaluate D3 → append if triggered

if any NOT_DEPLOYABLE code in reasonCodes → verdict = NOT_DEPLOYABLE
else if any UNCERTAIN code in reasonCodes → verdict = UNCERTAIN
else if composite >= READY_CONFIDENCE_THRESHOLD → verdict = READY, code = ALL_CHECKS_PASSED
else → verdict = UNCERTAIN, code = COMPOSITE_IN_UNCERTAIN_BAND
```

### Failure Handling

| Failure Mode                            | Detection                   | Verdict          | Reason Code           |
| --------------------------------------- | --------------------------- | ---------------- | --------------------- |
| Empty or missing tradeHistory           | Input validation            | `NOT_DEPLOYABLE` | `INSUFFICIENT_DATA`   |
| Walk-forward computation throws         | `try/catch` around module   | `NOT_DEPLOYABLE` | `COMPUTATION_FAILED`  |
| Monte Carlo computation throws          | `try/catch` around module   | `NOT_DEPLOYABLE` | `COMPUTATION_FAILED`  |
| Robustness score returns `NaN`/negative | Post-computation validation | `NOT_DEPLOYABLE` | `INVALID_SCORE`       |
| Any stage returns partial results       | Completeness check          | `NOT_DEPLOYABLE` | `INCOMPLETE_ANALYSIS` |

Computation failure produces `NOT_DEPLOYABLE`, never `UNCERTAIN`.
A system error is not ambiguity — it is a broken analysis.

Every error is logged with structured data: `strategyId`, `strategyVersion`,
failed sub-system, error message. No silent swallowing (CONTRIBUTING.md §7).

---

## 6. Constants

All thresholds live in `src/core/config/constants.ts` (PR#6).
None are hardcoded in the decision function.

```typescript
export const VERIFICATION = {
  MIN_TRADE_COUNT: 30,
  MONTE_CARLO_ITERATIONS: 10_000,
  MAX_SHARPE_DEGRADATION_PCT: 40,
  EXTREME_SHARPE_DEGRADATION_PCT: 80,
  MIN_OOS_TRADE_COUNT: 20,
  READY_CONFIDENCE_THRESHOLD: 0.75,
  NOT_DEPLOYABLE_THRESHOLD: 0.45,
  RUIN_PROBABILITY_CEILING: 0.15,
  CONFIG_VERSION: "1.0.0",
} as const;
```

---

## 7. Pure Verdict Output

This is what the pure verdict function returns.
No `computedAt`. No `displayText`. No side effects.

```typescript
interface VerificationVerdictOutput {
  strategyId: string;
  strategyVersion: number;
  verdict: VerificationVerdict;
  reasonCodes: ReasonCode[];
  scores: {
    composite: number;
    walkForwardDegradationPct: number | null;
    walkForwardOosSampleSize: number | null;
    monteCarloRuinProbability: number | null;
    sampleSize: number;
  };
  thresholdsUsed: {
    configVersion: string;
    thresholdsHash: string;
    minTradeCount: number;
    readyConfidenceThreshold: number;
    notDeployableThreshold: number;
    maxSharpeDegradationPct: number;
    extremeSharpeDegradationPct: number;
    minOosTradeCount: number;
    ruinProbabilityCeiling: number;
    monteCarloIterations?: number; // optional — included when present in config
  };
  warnings: string[];
}
```

### Field Notes

- `scores.*` fields are `null` when the corresponding stage did not run
  (e.g., walk-forward is `null` if D0 short-circuited before analysis).
- `thresholdsUsed.configVersion`: semantic version string from `VERIFICATION.CONFIG_VERSION`.
  Bumped whenever any threshold value or decision rule changes.
- `thresholdsUsed.thresholdsHash`: SHA-256 hex digest of the sorted, deterministic
  JSON serialization of all threshold values. Computed at startup, cached for the
  process lifetime. Allows proof-level comparison: two verdicts with the same
  `thresholdsHash` were computed under identical rules.
- `warnings`: non-fatal observations (e.g., `"Sample size near minimum threshold"`).
  Warnings do not affect the verdict.

### What the adapter/record layer adds

The adapter layer wraps the pure output into a persisted record:

```typescript
interface VerificationRecord extends VerificationVerdictOutput {
  recordId: string; // UUIDv4, generated by adapter at persistence time
  computedAt: string; // ISO-8601, stamped by adapter
  displayText: string; // human-readable summary, generated from reasonCodes
}
```

`recordId`, `computedAt`, and `displayText` are never inside the pure function.
The pure function is timeless and deterministic. The adapter stamps the clock
and assigns the record identity. `recordId` is a UUIDv4 generated once per
verification run and shared across the `VerificationRecord` and all emitted events.

---

## 8. Events

### VERIFICATION_RUN_COMPLETED (every run)

Emitted by the adapter layer after every verification run, regardless of verdict.
This is an **observability event**, not a lifecycle transition.

```typescript
interface VerificationRunCompletedEvent {
  eventType: "VERIFICATION_RUN_COMPLETED";
  strategyId: string;
  strategyVersion: number;
  verdict: VerificationVerdict;
  reasonCodes: ReasonCode[];
  thresholdsHash: string;
  recordId: string; // UUIDv4, generated by adapter layer
  timestamp: string; // ISO-8601
}
```

Purpose:

- Audit trail: every verification attempt is recorded, not just successful ones.
- Monitoring: track verdict distribution, failure rates, threshold sensitivity.
- Proof readiness: the event can be fed into the hash chain by the Proof Infrastructure.

This event does **not** trigger any lifecycle transition.

### VERIFICATION_PASSED (READY only → lifecycle transition)

Emitted only when `verdict === 'READY'`. Triggers lifecycle transition
`BACKTESTED` → `VERIFIED`. The mechanism (direct call vs event handler)
is defined by the adapter/lifecycle integration layer, not by this contract.

```typescript
interface VerificationPassedEvent {
  eventType: "VERIFICATION_PASSED";
  strategyId: string;
  strategyVersion: number;
  recordId: string; // UUIDv4, generated by adapter layer
  timestamp: string; // ISO-8601
}
```

### Event Sequence

Every `READY` verdict produces both events in this order:

```
1. VERIFICATION_RUN_COMPLETED  (observability — always)
2. VERIFICATION_PASSED         (lifecycle — only if READY)
```

`UNCERTAIN` and `NOT_DEPLOYABLE` produce only `VERIFICATION_RUN_COMPLETED`.

---

## 9. Verdict ↔ Lifecycle Interaction

| Verdict          | Lifecycle Phase After    | Event Emitted                                        | Transition                |
| ---------------- | ------------------------ | ---------------------------------------------------- | ------------------------- |
| `READY`          | `VERIFIED`               | `VERIFICATION_RUN_COMPLETED` + `VERIFICATION_PASSED` | `BACKTESTED` → `VERIFIED` |
| `UNCERTAIN`      | `BACKTESTED` (unchanged) | `VERIFICATION_RUN_COMPLETED`                         | None                      |
| `NOT_DEPLOYABLE` | `BACKTESTED` (unchanged) | `VERIFICATION_RUN_COMPLETED`                         | None                      |

What the verdict does **not** do:

- Does not transition to `DRAFT`. Rework is a user-initiated action outside this contract.
- Does not transition to `INVALIDATED`. Invalidation is a post-live concept outside this contract.
- Does not change `StrategyStatus`. Verdict operates on lifecycle phase only.
- Never emits `VERIFICATION_PASSED` for `UNCERTAIN`. Only `READY` triggers `BACKTESTED` → `VERIFIED`.

**Invariant:** `VERIFICATION_PASSED` can only be emitted when `verdict === 'READY'`.
Enforced in the adapter layer, not in the pure verdict function.

---

## 10. thresholdsHash Computation

The hash is deterministic and reproducible.

```
1. Collect all threshold values from VERIFICATION config.
   Include monteCarloIterations only if present in the config object.
2. Sort keys alphabetically.
3. Serialize as compact JSON (no whitespace).
4. Compute SHA-256 hex digest.
```

Example:

```
Input keys (sorted):
  configVersion, extremeSharpeDegradationPct, maxSharpeDegradationPct,
  minOosTradeCount, minTradeCount, monteCarloIterations (if present),
  notDeployableThreshold, readyConfidenceThreshold, ruinProbabilityCeiling

JSON: {"configVersion":"1.0.0","extremeSharpeDegradationPct":80,...}
Hash: sha256(json) → "a1b2c3..."
```

The hash is computed once at process startup and cached.
Two verdicts with the same `thresholdsHash` used identical decision rules.
A `configVersion` bump without a `thresholdsHash` change means only the
version label changed (documentation update). A `thresholdsHash` change
without a `configVersion` bump is a contract violation.

**Invariant:** `configVersion` must be bumped whenever `thresholdsHash` changes.

---

## 11. Summary

| Property               | Value                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| Possible verdicts      | 3: `READY`, `UNCERTAIN`, `NOT_DEPLOYABLE`                                                                      |
| Reason codes           | Typed string union, ≥1 per verdict                                                                             |
| Decision function      | Pure, deterministic, UI-independent                                                                            |
| Bias                   | Toward rejection — all NOT_DEPLOYABLE rules checked before READY                                               |
| Default                | `UNCERTAIN` (no guess)                                                                                         |
| Computation failure    | `NOT_DEPLOYABLE`, never `UNCERTAIN`                                                                            |
| D1 guard               | Three-tier: extreme overrides sample size; moderate requires MIN_OOS_TRADE_COUNT; thin OOS → flag as UNCERTAIN |
| `computedAt`           | Adapter layer only, never in pure output                                                                       |
| Events per run         | Always `VERIFICATION_RUN_COMPLETED`; additionally `VERIFICATION_PASSED` only if `READY`                        |
| Lifecycle transition   | Only `READY` → `BACKTESTED` → `VERIFIED`                                                                       |
| Threshold traceability | `configVersion` (semantic) + `thresholdsHash` (SHA-256)                                                        |
| Status interaction     | None — verdict is phase-only                                                                                   |
| Threshold source       | `src/core/config/constants.ts`                                                                                 |

---

_"Does this reduce the probability of a trader deploying a false edge?"_
_Yes — by making the verification decision deterministic, auditable, biased toward rejection, and traceable to the exact configuration that produced it._
