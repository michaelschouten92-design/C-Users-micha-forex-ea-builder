import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInfo, mockWarn } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockWarn: vi.fn(),
}));

const { mockInstanceUpdate, mockAlertUpdate } = vi.hoisted(() => ({
  mockInstanceUpdate: vi.fn().mockResolvedValue({}),
  mockAlertUpdate: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ info: mockInfo, warn: mockWarn }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveEAInstance: { update: mockInstanceUpdate },
    eAAlertConfig: { update: mockAlertUpdate },
  },
}));

import { transitionTradingState, transitionAlertState } from "./trading-state";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("transitionTradingState", () => {
  it("updates DB and logs valid TRADING → PAUSED transition", async () => {
    await transitionTradingState("inst_1", "TRADING", "PAUSED", "user_pause");

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_1" },
      data: { tradingState: "PAUSED" },
    });
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

  it("updates DB and logs valid PAUSED → TRADING transition", async () => {
    await transitionTradingState("inst_2", "PAUSED", "TRADING", "user_resume");

    expect(mockInstanceUpdate).toHaveBeenCalledWith({
      where: { id: "inst_2" },
      data: { tradingState: "TRADING" },
    });
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

  it("warns on unexpected same-state transition but still updates", async () => {
    await transitionTradingState("inst_3", "TRADING", "TRADING", "spurious");

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_3",
        from: "TRADING",
        to: "TRADING",
      }),
      "Unexpected trading state transition"
    );
    expect(mockInstanceUpdate).toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalled();
  });

  it("warns on invalid PAUSED → PAUSED transition", async () => {
    await transitionTradingState("inst_4", "PAUSED", "PAUSED", "duplicate_pause");

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: "inst_4",
        from: "PAUSED",
        to: "PAUSED",
        reason: "duplicate_pause",
      }),
      "Unexpected trading state transition"
    );
    expect(mockInstanceUpdate).toHaveBeenCalled();
  });
});

describe("transitionAlertState", () => {
  it("updates DB and logs valid ACTIVE → DISABLED transition", async () => {
    await transitionAlertState("cfg_1", "ACTIVE", "DISABLED", "user_disable");

    expect(mockAlertUpdate).toHaveBeenCalledWith({
      where: { id: "cfg_1" },
      data: { state: "DISABLED" },
    });
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

  it("updates DB and logs valid DISABLED → ACTIVE transition", async () => {
    await transitionAlertState("cfg_2", "DISABLED", "ACTIVE", "user_enable");

    expect(mockAlertUpdate).toHaveBeenCalledWith({
      where: { id: "cfg_2" },
      data: { state: "ACTIVE" },
    });
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

  it("warns on unexpected same-state transition but still updates", async () => {
    await transitionAlertState("cfg_3", "ACTIVE", "ACTIVE", "spurious");

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        configId: "cfg_3",
        from: "ACTIVE",
        to: "ACTIVE",
      }),
      "Unexpected alert state transition"
    );
    expect(mockAlertUpdate).toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalled();
  });
});
