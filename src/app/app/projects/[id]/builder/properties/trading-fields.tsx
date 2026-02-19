"use client";

import { SelectField, NumberField } from "../components/form-fields";
import type {
  PlaceBuyNodeData,
  PlaceSellNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  TakeProfitMethod,
  TPLevel,
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
    </>
  );
}

export function StopLossFields({
  data,
  onChange,
}: {
  data: StopLossNodeData;
  onChange: (updates: Partial<StopLossNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Method"
        value={data.method}
        options={[
          { value: "FIXED_PIPS", label: "Fixed Pips" },
          { value: "ATR_BASED", label: "ATR-Based" },
          { value: "PERCENT", label: "Percentage" },
          { value: "INDICATOR", label: "From Indicator" },
        ]}
        onChange={(v) => onChange({ method: v as StopLossNodeData["method"] })}
      />
      {data.method === "FIXED_PIPS" && (
        <div>
          <NumberField
            label="Pips"
            value={data.fixedPips}
            min={1}
            max={1000}
            onChange={(v) => onChange({ fixedPips: v })}
          />
          <OptimizableFieldCheckbox fieldName="fixedPips" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "ATR_BASED" && (
        <>
          <div>
            <SelectField
              label="ATR Timeframe"
              value={data.atrTimeframe ?? "H1"}
              options={TIMEFRAME_OPTIONS}
              onChange={(v) => onChange({ atrTimeframe: v as Timeframe })}
            />
            <OptimizableFieldCheckbox fieldName="atrTimeframe" data={data} onChange={onChange} />
          </div>
          <div>
            <NumberField
              label="ATR Period"
              value={data.atrPeriod}
              min={1}
              max={500}
              onChange={(v) => onChange({ atrPeriod: v })}
              tooltip="Average True Range - measures market volatility"
            />
            <OptimizableFieldCheckbox fieldName="atrPeriod" data={data} onChange={onChange} />
          </div>
          <div>
            <NumberField
              label="ATR Multiplier"
              value={data.atrMultiplier}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(v) => onChange({ atrMultiplier: v })}
              tooltip="Multiplier applied to the ATR value"
            />
            <OptimizableFieldCheckbox fieldName="atrMultiplier" data={data} onChange={onChange} />
          </div>
        </>
      )}
      {data.method === "PERCENT" && (
        <div>
          <NumberField
            label="Stop Loss (%)"
            value={data.slPercent ?? 1}
            min={0.01}
            max={50}
            step={0.1}
            onChange={(v) => onChange({ slPercent: v })}
          />
          <OptimizableFieldCheckbox fieldName="slPercent" data={data} onChange={onChange} />
        </div>
      )}
      {data.method === "INDICATOR" && (
        <div
          className="text-xs text-[#94A3B8] bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)] p-3 rounded-lg"
          role="note"
        >
          Connect an indicator block to use its value as SL level.
        </div>
      )}
    </>
  );
}

const TP_METHOD_OPTIONS = [
  { value: "FIXED_PIPS", label: "Fixed Pips" },
  { value: "RISK_REWARD", label: "Risk:Reward Ratio" },
  { value: "ATR_BASED", label: "ATR-Based" },
];

function TPLevelFields({
  level,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  level: TPLevel;
  index: number;
  onUpdate: (updates: Partial<TPLevel>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="p-2.5 bg-[rgba(79,70,229,0.05)] border border-[rgba(79,70,229,0.15)] rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#CBD5E1]">TP {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-[#EF4444] hover:text-[#F87171] p-0.5"
            aria-label={`Remove TP level ${index + 1}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <SelectField
        label="Method"
        value={level.method}
        options={TP_METHOD_OPTIONS}
        onChange={(v) => onUpdate({ method: v as TakeProfitMethod })}
      />
      {level.method === "FIXED_PIPS" && (
        <NumberField
          label="Pips"
          value={level.fixedPips}
          min={1}
          max={10000}
          onChange={(v) => onUpdate({ fixedPips: v })}
        />
      )}
      {level.method === "RISK_REWARD" && (
        <NumberField
          label="R:R Ratio"
          value={level.riskRewardRatio}
          min={0.1}
          max={20}
          step={0.1}
          onChange={(v) => onUpdate({ riskRewardRatio: v })}
        />
      )}
      {level.method === "ATR_BASED" && (
        <>
          <NumberField
            label="ATR Period"
            value={level.atrPeriod}
            min={1}
            max={500}
            onChange={(v) => onUpdate({ atrPeriod: v })}
          />
          <NumberField
            label="ATR Multiplier"
            value={level.atrMultiplier}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(v) => onUpdate({ atrMultiplier: v })}
          />
        </>
      )}
      <NumberField
        label="Close %"
        value={level.closePercent}
        min={1}
        max={100}
        step={1}
        onChange={(v) => onUpdate({ closePercent: v })}
        tooltip="Percentage of remaining position to close at this level"
      />
    </div>
  );
}

function defaultTPLevel(): TPLevel {
  return {
    method: "FIXED_PIPS",
    fixedPips: 50,
    riskRewardRatio: 2,
    atrMultiplier: 2,
    atrPeriod: 14,
    closePercent: 100,
  };
}

export function TakeProfitFields({
  data,
  onChange,
}: {
  data: TakeProfitNodeData;
  onChange: (updates: Partial<TakeProfitNodeData>) => void;
}) {
  const multipleEnabled = data.multipleTPEnabled ?? false;
  const levels = data.tpLevels ?? [];

  function toggleMultipleTP(enabled: boolean): void {
    if (enabled && levels.length === 0) {
      // Initialize with two levels based on current single TP settings
      const level1: TPLevel = {
        method: data.method,
        fixedPips: data.fixedPips,
        riskRewardRatio: data.riskRewardRatio,
        atrMultiplier: data.atrMultiplier,
        atrPeriod: data.atrPeriod,
        closePercent: 50,
      };
      const level2: TPLevel = {
        ...defaultTPLevel(),
        method: data.method,
        closePercent: 100,
      };
      onChange({ multipleTPEnabled: true, tpLevels: [level1, level2] });
    } else {
      onChange({ multipleTPEnabled: enabled });
    }
  }

  function updateLevel(index: number, updates: Partial<TPLevel>): void {
    const updated = [...levels];
    updated[index] = { ...updated[index], ...updates };
    onChange({ tpLevels: updated });
  }

  function removeLevel(index: number): void {
    onChange({ tpLevels: levels.filter((_, i) => i !== index) });
  }

  function addLevel(): void {
    if (levels.length >= 4) return;
    onChange({ tpLevels: [...levels, defaultTPLevel()] });
  }

  return (
    <>
      {/* Toggle for multiple TP */}
      <label
        className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={multipleEnabled}
          onChange={(e) => {
            e.stopPropagation();
            toggleMultipleTP(e.target.checked);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#10B981] focus:ring-[#10B981]"
        />
        Multiple take profit levels
      </label>
      <p className="text-[10px] text-[#7C8DB0] -mt-1">
        {multipleEnabled
          ? "Close parts of your position at different profit targets"
          : "Enable to set multiple TP targets with partial closes"}
      </p>

      {multipleEnabled ? (
        <div className="space-y-2">
          {levels.map((level, i) => (
            <TPLevelFields
              key={i}
              level={level}
              index={i}
              onUpdate={(updates) => updateLevel(i, updates)}
              onRemove={() => removeLevel(i)}
              canRemove={levels.length > 2}
            />
          ))}
          {levels.length < 4 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addLevel();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full py-1.5 text-xs font-medium text-[#A78BFA] bg-[rgba(79,70,229,0.1)] border border-dashed border-[rgba(79,70,229,0.3)] rounded-lg hover:bg-[rgba(79,70,229,0.2)] transition-colors"
            >
              + Add TP Level
            </button>
          )}
          <p className="text-[10px] text-[#7C8DB0]">
            TP1 partial close moves SL to breakeven. Remaining position targets next TP level.
          </p>
        </div>
      ) : (
        <>
          <SelectField
            label="Method"
            value={data.method}
            options={TP_METHOD_OPTIONS}
            onChange={(v) => onChange({ method: v as TakeProfitMethod })}
          />
          {data.method === "FIXED_PIPS" && (
            <div>
              <NumberField
                label="Pips"
                value={data.fixedPips}
                min={1}
                max={1000}
                onChange={(v) => onChange({ fixedPips: v })}
              />
              <OptimizableFieldCheckbox fieldName="fixedPips" data={data} onChange={onChange} />
            </div>
          )}
          {data.method === "RISK_REWARD" && (
            <div>
              <NumberField
                label="R:R Ratio"
                value={data.riskRewardRatio}
                min={0.1}
                max={20}
                step={0.1}
                onChange={(v) => onChange({ riskRewardRatio: v })}
              />
              <OptimizableFieldCheckbox
                fieldName="riskRewardRatio"
                data={data}
                onChange={onChange}
              />
            </div>
          )}
          {data.method === "ATR_BASED" && (
            <>
              <div>
                <NumberField
                  label="ATR Period"
                  value={data.atrPeriod}
                  min={1}
                  max={500}
                  onChange={(v) => onChange({ atrPeriod: v })}
                  tooltip="Average True Range - measures market volatility"
                />
                <OptimizableFieldCheckbox fieldName="atrPeriod" data={data} onChange={onChange} />
              </div>
              <div>
                <NumberField
                  label="ATR Multiplier"
                  value={data.atrMultiplier}
                  min={0.1}
                  max={20}
                  step={0.1}
                  onChange={(v) => onChange({ atrMultiplier: v })}
                  tooltip="Multiplier applied to the ATR value"
                />
                <OptimizableFieldCheckbox
                  fieldName="atrMultiplier"
                  data={data}
                  onChange={onChange}
                />
              </div>
            </>
          )}
        </>
      )}
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
