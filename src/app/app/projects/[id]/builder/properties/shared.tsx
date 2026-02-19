"use client";

import { createContext, useContext } from "react";
import { SelectField } from "../components/form-fields";
import type {
  BuilderNodeData,
  EntryDirection,
  EntrySlMethod,
  Timeframe,
  MTFConfirmation,
} from "@/types/builder";
import { NumberField } from "../components/form-fields";
import { DIRECTION_OPTIONS, BASE_SL_OPTIONS, TIMEFRAME_OPTIONS } from "./constants";

const OptimizationVisibleContext = createContext(false);

export function OptimizableFieldCheckbox<T extends BuilderNodeData>({
  fieldName,
  data,
  onChange,
}: {
  fieldName: string;
  data: T;
  onChange: (updates: Partial<T>) => void;
}) {
  const visible = useContext(OptimizationVisibleContext);
  if (!visible) return null;

  const optimizableFields = data.optimizableFields ?? [];
  const isOptimizable = optimizableFields.includes(fieldName);

  const toggleOptimizable = () => {
    const newFields = isOptimizable
      ? optimizableFields.filter((f) => f !== fieldName)
      : [...optimizableFields, fieldName];
    onChange({ optimizableFields: newFields } as Partial<T>);
  };

  return (
    <label className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] cursor-pointer hover:text-[#CBD5E1] mt-1">
      <input
        type="checkbox"
        checked={isOptimizable}
        onChange={toggleOptimizable}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-3 h-3 rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#22D3EE] focus:ring-[#22D3EE]"
      />
      <span
        className="flex items-center gap-1"
        title="Mark as optimizable input in MQL5 — MT5 Strategy Tester can auto-optimize this parameter"
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
        Optimize in MT5
      </span>
    </label>
  );
}

export { OptimizationVisibleContext };

