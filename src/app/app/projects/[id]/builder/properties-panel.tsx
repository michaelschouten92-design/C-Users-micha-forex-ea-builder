"use client";

import type { Node } from "@xyflow/react";
import type {
  BuilderNodeData,
  TradingTimesNodeData,
  MovingAverageNodeData,
  RSINodeData,
  MACDNodeData,
  BollingerBandsNodeData,
  ATRNodeData,
  ADXNodeData,
  EntryConditionNodeData,
  ExitConditionNodeData,
  PositionSizingNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  SessionTime,
} from "@/types/builder";

interface PropertiesPanelProps {
  selectedNode: Node<BuilderNodeData> | null;
  onNodeChange: (nodeId: string, data: Partial<BuilderNodeData>) => void;
  onNodeDelete: (nodeId: string) => void;
}

const appliedPriceOptions = [
  { value: "CLOSE", label: "Close" },
  { value: "OPEN", label: "Open" },
  { value: "HIGH", label: "High" },
  { value: "LOW", label: "Low" },
  { value: "MEDIAN", label: "Median (HL/2)" },
  { value: "TYPICAL", label: "Typical (HLC/3)" },
  { value: "WEIGHTED", label: "Weighted (HLCC/4)" },
];

export function PropertiesPanel({
  selectedNode,
  onNodeChange,
  onNodeDelete,
}: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-full h-full bg-[#1A0626] border-l border-[rgba(79,70,229,0.2)] p-4">
        <div className="text-center text-[#64748B] py-8">
          <svg
            className="mx-auto h-8 w-8 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
      </div>
    );
  }

  const data = selectedNode.data;

  const handleChange = (updates: Partial<BuilderNodeData>) => {
    onNodeChange(selectedNode.id, updates);
  };

  return (
    <div className="w-full h-full bg-[#1A0626] border-l border-[rgba(79,70,229,0.2)] overflow-y-auto">
      <div className="p-4 border-b border-[rgba(79,70,229,0.2)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{data.label}</h3>
          <button
            onClick={() => onNodeDelete(selectedNode.id)}
            className="text-[#EF4444] hover:text-[#F87171] p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200"
            title="Delete block"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-[#64748B] mt-1">ID: {selectedNode.id}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Label Field (all nodes) */}
        <div>
          <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
            Label
          </label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => handleChange({ label: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
          />
        </div>

        {/* Node-specific fields */}
        {renderNodeFields(data, handleChange)}
      </div>
    </div>
  );
}

function renderNodeFields(
  data: BuilderNodeData,
  onChange: (updates: Partial<BuilderNodeData>) => void
) {
  // Trading Times
  if ("timingType" in data && data.timingType === "trading-times") {
    const timingData = data as TradingTimesNodeData;
    return (
      <>
        <SelectField
          label="Mode"
          value={timingData.mode}
          options={[
            { value: "ALWAYS", label: "Always (24/7)" },
            { value: "CUSTOM", label: "Custom Sessions" },
          ]}
          onChange={(v) => onChange({ mode: v } as Partial<TradingTimesNodeData>)}
        />
        {timingData.mode === "CUSTOM" && (
          <>
            <div className="text-xs font-medium text-[#CBD5E1] mb-2">Trading Sessions</div>
            {timingData.sessions.map((session, i) => (
              <div key={i} className="bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] rounded-lg p-3 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-[#94A3B8]">Session {i + 1}</span>
                  {timingData.sessions.length > 1 && (
                    <button
                      onClick={() => {
                        const newSessions = timingData.sessions.filter((_, idx) => idx !== i);
                        onChange({ sessions: newSessions } as Partial<TradingTimesNodeData>);
                      }}
                      className="text-[#EF4444] hover:text-[#F87171] text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TimeField
                    label="Start"
                    hour={session.startHour}
                    minute={session.startMinute}
                    onChange={(h, m) => {
                      const newSessions = [...timingData.sessions];
                      newSessions[i] = { ...session, startHour: h, startMinute: m };
                      onChange({ sessions: newSessions } as Partial<TradingTimesNodeData>);
                    }}
                  />
                  <TimeField
                    label="End"
                    hour={session.endHour}
                    minute={session.endMinute}
                    onChange={(h, m) => {
                      const newSessions = [...timingData.sessions];
                      newSessions[i] = { ...session, endHour: h, endMinute: m };
                      onChange({ sessions: newSessions } as Partial<TradingTimesNodeData>);
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const newSessions = [...timingData.sessions, { startHour: 8, startMinute: 0, endHour: 17, endMinute: 0 }];
                onChange({ sessions: newSessions } as Partial<TradingTimesNodeData>);
              }}
              className="w-full py-2 text-xs text-[#22D3EE] border border-dashed border-[rgba(34,211,238,0.3)] rounded-lg hover:bg-[rgba(34,211,238,0.1)] transition-all duration-200"
            >
              + Add Session
            </button>
          </>
        )}
        <div className="mt-3">
          <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
            <input
              type="checkbox"
              checked={timingData.tradeMondayToFriday}
              onChange={(e) => onChange({ tradeMondayToFriday: e.target.checked } as Partial<TradingTimesNodeData>)}
              className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
            />
            Weekdays only (Mon-Fri)
          </label>
        </div>
      </>
    );
  }

  // Moving Average
  if ("indicatorType" in data && data.indicatorType === "moving-average") {
    const maData = data as MovingAverageNodeData;
    return (
      <>
        <SelectField
          label="Method"
          value={maData.method}
          options={[
            { value: "SMA", label: "Simple (SMA)" },
            { value: "EMA", label: "Exponential (EMA)" },
            { value: "SMMA", label: "Smoothed (SMMA)" },
            { value: "LWMA", label: "Linear Weighted (LWMA)" },
          ]}
          onChange={(v) => onChange({ method: v } as Partial<MovingAverageNodeData>)}
        />
        <NumberField
          label="Period"
          value={maData.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v } as Partial<MovingAverageNodeData>)}
        />
        <SelectField
          label="Applied Price"
          value={maData.appliedPrice}
          options={appliedPriceOptions}
          onChange={(v) => onChange({ appliedPrice: v } as Partial<MovingAverageNodeData>)}
        />
        <NumberField
          label="Shift"
          value={maData.shift}
          min={0}
          max={100}
          onChange={(v) => onChange({ shift: v } as Partial<MovingAverageNodeData>)}
        />
      </>
    );
  }

  // RSI
  if ("indicatorType" in data && data.indicatorType === "rsi") {
    const rsiData = data as RSINodeData;
    return (
      <>
        <NumberField
          label="Period"
          value={rsiData.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v } as Partial<RSINodeData>)}
        />
        <SelectField
          label="Applied Price"
          value={rsiData.appliedPrice}
          options={appliedPriceOptions}
          onChange={(v) => onChange({ appliedPrice: v } as Partial<RSINodeData>)}
        />
        <NumberField
          label="Overbought Level"
          value={rsiData.overboughtLevel}
          min={50}
          max={100}
          onChange={(v) => onChange({ overboughtLevel: v } as Partial<RSINodeData>)}
        />
        <NumberField
          label="Oversold Level"
          value={rsiData.oversoldLevel}
          min={0}
          max={50}
          onChange={(v) => onChange({ oversoldLevel: v } as Partial<RSINodeData>)}
        />
      </>
    );
  }

  // MACD
  if ("indicatorType" in data && data.indicatorType === "macd") {
    const macdData = data as MACDNodeData;
    return (
      <>
        <NumberField
          label="Fast Period"
          value={macdData.fastPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ fastPeriod: v } as Partial<MACDNodeData>)}
        />
        <NumberField
          label="Slow Period"
          value={macdData.slowPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ slowPeriod: v } as Partial<MACDNodeData>)}
        />
        <NumberField
          label="Signal Period"
          value={macdData.signalPeriod}
          min={1}
          max={500}
          onChange={(v) => onChange({ signalPeriod: v } as Partial<MACDNodeData>)}
        />
        <SelectField
          label="Applied Price"
          value={macdData.appliedPrice}
          options={appliedPriceOptions}
          onChange={(v) => onChange({ appliedPrice: v } as Partial<MACDNodeData>)}
        />
      </>
    );
  }

  // Bollinger Bands
  if ("indicatorType" in data && data.indicatorType === "bollinger-bands") {
    const bbData = data as BollingerBandsNodeData;
    return (
      <>
        <NumberField
          label="Period"
          value={bbData.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v } as Partial<BollingerBandsNodeData>)}
        />
        <NumberField
          label="Deviation"
          value={bbData.deviation}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onChange({ deviation: v } as Partial<BollingerBandsNodeData>)}
        />
        <SelectField
          label="Applied Price"
          value={bbData.appliedPrice}
          options={appliedPriceOptions}
          onChange={(v) => onChange({ appliedPrice: v } as Partial<BollingerBandsNodeData>)}
        />
        <NumberField
          label="Shift"
          value={bbData.shift}
          min={0}
          max={100}
          onChange={(v) => onChange({ shift: v } as Partial<BollingerBandsNodeData>)}
        />
      </>
    );
  }

  // ATR
  if ("indicatorType" in data && data.indicatorType === "atr") {
    const atrData = data as ATRNodeData;
    return (
      <>
        <NumberField
          label="Period"
          value={atrData.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v } as Partial<ATRNodeData>)}
        />
        <div className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg">
          ATR measures market volatility. Commonly used for dynamic SL/TP levels.
        </div>
      </>
    );
  }

  // ADX
  if ("indicatorType" in data && data.indicatorType === "adx") {
    const adxData = data as ADXNodeData;
    return (
      <>
        <NumberField
          label="Period"
          value={adxData.period}
          min={1}
          max={500}
          onChange={(v) => onChange({ period: v } as Partial<ADXNodeData>)}
        />
        <NumberField
          label="Trend Level"
          value={adxData.trendLevel}
          min={10}
          max={50}
          onChange={(v) => onChange({ trendLevel: v } as Partial<ADXNodeData>)}
        />
        <div className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg">
          ADX &gt; {adxData.trendLevel} indicates a trending market. +DI &gt; -DI suggests uptrend, -DI &gt; +DI suggests downtrend.
        </div>
      </>
    );
  }

  // Entry Condition
  if ("conditionType" in data && data.conditionType === "entry") {
    const entryData = data as EntryConditionNodeData;
    return (
      <>
        <SelectField
          label="Direction"
          value={entryData.direction}
          options={[
            { value: "BUY", label: "Buy Only" },
            { value: "SELL", label: "Sell Only" },
            { value: "BOTH", label: "Both Directions" },
          ]}
          onChange={(v) => onChange({ direction: v } as Partial<EntryConditionNodeData>)}
        />
        <SelectField
          label="Logic"
          value={entryData.logic}
          options={[
            { value: "AND", label: "All conditions (AND)" },
            { value: "OR", label: "Any condition (OR)" },
          ]}
          onChange={(v) => onChange({ logic: v } as Partial<EntryConditionNodeData>)}
        />
        <div className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg">
          Connect indicator blocks to define entry conditions.
        </div>
      </>
    );
  }

  // Exit Condition
  if ("conditionType" in data && data.conditionType === "exit") {
    const exitData = data as ExitConditionNodeData;
    return (
      <>
        <SelectField
          label="Exit Type"
          value={exitData.exitType}
          options={[
            { value: "CLOSE_ALL", label: "Close All Positions" },
            { value: "CLOSE_BUY", label: "Close Buy Positions" },
            { value: "CLOSE_SELL", label: "Close Sell Positions" },
          ]}
          onChange={(v) => onChange({ exitType: v } as Partial<ExitConditionNodeData>)}
        />
        <SelectField
          label="Logic"
          value={exitData.logic}
          options={[
            { value: "AND", label: "All conditions (AND)" },
            { value: "OR", label: "Any condition (OR)" },
          ]}
          onChange={(v) => onChange({ logic: v } as Partial<ExitConditionNodeData>)}
        />
        <div className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg">
          Connect indicator blocks to define exit conditions.
        </div>
      </>
    );
  }

  // Position Sizing
  if ("tradingType" in data && data.tradingType === "position-sizing") {
    const psData = data as PositionSizingNodeData;
    return (
      <>
        <SelectField
          label="Method"
          value={psData.method}
          options={[
            { value: "FIXED_LOT", label: "Fixed Lot Size" },
            { value: "RISK_PERCENT", label: "Risk Percentage" },
            { value: "BALANCE_PERCENT", label: "Balance Percentage" },
          ]}
          onChange={(v) => onChange({ method: v } as Partial<PositionSizingNodeData>)}
        />
        {psData.method === "FIXED_LOT" && (
          <NumberField
            label="Lot Size"
            value={psData.fixedLot}
            min={0.01}
            max={100}
            step={0.01}
            onChange={(v) => onChange({ fixedLot: v } as Partial<PositionSizingNodeData>)}
          />
        )}
        {psData.method === "RISK_PERCENT" && (
          <NumberField
            label="Risk %"
            value={psData.riskPercent}
            min={0.1}
            max={100}
            step={0.1}
            onChange={(v) => onChange({ riskPercent: v } as Partial<PositionSizingNodeData>)}
          />
        )}
        {psData.method === "BALANCE_PERCENT" && (
          <NumberField
            label="Balance %"
            value={psData.balancePercent}
            min={0.1}
            max={100}
            step={0.1}
            onChange={(v) => onChange({ balancePercent: v } as Partial<PositionSizingNodeData>)}
          />
        )}
        <NumberField
          label="Min Lot"
          value={psData.minLot}
          min={0.01}
          max={100}
          step={0.01}
          onChange={(v) => onChange({ minLot: v } as Partial<PositionSizingNodeData>)}
        />
        <NumberField
          label="Max Lot"
          value={psData.maxLot}
          min={0.01}
          max={1000}
          step={0.01}
          onChange={(v) => onChange({ maxLot: v } as Partial<PositionSizingNodeData>)}
        />
      </>
    );
  }

  // Stop Loss
  if ("tradingType" in data && data.tradingType === "stop-loss") {
    const slData = data as StopLossNodeData;
    return (
      <>
        <SelectField
          label="Method"
          value={slData.method}
          options={[
            { value: "FIXED_PIPS", label: "Fixed Pips" },
            { value: "ATR_BASED", label: "ATR-Based" },
            { value: "INDICATOR", label: "From Indicator" },
          ]}
          onChange={(v) => onChange({ method: v } as Partial<StopLossNodeData>)}
        />
        {slData.method === "FIXED_PIPS" && (
          <NumberField
            label="Pips"
            value={slData.fixedPips}
            min={1}
            max={1000}
            onChange={(v) => onChange({ fixedPips: v } as Partial<StopLossNodeData>)}
          />
        )}
        {slData.method === "ATR_BASED" && (
          <>
            <NumberField
              label="ATR Period"
              value={slData.atrPeriod}
              min={1}
              max={500}
              onChange={(v) => onChange({ atrPeriod: v } as Partial<StopLossNodeData>)}
            />
            <NumberField
              label="ATR Multiplier"
              value={slData.atrMultiplier}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(v) => onChange({ atrMultiplier: v } as Partial<StopLossNodeData>)}
            />
          </>
        )}
        {slData.method === "INDICATOR" && (
          <div className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg">
            Connect an indicator block to use its value as SL level.
          </div>
        )}
      </>
    );
  }

  // Take Profit
  if ("tradingType" in data && data.tradingType === "take-profit") {
    const tpData = data as TakeProfitNodeData;
    return (
      <>
        <SelectField
          label="Method"
          value={tpData.method}
          options={[
            { value: "FIXED_PIPS", label: "Fixed Pips" },
            { value: "RISK_REWARD", label: "Risk:Reward Ratio" },
            { value: "ATR_BASED", label: "ATR-Based" },
          ]}
          onChange={(v) => onChange({ method: v } as Partial<TakeProfitNodeData>)}
        />
        {tpData.method === "FIXED_PIPS" && (
          <NumberField
            label="Pips"
            value={tpData.fixedPips}
            min={1}
            max={1000}
            onChange={(v) => onChange({ fixedPips: v } as Partial<TakeProfitNodeData>)}
          />
        )}
        {tpData.method === "RISK_REWARD" && (
          <NumberField
            label="R:R Ratio"
            value={tpData.riskRewardRatio}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(v) => onChange({ riskRewardRatio: v } as Partial<TakeProfitNodeData>)}
          />
        )}
        {tpData.method === "ATR_BASED" && (
          <>
            <NumberField
              label="ATR Period"
              value={tpData.atrPeriod}
              min={1}
              max={500}
              onChange={(v) => onChange({ atrPeriod: v } as Partial<TakeProfitNodeData>)}
            />
            <NumberField
              label="ATR Multiplier"
              value={tpData.atrMultiplier}
              min={0.1}
              max={20}
              step={0.1}
              onChange={(v) => onChange({ atrMultiplier: v } as Partial<TakeProfitNodeData>)}
            />
          </>
        )}
      </>
    );
  }

  return null;
}

// Helper components
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#CBD5E1] mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#CBD5E1] mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
      />
    </div>
  );
}

function TimeField({
  label,
  hour,
  minute,
  onChange,
}: {
  label: string;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#CBD5E1] mb-1">{label}</label>
      <div className="flex gap-1">
        <input
          type="number"
          value={hour}
          min={0}
          max={23}
          onChange={(e) => onChange(parseInt(e.target.value) || 0, minute)}
          className="w-12 px-2 py-1.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-center focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent"
          placeholder="HH"
        />
        <span className="text-[#64748B] self-center">:</span>
        <input
          type="number"
          value={minute}
          min={0}
          max={59}
          step={15}
          onChange={(e) => onChange(hour, parseInt(e.target.value) || 0)}
          className="w-12 px-2 py-1.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white text-center focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent"
          placeholder="MM"
        />
      </div>
    </div>
  );
}
