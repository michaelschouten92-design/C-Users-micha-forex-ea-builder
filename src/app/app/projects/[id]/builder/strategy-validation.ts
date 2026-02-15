import type { Node, Edge } from "@xyflow/react";
import type { BuilderNodeData } from "@/types/builder";

export interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  nodeType?: string;
}

export interface ValidationResult {
  isValid: boolean;
  canExport: boolean;
  issues: ValidationIssue[];
  summary: {
    hasTiming: boolean;
    hasEntryStrategy: boolean;
  };
}

export function validateStrategy(
  nodes: Node<BuilderNodeData>[],
  edges: Edge[] = []
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check for entry strategy composite blocks (contain signal, SL, TP, position sizing)
  const hasEntryStrategy = nodes.some((n) => "entryType" in n.data);

  // Check for timing block
  const hasTiming = nodes.some((n) => "timingType" in n.data);

  // An entry strategy block is the minimum requirement
  if (!hasEntryStrategy) {
    issues.push({
      type: "error",
      message: "Drag an Entry Strategy block from the left toolbar onto the canvas",
      nodeType: "entrystrategy",
    });
  }

  // Timing is optional — without it, the strategy trades whenever conditions are met

  // Cross-field validation warnings for entry strategy nodes
  for (const n of nodes) {
    const d = n.data as Record<string, unknown>;
    if (!("entryType" in d)) continue;

    // RSI levels: oversold should be less than overbought
    if (
      "oversoldLevel" in d &&
      "overboughtLevel" in d &&
      typeof d.oversoldLevel === "number" &&
      typeof d.overboughtLevel === "number" &&
      d.oversoldLevel >= d.overboughtLevel
    ) {
      issues.push({
        type: "warning",
        message: "RSI oversold level should be lower than overbought level",
        nodeType: n.type,
      });
    }

    // TP R-multiple below 1 means you win less than you risk
    if ("tpRMultiple" in d && typeof d.tpRMultiple === "number" && d.tpRMultiple < 1) {
      issues.push({
        type: "warning",
        message: `Take profit (${d.tpRMultiple}R) is less than 1:1 — you risk more than you win per trade`,
        nodeType: n.type,
      });
    }
  }

  // Calculate if strategy can be exported (no errors)
  const hasErrors = issues.some((i) => i.type === "error");
  const canExport = !hasErrors && nodes.length > 0;

  return {
    isValid: issues.length === 0,
    canExport,
    issues,
    summary: {
      hasTiming,
      hasEntryStrategy,
    },
  };
}
