import type { Node, Edge } from "@xyflow/react";
import type { BuilderNodeData, BuildJsonSettings } from "@/types/builder";

export interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  nodeType?: string;
  nodeId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  canExport: boolean;
  issues: ValidationIssue[];
  issuesByNodeId: Record<string, ValidationIssue[]>;
  summary: {
    hasTiming: boolean;
    hasEntryStrategy: boolean;
  };
}

export function validateStrategy(
  nodes: Node<BuilderNodeData>[],
  edges: Edge[] = [],
  settings?: BuildJsonSettings
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Max nodes check
  if (nodes.length > 50) {
    issues.push({
      type: "error",
      message: `Too many blocks (${nodes.length}). Maximum is 50.`,
    });
  }

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
        nodeId: n.id,
      });
    }

    // TP R-multiple below 1 means you win less than you risk
    if ("tpRMultiple" in d && typeof d.tpRMultiple === "number" && d.tpRMultiple < 1) {
      issues.push({
        type: "warning",
        message: `Take profit (${d.tpRMultiple}R) is less than 1:1 — you risk more than you win per trade`,
        nodeType: n.type,
        nodeId: n.id,
      });
    }

    // SL pips: warning if very large
    if ("slPips" in d && typeof d.slPips === "number" && d.slPips > 500) {
      issues.push({
        type: "warning",
        message: `Stop loss of ${d.slPips} pips is very large`,
        nodeType: n.type,
        nodeId: n.id,
      });
    }

    // TP R-multiple: warning if unusually high
    if ("tpRMultiple" in d && typeof d.tpRMultiple === "number" && d.tpRMultiple > 10) {
      issues.push({
        type: "warning",
        message: `Take profit of ${d.tpRMultiple}R is unusually high`,
        nodeType: n.type,
        nodeId: n.id,
      });
    }

    // Risk %: warning if aggressive
    if ("riskPercent" in d && typeof d.riskPercent === "number" && d.riskPercent > 5) {
      issues.push({
        type: "warning",
        message: `Risk of ${d.riskPercent}% per trade is aggressive`,
        nodeType: n.type,
        nodeId: n.id,
      });
    }

    // EMA periods: fast should be less than slow
    if (
      "fastPeriod" in d &&
      "slowPeriod" in d &&
      typeof d.fastPeriod === "number" &&
      typeof d.slowPeriod === "number" &&
      d.fastPeriod >= d.slowPeriod
    ) {
      issues.push({
        type: "warning",
        message: "Fast EMA period should be less than slow EMA period",
        nodeType: n.type,
        nodeId: n.id,
      });
    }

    // Lot size: warning if very large
    if ("lotSize" in d && typeof d.lotSize === "number" && d.lotSize > 10) {
      issues.push({
        type: "warning",
        message: `Lot size of ${d.lotSize} is very large`,
        nodeType: n.type,
        nodeId: n.id,
      });
    }
  }

  // Settings validation
  if (settings) {
    if (settings.maxOpenTrades > 10) {
      issues.push({
        type: "warning",
        message: `Max ${settings.maxOpenTrades} open trades is unusually high`,
      });
    }

    if (settings.maxTradesPerDay && settings.maxTradesPerDay > 50) {
      issues.push({
        type: "warning",
        message: `Max ${settings.maxTradesPerDay} trades per day is very high`,
      });
    }

    if (settings.maxDailyLossPercent && settings.maxDailyLossPercent > 20) {
      issues.push({
        type: "warning",
        message: `Daily loss limit of ${settings.maxDailyLossPercent}% is very high`,
      });
    }
  }

  // Build issuesByNodeId map
  const issuesByNodeId: Record<string, ValidationIssue[]> = {};
  for (const issue of issues) {
    if (issue.nodeId) {
      (issuesByNodeId[issue.nodeId] ??= []).push(issue);
    }
  }

  // Calculate if strategy can be exported (no errors)
  const hasErrors = issues.some((i) => i.type === "error");
  const canExport = !hasErrors && nodes.length > 0;

  return {
    isValid: issues.length === 0,
    canExport,
    issues,
    issuesByNodeId,
    summary: {
      hasTiming,
      hasEntryStrategy,
    },
  };
}
