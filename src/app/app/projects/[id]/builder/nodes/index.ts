// Node type registry for React Flow
import type { NodeTypes } from "@xyflow/react";

import { TradingTimesNode } from "./trading-times-node";
import { MovingAverageNode } from "./indicators/moving-average-node";
import { RSINode } from "./indicators/rsi-node";
import { MACDNode } from "./indicators/macd-node";
import { BollingerBandsNode } from "./indicators/bollinger-bands-node";
import { ATRNode } from "./indicators/atr-node";
import { ADXNode } from "./indicators/adx-node";
import { EntryConditionNode } from "./entry-condition-node";
import { ExitConditionNode } from "./exit-condition-node";
import { PositionSizingNode } from "./position-sizing-node";
import { StopLossNode } from "./stop-loss-node";
import { TakeProfitNode } from "./take-profit-node";

// Register all custom node types
export const nodeTypes: NodeTypes = {
  "trading-times": TradingTimesNode,
  "moving-average": MovingAverageNode,
  "rsi": RSINode,
  "macd": MACDNode,
  "bollinger-bands": BollingerBandsNode,
  "atr": ATRNode,
  "adx": ADXNode,
  "entry-condition": EntryConditionNode,
  "exit-condition": ExitConditionNode,
  "position-sizing": PositionSizingNode,
  "stop-loss": StopLossNode,
  "take-profit": TakeProfitNode,
};

// Re-export individual nodes for direct imports
export {
  TradingTimesNode,
  MovingAverageNode,
  RSINode,
  MACDNode,
  BollingerBandsNode,
  ATRNode,
  ADXNode,
  EntryConditionNode,
  ExitConditionNode,
  PositionSizingNode,
  StopLossNode,
  TakeProfitNode,
};
