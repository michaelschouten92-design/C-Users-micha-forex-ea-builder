"use client";

import { useState, useEffect } from "react";
import type { BuildJsonSettings, MultiPairSettings } from "@/types/builder";
import { PROP_FIRM_PRESETS, DEFAULT_MULTI_PAIR } from "@/types/builder";

const COMMON_FOREX_PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "AUDUSD",
  "NZDUSD",
  "USDCAD",
  "EURJPY",
  "GBPJPY",
  "EURGBP",
];

interface StrategySettingsPanelProps {
  settings: BuildJsonSettings;
  onChange: (settings: BuildJsonSettings) => void;
}

export function StrategySettingsPanel({ settings, onChange }: StrategySettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMultiPair, setShowMultiPair] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [newSymbol, setNewSymbol] = useState("");

  const update = (partial: Partial<BuildJsonSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const mp = settings.multiPair ?? DEFAULT_MULTI_PAIR;
  const updateMultiPair = (partial: Partial<MultiPairSettings>) => {
    update({ multiPair: { ...mp, ...partial } });
  };

  const addSymbol = (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s || mp.symbols.includes(s) || mp.symbols.length >= 10) return;
    updateMultiPair({ symbols: [...mp.symbols, s] });
  };

  const removeSymbol = (sym: string) => {
    updateMultiPair({
      symbols: mp.symbols.filter((s) => s !== sym),
      perSymbolOverrides: mp.perSymbolOverrides.filter((o) => o.symbol !== sym),
    });
  };

  const applyPreset = (presetName: string) => {
    const preset = PROP_FIRM_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    setPendingPreset(presetName);
  };

  const confirmPreset = () => {
    if (!pendingPreset) return;
    const preset = PROP_FIRM_PRESETS.find((p) => p.name === pendingPreset);
    if (!preset) return;
    update({
      maxDailyLossPercent: preset.dailyLossPercent,
      maxTotalDrawdownPercent: preset.totalDrawdownPercent,
      maxOpenTrades: preset.maxOpenTrades,
      equityTargetPercent: preset.equityTargetPercent,
    });
    setPendingPreset(null);
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
            <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
              Prop firm presets
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PROP_FIRM_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyPreset(p.name);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="px-2 py-1 text-[10px] font-medium rounded-full border border-[rgba(79,70,229,0.3)] bg-[rgba(79,70,229,0.1)] text-[#A78BFA] hover:bg-[rgba(79,70,229,0.25)] hover:text-white transition-colors"
                  title={`${p.name}: ${p.dailyLossPercent}% daily loss, ${p.totalDrawdownPercent}% max DD, ${p.maxOpenTrades} max trades${p.equityTargetPercent ? `, ${p.equityTargetPercent}% equity target` : ""}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {pendingPreset && (
              <div className="mt-2 p-2.5 bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)] rounded-lg">
                <p className="text-xs text-[#FBBF24] mb-2">
                  Apply &ldquo;{pendingPreset}&rdquo; preset? This will overwrite your current risk
                  settings (max drawdown, daily loss limit, max open trades).
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingPreset(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex-1 px-2 py-1 text-xs text-[#CBD5E1] hover:text-white bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmPreset();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex-1 px-2 py-1 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] rounded transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
            <p className="text-[10px] text-[#7C8DB0] mt-1">
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
            <p className="text-[10px] text-[#7C8DB0] mt-1 ml-6">
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
                  <p className="text-[10px] text-[#7C8DB0] mt-1">
                    Shown in the MT5 trade journal for each order (max 31 chars)
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

          {/* Multi-Pair section */}
          <div className="border-t border-[rgba(79,70,229,0.2)] pt-3 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMultiPair(!showMultiPair);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] uppercase tracking-wide hover:text-[#CBD5E1] transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${showMultiPair ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Multi-Pair
              {mp.enabled && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30">
                  ON
                </span>
              )}
            </button>

            {showMultiPair && (
              <div className="mt-3 space-y-3">
                {/* Enable toggle */}
                <div>
                  <label
                    className="flex items-center gap-2 cursor-pointer"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={mp.enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateMultiPair({ enabled: e.target.checked });
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#4F46E5] focus:ring-[#4F46E5] focus:ring-offset-0"
                    />
                    <span className="text-xs font-medium text-[#CBD5E1]">
                      Enable Multi-Pair Trading
                    </span>
                  </label>
                  <p className="text-[10px] text-[#7C8DB0] mt-1 ml-6">
                    Trade the same strategy across multiple currency pairs from one EA
                  </p>
                </div>

                {mp.enabled && (
                  <div className="space-y-3 pl-1">
                    {/* Symbol picker */}
                    <div>
                      <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                        Trading Symbols ({mp.symbols.length}/10)
                      </label>
                      {/* Quick-add common pairs */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {COMMON_FOREX_PAIRS.filter((p) => !mp.symbols.includes(p)).map((pair) => (
                          <button
                            key={pair}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addSymbol(pair);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            disabled={mp.symbols.length >= 10}
                            className="px-1.5 py-0.5 text-[9px] font-medium rounded border border-[rgba(79,70,229,0.2)] bg-[rgba(79,70,229,0.05)] text-[#94A3B8] hover:bg-[rgba(79,70,229,0.15)] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            + {pair}
                          </button>
                        ))}
                      </div>
                      {/* Active symbols */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {mp.symbols.map((sym) => (
                          <span
                            key={sym}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-full bg-[#4F46E5]/20 text-[#A78BFA] border border-[#4F46E5]/40"
                          >
                            {sym}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSymbol(sym);
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="ml-0.5 text-[#A78BFA]/60 hover:text-red-400 transition-colors"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Custom symbol input */}
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newSymbol}
                          onChange={(e) => {
                            e.stopPropagation();
                            setNewSymbol(e.target.value.toUpperCase());
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              addSymbol(newSymbol);
                              setNewSymbol("");
                            }
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          placeholder="Custom symbol..."
                          maxLength={12}
                          className="flex-1 px-2 py-1.5 text-xs bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#475569] focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addSymbol(newSymbol);
                            setNewSymbol("");
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          disabled={!newSymbol.trim() || mp.symbols.length >= 10}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#6366F1] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Position Limits */}
                    <SettingsNumberField
                      label="Max Positions Per Pair"
                      value={mp.maxPositionsPerPair}
                      min={1}
                      max={20}
                      step={1}
                      onChange={(v) => updateMultiPair({ maxPositionsPerPair: v })}
                      hint="Maximum concurrent positions allowed per symbol"
                    />

                    <SettingsNumberField
                      label="Max Total Positions"
                      value={mp.maxTotalPositions}
                      min={1}
                      max={100}
                      step={1}
                      onChange={(v) => updateMultiPair({ maxTotalPositions: v })}
                      hint="Maximum concurrent positions across all symbols combined"
                    />

                    {/* Per-Symbol Overrides */}
                    {mp.symbols.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                          Per-Symbol Overrides
                        </label>
                        <p className="text-[10px] text-[#7C8DB0] mb-2">
                          Customize lot size, risk%, indicator periods, or spread per pair
                        </p>
                        <div className="space-y-1.5">
                          {mp.symbols.map((sym) => {
                            const override = mp.perSymbolOverrides.find((o) => o.symbol === sym);
                            const isOverridden = !!override;
                            return (
                              <div
                                key={sym}
                                className="rounded-lg border border-[rgba(79,70,229,0.15)] bg-[rgba(79,70,229,0.03)]"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isOverridden) {
                                      updateMultiPair({
                                        perSymbolOverrides: mp.perSymbolOverrides.filter(
                                          (o) => o.symbol !== sym
                                        ),
                                      });
                                    } else {
                                      updateMultiPair({
                                        perSymbolOverrides: [
                                          ...mp.perSymbolOverrides,
                                          { symbol: sym, enabled: true },
                                        ],
                                      });
                                    }
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px]"
                                >
                                  <span
                                    className={`font-medium ${isOverridden ? "text-[#A78BFA]" : "text-[#7C8DB0]"}`}
                                  >
                                    {sym}
                                  </span>
                                  <span className="text-[#475569]">
                                    {isOverridden ? "Customized" : "Default"}
                                  </span>
                                </button>
                                {isOverridden && override && (
                                  <div className="px-2.5 pb-2 space-y-1.5">
                                    <div className="flex gap-2">
                                      <div className="flex-1">
                                        <label className="block text-[9px] text-[#7C8DB0] mb-0.5">
                                          Lot Size
                                        </label>
                                        <input
                                          type="number"
                                          value={override.lotSizeOverride ?? ""}
                                          min={0.01}
                                          max={100}
                                          step={0.01}
                                          placeholder="Default"
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const val = parseFloat(e.target.value);
                                            updateMultiPair({
                                              perSymbolOverrides: mp.perSymbolOverrides.map((o) =>
                                                o.symbol === sym
                                                  ? {
                                                      ...o,
                                                      lotSizeOverride: isNaN(val) ? undefined : val,
                                                    }
                                                  : o
                                              ),
                                            });
                                          }}
                                          onPointerDown={(e) => e.stopPropagation()}
                                          className="w-full px-2 py-1 text-[10px] bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded text-white focus:ring-1 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="block text-[9px] text-[#7C8DB0] mb-0.5">
                                          Risk %
                                        </label>
                                        <input
                                          type="number"
                                          value={override.riskPercentOverride ?? ""}
                                          min={0.1}
                                          max={100}
                                          step={0.1}
                                          placeholder="Default"
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const val = parseFloat(e.target.value);
                                            updateMultiPair({
                                              perSymbolOverrides: mp.perSymbolOverrides.map((o) =>
                                                o.symbol === sym
                                                  ? {
                                                      ...o,
                                                      riskPercentOverride: isNaN(val)
                                                        ? undefined
                                                        : val,
                                                    }
                                                  : o
                                              ),
                                            });
                                          }}
                                          onPointerDown={(e) => e.stopPropagation()}
                                          className="w-full px-2 py-1 text-[10px] bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded text-white focus:ring-1 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                      <div className="flex-1">
                                        <label className="block text-[9px] text-[#7C8DB0] mb-0.5">
                                          EMA Period
                                        </label>
                                        <input
                                          type="number"
                                          value={override.emaPeriodOverride ?? ""}
                                          min={2}
                                          max={500}
                                          step={1}
                                          placeholder="Default"
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const val = parseInt(e.target.value, 10);
                                            updateMultiPair({
                                              perSymbolOverrides: mp.perSymbolOverrides.map((o) =>
                                                o.symbol === sym
                                                  ? {
                                                      ...o,
                                                      emaPeriodOverride: isNaN(val)
                                                        ? undefined
                                                        : val,
                                                    }
                                                  : o
                                              ),
                                            });
                                          }}
                                          onPointerDown={(e) => e.stopPropagation()}
                                          className="w-full px-2 py-1 text-[10px] bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded text-white focus:ring-1 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="block text-[9px] text-[#7C8DB0] mb-0.5">
                                          RSI Period
                                        </label>
                                        <input
                                          type="number"
                                          value={override.rsiPeriodOverride ?? ""}
                                          min={2}
                                          max={500}
                                          step={1}
                                          placeholder="Default"
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const val = parseInt(e.target.value, 10);
                                            updateMultiPair({
                                              perSymbolOverrides: mp.perSymbolOverrides.map((o) =>
                                                o.symbol === sym
                                                  ? {
                                                      ...o,
                                                      rsiPeriodOverride: isNaN(val)
                                                        ? undefined
                                                        : val,
                                                    }
                                                  : o
                                              ),
                                            });
                                          }}
                                          onPointerDown={(e) => e.stopPropagation()}
                                          className="w-full px-2 py-1 text-[10px] bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded text-white focus:ring-1 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="block text-[9px] text-[#7C8DB0] mb-0.5">
                                          Max Spread
                                        </label>
                                        <input
                                          type="number"
                                          value={override.spreadOverride ?? ""}
                                          min={0}
                                          max={500}
                                          step={1}
                                          placeholder="Default"
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const val = parseInt(e.target.value, 10);
                                            updateMultiPair({
                                              perSymbolOverrides: mp.perSymbolOverrides.map((o) =>
                                                o.symbol === sym
                                                  ? {
                                                      ...o,
                                                      spreadOverride: isNaN(val) ? undefined : val,
                                                    }
                                                  : o
                                              ),
                                            });
                                          }}
                                          onPointerDown={(e) => e.stopPropagation()}
                                          className="w-full px-2 py-1 text-[10px] bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded text-white focus:ring-1 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Correlation Filter */}
                    <div>
                      <label
                        className="flex items-center gap-2 cursor-pointer"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={mp.correlationFilter}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateMultiPair({ correlationFilter: e.target.checked });
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-[rgba(79,70,229,0.3)] bg-[#1E293B] text-[#4F46E5] focus:ring-[#4F46E5] focus:ring-offset-0"
                        />
                        <span className="text-xs font-medium text-[#CBD5E1]">
                          Correlation Filter
                        </span>
                      </label>
                      <p className="text-[10px] text-[#7C8DB0] mt-1 ml-6">
                        Skip entries when two pairs are highly correlated to reduce exposure
                      </p>
                    </div>
                    {mp.correlationFilter && (
                      <div className="pl-6 space-y-2">
                        <div>
                          <label className="block text-[10px] text-[#7C8DB0] mb-0.5">
                            Threshold: {mp.correlationThreshold.toFixed(2)}
                          </label>
                          <input
                            type="range"
                            min={0.5}
                            max={0.99}
                            step={0.01}
                            value={mp.correlationThreshold}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateMultiPair({ correlationThreshold: parseFloat(e.target.value) });
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full h-1.5 rounded-lg appearance-none bg-[#1E293B] accent-[#4F46E5]"
                          />
                        </div>
                        <SettingsNumberField
                          label="Lookback Period (bars)"
                          value={mp.correlationPeriod}
                          min={10}
                          max={500}
                          step={10}
                          onChange={(v) => updateMultiPair({ correlationPeriod: v })}
                        />
                      </div>
                    )}
                  </div>
                )}
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
        <span className={`text-xs font-medium ${isEnabled ? "text-[#CBD5E1]" : "text-[#7C8DB0]"}`}>
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
          className={`text-[10px] mt-1 ${isEnabled ? "text-[#7C8DB0]" : "text-[#475569]"} ${isEnabled ? "" : "ml-6"}`}
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
      {hint && <p className="text-[10px] text-[#7C8DB0] mt-1">{hint}</p>}
    </div>
  );
}
