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

  // Timing is optional — without it, the strategy trades whenever conditions are met

  // Check for risk-based sizing without stop loss
  const placeBuyNodes = nodes.filter(
    (n) => n.type === "place-buy" || ("tradingType" in n.data && n.data.tradingType === "place-buy")
  );
  const placeSellNodes = nodes.filter(
    (n) =>
      n.type === "place-sell" || ("tradingType" in n.data && n.data.tradingType === "place-sell")
  );
  const stopLossNodes = nodes.filter(
    (n) => n.type === "stop-loss" || ("tradingType" in n.data && n.data.tradingType === "stop-loss")
  );

  for (const buyNode of placeBuyNodes) {
    const d = buyNode.data as Record<string, unknown>;
    if (d.method === "RISK_PERCENT") {
      const hasSL =
        stopLossNodes.length > 0 ||
        edges.some((e) => e.source === buyNode.id && stopLossNodes.some((s) => s.id === e.target));
      if (!hasSL && stopLossNodes.length === 0) {
        issues.push({
          type: "warning",
          message:
            "Place Buy uses Risk % sizing but no Stop Loss is connected — lot size will fall back to minimum",
          nodeType: "place-buy",
        });
        break;
      }
    }
  }
  for (const sellNode of placeSellNodes) {
    const d = sellNode.data as Record<string, unknown>;
    if (d.method === "RISK_PERCENT") {
      const hasSL =
        stopLossNodes.length > 0 ||
        edges.some((e) => e.source === sellNode.id && stopLossNodes.some((s) => s.id === e.target));
      if (!hasSL && stopLossNodes.length === 0) {
        issues.push({
          type: "warning",
          message:
            "Place Sell uses Risk % sizing but no Stop Loss is connected — lot size will fall back to minimum",
          nodeType: "place-sell",
        });
        break;
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
