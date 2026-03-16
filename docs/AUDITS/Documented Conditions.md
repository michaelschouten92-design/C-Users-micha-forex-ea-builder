---
# Documented Conditions

These conditions remain but do **not threaten system safety**.
---

## Monitoring EA

Queue overflow may drop events after extended offline periods.

Mitigation:

- chain degradation markers
- SyncChainState recovery
- server-side chain validation

---

## Strategy Evaluation

Health evaluation reads are not transaction-bound.

Effect:

Possible short-lived snapshot inconsistency during baseline relink.

Mitigation:

- snapshots are append-only
- evaluation re-runs within 30 minutes

---

## Command Center

Operational mutations (pause, delete, baseline link) are not proof-chain events.

Justification:

These are resource management actions, not governance transitions.

Lifecycle transitions remain proof-chain protected.

---

## Strategy Builder

Certain strategy configurations intentionally remain permissive:

- SL/TP optional
- pending-order dynamic risk sizing
- embedded news fallback dataset

These are product design choices rather than system safety defects.

---

# Architectural Safety Guarantees

The audit confirmed the following guarantees hold across the system.

---

## Immutable Trade Facts

Trade events are:

- append-only
- chain-verified
- idempotent
- order-enforced

Invalid events are rejected.

---

## Deterministic Monitoring

Strategy health evaluation is based on:

- immutable trade facts
- deterministic statistics
- pure scoring functions

---

## Atomic Lifecycle Transitions

All lifecycle transitions use:
