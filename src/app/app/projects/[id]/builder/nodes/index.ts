// Node type registry for React Flow
import type { NodeTypes } from "@xyflow/react";

import { TradingTimesNode } from "./trading-times-node";
import { AlwaysNode } from "./always-node";
import { MaxSpreadNode } from "./max-spread-node";
import { VolatilityFilterNode } from "./volatility-filter-node";
import { FridayCloseNode } from "./friday-close-node";
import { NewsFilterNode } from "./news-filter-node";
import { MovingAverageNode } from "./indicators/moving-average-node";
import { RSINode } from "./indicators/rsi-node";
import { MACDNode } from "./indicators/macd-node";
import { BollingerBandsNode } from "./indicators/bollinger-bands-node";
import { ATRNode } from "./indicators/atr-node";
import { ADXNode } from "./indicators/adx-node";
import { StochasticNode } from "./indicators/stochastic-node";
import { CCINode } from "./indicators/cci-node";
import { IchimokuNode } from "./indicators/ichimoku-node";
import { CustomIndicatorNode } from "./indicators/custom-indicator-node";
import { OBVNode } from "./indicators/obv-node";
import { VWAPNode } from "./indicators/vwap-node";
import { BBSqueezeNode } from "./indicators/bb-squeeze-node";
import { VolumeFilterNode as VolumeFilterNodeComponent } from "./volume-filter-node";
import { ConditionNode } from "./condition-node";
import { CandlestickPatternNode } from "./priceaction/candlestick-pattern-node";
import { SupportResistanceNode } from "./priceaction/support-resistance-node";
import { RangeBreakoutNode } from "./priceaction/range-breakout-node";
import { OrderBlockNode } from "./priceaction/order-block-node";
import { FairValueGapNode } from "./priceaction/fair-value-gap-node";
import { MarketStructureNode } from "./priceaction/market-structure-node";
import { PlaceBuyNode, PlaceSellNode } from "./position-sizing-node";
import { StopLossNode } from "./stop-loss-node";
import { TakeProfitNode } from "./take-profit-node";
import { CloseConditionNode } from "./close-condition-node";
import { TimeExitNode } from "./trading/time-exit-node";
import { GridPyramidNode } from "./trading/grid-pyramid-node";
import {
  BreakevenStopNode,
  TrailingStopNode,
  PartialCloseNode,
  LockProfitNode,
  MultiLevelTPNode,
} from "./trademanagement";
import { EMACrossoverEntryNode } from "./entry-strategies/ema-crossover-entry-node";
import { TrendPullbackEntryNode } from "./entry-strategies/trend-pullback-entry-node";
import { DivergenceEntryNode } from "./entry-strategies/divergence-entry-node";

// Register all custom node types
export const nodeTypes: NodeTypes = {
  "trading-session": TradingTimesNode,
  always: AlwaysNode,
  "max-spread": MaxSpreadNode,
  "volatility-filter": VolatilityFilterNode,
  "volume-filter": VolumeFilterNodeComponent,
  "friday-close": FridayCloseNode,
  "news-filter": NewsFilterNode,
  "custom-times": TradingTimesNode, // backwards compat: legacy custom-times nodes render as TradingTimesNode
  "moving-average": MovingAverageNode,
  rsi: RSINode,
  macd: MACDNode,
  "bollinger-bands": BollingerBandsNode,
  atr: ATRNode,
  adx: ADXNode,
  stochastic: StochasticNode,
  cci: CCINode,
  ichimoku: IchimokuNode,
  "custom-indicator": CustomIndicatorNode,
  obv: OBVNode,
  vwap: VWAPNode,
  "bb-squeeze": BBSqueezeNode,
  condition: ConditionNode,
  "candlestick-pattern": CandlestickPatternNode,
  "support-resistance": SupportResistanceNode,
  "range-breakout": RangeBreakoutNode,
  "order-block": OrderBlockNode,
  "fair-value-gap": FairValueGapNode,
  "market-structure": MarketStructureNode,
  "place-buy": PlaceBuyNode,
  "place-sell": PlaceSellNode,
  "stop-loss": StopLossNode,
  "take-profit": TakeProfitNode,
  "close-condition": CloseConditionNode,
  "time-exit": TimeExitNode,
  "grid-pyramid": GridPyramidNode,
  "breakeven-stop": BreakevenStopNode,
  "trailing-stop": TrailingStopNode,
  "partial-close": PartialCloseNode,
  "lock-profit": LockProfitNode,
  "multi-level-tp": MultiLevelTPNode,
  "ema-crossover-entry": EMACrossoverEntryNode,
  "trend-pullback-entry": TrendPullbackEntryNode,
  "divergence-entry": DivergenceEntryNode,
};

// Re-export individual nodes for direct imports
export {
  TradingTimesNode,
  AlwaysNode,
  MaxSpreadNode,
  VolatilityFilterNode,
  VolumeFilterNodeComponent as VolumeFilterNode,
  FridayCloseNode,
  NewsFilterNode,
  MovingAverageNode,
  RSINode,
  MACDNode,
  BollingerBandsNode,
  ATRNode,
  ADXNode,
  StochasticNode,
  CCINode,
  IchimokuNode,
  CustomIndicatorNode,
  OBVNode,
  VWAPNode,
  BBSqueezeNode,
  ConditionNode,
  CandlestickPatternNode,
  SupportResistanceNode,
  RangeBreakoutNode,
  OrderBlockNode,
  FairValueGapNode,
  MarketStructureNode,
  PlaceBuyNode,
  PlaceSellNode,
  StopLossNode,
  TakeProfitNode,
  CloseConditionNode,
  TimeExitNode,
  GridPyramidNode,
  BreakevenStopNode,
  TrailingStopNode,
  PartialCloseNode,
  LockProfitNode,
  MultiLevelTPNode,
  EMACrossoverEntryNode,
  TrendPullbackEntryNode,
  DivergenceEntryNode,
};
