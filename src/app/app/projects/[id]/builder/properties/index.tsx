"use client";

import { memo, useCallback, useId, useMemo, useState } from "react";
import type { Node } from "@xyflow/react";
import type { BuilderNode, BuilderNodeType, NodeCategory } from "@/types/builder";
import { getNodeTemplate, getCategoryLabel } from "@/types/builder";
import { buildNaturalLanguageSummary } from "../strategy-summary";
import type {
  BuilderNodeData,
  TradingSessionNodeData,
  MaxSpreadNodeData,
  VolatilityFilterNodeData,
  VolumeFilterNodeData,
  FridayCloseFilterNodeData,
  NewsFilterNodeData,
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
  OrderBlockNodeData,
  FairValueGapNodeData,
  MarketStructureNodeData,
  PlaceBuyNodeData,
  PlaceSellNodeData,
  CloseConditionNodeData,
  BreakevenStopNodeData,
  TrailingStopNodeData,
  PartialCloseNodeData,
  LockProfitNodeData,
  CCINodeData,
  IchimokuNodeData,
  CustomIndicatorNodeData,
  OBVNodeData,
  VWAPNodeData,
  BBSqueezeNodeData,
  ConditionNodeData,
  TimeExitNodeData,
  GridPyramidNodeData,
  MultiLevelTPNodeData,
  EMACrossoverEntryData,
  TrendPullbackEntryData,
  DivergenceEntryData,
  FibonacciEntryData,
  PivotPointEntryData,
} from "@/types/builder";

import {
  TradingSessionFields,
  MaxSpreadFields,
  VolatilityFilterFields,
  VolumeFilterFields,
  FridayCloseFields,
  NewsFilterFields,
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
  IchimokuFields,
  CustomIndicatorFields,
  OBVFields,
  VWAPFields,
  BBSqueezeFields,
  ConditionFields,
} from "./indicator-fields";
import {
  CandlestickPatternFields,
  SupportResistanceFields,
  RangeBreakoutFields,
  OrderBlockFields,
  FairValueGapFields,
  MarketStructureFields,
} from "./price-action-fields";
import {
  PlaceBuyFields,
  PlaceSellFields,
  CloseConditionFields,
  TimeExitFields,
  GridPyramidFields,
} from "./trading-fields";
import {
  BreakevenStopFields,
  TrailingStopFields,
  PartialCloseFields,
  LockProfitFields,
  MultiLevelTPFields,
} from "./trade-mgmt-fields";
import {
  EMACrossoverEntryFields,
  TrendPullbackEntryFields,
  DivergenceEntryFields,
  FibonacciEntryFields,
  PivotPointEntryFields,
} from "./entry-strategy-fields";
import { StrategySettingsPanel } from "../strategy-settings-panel";
import { OptimizationVisibleContext } from "./shared";
import type { BuildJsonSettings } from "@/types/builder";

interface PropertiesPanelProps {
  selectedNode: Node<BuilderNodeData> | null;
  nodes?: BuilderNode[];
  onNodeChange: (nodeId: string, data: Partial<BuilderNodeData>) => void;
  onNodeDelete: (nodeId: string) => void;
  settings?: BuildJsonSettings;
  onSettingsChange?: (settings: BuildJsonSettings) => void;
}

