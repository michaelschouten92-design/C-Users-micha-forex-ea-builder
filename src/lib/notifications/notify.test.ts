import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: (...args: unknown[]) => mockLogInfo(...args),
      warn: (...args: unknown[]) => mockLogWarn(...args),
      error: vi.fn(),
    }),
  },
}));

const mockAlert = {
  strategyId: "strat_abc",
  fromState: "LIVE_MONITORING",
  toState: "EDGE_AT_RISK",
  monitoringVerdict: "AT_RISK",
  reasonCodes: ["DRAWDOWN_BREACH"],
  tradeSnapshotHash: "snap_hash_123",
  configVersion: "2.0.0",
  thresholdsHash: "thresh_hash_456",
  recordId: "rec_xyz",
};

describe("notifyTransition", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NOTIFY_WEBHOOK_URL;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends POST when NOTIFY_WEBHOOK_URL is set", async () => {
    process.env.NOTIFY_WEBHOOK_URL = "https://hooks.example.com/alert";
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = mockFetch;

    const { notifyTransition } = await import("./notify");
    await notifyTransition(mockAlert);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.example.com/alert",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("includes correct payload fields", async () => {
    process.env.NOTIFY_WEBHOOK_URL = "https://hooks.example.com/alert";
    let capturedBody: string | undefined;
    const mockFetch = vi.fn().mockImplementation((_url, opts) => {
      capturedBody = opts?.body;
      return Promise.resolve({ ok: true, status: 200 });
    });
    globalThis.fetch = mockFetch;

    const { notifyTransition } = await import("./notify");
    await notifyTransition(mockAlert);

    const parsed = JSON.parse(capturedBody!);
    expect(parsed).toEqual({
      event: "lifecycle_transition",
      strategyId: "strat_abc",
      fromState: "LIVE_MONITORING",
      toState: "EDGE_AT_RISK",
      monitoringVerdict: "AT_RISK",
      reasonCodes: ["DRAWDOWN_BREACH"],
      tradeSnapshotHash: "snap_hash_123",
      configVersion: "2.0.0",
      thresholdsHash: "thresh_hash_456",
      recordId: "rec_xyz",
    });
  });

  it("logs notifications_disabled when URL missing", async () => {
    const { notifyTransition } = await import("./notify");
    await notifyTransition(mockAlert);

    expect(mockLogInfo).toHaveBeenCalledWith({ strategyId: "strat_abc" }, "notifications_disabled");
  });

  it("logs warning on non-2xx response", async () => {
    process.env.NOTIFY_WEBHOOK_URL = "https://hooks.example.com/alert";
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    const { notifyTransition } = await import("./notify");
    await notifyTransition(mockAlert);

    expect(mockLogWarn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 503, strategyId: "strat_abc" }),
      "Transition notification delivery returned non-2xx"
    );
  });

  it("logs warning on network error", async () => {
    process.env.NOTIFY_WEBHOOK_URL = "https://hooks.example.com/alert";
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const { notifyTransition } = await import("./notify");
    await notifyTransition(mockAlert);

    expect(mockLogWarn).toHaveBeenCalledWith(
      expect.objectContaining({ error: "ECONNREFUSED", strategyId: "strat_abc" }),
      "Transition notification failed"
    );
  });

  it("never throws — error is swallowed", async () => {
    process.env.NOTIFY_WEBHOOK_URL = "https://hooks.example.com/alert";
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("timeout"));

    const { notifyTransition } = await import("./notify");
    await expect(notifyTransition(mockAlert)).resolves.toBeUndefined();
  });
});
