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
    hasTradingTimes: boolean;
    hasIndicator: boolean;
    hasPriceAction: boolean;
    hasStopLoss: boolean;
    hasTakeProfit: boolean;
    hasPositionSizing: boolean;
  };
}

export function validateStrategy(nodes: Node<BuilderNodeData>[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check for each node type
  const hasTradingTimes = nodes.some((n) => "timingType" in n.data);
  const hasIndicator = nodes.some((n) => "indicatorType" in n.data);
  const hasPriceAction = nodes.some((n) => "priceActionType" in n.data);
  const hasStopLoss = nodes.some(
    (n) => "tradingType" in n.data && n.data.tradingType === "stop-loss"
  );
  const hasTakeProfit = nodes.some(
    (n) => "tradingType" in n.data && n.data.tradingType === "take-profit"
  );
  const hasPositionSizing = nodes.some(
    (n) => "tradingType" in n.data && (n.data.tradingType === "place-buy" || n.data.tradingType === "place-sell")
  );

  // Required: Timing block (When to trade)
  if (!hasTradingTimes) {
    issues.push({
      type: "error",
      message: "A timing block is required - add one from 'When to trade' (Always, Custom Times, or Trading Sessions)",
      nodeType: "timing",
    });
  }

  // Required: At least one indicator or price action node for entry logic
  if (!hasIndicator && !hasPriceAction) {
    issues.push({
      type: "error",
      message: "At least one Indicator or Price Action node is required for entry/exit logic",
      nodeType: "indicator",
    });
  }

  // Recommended: Stop Loss
  if (!hasStopLoss) {
    issues.push({
      type: "warning",
      message: "Stoploss is recommended for risk management",
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
      message: "Place Buy or Place Sell is recommended - using default 0.1 lot",
      nodeType: "place-buy",
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
      hasTradingTimes,
      hasIndicator,
      hasPriceAction,
      hasStopLoss,
      hasTakeProfit,
      hasPositionSizing,
    },
  };
}
