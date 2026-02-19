import type { Node, Edge } from "@xyflow/react";
import type { BuilderNodeData, BuildJsonSettings } from "@/types/builder";

export interface ValidationIssue {
  nodeId?: string;
  message: string;
  severity: "error" | "warning";
}

export interface StrategyValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Validates a strategy's nodes, edges, and settings for completeness and
 * correctness before export. Returns structured errors and warnings.
 */
export function validateStrategyForExport(
  nodes: Node<BuilderNodeData>[],
  edges: Edge[],
  settings?: BuildJsonSettings
): StrategyValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. Must have at least one entry node (entry strategy)
  const hasEntryStrategy = nodes.some((n) => "entryType" in n.data);
  if (!hasEntryStrategy) {
    errors.push({
      message: "No entry strategy found. Add an entry strategy block to define your trading logic.",
      severity: "error",
    });
  }

  // 2. Timing node check (warning if missing)
  const hasTimingNode = nodes.some((n) => "timingType" in n.data || "filterType" in n.data);
  if (!hasTimingNode && nodes.length > 0) {
    warnings.push({
      message:
        "No timing or filter blocks. Your EA will trade whenever entry conditions are met, with no session or spread restrictions.",
      severity: "warning",
    });
  }

  // 3. Risk management check (warning if no SL/TP blocks on non-entry-strategy nodes)
  const hasRiskManagement = nodes.some((n) => {
    const d = n.data as Record<string, unknown>;
    return d.tradingType === "stop-loss" || d.tradingType === "take-profit";
  });
  const entryStrategyNodes = nodes.filter((n) => "entryType" in n.data);
  // Entry strategies have built-in SL/TP, so only warn if using legacy individual nodes
  if (!hasRiskManagement && entryStrategyNodes.length === 0 && nodes.length > 0) {
    warnings.push({
      message:
        "No stop loss or take profit blocks found. Consider adding risk management to protect your account.",
      severity: "warning",
    });
  }

  // 4. Orphaned nodes (nodes with no connections)
  if (nodes.length > 1) {
    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    for (const node of nodes) {
      if (!connectedNodeIds.has(node.id)) {
        const label = (node.data as Record<string, unknown>).label as string;
        warnings.push({
          nodeId: node.id,
          message: `"${label}" is not connected to any other block and will be ignored.`,
          severity: "warning",
        });
      }
    }
  }

  // 5. Validate required node parameters
  for (const node of nodes) {
    const d = node.data as Record<string, unknown>;

    // Entry strategy: validate EMA period ordering
    if (typeof d.fastEma === "number" && typeof d.slowEma === "number" && d.fastEma >= d.slowEma) {
      errors.push({
        nodeId: node.id,
        message: "Fast EMA period must be less than Slow EMA period.",
        severity: "error",
      });
    }

    // MACD period ordering
    if (
      typeof d.macdFast === "number" &&
      typeof d.macdSlow === "number" &&
      d.macdFast >= d.macdSlow
    ) {
      errors.push({
        nodeId: node.id,
        message: "MACD fast period must be less than MACD slow period.",
        severity: "error",
      });
    }

    // RSI levels: oversold should be less than overbought
    if (
      typeof d.oversoldLevel === "number" &&
      typeof d.overboughtLevel === "number" &&
      d.oversoldLevel >= d.overboughtLevel
    ) {
      errors.push({
        nodeId: node.id,
        message: "RSI oversold level must be lower than overbought level.",
        severity: "error",
      });
    }

    // SL pips must be > 0 when fixed pips method
    if (d.slMethod === "FIXED_PIPS" && typeof d.slPips === "number" && d.slPips <= 0) {
      errors.push({
        nodeId: node.id,
        message: "Stop loss must be greater than 0 pips.",
        severity: "error",
      });
    }

    // TP pips must be > 0 when fixed pips method
    if (d.tpMethod === "FIXED_PIPS" && typeof d.tpPips === "number" && d.tpPips <= 0) {
      errors.push({
        nodeId: node.id,
        message: "Take profit must be greater than 0 pips.",
        severity: "error",
      });
    }

    // Indicator periods must be > 0
    for (const periodField of ["period", "fastPeriod", "slowPeriod", "signalPeriod", "atrPeriod"]) {
      if (periodField in d && typeof d[periodField] === "number" && d[periodField] === 0) {
        const fieldLabel = periodField
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s: string) => s.toUpperCase());
        errors.push({
          nodeId: node.id,
          message: `${fieldLabel} must be greater than 0.`,
          severity: "error",
        });
      }
    }

    // Risk % warning if aggressive
    if (typeof d.riskPercent === "number" && d.riskPercent > 5) {
      warnings.push({
        nodeId: node.id,
        message: `Risk of ${d.riskPercent}% per trade is aggressive.`,
        severity: "warning",
      });
    }

    // Custom session start = end warning
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
      warnings.push({
        nodeId: node.id,
        message: "Start and end time are the same -- session window is empty.",
        severity: "warning",
      });
    }
  }

  // 6. Settings validation
  if (settings) {
    if (settings.maxOpenTrades > 10) {
      warnings.push({
        message: `Max ${settings.maxOpenTrades} open trades is unusually high.`,
        severity: "warning",
      });
    }

    if (settings.maxTradesPerDay && settings.maxTradesPerDay > 50) {
      warnings.push({
        message: `Max ${settings.maxTradesPerDay} trades per day is very high.`,
        severity: "warning",
      });
    }

    if (settings.maxDailyLossPercent && settings.maxDailyLossPercent > 20) {
      warnings.push({
        message: `Daily loss limit of ${settings.maxDailyLossPercent}% is very high.`,
        severity: "warning",
      });
    }
  }

  // 7. Max nodes check
  if (nodes.length > 50) {
    errors.push({
      message: `Too many blocks (${nodes.length}). Maximum is 50.`,
      severity: "error",
    });
  }

  return { errors, warnings };
}
