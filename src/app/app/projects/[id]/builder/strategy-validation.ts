import type { Node, Edge } from "@xyflow/react";
import type { BuilderNodeData, BuildJsonSettings } from "@/types/builder";

export interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  nodeType?: string;
  nodeId?: string;
  /** Human-readable label of the node with the issue */
  nodeLabel?: string;
  /** Which field on the node is invalid */
  field?: string;
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
  _edges: Edge[] = [],
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

  // Validate timing nodes
  for (const n of nodes) {
    const d = n.data as Record<string, unknown>;
    if (!("timingType" in d)) continue;
    const label = (d.label as string) ?? n.type ?? "Timing";

    // Custom trading session: start != end
    if (
      d.timingType === "trading-session" &&
      d.session === "CUSTOM" &&
      typeof d.customStartHour === "number" &&
      typeof d.customStartMinute === "number" &&
      typeof d.customEndHour === "number" &&
      typeof d.customEndMinute === "number" &&
      d.customStartHour === d.customEndHour &&
      d.customStartMinute === d.customEndMinute
    ) {
      issues.push({
        type: "warning",
        message: `"${label}": Start and end time are identical -- session window is empty. Set different start/end hours.`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "customStartHour",
      });
    }
  }

  // Cross-field validation warnings for entry strategy nodes
  for (const n of nodes) {
    const d = n.data as Record<string, unknown>;
    if (!("entryType" in d)) continue;
    const label = (d.label as string) ?? n.type ?? "Entry Strategy";

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
        message: `"${label}": Oversold (${d.oversoldLevel}) must be lower than Overbought (${d.overboughtLevel})`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "oversoldLevel",
      });
    }

    // TP R-multiple below 1 means you win less than you risk
    if ("tpRMultiple" in d && typeof d.tpRMultiple === "number" && d.tpRMultiple < 1) {
      issues.push({
        type: "warning",
        message: `"${label}": Take profit (${d.tpRMultiple}R) is below 1:1 -- you risk more than you win per trade. Set to 1.0 or higher.`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "tpRMultiple",
      });
    }

    // SL pips: warning if very large
    if ("slPips" in d && typeof d.slPips === "number" && d.slPips > 500) {
      issues.push({
        type: "warning",
        message: `"${label}": Stop loss of ${d.slPips} pips is very large. Typical range is 10-200 pips.`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "slPips",
      });
    }

    // TP R-multiple: warning if unusually high
    if ("tpRMultiple" in d && typeof d.tpRMultiple === "number" && d.tpRMultiple > 10) {
      issues.push({
        type: "warning",
        message: `"${label}": Take profit of ${d.tpRMultiple}R is unusually high. Most strategies use 1-5R.`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "tpRMultiple",
      });
    }

    // Risk %: warning if aggressive
    if ("riskPercent" in d && typeof d.riskPercent === "number" && d.riskPercent > 5) {
      issues.push({
        type: "warning",
        message: `"${label}": Risk of ${d.riskPercent}% per trade is aggressive. Recommended: 1-2%.`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "riskPercent",
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
        message: `"${label}": Fast period (${d.fastPeriod}) should be less than Slow period (${d.slowPeriod})`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "fastPeriod",
      });
    }

    // Also check EMA-specific field names
    if (typeof d.fastEma === "number" && typeof d.slowEma === "number" && d.fastEma >= d.slowEma) {
      issues.push({
        type: "error",
        nodeId: n.id,
        nodeType: n.type,
        nodeLabel: label,
        field: "fastEma",
        message: `"${label}": Fast EMA (${d.fastEma}) must be less than Slow EMA (${d.slowEma}). Example: Fast=9, Slow=21.`,
      });
    }
    if (
      typeof d.macdFast === "number" &&
      typeof d.macdSlow === "number" &&
      d.macdFast >= d.macdSlow
    ) {
      issues.push({
        type: "error",
        nodeId: n.id,
        nodeType: n.type,
        nodeLabel: label,
        field: "macdFast",
        message: `"${label}": MACD Fast (${d.macdFast}) must be less than MACD Slow (${d.macdSlow}). Example: Fast=12, Slow=26.`,
      });
    }

    // Lot size: warning if very large
    if ("lotSize" in d && typeof d.lotSize === "number" && d.lotSize > 10) {
      issues.push({
        type: "warning",
        message: `"${label}": Lot size of ${d.lotSize} is very large. Consider using risk-based sizing instead.`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "lotSize",
      });
    }

    // SL pips must be > 0 when fixed pips method
    if (
      "slMethod" in d &&
      d.slMethod === "FIXED_PIPS" &&
      "slPips" in d &&
      typeof d.slPips === "number" &&
      d.slPips <= 0
    ) {
      issues.push({
        type: "error",
        message: `"${label}": Stop loss pips must be greater than 0. Set a positive value (e.g. 50).`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "slPips",
      });
    }

    // TP pips must be > 0 when fixed pips method
    if (
      "tpMethod" in d &&
      d.tpMethod === "FIXED_PIPS" &&
      "tpPips" in d &&
      typeof d.tpPips === "number" &&
      d.tpPips <= 0
    ) {
      issues.push({
        type: "error",
        message: `"${label}": Take profit pips must be greater than 0. Set a positive value (e.g. 100).`,
        nodeType: n.type,
        nodeId: n.id,
        nodeLabel: label,
        field: "tpPips",
      });
    }

    // Indicator periods must be > 0
    for (const periodField of ["period", "fastPeriod", "slowPeriod", "signalPeriod", "atrPeriod"]) {
      if (periodField in d && typeof d[periodField] === "number" && d[periodField] === 0) {
        const fieldLabel = periodField
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s: string) => s.toUpperCase());
        issues.push({
          type: "error",
          message: `"${label}": ${fieldLabel} must be greater than 0`,
          nodeType: n.type,
          nodeId: n.id,
          nodeLabel: label,
          field: periodField,
        });
      }
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
