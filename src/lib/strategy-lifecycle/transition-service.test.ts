import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInfo } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
}));

const { mockInstanceUpdate } = vi.hoisted(() => ({
  mockInstanceUpdate: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: mockInfo }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: { update: mockInstanceUpdate },
  },
}));

import { performLifecycleTransition } from "./transition-service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("performLifecycleTransition", () => {
  it("updates DB and logs valid DRAFT → BACKTESTED transition", async () => {
    await performLifecycleTransition("inst_1", "DRAFT", "BACKTESTED", "backtest_complete");

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_1" },
      data: { lifecycleState: "BACKTESTED" },
    });
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_1",
        from: "DRAFT",
        to: "BACKTESTED",
        reason: "backtest_complete",
      }),
      "Lifecycle state transition"
    );
  });

  it("updates DB and logs valid LIVE_MONITORING → EDGE_AT_RISK transition", async () => {
    await performLifecycleTransition("inst_2", "LIVE_MONITORING", "EDGE_AT_RISK", "edge_degraded");

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_2" },
      data: { lifecycleState: "EDGE_AT_RISK" },
    });
    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_2",
        from: "LIVE_MONITORING",
        to: "EDGE_AT_RISK",
        reason: "edge_degraded",
      }),
      "Lifecycle state transition"
    );
  });

  it("throws on invalid DRAFT → INVALIDATED transition, no DB write or log", async () => {
    await expect(
      performLifecycleTransition("inst_3", "DRAFT", "INVALIDATED", "bad_transition")
    ).rejects.toThrow("Invalid lifecycle transition: DRAFT → INVALIDATED");

    expect(mockInstanceUpdate).not.toHaveBeenCalled();
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("throws on terminal INVALIDATED → DRAFT transition, no DB write", async () => {
    await expect(
      performLifecycleTransition("inst_4", "INVALIDATED", "DRAFT", "restart_attempt")
    ).rejects.toThrow("Invalid lifecycle transition: INVALIDATED → DRAFT");

    expect(mockInstanceUpdate).not.toHaveBeenCalled();
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("log contains all structured fields", async () => {
    await performLifecycleTransition("inst_5", "BACKTESTED", "VERIFIED", "verification_passed");

    expect(mockInfo).toHaveBeenCalledWith(
      { instanceId: "inst_5", from: "BACKTESTED", to: "VERIFIED", reason: "verification_passed" },
      "Lifecycle state transition"
    );
  });
});
