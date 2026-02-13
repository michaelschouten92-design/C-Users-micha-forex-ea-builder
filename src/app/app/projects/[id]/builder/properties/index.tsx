"use client";

import { memo, useId } from "react";
import type { Node } from "@xyflow/react";
import type {
  BuilderNodeData,
  TradingSessionNodeData,
  AlwaysNodeData,
  MaxSpreadNodeData,
  VolatilityFilterNodeData,
  EquityFilterNodeData,
  FridayCloseFilterNodeData,
  CustomTimesNodeData,
  MovingAverageNodeData,
  RSINodeData,
  MACDNodeData,
  BollingerBandsNodeData,
  ATRNodeData,
  ADXNodeData,
  StochasticNodeData,
  CandlestickPatternNodeData,
  SupportResistanceNodeData,
  RangeBreakoutNodeData,
  PlaceBuyNodeData,
  PlaceSellNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  CloseConditionNodeData,
  BreakevenStopNodeData,
  TrailingStopNodeData,
  PartialCloseNodeData,
  LockProfitNodeData,
  CCINodeData,
  TimeExitNodeData,
  EMACrossoverEntryData,
  RangeBreakoutEntryData,
  RSIReversalEntryData,
  TrendPullbackEntryData,
  MACDCrossoverEntryData,
} from "@/types/builder";

import {
  TradingSessionFields,
  AlwaysFields,
  MaxSpreadFields,
  VolatilityFilterFields,
  EquityFilterFields,
  FridayCloseFields,
  CustomTimesFields,
} from "./timing-fields";
import {
  MovingAverageFields,
  RSIFields,
  MACDFields,
  BollingerBandsFields,
  ATRFields,
  ADXFields,
  StochasticFields,
  CCIFields,
} from "./indicator-fields";
import {
  CandlestickPatternFields,
  SupportResistanceFields,
  RangeBreakoutFields,
} from "./price-action-fields";
import {
  PlaceBuyFields,
  PlaceSellFields,
  StopLossFields,
  TakeProfitFields,
  CloseConditionFields,
  TimeExitFields,
} from "./trading-fields";
import {
  BreakevenStopFields,
  TrailingStopFields,
  PartialCloseFields,
  LockProfitFields,
} from "./trade-mgmt-fields";
import {
  EMACrossoverEntryFields,
  RangeBreakoutEntryFields,
  RSIReversalEntryFields,
  TrendPullbackEntryFields,
  MACDCrossoverEntryFields,
} from "./entry-strategy-fields";

interface PropertiesPanelProps {
  selectedNode: Node<BuilderNodeData> | null;
  onNodeChange: (nodeId: string, data: Partial<BuilderNodeData>) => void;
  onNodeDelete: (nodeId: string) => void;
}

