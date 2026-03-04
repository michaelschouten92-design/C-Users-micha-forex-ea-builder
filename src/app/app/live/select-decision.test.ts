import { describe, it, expect } from "vitest";
import { selectDecision } from "./select-decision";
import type { AuthorityDecision, RecentDecision } from "./load-monitor-data";

const decisions: RecentDecision[] = [
  { id: "evt_1", timestamp: "2025-01-01T12:02:00.000Z", action: "RUN", reasonCode: "OK" },
  {
    id: "evt_2",
    timestamp: "2025-01-01T12:01:00.000Z",
    action: "PAUSE",
    reasonCode: "MONITORING_AT_RISK",
  },
  {
    id: "evt_3",
    timestamp: "2025-01-01T12:00:00.000Z",
    action: "STOP",
    reasonCode: "STRATEGY_HALTED",
  },
];

const authority: AuthorityDecision = {
  action: "RUN",
  reasonCode: "OK",
  decidedAt: "2025-01-01T12:02:00.000Z",
  strategyId: "strat_1",
};

describe("selectDecision", () => {
  it("selects matching decision when selectedId matches", () => {
    const result = selectDecision(decisions, authority, "evt_2");
    expect(result.decision.action).toBe("PAUSE");
    expect(result.decision.reasonCode).toBe("MONITORING_AT_RISK");
    expect(result.selectedId).toBe("evt_2");
  });

  it("falls back to authority when selectedId does not match", () => {
    const result = selectDecision(decisions, authority, "nonexistent");
    expect(result.decision.action).toBe("RUN");
    expect(result.decision.reasonCode).toBe("OK");
    expect(result.selectedId).toBeNull();
  });

  it("falls back to authority when selectedId is undefined", () => {
    const result = selectDecision(decisions, authority, undefined);
    expect(result.decision.action).toBe("RUN");
    expect(result.decision.reasonCode).toBe("OK");
    expect(result.selectedId).toBeNull();
  });

  it("falls back to authority when selectedId is empty string", () => {
    const result = selectDecision(decisions, authority, "");
    expect(result.decision.action).toBe("RUN");
    expect(result.decision.reasonCode).toBe("OK");
    expect(result.selectedId).toBeNull();
  });

  it("returns fail-closed fallback when authority is null and no match", () => {
    const result = selectDecision(decisions, null, "nonexistent");
    expect(result.decision.action).toBe("PAUSE");
    expect(result.decision.reasonCode).toBe("COMPUTATION_FAILED");
    expect(result.selectedId).toBeNull();
  });

  it("returns fail-closed fallback when everything is empty/null", () => {
    const result = selectDecision([], null, undefined);
    expect(result.decision.action).toBe("PAUSE");
    expect(result.decision.reasonCode).toBe("COMPUTATION_FAILED");
    expect(result.selectedId).toBeNull();
  });

  it("still matches selectedId even when authority is null", () => {
    const result = selectDecision(decisions, null, "evt_3");
    expect(result.decision.action).toBe("STOP");
    expect(result.decision.reasonCode).toBe("STRATEGY_HALTED");
    expect(result.selectedId).toBe("evt_3");
  });

  it("is deterministic — same inputs produce same outputs", () => {
    const a = selectDecision(decisions, authority, "evt_2");
    const b = selectDecision(decisions, authority, "evt_2");
    expect(a).toEqual(b);
  });

  it("carries context through when URL-matched decision has context", () => {
    const withContext: RecentDecision[] = [
      {
        id: "evt_ctx",
        timestamp: "2025-01-01T12:00:00.000Z",
        action: "PAUSE",
        reasonCode: "STRATEGY_HALTED",
        context: {
          lifecycleState: "EDGE_AT_RISK",
          operatorHold: "HALTED",
          suppressionActive: false,
        },
      },
    ];
    const result = selectDecision(withContext, authority, "evt_ctx");
    expect(result.decision.context).toEqual({
      lifecycleState: "EDGE_AT_RISK",
      operatorHold: "HALTED",
      suppressionActive: false,
    });
    expect(result.selectedId).toBe("evt_ctx");
  });

  it("authority fallback has no context", () => {
    const result = selectDecision(decisions, authority, undefined);
    expect(result.decision.context).toBeUndefined();
  });
});
