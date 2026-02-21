"use client";

import { SelectField, NumberField } from "../components/form-fields";
import type {
  PlaceBuyNodeData,
  PlaceSellNodeData,
  CloseConditionNodeData,
  CloseDirection,
  TimeExitNodeData,
  GridPyramidNodeData,
  Timeframe,
  OrderType,
} from "@/types/builder";
import { TIMEFRAME_OPTIONS } from "./constants";
import { OptimizableFieldCheckbox, FieldWarning, FieldError } from "./shared";

export function PlaceBuyFields({
  data,
  onChange,
}: {
  data: PlaceBuyNodeData;
  onChange: (updates: Partial<PlaceBuyNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22C55E] p-2 rounded-lg text-xs mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
        </svg>
        Opens a BUY position when conditions are met
      </div>
      <SelectField
        label="Order Type"
        value={data.orderType ?? "MARKET"}
        options={[
          { value: "MARKET", label: "Market" },
          { value: "STOP", label: "Buy Stop" },
          { value: "LIMIT", label: "Buy Limit" },
        ]}
        onChange={(v) => onChange({ orderType: v as OrderType })}
      />
      {data.orderType && data.orderType !== "MARKET" && (
        <NumberField
          label="Pending Offset (pips)"
          value={data.pendingOffset ?? 10}
          min={1}
          max={10000}
          step={1}
          onChange={(v) => onChange({ pendingOffset: v })}
        />
      )}
      <SelectField
        label="Position Size Method"
        value={data.method}
        options={[
          { value: "FIXED_LOT", label: "Fixed Lot" },
          { value: "RISK_PERCENT", label: "Risk %" },
        ]}
        onChange={(v) => onChange({ method: v as PlaceBuyNodeData["method"] })}
      />
      {data.method === "FIXED_LOT" && (
        <div>
          <NumberField
            label="Lot Size"
            value={data.fixedLot}
            min={0.01}
            max={100}
            step={0.01}
            onChange={(v) => onChange({ fixedLot: v })}
          />
          <OptimizableFieldCheckbox fieldName="fixedLot" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "RISK_PERCENT" && (
        <div>
          <NumberField
            label="Risk %"
            value={data.riskPercent}
            min={0.1}
            max={100}
            step={0.1}
            onChange={(v) => onChange({ riskPercent: v })}
          />
          <OptimizableFieldCheckbox fieldName="riskPercent" data={data} onChange={onChange} />
        </div>
      )}
      <NumberField
        label="Min Lot"
        value={data.minLot}
        min={0.01}
        max={100}
        step={0.01}
        onChange={(v) => onChange({ minLot: v })}
      />
      <NumberField
        label="Max Lot"
        value={data.maxLot}
        min={0.01}
        max={1000}
        step={0.01}
        onChange={(v) => onChange({ maxLot: v })}
      />
      {data.minLot > data.maxLot && <FieldError message="Min lot must not exceed max lot" />}
      {data.method === "RISK_PERCENT" && data.riskPercent > 5 && (
        <FieldWarning message="Risk above 5% per trade is considered aggressive" />
      )}

      {/* Stop Loss */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <p className="text-xs font-medium text-[#CBD5E1] mb-2">Stop Loss</p>
        <SelectField
          label="SL Method"
          value={((data as Record<string, unknown>).slMethod as string) ?? "FIXED_PIPS"}
          options={[
            { value: "FIXED_PIPS", label: "Fixed Pips" },
            { value: "ATR_BASED", label: "ATR-Based" },
            { value: "PERCENT", label: "Percentage" },
            { value: "INDICATOR", label: "From Indicator" },
            { value: "RANGE_OPPOSITE", label: "Range Opposite" },
          ]}
          onChange={(v) => onChange({ slMethod: v } as Partial<PlaceBuyNodeData>)}
        />
        {(data as Record<string, unknown>).slMethod === "FIXED_PIPS" && (
          <NumberField
            label="SL Pips"
            value={((data as Record<string, unknown>).slFixedPips as number) ?? 50}
            min={1}
            max={1000}
            onChange={(v) => onChange({ slFixedPips: v } as Partial<PlaceBuyNodeData>)}
          />
        )}
        {(data as Record<string, unknown>).slMethod === "ATR_BASED" && (
          <>
            <NumberField
              label="ATR Multiplier"
              value={((data as Record<string, unknown>).slAtrMultiplier as number) ?? 1.5}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(v) => onChange({ slAtrMultiplier: v } as Partial<PlaceBuyNodeData>)}
            />
            <NumberField
              label="ATR Period"
              value={((data as Record<string, unknown>).slAtrPeriod as number) ?? 14}
              min={1}
              max={500}
              onChange={(v) => onChange({ slAtrPeriod: v } as Partial<PlaceBuyNodeData>)}
            />
          </>
        )}
        {(data as Record<string, unknown>).slMethod === "PERCENT" && (
          <NumberField
            label="Stop Loss (%)"
            value={((data as Record<string, unknown>).slPercent as number) ?? 1}
            min={0.01}
            max={50}
            step={0.1}
            onChange={(v) => onChange({ slPercent: v } as Partial<PlaceBuyNodeData>)}
          />
        )}
        {(data as Record<string, unknown>).slMethod === "INDICATOR" && (
          <div
            className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
            role="note"
          >
            Connect an indicator block to use its value as SL level.
          </div>
        )}
        {(data as Record<string, unknown>).slMethod === "RANGE_OPPOSITE" && (
          <div
            className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
            role="note"
          >
            Stop loss placed at the opposite side of the range.
          </div>
        )}
      </div>

      {/* Take Profit */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <p className="text-xs font-medium text-[#CBD5E1] mb-2">Take Profit</p>
        <SelectField
          label="TP Method"
          value={((data as Record<string, unknown>).tpMethod as string) ?? "FIXED_PIPS"}
          options={[
            { value: "FIXED_PIPS", label: "Fixed Pips" },
            { value: "RISK_REWARD", label: "Risk:Reward Ratio" },
            { value: "ATR_BASED", label: "ATR-Based" },
          ]}
          onChange={(v) => onChange({ tpMethod: v } as Partial<PlaceBuyNodeData>)}
        />
        {(data as Record<string, unknown>).tpMethod === "FIXED_PIPS" && (
          <NumberField
            label="TP Pips"
            value={((data as Record<string, unknown>).tpFixedPips as number) ?? 100}
            min={1}
            max={10000}
            onChange={(v) => onChange({ tpFixedPips: v } as Partial<PlaceBuyNodeData>)}
          />
        )}
        {(data as Record<string, unknown>).tpMethod === "RISK_REWARD" && (
          <NumberField
            label="Risk:Reward Ratio"
            value={((data as Record<string, unknown>).tpRiskRewardRatio as number) ?? 2}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(v) => onChange({ tpRiskRewardRatio: v } as Partial<PlaceBuyNodeData>)}
          />
        )}
        {(data as Record<string, unknown>).tpMethod === "ATR_BASED" && (
          <>
            <NumberField
              label="ATR Multiplier"
              value={((data as Record<string, unknown>).tpAtrMultiplier as number) ?? 3}
              min={0.1}
              max={20}
              step={0.1}
              onChange={(v) => onChange({ tpAtrMultiplier: v } as Partial<PlaceBuyNodeData>)}
            />
            <NumberField
              label="ATR Period"
              value={((data as Record<string, unknown>).tpAtrPeriod as number) ?? 14}
              min={1}
              max={500}
              onChange={(v) => onChange({ tpAtrPeriod: v } as Partial<PlaceBuyNodeData>)}
            />
          </>
        )}
      </div>
    </>
  );
}

export function PlaceSellFields({
  data,
  onChange,
}: {
  data: PlaceSellNodeData;
  onChange: (updates: Partial<PlaceSellNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-2 rounded-lg text-xs mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 7l5 5 5-5M7 17l5-5 5 5" />
        </svg>
        Opens a SELL position when conditions are met
      </div>
      <SelectField
        label="Order Type"
        value={data.orderType ?? "MARKET"}
        options={[
          { value: "MARKET", label: "Market" },
          { value: "STOP", label: "Sell Stop" },
          { value: "LIMIT", label: "Sell Limit" },
        ]}
        onChange={(v) => onChange({ orderType: v as OrderType })}
      />
      {data.orderType && data.orderType !== "MARKET" && (
        <NumberField
          label="Pending Offset (pips)"
          value={data.pendingOffset ?? 10}
          min={1}
          max={10000}
          step={1}
          onChange={(v) => onChange({ pendingOffset: v })}
        />
      )}
      <SelectField
        label="Position Size Method"
        value={data.method}
        options={[
          { value: "FIXED_LOT", label: "Fixed Lot" },
          { value: "RISK_PERCENT", label: "Risk %" },
        ]}
        onChange={(v) => onChange({ method: v as PlaceSellNodeData["method"] })}
      />
      {data.method === "FIXED_LOT" && (
        <div>
          <NumberField
            label="Lot Size"
            value={data.fixedLot}
            min={0.01}
            max={100}
            step={0.01}
            onChange={(v) => onChange({ fixedLot: v })}
          />
          <OptimizableFieldCheckbox fieldName="fixedLot" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "RISK_PERCENT" && (
        <div>
          <NumberField
            label="Risk %"
            value={data.riskPercent}
            min={0.1}
            max={100}
            step={0.1}
            onChange={(v) => onChange({ riskPercent: v })}
          />
          <OptimizableFieldCheckbox fieldName="riskPercent" data={data} onChange={onChange} />
        </div>
      )}
      <NumberField
        label="Min Lot"
        value={data.minLot}
        min={0.01}
        max={100}
        step={0.01}
        onChange={(v) => onChange({ minLot: v })}
      />
      <NumberField
        label="Max Lot"
        value={data.maxLot}
        min={0.01}
        max={1000}
        step={0.01}
        onChange={(v) => onChange({ maxLot: v })}
      />
      {data.minLot > data.maxLot && <FieldError message="Min lot must not exceed max lot" />}
      {data.method === "RISK_PERCENT" && data.riskPercent > 5 && (
        <FieldWarning message="Risk above 5% per trade is considered aggressive" />
      )}

      {/* Stop Loss */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <p className="text-xs font-medium text-[#CBD5E1] mb-2">Stop Loss</p>
        <SelectField
          label="SL Method"
          value={((data as Record<string, unknown>).slMethod as string) ?? "FIXED_PIPS"}
          options={[
            { value: "FIXED_PIPS", label: "Fixed Pips" },
            { value: "ATR_BASED", label: "ATR-Based" },
            { value: "PERCENT", label: "Percentage" },
            { value: "INDICATOR", label: "From Indicator" },
            { value: "RANGE_OPPOSITE", label: "Range Opposite" },
          ]}
          onChange={(v) => onChange({ slMethod: v } as Partial<PlaceSellNodeData>)}
        />
        {(data as Record<string, unknown>).slMethod === "FIXED_PIPS" && (
          <NumberField
            label="SL Pips"
            value={((data as Record<string, unknown>).slFixedPips as number) ?? 50}
            min={1}
            max={1000}
            onChange={(v) => onChange({ slFixedPips: v } as Partial<PlaceSellNodeData>)}
          />
        )}
        {(data as Record<string, unknown>).slMethod === "ATR_BASED" && (
          <>
            <NumberField
              label="ATR Multiplier"
              value={((data as Record<string, unknown>).slAtrMultiplier as number) ?? 1.5}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(v) => onChange({ slAtrMultiplier: v } as Partial<PlaceSellNodeData>)}
            />
            <NumberField
              label="ATR Period"
              value={((data as Record<string, unknown>).slAtrPeriod as number) ?? 14}
              min={1}
              max={500}
              onChange={(v) => onChange({ slAtrPeriod: v } as Partial<PlaceSellNodeData>)}
            />
          </>
        )}
        {(data as Record<string, unknown>).slMethod === "PERCENT" && (
          <NumberField
            label="Stop Loss (%)"
            value={((data as Record<string, unknown>).slPercent as number) ?? 1}
            min={0.01}
            max={50}
            step={0.1}
            onChange={(v) => onChange({ slPercent: v } as Partial<PlaceSellNodeData>)}
          />
        )}
        {(data as Record<string, unknown>).slMethod === "INDICATOR" && (
          <div
            className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
            role="note"
          >
            Connect an indicator block to use its value as SL level.
          </div>
        )}
        {(data as Record<string, unknown>).slMethod === "RANGE_OPPOSITE" && (
          <div
            className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
            role="note"
          >
            Stop loss placed at the opposite side of the range.
          </div>
        )}
      </div>

      {/* Take Profit */}
      <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
        <p className="text-xs font-medium text-[#CBD5E1] mb-2">Take Profit</p>
        <SelectField
          label="TP Method"
          value={((data as Record<string, unknown>).tpMethod as string) ?? "FIXED_PIPS"}
          options={[
            { value: "FIXED_PIPS", label: "Fixed Pips" },
            { value: "RISK_REWARD", label: "Risk:Reward Ratio" },
            { value: "ATR_BASED", label: "ATR-Based" },
          ]}
          onChange={(v) => onChange({ tpMethod: v } as Partial<PlaceSellNodeData>)}
        />
        {(data as Record<string, unknown>).tpMethod === "FIXED_PIPS" && (
          <NumberField
            label="TP Pips"
            value={((data as Record<string, unknown>).tpFixedPips as number) ?? 100}
            min={1}
            max={10000}
            onChange={(v) => onChange({ tpFixedPips: v } as Partial<PlaceSellNodeData>)}
          />
        )}
        {(data as Record<string, unknown>).tpMethod === "RISK_REWARD" && (
          <NumberField
            label="Risk:Reward Ratio"
            value={((data as Record<string, unknown>).tpRiskRewardRatio as number) ?? 2}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(v) => onChange({ tpRiskRewardRatio: v } as Partial<PlaceSellNodeData>)}
          />
        )}
        {(data as Record<string, unknown>).tpMethod === "ATR_BASED" && (
          <>
            <NumberField
              label="ATR Multiplier"
              value={((data as Record<string, unknown>).tpAtrMultiplier as number) ?? 3}
              min={0.1}
              max={20}
              step={0.1}
              onChange={(v) => onChange({ tpAtrMultiplier: v } as Partial<PlaceSellNodeData>)}
            />
            <NumberField
              label="ATR Period"
              value={((data as Record<string, unknown>).tpAtrPeriod as number) ?? 14}
              min={1}
              max={500}
              onChange={(v) => onChange({ tpAtrPeriod: v } as Partial<PlaceSellNodeData>)}
            />
          </>
        )}
      </div>
    </>
  );
}

export function CloseConditionFields({
  data,
  onChange,
}: {
  data: CloseConditionNodeData;
  onChange: (updates: Partial<CloseConditionNodeData>) => void;
}) {
  return (
    <>
      <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-2 rounded-lg text-xs mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Closes positions when conditions are met
      </div>
      <SelectField
        label="Close Direction"
        value={data.closeDirection}
        options={[
          { value: "BOTH", label: "Close Both (Buy & Sell)" },
          { value: "BUY", label: "Close Buy Only" },
          { value: "SELL", label: "Close Sell Only" },
        ]}
        onChange={(v) => onChange({ closeDirection: v as CloseDirection })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Closes open positions when connected conditions are triggered. Connect indicator or price
        action blocks to define when to close.
      </div>
    </>
  );
}

export function TimeExitFields({
  data,
  onChange,
}: {
  data: TimeExitNodeData;
  onChange: (updates: Partial<TimeExitNodeData>) => void;
}) {
  return (
    <>
      <NumberField
        label="Exit After Bars"
        value={data.exitAfterBars}
        min={1}
        max={1000}
        onChange={(v) => onChange({ exitAfterBars: v })}
      />
      <SelectField
        label="Timeframe"
        value={data.exitTimeframe}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) => onChange({ exitTimeframe: v as Timeframe })}
      />
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        Automatically closes positions after the specified number of bars on the selected timeframe.
      </div>
    </>
  );
}

export function GridPyramidFields({
  data,
  onChange,
}: {
  data: GridPyramidNodeData;
  onChange: (updates: Partial<GridPyramidNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Mode"
        value={data.gridMode}
        options={[
          { value: "GRID", label: "Grid (pending orders at intervals)" },
          { value: "PYRAMID", label: "Pyramid (add to winners)" },
        ]}
        onChange={(v) => onChange({ gridMode: v as GridPyramidNodeData["gridMode"] })}
        tooltip="Grid places pending orders at regular intervals. Pyramid adds to winning positions."
      />
      <SelectField
        label="Direction"
        value={data.direction}
        options={[
          { value: "BOTH", label: "Both Directions" },
          { value: "BUY_ONLY", label: "Buy Only" },
          { value: "SELL_ONLY", label: "Sell Only" },
        ]}
        onChange={(v) => onChange({ direction: v as GridPyramidNodeData["direction"] })}
      />
      <div>
        <NumberField
          label="Grid Spacing (pips)"
          value={data.gridSpacing}
          min={1}
          max={1000}
          onChange={(v) => onChange({ gridSpacing: v })}
          tooltip="Distance in pips between each grid level or pyramid addition"
        />
        <OptimizableFieldCheckbox fieldName="gridSpacing" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Max Grid Levels"
          value={data.maxGridLevels}
          min={1}
          max={50}
          onChange={(v) => onChange({ maxGridLevels: v })}
          tooltip="Maximum number of grid levels or pyramid additions"
        />
        <OptimizableFieldCheckbox fieldName="maxGridLevels" data={data} onChange={onChange} />
      </div>
      <div>
        <NumberField
          label="Lot Multiplier"
          value={data.lotMultiplier}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onChange({ lotMultiplier: v })}
          tooltip="Lot size multiplier for each level. 1.0 = same size, 2.0 = double each level (martingale), 0.5 = halve each level"
        />
        <OptimizableFieldCheckbox fieldName="lotMultiplier" data={data} onChange={onChange} />
      </div>
      {data.lotMultiplier > 1.0 && (
        <FieldWarning message="Lot multiplier > 1.0 (martingale) increases risk exponentially with each level" />
      )}
      <div
        className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
        role="note"
      >
        {data.gridMode === "GRID"
          ? "Grid mode places pending orders at regular intervals from the entry price. Useful for range-bound markets."
          : "Pyramid mode adds to winning positions at intervals. Useful for trending markets."}
      </div>
    </>
  );
}
