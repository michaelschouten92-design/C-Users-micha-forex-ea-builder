"use client";

// ============================================
// STATIC FOREX CORRELATION DATA
// ============================================

const FOREX_CORRELATIONS: Record<string, Record<string, number>> = {
  EURUSD: {
    GBPUSD: 0.87,
    USDCHF: -0.93,
    USDJPY: -0.23,
    AUDUSD: 0.75,
    NZDUSD: 0.72,
    USDCAD: -0.55,
    EURJPY: 0.45,
    EURGBP: 0.32,
    GBPJPY: 0.35,
    AUDNZD: 0.12,
  },
  GBPUSD: {
    EURUSD: 0.87,
    USDCHF: -0.82,
    USDJPY: -0.15,
    AUDUSD: 0.71,
    NZDUSD: 0.65,
    USDCAD: -0.48,
    EURJPY: 0.38,
    EURGBP: -0.42,
    GBPJPY: 0.62,
    AUDNZD: 0.08,
  },
  USDCHF: {
    EURUSD: -0.93,
    GBPUSD: -0.82,
    USDJPY: 0.28,
    AUDUSD: -0.71,
    NZDUSD: -0.68,
    USDCAD: 0.52,
    EURJPY: -0.38,
    EURGBP: -0.25,
    GBPJPY: -0.3,
    AUDNZD: -0.1,
  },
  USDJPY: {
    EURUSD: -0.23,
    GBPUSD: -0.15,
    USDCHF: 0.28,
    AUDUSD: -0.05,
    NZDUSD: -0.08,
    USDCAD: 0.32,
    EURJPY: 0.72,
    EURGBP: -0.12,
    GBPJPY: 0.78,
    AUDNZD: 0.04,
  },
  AUDUSD: {
    EURUSD: 0.75,
    GBPUSD: 0.71,
    USDCHF: -0.71,
    USDJPY: -0.05,
    NZDUSD: 0.91,
    USDCAD: -0.58,
    EURJPY: 0.32,
    EURGBP: 0.18,
    GBPJPY: 0.28,
    AUDNZD: 0.45,
  },
  NZDUSD: {
    EURUSD: 0.72,
    GBPUSD: 0.65,
    USDCHF: -0.68,
    USDJPY: -0.08,
    AUDUSD: 0.91,
    USDCAD: -0.52,
    EURJPY: 0.28,
    EURGBP: 0.15,
    GBPJPY: 0.25,
    AUDNZD: -0.38,
  },
  USDCAD: {
    EURUSD: -0.55,
    GBPUSD: -0.48,
    USDCHF: 0.52,
    USDJPY: 0.32,
    AUDUSD: -0.58,
    NZDUSD: -0.52,
    EURJPY: -0.18,
    EURGBP: -0.1,
    GBPJPY: -0.15,
    AUDNZD: -0.22,
  },
  EURJPY: {
    EURUSD: 0.45,
    GBPUSD: 0.38,
    USDCHF: -0.38,
    USDJPY: 0.72,
    AUDUSD: 0.32,
    NZDUSD: 0.28,
    USDCAD: -0.18,
    EURGBP: 0.28,
    GBPJPY: 0.88,
    AUDNZD: 0.08,
  },
  EURGBP: {
    EURUSD: 0.32,
    GBPUSD: -0.42,
    USDCHF: -0.25,
    USDJPY: -0.12,
    AUDUSD: 0.18,
    NZDUSD: 0.15,
    USDCAD: -0.1,
    EURJPY: 0.28,
    GBPJPY: -0.08,
    AUDNZD: 0.06,
  },
  GBPJPY: {
    EURUSD: 0.35,
    GBPUSD: 0.62,
    USDCHF: -0.3,
    USDJPY: 0.78,
    AUDUSD: 0.28,
    NZDUSD: 0.25,
    USDCAD: -0.15,
    EURJPY: 0.88,
    EURGBP: -0.08,
    AUDNZD: 0.05,
  },
  AUDNZD: {
    EURUSD: 0.12,
    GBPUSD: 0.08,
    USDCHF: -0.1,
    USDJPY: 0.04,
    AUDUSD: 0.45,
    NZDUSD: -0.38,
    USDCAD: -0.22,
    EURJPY: 0.08,
    EURGBP: 0.06,
    GBPJPY: 0.05,
  },
};

// ============================================
// HELPER
// ============================================

function getCorrelation(sym1: string, sym2: string): number | null {
  if (sym1 === sym2) return 1.0;
  const normalized1 = sym1.toUpperCase().replace(/[^A-Z]/g, "");
  const normalized2 = sym2.toUpperCase().replace(/[^A-Z]/g, "");

  if (normalized1 === normalized2) return 1.0;
  return FOREX_CORRELATIONS[normalized1]?.[normalized2] ?? null;
}

function correlationColor(value: number | null): string {
  if (value === null) return "rgba(79,70,229,0.1)";
  if (value === 1.0) return "rgba(79,70,229,0.3)";

  const absVal = Math.abs(value);

  // High correlation (absolute) = red/orange, low = green
  if (absVal >= 0.8) return "rgba(239,68,68,0.5)";
  if (absVal >= 0.6) return "rgba(245,158,11,0.4)";
  if (absVal >= 0.4) return "rgba(251,191,36,0.3)";
  if (absVal >= 0.2) return "rgba(34,211,238,0.25)";
  return "rgba(16,185,129,0.35)";
}

