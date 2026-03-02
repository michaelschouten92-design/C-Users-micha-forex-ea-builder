import { describe, it, expect } from "vitest";
import { decideMonitoringTransition } from "./decide-monitoring-transition";
import type { TransitionInput } from "./decide-monitoring-transition";

const RECOVERY_RUNS = 3;

function makeInput(overrides: Partial<TransitionInput>): TransitionInput {
  return {
    currentLifecycleState: "LIVE_MONITORING",
    monitoringVerdict: "HEALTHY",
    reasons: [],
    consecutiveHealthyRuns: 0,
    recoveryRunsRequired: RECOVERY_RUNS,
    ...overrides,
  };
}

describe("decideMonitoringTransition", () => {
  // ── LIVE_MONITORING transitions ──────────────────────────────────────
  describe("from LIVE_MONITORING", () => {
    it("AT_RISK → TRANSITION to EDGE_AT_RISK", () => {
      const result = decideMonitoringTransition(
        makeInput({
          monitoringVerdict: "AT_RISK",
          reasons: ["MONITORING_DRAWDOWN_BREACH"],
        })
      );

      expect(result).toEqual({
        type: "TRANSITION",
        from: "LIVE_MONITORING",
        to: "EDGE_AT_RISK",
        reason: expect.stringContaining("MONITORING_DRAWDOWN_BREACH"),
        proofEventType: "STRATEGY_EDGE_AT_RISK",
      });
    });

    it("INVALIDATED → NO_TRANSITION (must pass through EDGE_AT_RISK)", () => {
      const result = decideMonitoringTransition(
        makeInput({
          monitoringVerdict: "INVALIDATED",
          reasons: ["MONITORING_CUSUM_DRIFT"],
        })
      );

      expect(result).toEqual({
        type: "NO_TRANSITION",
        reason: "must_pass_through_edge_at_risk",
      });
    });

    it("HEALTHY → NO_TRANSITION", () => {
      const result = decideMonitoringTransition(makeInput({ monitoringVerdict: "HEALTHY" }));

      expect(result).toEqual({
        type: "NO_TRANSITION",
        reason: "healthy",
      });
    });
  });

  // ── EDGE_AT_RISK transitions ─────────────────────────────────────────
  describe("from EDGE_AT_RISK", () => {
    it("INVALIDATED → TRANSITION to INVALIDATED", () => {
      const result = decideMonitoringTransition(
        makeInput({
          currentLifecycleState: "EDGE_AT_RISK",
          monitoringVerdict: "INVALIDATED",
          reasons: ["MONITORING_CUSUM_DRIFT"],
        })
      );

      expect(result).toEqual({
        type: "TRANSITION",
        from: "EDGE_AT_RISK",
        to: "INVALIDATED",
        reason: expect.stringContaining("MONITORING_CUSUM_DRIFT"),
        proofEventType: "STRATEGY_INVALIDATED",
      });
    });

    it("AT_RISK → NO_TRANSITION (already at risk)", () => {
      const result = decideMonitoringTransition(
        makeInput({
          currentLifecycleState: "EDGE_AT_RISK",
          monitoringVerdict: "AT_RISK",
          reasons: ["MONITORING_DRAWDOWN_BREACH"],
        })
      );

      expect(result).toEqual({
        type: "NO_TRANSITION",
        reason: "already_at_risk",
      });
    });

    it("HEALTHY with consecutiveHealthyRuns >= N → TRANSITION to LIVE_MONITORING (recovery)", () => {
      const result = decideMonitoringTransition(
        makeInput({
          currentLifecycleState: "EDGE_AT_RISK",
          monitoringVerdict: "HEALTHY",
          consecutiveHealthyRuns: 3,
        })
      );

      expect(result).toEqual({
        type: "TRANSITION",
        from: "EDGE_AT_RISK",
        to: "LIVE_MONITORING",
        reason: expect.stringContaining("3 consecutive healthy runs"),
        proofEventType: "STRATEGY_RECOVERED",
      });
    });

    it("HEALTHY with consecutiveHealthyRuns > N → still recovers", () => {
      const result = decideMonitoringTransition(
        makeInput({
          currentLifecycleState: "EDGE_AT_RISK",
          monitoringVerdict: "HEALTHY",
          consecutiveHealthyRuns: 10,
        })
      );

      expect(result.type).toBe("TRANSITION");
    });

    it("HEALTHY with consecutiveHealthyRuns < N → NO_TRANSITION (recovering)", () => {
      const result = decideMonitoringTransition(
        makeInput({
          currentLifecycleState: "EDGE_AT_RISK",
          monitoringVerdict: "HEALTHY",
          consecutiveHealthyRuns: 2,
        })
      );

      expect(result).toEqual({
        type: "NO_TRANSITION",
        reason: "recovering",
      });
    });

    it("HEALTHY with consecutiveHealthyRuns = 0 → NO_TRANSITION", () => {
      const result = decideMonitoringTransition(
        makeInput({
          currentLifecycleState: "EDGE_AT_RISK",
          monitoringVerdict: "HEALTHY",
          consecutiveHealthyRuns: 0,
        })
      );

      expect(result).toEqual({
        type: "NO_TRANSITION",
        reason: "recovering",
      });
    });
  });

  // ── Non-eligible states ──────────────────────────────────────────────
  describe("non-eligible states", () => {
    const nonEligible = ["DRAFT", "BACKTESTED", "VERIFIED", "INVALIDATED"];

    for (const state of nonEligible) {
      it(`${state} + any verdict → NO_TRANSITION (state_not_eligible)`, () => {
        for (const verdict of ["HEALTHY", "AT_RISK", "INVALIDATED"] as const) {
          const result = decideMonitoringTransition(
            makeInput({
              currentLifecycleState: state,
              monitoringVerdict: verdict,
              reasons: verdict !== "HEALTHY" ? ["SOME_REASON"] : [],
            })
          );

          expect(result).toEqual({
            type: "NO_TRANSITION",
            reason: "state_not_eligible",
          });
        }
      });
    }
  });

  // ── Determinism ──────────────────────────────────────────────────────
  it("is deterministic — same input produces same output", () => {
    const input = makeInput({
      currentLifecycleState: "EDGE_AT_RISK",
      monitoringVerdict: "HEALTHY",
      consecutiveHealthyRuns: 3,
    });
    const a = decideMonitoringTransition(input);
    const b = decideMonitoringTransition(input);
    expect(a).toEqual(b);
  });

  // ── Reason formatting ────────────────────────────────────────────────
  it("includes all reasons in transition reason string", () => {
    const result = decideMonitoringTransition(
      makeInput({
        monitoringVerdict: "AT_RISK",
        reasons: ["MONITORING_DRAWDOWN_BREACH", "MONITORING_LOSS_STREAK"],
      })
    );

    expect(result.type).toBe("TRANSITION");
    if (result.type === "TRANSITION") {
      expect(result.reason).toContain("MONITORING_DRAWDOWN_BREACH");
      expect(result.reason).toContain("MONITORING_LOSS_STREAK");
    }
  });
});
