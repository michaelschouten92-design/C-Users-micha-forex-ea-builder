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
      message: "Add an entry strategy block to define your trading logic",
      nodeType: "entrystrategy",
    });
  }

  // Timing is required (when to trade)
  if (!hasTiming) {
    issues.push({
      type: "error",
      message:
        "Add a timing block (Always, Custom Times, or Trading Sessions) to define when the strategy runs",
      nodeType: "timing",
    });
  }

  // Check that entry strategy is connected to a timing block
  if (hasEntryStrategy && hasTiming && edges.length > 0) {
    const entryNodes = nodes.filter((n) => "entryType" in n.data);
    const timingNodes = nodes.filter((n) => "timingType" in n.data);
    const timingIds = new Set(timingNodes.map((n) => n.id));

    for (const entry of entryNodes) {
      const isConnected = edges.some((e) => e.target === entry.id && timingIds.has(e.source));
      if (!isConnected) {
        issues.push({
          type: "warning",
          message: `"${entry.data.label}" is not connected to a timing block`,
          nodeType: "entrystrategy",
        });
      }
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
