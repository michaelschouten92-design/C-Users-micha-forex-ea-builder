import { describe, it, expect } from "vitest";
import { migrateProjectData, CURRENT_VERSION } from "./index";

describe("migrateProjectData", () => {
  it("adds default version 1.0 when version field is missing", () => {
    const data = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      metadata: { createdAt: "2024-01-01", updatedAt: "2024-01-01" },
      settings: { magicNumber: 123456, comment: "Test" },
    };
    const result = migrateProjectData(data);
    expect(result.version).toBe(CURRENT_VERSION);
  });

  it("does not modify data that is already at current version", () => {
    const data = {
      version: CURRENT_VERSION,
      nodes: [{ id: "n1", type: "always", position: { x: 0, y: 0 }, data: { label: "Always" } }],
      edges: [],
      viewport: { x: 10, y: 20, zoom: 1.5 },
      metadata: { createdAt: "2024-01-01", updatedAt: "2024-01-01" },
      settings: { magicNumber: 999, comment: "Keep" },
    };
    const result = migrateProjectData(data);
    expect(result.version).toBe(CURRENT_VERSION);
    expect(result.nodes).toHaveLength(1);
    expect(result.settings.magicNumber).toBe(999);
    expect(result.viewport.zoom).toBe(1.5);
  });

  it("preserves all existing fields through migration", () => {
    const data = {
      version: "1.0",
      nodes: [],
      edges: [{ id: "e1", source: "a", target: "b" }],
      viewport: { x: 0, y: 0, zoom: 1 },
      metadata: { createdAt: "2024-06-01", updatedAt: "2024-06-15" },
      settings: { magicNumber: 42, comment: "Custom" },
    };
    const result = migrateProjectData(data);
    expect(result.edges).toHaveLength(1);
    expect(result.metadata.createdAt).toBe("2024-06-01");
  });
});