export function FieldWarning({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-1.5 mt-1.5 text-[#FBBF24] text-[11px]" role="alert">
      <svg
        className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-1.5 mt-1.5 text-[#EF4444] text-[11px]" role="alert">
      <svg
        className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
  hint,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.target.checked);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#10B981] focus:ring-[#10B981]"
        />
        {label}
      </label>
      {hint && <p className="text-[10px] text-[#7C8DB0] mt-0.5 ml-5">{hint}</p>}
      {checked && children && <div className="mt-2 ml-5 space-y-2">{children}</div>}
    </div>
  );
}

export function DirectionSelector({
  direction,
  onChange,
}: {
  direction: EntryDirection;
  onChange: (v: EntryDirection) => void;
}) {
  return (
    <SelectField
      label="Direction"
      value={direction}
      options={DIRECTION_OPTIONS}
      onChange={(v) => onChange(v as EntryDirection)}
    />
  );
}

export function AdvancedToggleSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
      <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">Advanced</span>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}

export function EntryStrategyRiskSection<T extends BuilderNodeData>({
  data,
  onChange,
  slOptions,
}: {
  data: T & {
    riskPercent: number;
    slMethod?: EntrySlMethod;
    slFixedPips?: number;
    slPercent?: number;
    slAtrMultiplier: number;
    slAtrPeriod?: number;
    slAtrTimeframe?: Timeframe;
    tpRMultiple: number;
    closeOnOpposite?: boolean;
    multipleTP?: {
      enabled: boolean;
      tp1RMultiple: number;
      tp1Percent: number;
      tp2RMultiple: number;
    };
    trailingStop?: {
      enabled: boolean;
      method: "atr" | "fixed-pips";
      atrMultiplier?: number;
      atrPeriod?: number;
      atrTimeframe?: string;
      fixedPips?: number;
    };
  };
  onChange: (updates: Partial<T>) => void;
  slOptions?: { value: EntrySlMethod; label: string }[];
}) {
  const slMethod = data.slMethod ?? "ATR";
  const options = slOptions ?? BASE_SL_OPTIONS;

  return (
    <>
      <NumberField
        label="Risk %"
        value={data.riskPercent}
        min={0.1}
        max={10}
        step={0.1}
        onChange={(v) => onChange({ riskPercent: v } as Partial<T>)}
        tooltip="How much of your account you risk on each trade"
      />
      <p className="text-[10px] text-[#7C8DB0] -mt-0.5">
        The EA calculates your position size so you only lose this % if your stop loss is hit
      </p>
      <OptimizableFieldCheckbox fieldName="riskPercent" data={data} onChange={onChange} />

      <SelectField
        label="Stop Loss Method"
        value={slMethod}
        options={options}
        onChange={(v) => onChange({ slMethod: v } as Partial<T>)}
        tooltip="How the stop loss distance is calculated"
      />
      {slMethod === "RANGE_OPPOSITE" && (
        <p className="text-[11px] text-[#94A3B8] -mt-1">
          SL at the opposite side of the range. Buy: SL = range low. Sell: SL = range high. Lot size
          calculated from risk %.
        </p>
      )}
      {slMethod === "ATR" && (
        <>
          <NumberField
            label="ATR Multiplier"
            value={data.slAtrMultiplier}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(v) => onChange({ slAtrMultiplier: v } as Partial<T>)}
            tooltip="ATR measures how much the price moves on average. A 1.5x multiplier means your SL is 1.5 times that movement."
          />
          <OptimizableFieldCheckbox fieldName="slAtrMultiplier" data={data} onChange={onChange} />
          <NumberField
            label="ATR Period"
            value={data.slAtrPeriod ?? 14}
            min={1}
            max={500}
            step={1}
            onChange={(v) => onChange({ slAtrPeriod: v } as Partial<T>)}
            tooltip="Number of candles used to calculate average price movement. 14 is the standard setting."
          />
          <OptimizableFieldCheckbox fieldName="slAtrPeriod" data={data} onChange={onChange} />
          <SelectField
            label="ATR Timeframe"
            value={data.slAtrTimeframe ?? ""}
            options={[{ value: "", label: "Current (chart)" }, ...TIMEFRAME_OPTIONS]}
            onChange={(v) =>
              onChange({ slAtrTimeframe: (v || undefined) as Timeframe | undefined } as Partial<T>)
            }
          />
          <OptimizableFieldCheckbox fieldName="slAtrTimeframe" data={data} onChange={onChange} />
        </>
      )}
      {slMethod === "PIPS" && (
        <>
          <NumberField
            label="Stop Loss (Pips)"
            value={data.slFixedPips ?? 50}
            min={1}
            max={10000}
            step={1}
            onChange={(v) => onChange({ slFixedPips: v } as Partial<T>)}
          />
          <OptimizableFieldCheckbox fieldName="slFixedPips" data={data} onChange={onChange} />
        </>
      )}
      {slMethod === "PERCENT" && (
        <>
          <NumberField
            label="Stop Loss (%)"
            value={data.slPercent ?? 1}
            min={0.01}
            max={50}
            step={0.1}
            onChange={(v) => onChange({ slPercent: v } as Partial<T>)}
          />
          <OptimizableFieldCheckbox fieldName="slPercent" data={data} onChange={onChange} />
        </>
      )}

      {/* Take Profit — single or multiple */}
      <ToggleField
        label="Multiple take profits"
        hint="Close part of your position early and let the rest run"
        checked={data.multipleTP?.enabled ?? false}
        onChange={(v) =>
          onChange({
            multipleTP: {
              enabled: v,
              tp1RMultiple: data.multipleTP?.tp1RMultiple ?? 1,
              tp1Percent: data.multipleTP?.tp1Percent ?? 50,
              tp2RMultiple: data.multipleTP?.tp2RMultiple ?? 2,
            },
          } as Partial<T>)
        }
      >
        <NumberField
          label="TP1 R-multiple"
          value={data.multipleTP?.tp1RMultiple ?? 1}
          min={0.5}
          max={20}
          step={0.1}
          onChange={(v) =>
            onChange({
              multipleTP: { ...data.multipleTP!, tp1RMultiple: v },
            } as Partial<T>)
          }
          tooltip="First take profit as multiple of your stop loss distance"
        />
        <NumberField
          label="TP1 Close %"
          value={data.multipleTP?.tp1Percent ?? 50}
          min={10}
          max={90}
          step={5}
          onChange={(v) =>
            onChange({
              multipleTP: { ...data.multipleTP!, tp1Percent: v },
            } as Partial<T>)
          }
          tooltip="Percentage of your position to close at TP1"
        />
        <p className="text-[10px] text-[#7C8DB0] -mt-0.5">
          Remaining {100 - (data.multipleTP?.tp1Percent ?? 50)}% closes at TP2
        </p>
        <NumberField
          label="TP2 R-multiple"
          value={data.multipleTP?.tp2RMultiple ?? 2}
          min={0.5}
          max={20}
          step={0.1}
          onChange={(v) =>
            onChange({
              multipleTP: { ...data.multipleTP!, tp2RMultiple: v },
            } as Partial<T>)
          }
          tooltip="Second take profit for the remaining position"
        />
      </ToggleField>
      {!data.multipleTP?.enabled && (
        <>
          <NumberField
            label="Take Profit (Reward:Risk)"
            value={data.tpRMultiple}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(v) => onChange({ tpRMultiple: v } as Partial<T>)}
            tooltip="How many times your stop loss distance you want as profit. 2 means your target profit is 2x your stop loss."
          />
          <p className="text-[10px] text-[#7C8DB0] -mt-0.5">
            Example: if your SL is 50 pips, then {data.tpRMultiple}R ={" "}
            {Math.round(50 * data.tpRMultiple)} pips TP
          </p>
          <OptimizableFieldCheckbox fieldName="tpRMultiple" data={data} onChange={onChange} />
        </>
      )}

      {/* Close on opposite signal */}
      <ToggleField
        label="Close on opposite signal"
        hint="When a buy signal fires, close any open sell positions (and vice versa)"
        checked={data.closeOnOpposite ?? false}
        onChange={(v) => onChange({ closeOnOpposite: v } as Partial<T>)}
      />

      {/* Trailing stop */}
      <ToggleField
        label="Trailing stop"
        hint="Automatically moves your stop loss to lock in profit as the price moves in your favor"
        checked={data.trailingStop?.enabled ?? false}
        onChange={(v) =>
          onChange({
            trailingStop: {
              enabled: v,
              method: data.trailingStop?.method ?? "atr",
              atrMultiplier: data.trailingStop?.atrMultiplier ?? 2.0,
              fixedPips: data.trailingStop?.fixedPips ?? 30,
            },
          } as Partial<T>)
        }
      >
        <SelectField
          label="Trailing method"
          value={data.trailingStop?.method ?? "atr"}
          options={[
            { value: "atr", label: "ATR" },
            { value: "fixed-pips", label: "Fixed pips" },
          ]}
          onChange={(v) =>
            onChange({
              trailingStop: { ...data.trailingStop!, method: v as "atr" | "fixed-pips" },
            } as Partial<T>)
          }
        />
        {data.trailingStop?.method === "atr" && (
          <>
            <NumberField
              label="ATR Multiplier"
              value={data.trailingStop?.atrMultiplier ?? 2.0}
              min={0.1}
              max={20}
              step={0.1}
              onChange={(v) =>
                onChange({
                  trailingStop: { ...data.trailingStop!, atrMultiplier: v },
                } as Partial<T>)
              }
              tooltip="Distance from price to trailing stop, measured in ATR units"
            />
            <NumberField
              label="ATR Period"
              value={data.trailingStop?.atrPeriod ?? 14}
              min={1}
              max={500}
              step={1}
              onChange={(v) =>
                onChange({
                  trailingStop: { ...data.trailingStop!, atrPeriod: v },
                } as Partial<T>)
              }
              tooltip="Number of candles used to calculate average price movement. 14 is the standard setting."
            />
          </>
        )}
        {data.trailingStop?.method === "fixed-pips" && (
          <NumberField
            label="Trail distance (pips)"
            value={data.trailingStop?.fixedPips ?? 30}
            min={1}
            max={1000}
            step={1}
            onChange={(v) =>
              onChange({
                trailingStop: { ...data.trailingStop!, fixedPips: v },
              } as Partial<T>)
            }
          />
        )}
      </ToggleField>
    </>
  );
}

