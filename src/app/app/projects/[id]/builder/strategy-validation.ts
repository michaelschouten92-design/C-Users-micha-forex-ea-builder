import type { Node } from "@xyflow/react";
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
    hasEntryCondition: boolean;
    hasExitCondition: boolean;
    hasIndicator: boolean;
    hasStopLoss: boolean;
    hasTakeProfit: boolean;
    hasPositionSizing: boolean;
    hasTradingTimes: boolean;
  };
}

export function validateStrategy(nodes: Node<BuilderNodeData>[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check for each node type
  const hasEntryCondition = nodes.some(
    (n) => "conditionType" in n.data && n.data.conditionType === "entry"
  );
  const hasExitCondition = nodes.some(
    (n) => "conditionType" in n.data && n.data.conditionType === "exit"
  );
  const hasIndicator = nodes.some((n) => "indicatorType" in n.data);
  const hasStopLoss = nodes.some(
    (n) => "tradingType" in n.data && n.data.tradingType === "stop-loss"
  );
  const hasTakeProfit = nodes.some(
    (n) => "tradingType" in n.data && n.data.tradingType === "take-profit"
  );
  const hasPositionSizing = nodes.some(
    (n) => "tradingType" in n.data && n.data.tradingType === "position-sizing"
  );
  const hasTradingTimes = nodes.some((n) => "timingType" in n.data);

  // Required: Entry Condition
  if (!hasEntryCondition) {
    issues.push({
      type: "error",
      message: "Entry Condition is required - add one from the Conditions category",
      nodeType: "entry-condition",
    });
  }

  // Required: At least one indicator for entry logic
  if (!hasIndicator) {
    issues.push({
      type: "error",
      message: "At least one Indicator is required for entry/exit logic",
      nodeType: "indicator",
    });
  }

  // Recommended: Stop Loss
  if (!hasStopLoss) {
    issues.push({
      type: "warning",
      message: "Stop Loss is recommended for risk management",
      nodeType: "stop-loss",
    });
  }

  // Recommended: Take Profit
  if (!hasTakeProfit) {
    issues.push({
      type: "warning",
      message: "Take Profit is recommended to secure profits",
      nodeType: "take-profit",
    });
  }

  // Recommended: Position Sizing
  if (!hasPositionSizing) {
    issues.push({
      type: "warning",
      message: "Position Sizing is recommended - using default 0.1 lot",
      nodeType: "position-sizing",
    });
  }

  // Info: Exit Condition
  if (!hasExitCondition) {
    issues.push({
      type: "warning",
      message: "Exit Condition not set - positions will close via SL/TP only",
      nodeType: "exit-condition",
    });
  }

  // Calculate if strategy can be exported (no errors)
  const hasErrors = issues.some((i) => i.type === "error");
  const canExport = !hasErrors && nodes.length > 0;

  return {
    isValid: issues.length === 0,
    canExport,
    issues,
    summary: {
      hasEntryCondition,
      hasExitCondition,
      hasIndicator,
      hasStopLoss,
      hasTakeProfit,
      hasPositionSizing,
      hasTradingTimes,
    },
  };
}
