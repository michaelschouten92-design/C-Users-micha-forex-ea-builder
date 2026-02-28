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
