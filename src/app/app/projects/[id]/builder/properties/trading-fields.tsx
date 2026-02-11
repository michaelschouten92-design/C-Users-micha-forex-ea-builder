"use client";

import { SelectField, NumberField } from "../components/form-fields";
import type {
  PlaceBuyNodeData,
  PlaceSellNodeData,
  StopLossNodeData,
  TakeProfitNodeData,
  CloseConditionNodeData,
  CloseDirection,
  TimeExitNodeData,
  Timeframe,
  OrderType,
} from "@/types/builder";
import { TIMEFRAME_OPTIONS } from "./constants";
import { OptimizableFieldCheckbox, FieldWarning } from "./shared";

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
      {data.minLot > data.maxLot && <FieldWarning message="Min lot should not exceed max lot" />}
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
      {data.minLot > data.maxLot && <FieldWarning message="Min lot should not exceed max lot" />}
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
            <NumberField
              label="ATR Period"
              value={data.atrPeriod}
              min={1}
              max={500}
              onChange={(v) => onChange({ atrPeriod: v })}
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

export function TakeProfitFields({
  data,
  onChange,
}: {
  data: TakeProfitNodeData;
  onChange: (updates: Partial<TakeProfitNodeData>) => void;
}) {
  return (
    <>
      <SelectField
        label="Method"
        value={data.method}
        options={[
          { value: "FIXED_PIPS", label: "Fixed Pips" },
          { value: "RISK_REWARD", label: "Risk:Reward Ratio" },
          { value: "ATR_BASED", label: "ATR-Based" },
        ]}
        onChange={(v) => onChange({ method: v as TakeProfitNodeData["method"] })}
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
          <OptimizableFieldCheckbox fieldName="riskRewardRatio" data={data} onChange={onChange} />
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
            />
            <OptimizableFieldCheckbox fieldName="atrMultiplier" data={data} onChange={onChange} />
          </div>
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
