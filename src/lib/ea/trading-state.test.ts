import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInfo, mockWarn } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockWarn: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: mockInfo, warn: mockWarn }),
  },
}));

import { logTradingStateTransition, logAlertStateTransition } from "./trading-state";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("logTradingStateTransition", () => {
  it("logs valid TRADING → PAUSED transition without warning", () => {
    logTradingStateTransition("inst_1", "TRADING", "PAUSED", "user_pause");

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_1",
        from: "TRADING",
        to: "PAUSED",
        reason: "user_pause",
      }),
      "Trading state transition"
    );
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("logs valid PAUSED → TRADING transition without warning", () => {
    logTradingStateTransition("inst_2", "PAUSED", "TRADING", "user_resume");

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_2",
        from: "PAUSED",
        to: "TRADING",
        reason: "user_resume",
      }),
      "Trading state transition"
    );
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("warns on unexpected transition (same state)", () => {
    logTradingStateTransition("inst_3", "TRADING", "TRADING", "spurious");

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_3",
        from: "TRADING",
        to: "TRADING",
      }),
      "Unexpected trading state transition"
    );
    // Still emits info log
    expect(mockInfo).toHaveBeenCalled();
  });
});

describe("logAlertStateTransition", () => {
  it("logs valid ACTIVE → DISABLED transition without warning", () => {
    logAlertStateTransition("cfg_1", "ACTIVE", "DISABLED", "user_disable");

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        configId: "cfg_1",
        from: "ACTIVE",
        to: "DISABLED",
        reason: "user_disable",
      }),
      "Alert state transition"
    );
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("logs valid DISABLED → ACTIVE transition without warning", () => {
    logAlertStateTransition("cfg_2", "DISABLED", "ACTIVE", "user_enable");

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        configId: "cfg_2",
        from: "DISABLED",
        to: "ACTIVE",
        reason: "user_enable",
      }),
      "Alert state transition"
    );
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("warns on unexpected transition (same state)", () => {
    logAlertStateTransition("cfg_3", "ACTIVE", "ACTIVE", "spurious");

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        configId: "cfg_3",
        from: "ACTIVE",
        to: "ACTIVE",
      }),
      "Unexpected alert state transition"
    );
    expect(mockInfo).toHaveBeenCalled();
  });
});