export const PropertiesPanel = memo(function PropertiesPanel({
  selectedNode,
  nodes = [],
  onNodeChange,
  onNodeDelete,
  settings,
  onSettingsChange,
}: PropertiesPanelProps) {
  const panelId = useId();
  const labelInputId = useId();
  const [confirmAction, setConfirmAction] = useState<"delete" | "reset" | null>(null);
  const [showOptimization, setShowOptimization] = useState(true);
  const toggleOptimization = useCallback(() => setShowOptimization((v) => !v), []);
  const summaryLines = useMemo(
    () => (!selectedNode && nodes.length > 0 ? buildNaturalLanguageSummary(nodes) : []),
    [selectedNode, nodes]
  );

  if (!selectedNode) {
    return (
      <aside
        aria-label="Properties Panel"
        className="w-full h-full bg-[#1A0626] border-l border-[rgba(79,70,229,0.2)] p-4"
      >
        {nodes.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-4 h-4 text-[#A78BFA]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              <span className="text-xs text-[#A78BFA] font-medium">Click a block to edit</span>
              <span className="text-[10px] font-medium text-[#7C8DB0] bg-[rgba(100,116,139,0.2)] px-1.5 py-0.5 rounded">
                {nodes.length} {nodes.length === 1 ? "block" : "blocks"}
              </span>
            </div>
            <p className="text-xs font-medium text-[#94A3B8] mb-2">Strategy overview:</p>
            {summaryLines.length > 0 ? (
              <ul className="space-y-1.5">
                {summaryLines.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-[#CBD5E1] leading-relaxed"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-[#22D3EE] flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#7C8DB0]">
                Connect your blocks to see the strategy description.
              </p>
            )}
            {settings && onSettingsChange && (
              <div className="mt-4 pt-3 border-t border-[rgba(79,70,229,0.2)]">
                <StrategySettingsPanel settings={settings} onChange={onSettingsChange} />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-[#7C8DB0] py-8">
            <svg
              className="mx-auto h-8 w-8 mb-3 text-[#A78BFA]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <p className="text-sm font-medium text-[#94A3B8] mb-1">Get started</p>
            <p className="text-xs text-[#7C8DB0] leading-relaxed">
              Drag an <span className="text-white font-medium">Entry Strategy</span> block from the
              left toolbar onto the canvas
            </p>
          </div>
        )}
      </aside>
    );
  }

  const data = selectedNode.data;
  const nodeTemplate = getNodeTemplate(selectedNode.type as BuilderNodeType);
  const categoryLabel = data.category ? getCategoryLabel(data.category as NodeCategory) : null;

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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setConfirmAction("reset")}
              className="text-[#94A3B8] hover:text-[#CBD5E1] p-1.5 rounded-lg hover:bg-[rgba(79,70,229,0.1)] transition-all duration-200"
              aria-label={`Reset ${data.label} to defaults`}
              title="Reset to defaults"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={() => setConfirmAction("delete")}
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
        </div>
        {nodeTemplate?.description && (
          <p className="text-xs text-[#94A3B8] mt-1">
            {categoryLabel && (
              <span className="text-[#7C8DB0] font-medium">{categoryLabel} · </span>
            )}
            {nodeTemplate.description}
          </p>
        )}
        {/* Inline confirmation banner */}
        {confirmAction && (
          <div
            className={`mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs ${confirmAction === "delete" ? "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]" : "bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.3)]"}`}
          >
            <span className="text-[#CBD5E1]">
              {confirmAction === "delete" ? "Delete this block?" : "Reset to defaults?"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-2 py-1 text-[#94A3B8] hover:text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction === "delete") {
                    onNodeDelete(selectedNode.id);
                  } else {
                    const template = getNodeTemplate(selectedNode.type as BuilderNodeType);
                    if (template?.defaultData) {
                      onNodeChange(selectedNode.id, {
                        ...template.defaultData,
                      } as Partial<BuilderNodeData>);
                    }
                  }
                  setConfirmAction(null);
                }}
                className={`px-2 py-1 rounded font-medium transition-colors ${confirmAction === "delete" ? "bg-[#EF4444] text-white hover:bg-[#DC2626]" : "bg-[#4F46E5] text-white hover:bg-[#6366F1]"}`}
              >
                {confirmAction === "delete" ? "Delete" : "Reset"}
              </button>
            </div>
          </div>
        )}
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
            maxLength={50}
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
        <OptimizationVisibleContext.Provider value={showOptimization}>
          <NodeFields data={data} onChange={handleChange} />
        </OptimizationVisibleContext.Provider>

        {/* Optimization toggle */}
        <div className="border-t border-[rgba(79,70,229,0.2)] pt-3">
          <button
            onClick={toggleOptimization}
            className="flex items-center gap-1.5 text-[10px] text-[#7C8DB0] hover:text-[#94A3B8] transition-colors"
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3v18h18" />
              <path d="M18 9l-5 5-4-4-3 3" />
            </svg>
            {showOptimization ? "Hide" : "Show"} optimization settings
            <svg
              className={`w-3 h-3 transition-transform ${showOptimization ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
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
      case "trend-pullback":
        return (
          <TrendPullbackEntryFields data={data as TrendPullbackEntryData} onChange={onChange} />
        );
      case "divergence":
        return <DivergenceEntryFields data={data as DivergenceEntryData} onChange={onChange} />;
      case "fibonacci-entry":
        return <FibonacciEntryFields data={data as FibonacciEntryData} onChange={onChange} />;
      case "pivot-point-entry":
        return <PivotPointEntryFields data={data as PivotPointEntryData} onChange={onChange} />;
    }
  }

  // Timing nodes
  if ("timingType" in data) {
    switch (data.timingType) {
      case "trading-session":
        return <TradingSessionFields data={data as TradingSessionNodeData} onChange={onChange} />;
      case "custom-times":
        // Backwards compat: legacy custom-times nodes render with TradingSessionFields
        return (
          <TradingSessionFields
            data={data as unknown as TradingSessionNodeData}
            onChange={onChange}
          />
        );
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
      case "volume-filter":
        return <VolumeFilterFields data={data as VolumeFilterNodeData} onChange={onChange} />;
      case "friday-close":
        return <FridayCloseFields data={data as FridayCloseFilterNodeData} onChange={onChange} />;
      case "news-filter":
        return <NewsFilterFields data={data as NewsFilterNodeData} onChange={onChange} />;
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
      case "ichimoku":
        return <IchimokuFields data={data as IchimokuNodeData} onChange={onChange} />;
      case "custom-indicator":
        return <CustomIndicatorFields data={data as CustomIndicatorNodeData} onChange={onChange} />;
      case "obv":
        return <OBVFields data={data as OBVNodeData} onChange={onChange} />;
      case "vwap":
        return <VWAPFields data={data as VWAPNodeData} onChange={onChange} />;
      case "bb-squeeze":
        return <BBSqueezeFields data={data as BBSqueezeNodeData} onChange={onChange} />;
      case "condition":
        return <ConditionFields data={data as ConditionNodeData} onChange={onChange} />;
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
      case "order-block":
        return <OrderBlockFields data={data as OrderBlockNodeData} onChange={onChange} />;
      case "fair-value-gap":
        return <FairValueGapFields data={data as FairValueGapNodeData} onChange={onChange} />;
      case "market-structure":
        return <MarketStructureFields data={data as MarketStructureNodeData} onChange={onChange} />;
    }
  }

  // Trading
  if ("tradingType" in data) {
    switch (data.tradingType) {
      case "place-buy":
        return <PlaceBuyFields data={data as PlaceBuyNodeData} onChange={onChange} />;
      case "place-sell":
        return <PlaceSellFields data={data as PlaceSellNodeData} onChange={onChange} />;
      case "close-condition":
        return <CloseConditionFields data={data as CloseConditionNodeData} onChange={onChange} />;
      case "time-exit":
        return <TimeExitFields data={data as TimeExitNodeData} onChange={onChange} />;
      case "grid-pyramid":
        return <GridPyramidFields data={data as GridPyramidNodeData} onChange={onChange} />;
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

  // Trade Management (tradeManagementType variant)
  if ("tradeManagementType" in data) {
    switch (data.tradeManagementType) {
      case "multi-level-tp":
        return <MultiLevelTPFields data={data as MultiLevelTPNodeData} onChange={onChange} />;
    }
  }

  return null;
}