function correlationTextColor(value: number | null): string {
  if (value === null) return "#64748B";
  if (value === 1.0) return "#A78BFA";

  const absVal = Math.abs(value);

  if (absVal >= 0.8) return "#EF4444";
  if (absVal >= 0.6) return "#F59E0B";
  if (absVal >= 0.4) return "#FBBF24";
  if (absVal >= 0.2) return "#22D3EE";
  return "#10B981";
}

// ============================================
// COMPONENT
// ============================================

interface PortfolioHeatmapProps {
  symbols: string[];
  /** Optional: per-instance trade profit arrays keyed by symbol for live correlation calculation */
  tradeDataBySymbol?: Record<string, number[]>;
}

function computeLiveCorrelation(profits1: number[], profits2: number[]): number | null {
  const n = Math.min(profits1.length, profits2.length);
  if (n < 10) return null; // Need sufficient data

  const arr1 = profits1.slice(0, n);
  const arr2 = profits2.slice(0, n);

  const mean1 = arr1.reduce((a, b) => a + b, 0) / n;
  const mean2 = arr2.reduce((a, b) => a + b, 0) / n;

  let cov = 0;
  let var1 = 0;
  let var2 = 0;

  for (let i = 0; i < n; i++) {
    const d1 = arr1[i] - mean1;
    const d2 = arr2[i] - mean2;
    cov += d1 * d2;
    var1 += d1 * d1;
    var2 += d2 * d2;
  }

  const denom = Math.sqrt(var1 * var2);
  if (denom === 0) return null;
  return cov / denom;
}

export function PortfolioHeatmap({ symbols, tradeDataBySymbol }: PortfolioHeatmapProps) {
  const uniqueSymbols = [...new Set(symbols.map((s) => s.toUpperCase().replace(/[^A-Z]/g, "")))];

  if (uniqueSymbols.length < 2) return null;

  const hasLiveData = tradeDataBySymbol && Object.keys(tradeDataBySymbol).length >= 2;
  const cellSize = Math.max(48, Math.min(72, 500 / uniqueSymbols.length));

  // Determine correlation source
  function getEffectiveCorrelation(sym1: string, sym2: string): number | null {
    if (hasLiveData && tradeDataBySymbol) {
      const data1 = tradeDataBySymbol[sym1];
      const data2 = tradeDataBySymbol[sym2];
      if (data1 && data2) {
        const liveCorr = computeLiveCorrelation(data1, data2);
        if (liveCorr !== null) return liveCorr;
      }
    }
    return getCorrelation(sym1, sym2);
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-1">Portfolio Correlation</h3>
      {hasLiveData ? (
        <p className="text-xs text-[#10B981] mb-4">
          Correlations calculated from your actual trade P&L data where available, with historical
          averages as fallback.
        </p>
      ) : (
        <div className="mb-4">
          <p className="text-xs text-[#7C8DB0] mb-1">
            Correlations are approximate, based on historical averages for major forex pairs.
          </p>
          <p className="text-xs text-[#F59E0B]">
            For live correlation data, connect your MT5 terminal or accumulate trade history across
            multiple symbols. You can also use MT5&apos;s built-in correlation indicator for
            real-time values.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex" style={{ marginLeft: cellSize + 8 }}>
            {uniqueSymbols.map((sym) => (
              <div
                key={sym}
                className="text-[10px] text-[#7C8DB0] text-center font-medium"
                style={{ width: cellSize }}
              >
                {sym}
              </div>
            ))}
          </div>

          {/* Rows */}
          {uniqueSymbols.map((rowSym) => (
            <div key={rowSym} className="flex items-center">
              <div
                className="text-[10px] text-[#7C8DB0] text-right pr-2 font-medium shrink-0"
                style={{ width: cellSize + 8 }}
              >
                {rowSym}
              </div>
              {uniqueSymbols.map((colSym) => {
                const corr = getEffectiveCorrelation(rowSym, colSym);
                const bg = correlationColor(corr);
                const textColor = correlationTextColor(corr);

                return (
                  <div
                    key={`${rowSym}-${colSym}`}
                    className="flex items-center justify-center border border-[rgba(0,0,0,0.15)] rounded-sm"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bg,
                    }}
                    title={`${rowSym} / ${colSym}: ${corr !== null ? corr.toFixed(2) : "N/A"}`}
                  >
                    <span className="text-[11px] font-semibold" style={{ color: textColor }}>
                      {corr !== null ? corr.toFixed(2) : "--"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-[rgba(79,70,229,0.1)]">
        <span className="text-[10px] text-[#7C8DB0] font-medium">Correlation strength:</span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: "rgba(16,185,129,0.35)" }}
          />
          <span className="text-[10px] text-[#10B981]">Low (0.0-0.2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: "rgba(34,211,238,0.25)" }}
          />
          <span className="text-[10px] text-[#22D3EE]">Moderate (0.2-0.4)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: "rgba(251,191,36,0.3)" }}
          />
          <span className="text-[10px] text-[#FBBF24]">Significant (0.4-0.6)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: "rgba(245,158,11,0.4)" }}
          />
          <span className="text-[10px] text-[#F59E0B]">High (0.6-0.8)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(239,68,68,0.5)" }} />
          <span className="text-[10px] text-[#EF4444]">Very High (0.8+)</span>
        </div>
      </div>

      <p className="text-[10px] text-[#64748B] mt-2">
        {hasLiveData
          ? "Values from your trade data are shown where sufficient history exists (10+ trades per pair). Others use historical averages."
          : "Note: These are static historical averages. Actual correlations vary with market conditions."}{" "}
        High absolute correlation means overlapping risk exposure.
      </p>
    </div>
  );
}
