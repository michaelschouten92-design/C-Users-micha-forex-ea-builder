"use client";

import { useState } from "react";

const POPULAR_PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "AUDUSD",
  "NZDUSD",
  "USDCAD",
  "EURGBP",
  "EURJPY",
  "GBPJPY",
  "XAUUSD",
  "BTCUSD",
];

export function MultiPairPanel() {
  const [enabled, setEnabled] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  function handleAddSymbol(symbol: string): void {
    const upper = symbol.toUpperCase().trim();
    if (upper.length >= 3 && !symbols.includes(upper)) {
      setSymbols([...symbols, upper]);
    }
    setInputValue("");
  }

  function handleRemoveSymbol(symbol: string): void {
    setSymbols(symbols.filter((s) => s !== symbol));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSymbol(inputValue);
    }
  }

  return (
    <div className="border border-[rgba(79,70,229,0.2)] rounded-lg p-4 bg-[#1A0626]/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">Multi-Pair Mode</h3>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30 font-medium">
            Coming Soon
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
            enabled ? "bg-[#4F46E5]" : "bg-[#334155]"
          }`}
          aria-label="Toggle multi-pair mode"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
              enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3 opacity-60 pointer-events-none" aria-disabled="true">
          <p className="text-xs text-[#7C8DB0]">
            Run this strategy across multiple currency pairs simultaneously. Available in a future
            update.
          </p>

          {/* Symbol Input */}
          <div>
            <label htmlFor="multi-pair-input" className="block text-xs text-[#94A3B8] mb-1">
              Add symbols
            </label>
            <input
              id="multi-pair-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., EURUSD"
              disabled
              className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(79,70,229,0.2)] rounded text-sm text-white placeholder-[#64748B] disabled:opacity-50"
            />
          </div>

          {/* Popular Pairs */}
          <div>
            <p className="text-xs text-[#7C8DB0] mb-1.5">Popular pairs:</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_PAIRS.map((pair) => (
                <button
                  key={pair}
                  type="button"
                  onClick={() => handleAddSymbol(pair)}
                  disabled
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    symbols.includes(pair)
                      ? "bg-[#4F46E5]/20 border-[#4F46E5]/50 text-[#A78BFA]"
                      : "bg-[rgba(79,70,229,0.1)] border-[rgba(79,70,229,0.2)] text-[#94A3B8]"
                  }`}
                >
                  {pair}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Symbols */}
          {symbols.length > 0 && (
            <div>
              <p className="text-xs text-[#94A3B8] mb-1.5">Selected ({symbols.length}):</p>
              <div className="flex flex-wrap gap-1.5">
                {symbols.map((symbol) => (
                  <span
                    key={symbol}
                    className="text-[10px] px-2 py-1 rounded bg-[#4F46E5]/20 border border-[#4F46E5]/50 text-[#A78BFA] flex items-center gap-1"
                  >
                    {symbol}
                    <button
                      type="button"
                      onClick={() => handleRemoveSymbol(symbol)}
                      disabled
                      className="text-[#A78BFA] hover:text-white"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Settings preview */}
          <div className="border-t border-[rgba(79,70,229,0.15)] pt-3 space-y-2">
            <label className="flex items-center gap-2 text-xs text-[#94A3B8]">
              <input
                type="checkbox"
                disabled
                checked
                className="rounded border-[rgba(79,70,229,0.3)]"
              />
              Correlation filter (avoid correlated entries)
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="max-total" className="text-xs text-[#94A3B8]">
                Max total positions:
              </label>
              <input
                id="max-total"
                type="number"
                value={5}
                disabled
                className="w-16 px-2 py-1 bg-[#1E293B] border border-[rgba(79,70,229,0.2)] rounded text-xs text-white disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-xs text-[#7C8DB0]">
          Enable to run your strategy on multiple currency pairs. This feature is under development.
        </p>
      )}
    </div>
  );
}
