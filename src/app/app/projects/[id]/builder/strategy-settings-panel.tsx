"use client";

import { useState, useEffect } from "react";
import type { BuildJsonSettings } from "@/types/builder";
import { PROP_FIRM_PRESETS } from "@/types/builder";

interface StrategySettingsPanelProps {
  settings: BuildJsonSettings;
  onChange: (settings: BuildJsonSettings) => void;
}

export function StrategySettingsPanel({ settings, onChange }: StrategySettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (partial: Partial<BuildJsonSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const applyPreset = (presetName: string) => {
    const preset = PROP_FIRM_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    const confirmed = window.confirm(
      `Apply "${presetName}" preset? This will overwrite your current risk settings (max drawdown, daily loss limit, max open trades).`
    );
    if (!confirmed) return;
    update({
      maxDailyLossPercent: preset.dailyLossPercent,
      maxTotalDrawdownPercent: preset.totalDrawdownPercent,
      maxOpenTrades: preset.maxOpenTrades,
    });
  };

  return (
    <div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold text-sm tracking-wide rounded-xl border transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-[#4F46E5] to-[#6366F1] shadow-[0_2px_8px_rgba(79,70,229,0.3)] hover:shadow-[0_4px_16px_rgba(79,70,229,0.4)] border-[#6366F1]/30"
        aria-expanded={isExpanded}
      >
        <span className="whitespace-nowrap">Strategy Settings</span>
        <svg
          className={`w-4 h-4 opacity-80 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 pl-1 space-y-3 px-3 pb-2">
          {/* Prop Firm Preset */}
          <div>
            <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
              Load prop firm preset
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) applyPreset(e.target.value);
                e.target.value = "";
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
              defaultValue=""
            >
              <option value="" disabled>
                Select preset...
              </option>
              {PROP_FIRM_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} (Max DD {p.totalDrawdownPercent}%, Daily Loss {p.dailyLossPercent}%)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#64748B] mt-1">
              Auto-fills risk limits for your prop firm challenge
            </p>
          </div>

          {/* Max Open Trades */}
          <SettingsNumberField
            label="Max Open Trades"
            value={settings.maxOpenTrades}
            min={1}
            max={100}
            step={1}
            onChange={(v) => update({ maxOpenTrades: v })}
            hint="Maximum positions open at the same time"
          />

          {/* Max Trades Per Day */}
          <SettingsToggleNumberField
            label="Max Trades Per Day"
            value={settings.maxTradesPerDay ?? 0}
            min={1}
            max={100}
            step={1}
            onChange={(v) => update({ maxTradesPerDay: v })}
            hint="Limits how many trades the EA opens per day"
          />

          {/* Max Buy Positions */}
          <SettingsToggleNumberField
            label="Max Buy Positions"
            value={settings.maxBuyPositions ?? 0}
            min={1}
            max={100}
            step={1}
            onChange={(v) => update({ maxBuyPositions: v || undefined })}
            hint="Limit concurrent buy positions (leave off to use Max Open Trades)"
          />

          {/* Max Sell Positions */}
          <SettingsToggleNumberField
            label="Max Sell Positions"
            value={settings.maxSellPositions ?? 0}
            min={1}
            max={100}
            step={1}
            onChange={(v) => update({ maxSellPositions: v || undefined })}
            hint="Limit concurrent sell positions (leave off to use Max Open Trades)"
          />

          {/* Allow Hedging */}
          <div>
            <label
              className="flex items-center gap-2 cursor-pointer"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={settings.allowHedging}
                onChange={(e) => {
                  e.stopPropagation();
                  update({ allowHedging: e.target.checked });
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#4F46E5] focus:ring-[#4F46E5] focus:ring-offset-0"
              />
              <span className="text-xs font-medium text-[#CBD5E1]">Allow Hedging</span>
            </label>
            <p className="text-[10px] text-[#64748B] mt-1 ml-6">
              Allow buy and sell positions open at the same time. Note: some brokers (especially US
              brokers) enforce FIFO rules and do not support hedging.
            </p>
          </div>

          {/* Daily Profit Target */}
          <SettingsToggleNumberField
            label="Daily Profit Target (%)"
            value={settings.maxDailyProfitPercent ?? 0}
            min={0.5}
            max={100}
            step={0.5}
            onChange={(v) => update({ maxDailyProfitPercent: v })}
            hint="Stops trading for the day after reaching this profit"
          />

          {/* Daily Loss Limit */}
          <SettingsToggleNumberField
            label="Daily Loss Limit (%)"
            value={settings.maxDailyLossPercent ?? 0}
            min={0.5}
            max={100}
            step={0.5}
            onChange={(v) => update({ maxDailyLossPercent: v })}
            hint="Stops trading for the day after this loss (required by most prop firms)"
          />
          {(settings.maxDailyLossPercent ?? 0) > 0 &&
            (settings.maxTotalDrawdownPercent ?? 0) > 0 &&
            settings.maxDailyLossPercent! >= settings.maxTotalDrawdownPercent! && (
              <p className="text-[10px] text-[#FBBF24] mt-1 flex items-center gap-1">
                <svg
                  className="w-3 h-3 flex-shrink-0"
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
                Daily loss limit should be lower than total drawdown limit
              </p>
            )}

          {/* Advanced section */}
          <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAdvanced(!showAdvanced);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] uppercase tracking-wide hover:text-[#CBD5E1] transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Advanced
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                {/* Trade Comment */}
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">
                    Trade Comment
                  </label>
                  <input
                    type="text"
                    value={settings.comment ?? ""}
                    maxLength={31}
                    onChange={(e) => {
                      e.stopPropagation();
                      update({ comment: e.target.value });
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder="EA Builder Strategy"
                    className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1">
                    Shown in the MT5/MT4 trade journal for each order (max 31 chars)
                  </p>
                </div>

                {/* Max Slippage */}
                <SettingsNumberField
                  label="Max Slippage (points)"
                  value={settings.maxSlippage ?? 10}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(v) => update({ maxSlippage: v })}
                  hint="Maximum allowed slippage in points when opening/closing trades. 10 points = 1 pip on 5-digit brokers."
                />

                {/* Max Total Drawdown */}
                <SettingsToggleNumberField
                  label="Max Total Drawdown (%)"
                  value={settings.maxTotalDrawdownPercent ?? 0}
                  min={1}
                  max={50}
                  step={0.5}
                  onChange={(v) => update({ maxTotalDrawdownPercent: v || undefined })}
                  hint="Stops all trading when your account drops this much from its highest point"
                />

                {/* Cooldown After Loss */}
                <SettingsToggleNumberField
                  label="Cooldown After Loss (min)"
                  value={settings.cooldownAfterLossMinutes ?? 0}
                  min={1}
                  max={1440}
                  step={1}
                  onChange={(v) => update({ cooldownAfterLossMinutes: v || undefined })}
                  hint="Pauses the EA for X minutes after a losing trade to avoid revenge trading"
                />

                {/* Min Bars Between Trades */}
                <SettingsToggleNumberField
                  label="Min Bars Between Trades"
                  value={settings.minBarsBetweenTrades ?? 0}
                  min={1}
                  max={500}
                  step={1}
                  onChange={(v) => update({ minBarsBetweenTrades: v || undefined })}
                  hint="Waits X candles before taking another trade to prevent overtrading"
                />

                {/* Equity Target */}
                <SettingsToggleNumberField
                  label="Equity Target (%)"
                  value={settings.equityTargetPercent ?? 0}
                  min={1}
                  max={1000}
                  step={1}
                  onChange={(v) => update({ equityTargetPercent: v || undefined })}
                  hint="Stops trading when account equity grows by this % from starting balance"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Number field with an enable/disable toggle — replaces the confusing "0 = disabled" pattern */
function SettingsToggleNumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const isEnabled = value > 0;

  return (
    <div>
      <label
        className="flex items-center gap-2 cursor-pointer"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.target.checked ? min : 0);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#4F46E5] focus:ring-[#4F46E5] focus:ring-offset-0"
        />
        <span className={`text-xs font-medium ${isEnabled ? "text-[#CBD5E1]" : "text-[#64748B]"}`}>
          {label}
        </span>
      </label>
      {isEnabled && (
        <div className="mt-1.5 ml-6">
          <SettingsNumberField
            label=""
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={onChange}
          />
        </div>
      )}
      {hint && (
        <p
          className={`text-[10px] mt-1 ${isEnabled ? "text-[#64748B]" : "text-[#475569]"} ${isEnabled ? "" : "ml-6"}`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function SettingsNumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  // Sync local state when external value changes (e.g. from parent)
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const v = step % 1 === 0 ? parseInt(raw, 10) : parseFloat(raw);
    if (!isNaN(v)) {
      const clamped = Math.min(max, Math.max(min, v));
      onChange(clamped);
      setLocalValue(String(clamped));
    } else {
      setLocalValue(String(value));
    }
  };

  return (
    <div>
      {label && <label className="block text-xs font-medium text-[#CBD5E1] mb-1">{label}</label>}
      <input
        type="number"
        value={localValue}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          e.stopPropagation();
          setLocalValue(e.target.value);
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.value);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
      />
      {hint && <p className="text-[10px] text-[#64748B] mt-1">{hint}</p>}
    </div>
  );
}
