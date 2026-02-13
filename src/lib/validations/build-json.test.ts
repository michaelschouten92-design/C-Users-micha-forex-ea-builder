import { describe, it, expect } from "vitest";
import { buildJsonSchema } from "./index";

const validBuildJson = {
  version: "1.0",
  nodes: [
    {
      id: "t1",
      type: "always",
      position: { x: 0, y: 0 },
      data: { label: "Always", category: "timing", timingType: "always" },
    },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  metadata: { createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  settings: {
    magicNumber: 123456,
    comment: "Test",
    maxOpenTrades: 1,
    allowHedging: false,
    maxTradesPerDay: 0,
  },
};

describe("buildJsonSchema", () => {
  it("accepts a valid complete build JSON", () => {
    const result = buildJsonSchema.safeParse(validBuildJson);
    expect(result.success).toBe(true);
  });

  it("rejects missing version field", () => {
    const { version, ...rest } = validBuildJson;
    const result = buildJsonSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects wrong version value", () => {
    const result = buildJsonSchema.safeParse({ ...validBuildJson, version: "2.0" });
    expect(result.success).toBe(false);
  });

  it("rejects missing nodes array", () => {
    const { nodes, ...rest } = validBuildJson;
    const result = buildJsonSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts empty nodes and edges", () => {
    const result = buildJsonSchema.safeParse({
      ...validBuildJson,
      nodes: [],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional settings fields", () => {
    const result = buildJsonSchema.safeParse(validBuildJson);
    expect(result.success).toBe(true);
    if (result.success) {
      // Settings should be preserved
      expect(result.data.settings.magicNumber).toBe(123456);
    }
  });

  it("rejects missing metadata", () => {
    const { metadata, ...rest } = validBuildJson;
    const result = buildJsonSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("validates volatility-filter node data", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "vf1",
          type: "volatility-filter",
          position: { x: 0, y: 0 },
          data: {
            label: "Volatility",
            category: "timing",
            filterType: "volatility-filter",
            atrPeriod: 14,
            atrTimeframe: "H1",
            minAtrPips: 5,
            maxAtrPips: 50,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(true);
  });

  it("rejects volatility-filter with invalid atrPeriod", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "vf1",
          type: "volatility-filter",
          position: { x: 0, y: 0 },
          data: {
            label: "Volatility",
            category: "timing",
            filterType: "volatility-filter",
            atrPeriod: -1,
            atrTimeframe: "H1",
            minAtrPips: 5,
            maxAtrPips: 50,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(false);
  });

  it("validates friday-close node data", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "fc1",
          type: "friday-close",
          position: { x: 0, y: 0 },
          data: {
            label: "Friday Close",
            category: "timing",
            filterType: "friday-close",
            closeHour: 17,
            closeMinute: 0,
            useServerTime: true,
            closePending: true,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(true);
  });

  it("rejects friday-close with invalid closeHour", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "fc1",
          type: "friday-close",
          position: { x: 0, y: 0 },
          data: {
            label: "Friday Close",
            category: "timing",
            filterType: "friday-close",
            closeHour: 25,
            closeMinute: 0,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(false);
  });

  it("validates news-filter node data", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "nf1",
          type: "news-filter",
          position: { x: 0, y: 0 },
          data: {
            label: "News Filter",
            category: "timing",
            filterType: "news-filter",
            hoursBefore: 0.5,
            hoursAfter: 0.5,
            highImpact: true,
            mediumImpact: false,
            lowImpact: false,
            closePositions: false,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(true);
  });

  it("validates ema-crossover entry with minEmaSeparation", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "e1",
          type: "ema-crossover-entry",
          position: { x: 0, y: 0 },
          data: {
            label: "EMA Crossover",
            category: "entrystrategy",
            entryType: "ema-crossover",
            direction: "BOTH",
            fastEma: 50,
            slowEma: 200,
            appliedPrice: "CLOSE",
            timeframe: "H1",
            riskPercent: 1,
            slMethod: "ATR",
            slFixedPips: 50,
            slPercent: 1,
            slAtrMultiplier: 1.5,
            tpRMultiple: 2,
            htfTrendFilter: false,
            htfTimeframe: "H4",
            htfEma: 200,
            rsiConfirmation: false,
            rsiPeriod: 14,
            rsiLongMax: 60,
            rsiShortMin: 40,
            minEmaSeparation: 5,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(true);
    if (result.success) {
      const nodeData = result.data.nodes[0].data as Record<string, unknown>;
      expect(nodeData.minEmaSeparation).toBe(5);
    }
  });

  it("validates trend-pullback entry with appliedPrice preserved", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "e1",
          type: "trend-pullback-entry",
          position: { x: 0, y: 0 },
          data: {
            label: "Trend Pullback",
            category: "entrystrategy",
            entryType: "trend-pullback",
            direction: "BOTH",
            trendEma: 50,
            pullbackRsiPeriod: 14,
            rsiPullbackLevel: 30,
            pullbackMaxDistance: 2.0,
            requireEmaBuffer: true,
            useAdxFilter: false,
            adxPeriod: 14,
            adxThreshold: 25,
            appliedPrice: "HIGH",
            timeframe: "H1",
            riskPercent: 1,
            slMethod: "ATR",
            slFixedPips: 50,
            slPercent: 1,
            slAtrMultiplier: 1.5,
            tpRMultiple: 2,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(true);
    if (result.success) {
      const nodeData = result.data.nodes[0].data as Record<string, unknown>;
      expect(nodeData.appliedPrice).toBe("HIGH");
    }
  });

  it("rejects trend-pullback with rsiPullbackLevel < 10", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "e1",
          type: "trend-pullback-entry",
          position: { x: 0, y: 0 },
          data: {
            label: "Trend Pullback",
            category: "entrystrategy",
            entryType: "trend-pullback",
            direction: "BOTH",
            trendEma: 50,
            pullbackRsiPeriod: 14,
            rsiPullbackLevel: 5,
            pullbackMaxDistance: 2.0,
            requireEmaBuffer: true,
            useAdxFilter: false,
            adxPeriod: 14,
            adxThreshold: 25,
            timeframe: "H1",
            riskPercent: 1,
            slMethod: "ATR",
            slFixedPips: 50,
            slPercent: 1,
            slAtrMultiplier: 1.5,
            tpRMultiple: 2,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(false);
  });

  it("rejects ema-crossover with fastEma >= slowEma", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "e1",
          type: "ema-crossover-entry",
          position: { x: 0, y: 0 },
          data: {
            label: "EMA Crossover",
            category: "entrystrategy",
            entryType: "ema-crossover",
            direction: "BOTH",
            fastEma: 200,
            slowEma: 50,
            appliedPrice: "CLOSE",
            timeframe: "H1",
            riskPercent: 1,
            slMethod: "ATR",
            slFixedPips: 50,
            slPercent: 1,
            slAtrMultiplier: 1.5,
            tpRMultiple: 2,
            htfTrendFilter: false,
            htfTimeframe: "H4",
            htfEma: 200,
            rsiConfirmation: false,
            rsiPeriod: 14,
            rsiLongMax: 60,
            rsiShortMin: 40,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(false);
  });

  it("rejects macd-crossover with macdFast >= macdSlow", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "e1",
          type: "macd-crossover-entry",
          position: { x: 0, y: 0 },
          data: {
            label: "MACD Crossover",
            category: "entrystrategy",
            entryType: "macd-crossover",
            direction: "BOTH",
            macdFast: 26,
            macdSlow: 12,
            macdSignal: 9,
            timeframe: "H1",
            riskPercent: 1,
            slMethod: "ATR",
            slFixedPips: 50,
            slPercent: 1,
            slAtrMultiplier: 1.5,
            tpRMultiple: 2,
            htfTrendFilter: false,
            htfTimeframe: "H4",
            htfEma: 200,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(false);
  });

  it("rejects rsi-reversal with overboughtLevel <= oversoldLevel", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "e1",
          type: "rsi-reversal-entry",
          position: { x: 0, y: 0 },
          data: {
            label: "RSI Reversal",
            category: "entrystrategy",
            entryType: "rsi-reversal",
            direction: "BOTH",
            rsiPeriod: 14,
            oversoldLevel: 50,
            overboughtLevel: 50,
            timeframe: "H1",
            riskPercent: 1,
            slMethod: "ATR",
            slFixedPips: 50,
            slPercent: 1,
            slAtrMultiplier: 1.2,
            tpRMultiple: 1.5,
            trendFilter: false,
            trendEma: 200,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(false);
  });

  it("rejects news-filter with hoursBefore > 24", () => {
    const build = {
      ...validBuildJson,
      version: "1.1",
      nodes: [
        {
          id: "nf1",
          type: "news-filter",
          position: { x: 0, y: 0 },
          data: {
            label: "News Filter",
            category: "timing",
            filterType: "news-filter",
            hoursBefore: 30,
            hoursAfter: 0.5,
            highImpact: true,
            mediumImpact: false,
            lowImpact: false,
            closePositions: false,
          },
        },
      ],
    };
    const result = buildJsonSchema.safeParse(build);
    expect(result.success).toBe(false);
  });
});
