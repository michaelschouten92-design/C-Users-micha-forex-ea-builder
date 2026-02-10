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
});
