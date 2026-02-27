# Contributing to AlgoStudio

> This document is an engineering contract, not an onboarding guide.
> All contributors — human and AI — are bound by these rules.
>
> For strategic context, read [docs/FOUNDATION.md](docs/FOUNDATION.md) first.
> That document defines what AlgoStudio is, who it serves, and why it exists.
> This document defines how we build it.

---

## 1. First Principles

These are derived from FOUNDATION.md §8 and are non-negotiable.

1. **Architecture before implementation.** Design the system boundary, state transitions, and data flow before writing code. If you cannot draw the change on a whiteboard, you are not ready to implement it.

2. **Systems over features.** AlgoStudio is built around five core systems (§2). Every change must strengthen a system. A feature that does not belong to a system does not belong in the codebase.

3. **Explicit state machines over implicit logic.** Every entity with a lifecycle must have named states, defined transitions, and logged changes. No state may change as a side effect of an unrelated operation.

4. **Verification logic must be UI-independent.** Core domain logic (scoring, drift detection, walk-forward analysis, hash chain integrity) must never depend on the UI layer. It must be testable in isolation.

5. **Reliability over feature velocity.** A correct system with three capabilities beats a fragile system with thirty features. Ship less, ship sound.

---

## 2. The Five Systems

AlgoStudio is organized around five core systems, defined in FOUNDATION.md §5:

| #   | System                      | Responsibility                                                               |
| --- | --------------------------- | ---------------------------------------------------------------------------- |
| 1   | **Strategy Identity**       | Persistent strategy ID, version history, verification lineage                |
| 2   | **Lifecycle State Machine** | Draft → Backtested → Verified → Live Monitoring → Edge At Risk → Invalidated |
| 3   | **Verification Engine**     | Robustness validation, Monte Carlo, overfit detection, clear decision output |
| 4   | **Monitoring Engine**       | Baseline vs live drift, edge decay detection, state transitions              |
| 5   | **Proof Infrastructure**    | Integrity sealing, tamper-resistant records, public verification layer       |

### Rule

Every PR must declare a **primary system** it strengthens (and an optional **secondary system** if cross-cutting). If a PR cannot name its primary system, it should not be merged.

Use the PR description format:

```
Primary system: Monitoring Engine
Secondary system: Proof Infrastructure (optional)
```

If work does not map to any system, it is either infrastructure (acceptable) or feature drift (not acceptable). See §8.

---

## 3. State Machine Requirement

Any entity with a lifecycle (strategy phase, strategy status, notification delivery, subscription tier) must follow these rules:

1. **Named states.** Every state is a string literal in a union type. No booleans masquerading as state (`isVerified`, `hasExpired`).

2. **Defined transitions.** Valid transitions must be readable from code — either as an explicit transition table or a clearly structured if/else-if chain with each branch representing one transition.

3. **Logged transitions.** Every state change must emit a structured log entry containing: entity ID, previous state, new state, and the reason for transition.

4. **No implicit mutations.** A state may only change inside the function responsible for that state machine. No external function may set a lifecycle field as a side effect.

5. **Recovery paths must be explicit.** If an entity can return to a previous state (e.g., RETIRED → PROVING), that path must be a named transition with its own guard condition, not a reset hack.

---

## 4. Verification Logic Isolation

Verification, scoring, and integrity logic form the core domain of AlgoStudio. This logic must be strictly isolated from the UI layer.

### Boundary Definition

- **Core domain modules**: scoring, health evaluation, drift detection, walk-forward analysis, hash chain operations, checkpoint integrity, proof computation. These modules must have zero imports from the UI layer (components, pages, framework-specific routing, React hooks).

- **UI layer**: pages, components, route handlers, client-side hooks, framework bindings. The UI layer may import from core domain modules. The reverse is never permitted.

### Rules

1. Core domain modules must be testable with a unit test runner alone — no browser, no framework context, no HTTP server.

2. If a core domain function needs data that currently lives in a UI context (e.g., user session, request headers), that data must be passed as a plain parameter, not imported from framework internals.

3. Type definitions shared between core and UI must live in a dedicated types layer, not in either side.

### Test

If you can run the module's tests with `vitest run path/to/module.test.ts` and they pass without starting a dev server, the boundary is respected.

---

## 5. PR Discipline

### Size

- A PR should change **one system** (primary) and touch at most one more (secondary).
- Prefer PRs under 400 lines of diff. If a change exceeds this, split it into sequential PRs with clear dependency order.
- Infrastructure changes (dependencies, config, CI) should be separate PRs from logic changes.

### Required Checks

Every PR must pass before merge:

```
npm run type-check   # tsc --noEmit — zero errors
npm run lint         # ESLint — zero errors (warnings acceptable if pre-existing)
npm run test:run     # Vitest — all tests pass
```

