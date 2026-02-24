import { describe, it, expect } from "vitest";
import { validateStrategyForExport } from "./strategy-validation";
import type { Node, Edge } from "@xyflow/react";
import type { BuilderNodeData } from "@/types/builder";

function makeNode(id: string, data: Record<string, unknown>): Node<BuilderNodeData> {
  return {
    id,
    type: "custom",
    position: { x: 0, y: 0 },
    data: { label: "Test Node", ...data },
  } as Node<BuilderNodeData>;
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}

describe("validateStrategyForExport", () => {
  describe("missing SL/TP → error", () => {
    it("returns an error when no stop loss or take profit blocks are present", () => {
      const nodes = [
        makeNode("1", { timingType: "always" }),
        makeNode("2", { entryType: "ma-crossover", fastEma: 10, slowEma: 20 }),
      ];
      const edges = [makeEdge("1", "2")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.errors.some((e) => e.message.includes("stop loss or take profit"))).toBe(true);
      expect(result.errors.some((e) => e.severity === "error")).toBe(true);
    });

    it("does not return error when SL block is present", () => {
      const nodes = [
        makeNode("1", { timingType: "always" }),
        makeNode("2", { tradingType: "stop-loss", slMethod: "FIXED_PIPS", slPips: 50 }),
      ];
      const edges = [makeEdge("1", "2")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.errors.some((e) => e.message.includes("stop loss or take profit"))).toBe(false);
    });
  });

  describe("risk percent validation", () => {
    it("returns error when risk > 10%", () => {
      const nodes = [
        makeNode("1", { tradingType: "stop-loss", slMethod: "FIXED_PIPS", slPips: 50 }),
        makeNode("2", { riskPercent: 15 }),
      ];
      const edges = [makeEdge("1", "2")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.errors.some((e) => e.message.includes("exceeds safe limits"))).toBe(true);
    });

    it("returns warning when risk 5-10%", () => {
      const nodes = [
        makeNode("1", { tradingType: "stop-loss", slMethod: "FIXED_PIPS", slPips: 50 }),
        makeNode("2", { riskPercent: 7 }),
      ];
      const edges = [makeEdge("1", "2")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.warnings.some((w) => w.message.includes("aggressive"))).toBe(true);
      expect(result.errors.some((e) => e.message.includes("exceeds safe limits"))).toBe(false);
    });

    it("does not warn when risk <= 5%", () => {
      const nodes = [
        makeNode("1", { tradingType: "stop-loss", slMethod: "FIXED_PIPS", slPips: 50 }),
        makeNode("2", { riskPercent: 2 }),
      ];
      const edges = [makeEdge("1", "2")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.warnings.some((w) => w.message.includes("aggressive"))).toBe(false);
      expect(result.errors.some((e) => e.message.includes("exceeds safe limits"))).toBe(false);
    });
  });

  describe("indicator period bounds", () => {
    it("returns error when period > 1000", () => {
      const nodes = [
        makeNode("1", { tradingType: "stop-loss", slMethod: "FIXED_PIPS", slPips: 50 }),
        makeNode("2", { period: 1500 }),
      ];
      const edges = [makeEdge("1", "2")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.errors.some((e) => e.message.includes("too large"))).toBe(true);
    });

    it("returns error when period is 0", () => {
      const nodes = [
        makeNode("1", { tradingType: "stop-loss", slMethod: "FIXED_PIPS", slPips: 50 }),
        makeNode("2", { period: 0 }),
      ];
      const edges = [makeEdge("1", "2")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.errors.some((e) => e.message.includes("greater than 0"))).toBe(true);
    });

    it("returns error when period is negative", () => {
      const nodes = [
        makeNode("1", { tradingType: "stop-loss", slMethod: "FIXED_PIPS", slPips: 50 }),
        makeNode("2", { period: -5 }),
      ];
      const edges = [makeEdge("1", "2")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.errors.some((e) => e.message.includes("greater than 0"))).toBe(true);
    });

    it("accepts valid period", () => {
      const nodes = [
        makeNode("1", { tradingType: "stop-loss", slMethod: "FIXED_PIPS", slPips: 50 }),
        makeNode("2", { period: 14 }),
      ];
      const edges = [makeEdge("1", "2")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.errors.some((e) => e.message.includes("Period"))).toBe(false);
    });
  });

  describe("valid strategy", () => {
    it("returns no errors for a well-configured strategy", () => {
      const nodes = [
        makeNode("1", { timingType: "always" }),
        makeNode("2", {
          entryType: "ma-crossover",
          fastEma: 10,
          slowEma: 20,
          riskPercent: 2,
          period: 14,
        }),
        makeNode("3", { tradingType: "stop-loss", slMethod: "FIXED_PIPS", slPips: 50 }),
        makeNode("4", { tradingType: "take-profit", tpMethod: "FIXED_PIPS", tpPips: 100 }),
      ];
      const edges = [makeEdge("1", "2"), makeEdge("2", "3"), makeEdge("3", "4")];
      const result = validateStrategyForExport(nodes, edges);
      expect(result.errors).toHaveLength(0);
    });
  });
});
