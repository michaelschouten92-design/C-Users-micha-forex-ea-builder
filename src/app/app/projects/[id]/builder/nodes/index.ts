// Node type registry for React Flow
import type { NodeTypes } from "@xyflow/react";

import { TradingTimesNode } from "./trading-times-node";
import { AlwaysNode } from "./always-node";
import { MaxSpreadNode } from "./max-spread-node";
import { VolatilityFilterNode } from "./volatility-filter-node";
import { EquityFilterNode } from "./equity-filter-node";
import { FridayCloseNode } from "./friday-close-node";
import { NewsFilterNode } from "./news-filter-node";
import { CustomTimesNode } from "./custom-times-node";
import { MovingAverageNode } from "./indicators/moving-average-node";
import { RSINode } from "./indicators/rsi-node";
import { MACDNode } from "./indicators/macd-node";
import { BollingerBandsNode } from "./indicators/bollinger-bands-node";
import { ATRNode } from "./indicators/atr-node";
import { ADXNode } from "./indicators/adx-node";
import { StochasticNode } from "./indicators/stochastic-node";
import { CCINode } from "./indicators/cci-node";
import { CandlestickPatternNode } from "./priceaction/candlestick-pattern-node";
import { SupportResistanceNode } from "./priceaction/support-resistance-node";
import { RangeBreakoutNode } from "./priceaction/range-breakout-node";
import { PlaceBuyNode, PlaceSellNode } from "./position-sizing-node";
import { StopLossNode } from "./stop-loss-node";
import { TakeProfitNode } from "./take-profit-node";
import { CloseConditionNode } from "./close-condition-node";
import { TimeExitNode } from "./trading/time-exit-node";
import {
  BreakevenStopNode,
  TrailingStopNode,
  PartialCloseNode,
  LockProfitNode,
} from "./trademanagement";
import { EMACrossoverEntryNode } from "./entry-strategies/ema-crossover-entry-node";
import { RangeBreakoutEntryNode } from "./entry-strategies/range-breakout-entry-node";
import { RSIReversalEntryNode } from "./entry-strategies/rsi-reversal-entry-node";
import { TrendPullbackEntryNode } from "./entry-strategies/trend-pullback-entry-node";
import { MACDCrossoverEntryNode } from "./entry-strategies/macd-crossover-entry-node";

// Register all custom node types
export const nodeTypes: NodeTypes = {
  "trading-session": TradingTimesNode,
  always: AlwaysNode,
  "max-spread": MaxSpreadNode,
  "volatility-filter": VolatilityFilterNode,
  "equity-filter": EquityFilterNode,
  "friday-close": FridayCloseNode,
  "news-filter": NewsFilterNode,
  "custom-times": CustomTimesNode,
  "moving-average": MovingAverageNode,
  rsi: RSINode,
  macd: MACDNode,
  "bollinger-bands": BollingerBandsNode,
  atr: ATRNode,
  adx: ADXNode,
  stochastic: StochasticNode,
  cci: CCINode,
  "candlestick-pattern": CandlestickPatternNode,
  "support-resistance": SupportResistanceNode,
  "range-breakout": RangeBreakoutNode,
  "place-buy": PlaceBuyNode,
  "place-sell": PlaceSellNode,
  "stop-loss": StopLossNode,
  "take-profit": TakeProfitNode,
  "close-condition": CloseConditionNode,
  "time-exit": TimeExitNode,
  "breakeven-stop": BreakevenStopNode,
  "trailing-stop": TrailingStopNode,
  "partial-close": PartialCloseNode,
  "lock-profit": LockProfitNode,
  "ema-crossover-entry": EMACrossoverEntryNode,
  "range-breakout-entry": RangeBreakoutEntryNode,
  "rsi-reversal-entry": RSIReversalEntryNode,
  "trend-pullback-entry": TrendPullbackEntryNode,
  "macd-crossover-entry": MACDCrossoverEntryNode,
};

// Re-export individual nodes for direct imports
export {
  TradingTimesNode,
  AlwaysNode,
  MaxSpreadNode,
  VolatilityFilterNode,
  EquityFilterNode,
  FridayCloseNode,
  NewsFilterNode,
  CustomTimesNode,
  MovingAverageNode,
  RSINode,
  MACDNode,
  BollingerBandsNode,
  ATRNode,
  ADXNode,
  StochasticNode,
  CCINode,
  CandlestickPatternNode,
  SupportResistanceNode,
  RangeBreakoutNode,
  PlaceBuyNode,
  PlaceSellNode,
  StopLossNode,
  TakeProfitNode,
  CloseConditionNode,
  TimeExitNode,
  BreakevenStopNode,
  TrailingStopNode,
  PartialCloseNode,
  LockProfitNode,
  EMACrossoverEntryNode,
  RangeBreakoutEntryNode,
  RSIReversalEntryNode,
  TrendPullbackEntryNode,
  MACDCrossoverEntryNode,
};