Pre-commit hooks (Husky + lint-staged) enforce formatting. Do not bypass with `--no-verify`.

### Commit Messages

Use imperative mood. Focus on why, not what.

```
Fix CUSUM drift detection using per-trade baseline normalization

Add PROCESSING crash recovery to notification outbox
```

Subject line: under 72 characters. Use the body for technical detail when needed.

### PR Description

Every PR description must include:

1. **Primary system** (and optional secondary system)
2. **What changed** (1–3 bullet points)
3. **Why** (the problem or goal)
4. **Test plan** (how to verify the change works)

---

## 6. Testing Expectations

### Must Be Tested

- All core domain logic: scoring functions, drift detection, walk-forward analysis, state machine transitions, hash chain operations, checkpoint generation.
- All pure utility functions: normalization, sanitization, formatting, validation.
- Any function where a bug would corrupt data or produce a false verification result.

### Should Be Tested

- API route handlers: at least one happy-path and one error-path test.
- Database query logic with meaningful conditions or aggregations.

### May Skip Tests (With Justification)

- Pure UI components with no business logic (layout, styling).
- One-off migration scripts.
- Configuration changes.

If you skip tests, state why in the PR description. "It's simple" is not a justification. "It is a static configuration change with no branching logic" is.

### Test Quality

- Tests must assert behavior, not implementation. Test what a function returns or what side effect it produces, not how it internally computes the result.
- Tests must not depend on execution order.
- Tests must not mock core domain logic — if a test needs to mock the scoring engine to test the scoring engine, the design is wrong.

---

## 7. Error Handling Contract

1. **No silent error swallowing.** Every `.catch()` must log with structured logging at minimum. Critical paths must also report to the error tracking service (Sentry). The pattern `.catch(() => {})` is banned.

2. **User-facing side effects use the outbox.** Notifications that a user expects to receive — email, Discord, webhook, push — must go through the notification outbox (`enqueueNotification()`), not be fired directly from request handlers. This ensures delivery is reliable, retryable, and auditable. Internal async work (cache warming, background recomputation, non-user-visible logging) does not require the outbox — a logged `.catch()` is sufficient.

3. **Fail loudly in development, recover gracefully in production.** Throw in dev when invariants are violated. In production, log, report to error tracking, and degrade gracefully.

---

## 8. Anti-Patterns

These are explicitly prohibited. If a PR introduces any of these patterns, it must be revised.

### Builder-Feature Drift

Adding builder UI features (new indicators, new node types, visual polish) that do not strengthen the verification, monitoring, or proof systems. The builder exists as onboarding (FOUNDATION.md §2). If a builder change does not make verification more accurate or the pre-live ritual more complete, it is drift.

**Test:** Ask "Does this reduce the probability of a trader deploying a false edge?" (FOUNDATION.md §6). If no, it is secondary at best.

### Feature-First Thinking

Proposing a feature without first identifying which system it belongs to and how it changes that system's state model or data flow. Every change must start from architecture, not UI wireframes.

### Implicit State Transitions

Changing a lifecycle phase or status as a side effect inside an unrelated function. Example: updating `lifecyclePhase` inside a billing webhook handler instead of routing through the lifecycle state machine.

### Silent Error Swallowing

Using `.catch(() => {})` or bare `catch {}` without logging. See §7.

### Hardcoded Values in Logic

Embedding version strings, threshold constants, or configuration values directly in business logic. These must be named constants or imported from a single source of truth.

### Fire-and-Forget Without Outbox

Sending user-facing notifications (email, Discord, webhooks) directly from request handlers with a `.catch()` and hoping for the best. All outbound user-facing notifications go through the notification outbox.

### UI-Coupled Domain Logic

Importing React hooks, component state, or framework routing inside core domain modules (scoring, drift detection, verification, hash chain). Core logic must be framework-agnostic.

---

## 9. Decision Escalation

Not every decision needs documentation. These do:

### Write to docs/DECISIONS.md When

- Adding or removing a core system (§2).
- Changing a state machine's states or transitions.
- Choosing between two viable architectural approaches.
- Introducing a new external dependency for a core capability.
- Changing the data model for strategy identity, track record, or proof.

Format: date, decision, context, alternatives considered, outcome.

### Update docs/FOUNDATION.md When

- The mission, target user, or core identity changes.
- A core system is added, removed, or fundamentally redefined.
- The decision principle (§6 of FOUNDATION.md) is refined.

FOUNDATION.md changes require explicit team consensus. It is not updated casually.

---

## Summary

Every contribution must:

1. Map to a named system
2. Respect state machine boundaries
3. Keep verification logic isolated from UI
4. Stay small and focused
5. Pass all checks
6. Avoid every listed anti-pattern

When in doubt, re-read [docs/FOUNDATION.md](docs/FOUNDATION.md). The answer is usually there.