const MTF_METHOD_OPTIONS = [
  { value: "ema", label: "EMA Trend" },
  { value: "adx", label: "ADX Strength" },
];

export function MTFConfirmationSection<T extends BuilderNodeData>({
  data,
  onChange,
}: {
  data: T & { mtfConfirmation?: MTFConfirmation };
  onChange: (updates: Partial<T>) => void;
}) {
  const mtf = data.mtfConfirmation;

  return (
    <ToggleField
      label="Multi-timeframe confirmation"
      hint="Confirm entries using a higher timeframe indicator (e.g. H4 EMA for M15 entries)"
      checked={mtf?.enabled ?? false}
      onChange={(v) =>
        onChange({
          mtfConfirmation: {
            enabled: v,
            timeframe: mtf?.timeframe ?? "H4",
            method: mtf?.method ?? "ema",
            emaPeriod: mtf?.emaPeriod ?? 200,
            adxPeriod: mtf?.adxPeriod ?? 14,
            adxThreshold: mtf?.adxThreshold ?? 25,
          },
        } as Partial<T>)
      }
    >
      <SelectField
        label="HTF Timeframe"
        value={mtf?.timeframe ?? "H4"}
        options={TIMEFRAME_OPTIONS}
        onChange={(v) =>
          onChange({
            mtfConfirmation: { ...mtf!, timeframe: v as Timeframe },
          } as Partial<T>)
        }
        tooltip="Higher timeframe used for trend confirmation"
      />
      <OptimizableFieldCheckbox
        fieldName="mtfConfirmation.timeframe"
        data={data}
        onChange={onChange}
      />
      <SelectField
        label="Method"
        value={mtf?.method ?? "ema"}
        options={MTF_METHOD_OPTIONS}
        onChange={(v) =>
          onChange({
            mtfConfirmation: { ...mtf!, method: v as "ema" | "adx" },
          } as Partial<T>)
        }
        tooltip="EMA: trade in EMA trend direction. ADX: trade only when trend is strong enough."
      />
      {(mtf?.method ?? "ema") === "ema" && (
        <>
          <NumberField
            label="EMA Period"
            value={mtf?.emaPeriod ?? 200}
            min={1}
            max={1000}
            step={1}
            onChange={(v) =>
              onChange({
                mtfConfirmation: { ...mtf!, emaPeriod: v },
              } as Partial<T>)
            }
            tooltip="EMA period on the higher timeframe. 200 is the most common trend filter."
          />
          <OptimizableFieldCheckbox
            fieldName="mtfConfirmation.emaPeriod"
            data={data}
            onChange={onChange}
          />
        </>
      )}
      {mtf?.method === "adx" && (
        <>
          <NumberField
            label="ADX Period"
            value={mtf?.adxPeriod ?? 14}
            min={1}
            max={500}
            step={1}
            onChange={(v) =>
              onChange({
                mtfConfirmation: { ...mtf!, adxPeriod: v },
              } as Partial<T>)
            }
            tooltip="Number of candles to calculate ADX. 14 is standard."
          />
          <OptimizableFieldCheckbox
            fieldName="mtfConfirmation.adxPeriod"
            data={data}
            onChange={onChange}
          />
          <NumberField
            label="ADX Threshold"
            value={mtf?.adxThreshold ?? 25}
            min={1}
            max={100}
            step={1}
            onChange={(v) =>
              onChange({
                mtfConfirmation: { ...mtf!, adxThreshold: v },
              } as Partial<T>)
            }
            tooltip="Minimum ADX value to confirm a strong trend. 25 is the standard threshold."
          />
          <OptimizableFieldCheckbox
            fieldName="mtfConfirmation.adxThreshold"
            data={data}
            onChange={onChange}
          />
        </>
      )}
    </ToggleField>
  );
}