export const PropertiesPanel = memo(function PropertiesPanel({
  selectedNode,
  onNodeChange,
  onNodeDelete,
}: PropertiesPanelProps) {
  const panelId = useId();
  const labelInputId = useId();

  if (!selectedNode) {
    return (
      <aside
        aria-label="Properties Panel"
        className="w-full h-full bg-[#1A0626] border-l border-[rgba(79,70,229,0.2)] p-4"
      >
        <div className="text-center text-[#64748B] py-8">
          <svg
            className="mx-auto h-8 w-8 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm">Select a block to edit its properties</p>
        </div>
      </aside>
    );
  }

  const data = selectedNode.data;

  const handleChange = (updates: Partial<BuilderNodeData>) => {
    onNodeChange(selectedNode.id, updates);
  };

  return (
    <aside
      aria-label="Properties Panel"
      aria-describedby={panelId}
      className="w-full h-full bg-[#1A0626] border-l border-[rgba(79,70,229,0.2)] overflow-y-auto"
    >
      <div className="p-4 border-b border-[rgba(79,70,229,0.2)]">
        <div className="flex items-center justify-between">
          <h3 id={panelId} className="text-sm font-semibold text-white">
            {data.label}
          </h3>
          <button
            onClick={() => onNodeDelete(selectedNode.id)}
            className="text-[#EF4444] hover:text-[#F87171] p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200"
            aria-label={`Delete ${data.label} block`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-[#64748B] mt-1">ID: {selectedNode.id}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Label Field (all nodes) */}
        <div>
          <label htmlFor={labelInputId} className="block text-xs font-medium text-[#CBD5E1] mb-1">
            Label
          </label>
          <input
            id={labelInputId}
            type="text"
            value={data.label}
            onChange={(e) => {
              e.stopPropagation();
              handleChange({ label: e.target.value });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
          />
        </div>

        {/* Node-specific fields */}
        <NodeFields data={data} onChange={handleChange} />
      </div>
    </aside>
  );
});

function NodeFields({
  data,
  onChange,
}: {
  data: BuilderNodeData;
  onChange: (updates: Partial<BuilderNodeData>) => void;
}) {
  // Entry Strategy nodes
  if ("entryType" in data) {
    switch (data.entryType) {
      case "ema-crossover":
        return <EMACrossoverEntryFields data={data as EMACrossoverEntryData} onChange={onChange} />;
      case "range-breakout":
        return (
          <RangeBreakoutEntryFields data={data as RangeBreakoutEntryData} onChange={onChange} />
        );
      case "rsi-reversal":
        return <RSIReversalEntryFields data={data as RSIReversalEntryData} onChange={onChange} />;
      case "trend-pullback":
        return (
          <TrendPullbackEntryFields data={data as TrendPullbackEntryData} onChange={onChange} />
        );
      case "macd-crossover":
        return (
          <MACDCrossoverEntryFields data={data as MACDCrossoverEntryData} onChange={onChange} />
        );
    }
  }

  // Timing nodes
  if ("timingType" in data) {
    switch (data.timingType) {
      case "trading-session":
        return <TradingSessionFields data={data as TradingSessionNodeData} onChange={onChange} />;
      case "always":
        return <AlwaysFields data={data as AlwaysNodeData} onChange={onChange} />;
      case "custom-times":
        return <CustomTimesFields data={data as CustomTimesNodeData} onChange={onChange} />;
    }
  }

  // Filter nodes (timing category with filterType)
  if ("filterType" in data) {
    switch (data.filterType) {
      case "max-spread":
        return <MaxSpreadFields data={data as MaxSpreadNodeData} onChange={onChange} />;
      case "volatility-filter":
        return (
          <VolatilityFilterFields data={data as VolatilityFilterNodeData} onChange={onChange} />
        );
      case "equity-filter":
        return <EquityFilterFields data={data as EquityFilterNodeData} onChange={onChange} />;
      case "friday-close":
        return <FridayCloseFields data={data as FridayCloseFilterNodeData} onChange={onChange} />;
    }
  }

  // Indicators
  if ("indicatorType" in data) {
    switch (data.indicatorType) {
      case "moving-average":
        return <MovingAverageFields data={data as MovingAverageNodeData} onChange={onChange} />;
      case "rsi":
        return <RSIFields data={data as RSINodeData} onChange={onChange} />;
      case "macd":
        return <MACDFields data={data as MACDNodeData} onChange={onChange} />;
      case "bollinger-bands":
        return <BollingerBandsFields data={data as BollingerBandsNodeData} onChange={onChange} />;
      case "atr":
        return <ATRFields data={data as ATRNodeData} onChange={onChange} />;
      case "adx":
        return <ADXFields data={data as ADXNodeData} onChange={onChange} />;
      case "stochastic":
        return <StochasticFields data={data as StochasticNodeData} onChange={onChange} />;
      case "cci":
        return <CCIFields data={data as CCINodeData} onChange={onChange} />;
    }
  }

  // Price Action
  if ("priceActionType" in data) {
    switch (data.priceActionType) {
      case "candlestick-pattern":
        return (
          <CandlestickPatternFields data={data as CandlestickPatternNodeData} onChange={onChange} />
        );
      case "support-resistance":
        return (
          <SupportResistanceFields data={data as SupportResistanceNodeData} onChange={onChange} />
        );
      case "range-breakout":
        return <RangeBreakoutFields data={data as RangeBreakoutNodeData} onChange={onChange} />;
    }
  }

  // Trading
  if ("tradingType" in data) {
    switch (data.tradingType) {
      case "place-buy":
        return <PlaceBuyFields data={data as PlaceBuyNodeData} onChange={onChange} />;
      case "place-sell":
        return <PlaceSellFields data={data as PlaceSellNodeData} onChange={onChange} />;
      case "stop-loss":
        return <StopLossFields data={data as StopLossNodeData} onChange={onChange} />;
      case "take-profit":
        return <TakeProfitFields data={data as TakeProfitNodeData} onChange={onChange} />;
      case "close-condition":
        return <CloseConditionFields data={data as CloseConditionNodeData} onChange={onChange} />;
      case "time-exit":
        return <TimeExitFields data={data as TimeExitNodeData} onChange={onChange} />;
    }
  }

  // Trade Management (Pro only)
  if ("managementType" in data) {
    switch (data.managementType) {
      case "breakeven-stop":
        return <BreakevenStopFields data={data as BreakevenStopNodeData} onChange={onChange} />;
      case "trailing-stop":
        return <TrailingStopFields data={data as TrailingStopNodeData} onChange={onChange} />;
      case "partial-close":
        return <PartialCloseFields data={data as PartialCloseNodeData} onChange={onChange} />;
      case "lock-profit":
        return <LockProfitFields data={data as LockProfitNodeData} onChange={onChange} />;
    }
  }

  return null;
}
