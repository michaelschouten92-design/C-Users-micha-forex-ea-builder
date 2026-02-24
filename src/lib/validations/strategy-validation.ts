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

  // 1. Timing node check (warning if missing)
  const hasTimingNode = nodes.some((n) => "timingType" in n.data || "filterType" in n.data);
  if (!hasTimingNode && nodes.length > 0) {
    warnings.push({
      message:
        "No timing or filter blocks. Your EA will trade whenever entry conditions are met, with no session or spread restrictions.",
      severity: "warning",
    });
  }

  // 2. Risk management check (error if no SL/TP blocks — protects trading capital)
  const hasRiskManagement = nodes.some((n) => {
    const d = n.data as Record<string, unknown>;
    return d.tradingType === "stop-loss" || d.tradingType === "take-profit";
  });
  if (!hasRiskManagement && nodes.length > 0) {
    errors.push({
      message:
        "No stop loss or take profit blocks found. Add risk management to protect your account.",
      severity: "error",
    });
  }

  // 3. Orphaned nodes (nodes with no connections)
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

  // 4. Validate required node parameters
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

    // Indicator periods must be > 0 and <= 1000
    for (const periodField of ["period", "fastPeriod", "slowPeriod", "signalPeriod", "atrPeriod"]) {
      if (periodField in d && typeof d[periodField] === "number") {
        const fieldLabel = periodField
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s: string) => s.toUpperCase());
        if ((d[periodField] as number) <= 0) {
          errors.push({
            nodeId: node.id,
            message: `${fieldLabel} must be greater than 0.`,
            severity: "error",
          });
        } else if ((d[periodField] as number) > 1000) {
          errors.push({
            nodeId: node.id,
            message: `${fieldLabel} of ${d[periodField]} is too large. Maximum is 1000.`,
            severity: "error",
          });
        }
      }
    }

    // Risk % validation
    if (typeof d.riskPercent === "number" && d.riskPercent > 10) {
      errors.push({
        nodeId: node.id,
        message: `Risk of ${d.riskPercent}% per trade exceeds safe limits. Maximum is 10%.`,
        severity: "error",
      });
    } else if (typeof d.riskPercent === "number" && d.riskPercent > 5) {
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

  // 5. Settings validation
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

  // 6. Max nodes check
  if (nodes.length > 50) {
    errors.push({
      message: `Too many blocks (${nodes.length}). Maximum is 50.`,
      severity: "error",
    });
  }

  return { errors, warnings };
}
