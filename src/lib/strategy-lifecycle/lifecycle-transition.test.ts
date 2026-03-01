import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInfo } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: mockInfo }),
  },
}));

import { applyLifecycleTransition } from "./lifecycle-transition";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyLifecycleTransition", () => {
  it("valid BACKTESTED → VERIFIED returns new state and logs", () => {
    const result = applyLifecycleTransition(
      "strat_1",
      3,
      "BACKTESTED",
      "VERIFIED",
      "verification_passed"
    );

    expect(result).toBe("VERIFIED");
    expect(mockInfo).toHaveBeenCalledWith(
      {
        strategyId: "strat_1",
        strategyVersion: 3,
        from: "BACKTESTED",
        to: "VERIFIED",
        reason: "verification_passed",
      },
      "Lifecycle state transition"
    );
  });

  it("invalid DRAFT → INVALIDATED throws", () => {
    expect(() =>
      applyLifecycleTransition("strat_2", 1, "DRAFT", "INVALIDATED", "bad_transition")
    ).toThrow("Invalid lifecycle transition: DRAFT → INVALIDATED");

    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("valid DRAFT → BACKTESTED logs correct payload", () => {
    const result = applyLifecycleTransition(
      "strat_3",
      2,
      "DRAFT",
      "BACKTESTED",
      "backtest_complete"
    );

    expect(result).toBe("BACKTESTED");
    expect(mockInfo).toHaveBeenCalledWith(
      {
        strategyId: "strat_3",
        strategyVersion: 2,
        from: "DRAFT",
        to: "BACKTESTED",
        reason: "backtest_complete",
      },
      "Lifecycle state transition"
    );
  });
});
