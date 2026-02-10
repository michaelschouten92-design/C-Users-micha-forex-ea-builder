"use client";

import { useState } from "react";
import type { BuildJsonSettings } from "@/types/builder";

interface StrategySettingsPanelProps {
  settings: BuildJsonSettings;
  onChange: (settings: BuildJsonSettings) => void;
}

export function StrategySettingsPanel({ settings, onChange }: StrategySettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const update = (partial: Partial<BuildJsonSettings>) => {
    onChange({ ...settings, ...partial });
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
          {/* Magic Number */}
          <SettingsNumberField
            label="Magic Number"
            value={settings.magicNumber}
            min={1}
            max={2147483647}
            step={1}
            onChange={(v) => update({ magicNumber: v })}
          />

          {/* Max Open Trades */}
          <SettingsNumberField
            label="Max Open Trades"
            value={settings.maxOpenTrades}
            min={1}
            max={100}
            step={1}
            onChange={(v) => update({ maxOpenTrades: v })}
          />

          {/* Max Trades Per Day */}
          <div>
            <SettingsNumberField
              label="Max Trades Per Day"
              value={settings.maxTradesPerDay ?? 0}
              min={0}
              max={100}
              step={1}
              onChange={(v) => update({ maxTradesPerDay: v })}
            />
            <p className="text-[10px] text-[#64748B] mt-1">0 = unlimited</p>
          </div>

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
              Allow both buy and sell positions at the same time
            </p>
          </div>

          {/* Max Spread Filter */}
          <div>
            <SettingsNumberField
              label="Max Spread (pips)"
              value={settings.maxSpreadPips ?? 0}
              min={0}
              max={100}
              step={1}
              onChange={(v) => update({ maxSpreadPips: v })}
            />
            <p className="text-[10px] text-[#64748B] mt-1">0 = no spread filter</p>
          </div>

          {/* Daily Profit Target */}
          <div>
            <SettingsNumberField
              label="Daily Profit Target (%)"
              value={settings.maxDailyProfitPercent ?? 0}
              min={0}
              max={100}
              step={0.5}
              onChange={(v) => update({ maxDailyProfitPercent: v })}
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              0 = disabled. Closes all trades when hit
            </p>
          </div>

          {/* Daily Loss Limit */}
          <div>
            <SettingsNumberField
              label="Daily Loss Limit (%)"
              value={settings.maxDailyLossPercent ?? 0}
              min={0}
              max={100}
              step={0.5}
              onChange={(v) => update({ maxDailyLossPercent: v })}
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              0 = disabled. Closes all trades when hit
            </p>
          </div>
        </div>
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
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
        onChange={(e) => {
          e.stopPropagation();
          const v = step % 1 === 0 ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
          if (!isNaN(v) && v >= min && v <= max) {
            onChange(v);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
      />
    </div>
  );
}
