"use client";

import { useMemo, useState } from "react";
import type { BuilderNode, BuilderEdge } from "@/types/builder";

interface StrategySummaryProps {
  nodes: BuilderNode[];
  edges: BuilderEdge[];
}

export function buildNaturalLanguageSummary(nodes: BuilderNode[]): string[] {
  const lines: string[] = [];

  // Timing
  let hasTimingNode = false;
  for (const n of nodes) {
    const d = n.data;
    if (n.type === "always") {
      lines.push("Trade at all times (24/5)");
      hasTimingNode = true;
    } else if (n.type === "trading-session" && "session" in d) {
      hasTimingNode = true;
      if (d.session === "CUSTOM") {
        const sh = "customStartHour" in d ? String(d.customStartHour).padStart(2, "0") : "08";
        const sm = "customStartMinute" in d ? String(d.customStartMinute).padStart(2, "0") : "00";
        const eh = "customEndHour" in d ? String(d.customEndHour).padStart(2, "0") : "17";
        const em = "customEndMinute" in d ? String(d.customEndMinute).padStart(2, "0") : "00";
        lines.push(`Trade during custom session (${sh}:${sm} - ${eh}:${em})`);
      } else {
        lines.push(`Trade during the ${d.session} session`);
      }
    } else if (n.type === "custom-times") {
      lines.push("Trade during custom time windows");
      hasTimingNode = true;
    } else if (n.type === "max-spread" && "maxSpreadPips" in d) {
      lines.push(`Max spread filter: ${d.maxSpreadPips} pips`);
    }
  }
  if (!hasTimingNode && nodes.length > 0) {
    lines.push("Trade at all times (no timing filter)");
  }

  // Entry strategy composite blocks
  for (const n of nodes) {
    const d = n.data;
    if (!("entryType" in d)) continue;

    // Direction
    const dir = "direction" in d ? d.direction : "BOTH";
    const dirLabel = dir === "BOTH" ? "" : dir === "BUY" ? " (long only)" : " (short only)";

    switch (d.entryType) {
      case "ema-crossover":
        if ("fastEma" in d && "slowEma" in d) {
          lines.push(`Enter on EMA(${d.fastEma})/EMA(${d.slowEma}) crossover${dirLabel}`);
        }
        break;
      case "range-breakout":
        if ("rangeMethod" in d && d.rangeMethod === "CUSTOM_TIME") {
          const sh = "customStartHour" in d ? String(d.customStartHour).padStart(2, "0") : "00";
          const sm = "customStartMinute" in d ? String(d.customStartMinute).padStart(2, "0") : "00";
          const eh = "customEndHour" in d ? String(d.customEndHour).padStart(2, "0") : "08";
          const em = "customEndMinute" in d ? String(d.customEndMinute).padStart(2, "0") : "00";
          lines.push(`Enter on ${sh}:${sm}-${eh}:${em} range breakout${dirLabel}`);
        } else if ("rangePeriod" in d) {
          const tf = "rangeTimeframe" in d ? ` (${d.rangeTimeframe})` : "";
          lines.push(`Enter on ${d.rangePeriod}-candle${tf} range breakout${dirLabel}`);
        }
        break;
      case "rsi-reversal":
        if ("rsiPeriod" in d && "oversoldLevel" in d && "overboughtLevel" in d) {
          lines.push(
            `Enter on RSI(${d.rsiPeriod}) reversal at ${d.oversoldLevel}/${d.overboughtLevel}${dirLabel}`
          );
        }
        break;
      case "trend-pullback":
        if ("trendEma" in d && "rsiPullbackLevel" in d) {
          lines.push(
            `Enter on pullback (EMA ${d.trendEma} trend, RSI dip to ${d.rsiPullbackLevel})${dirLabel}`
          );
        }
        break;
      case "macd-crossover":
        if ("macdFast" in d && "macdSlow" in d && "macdSignal" in d) {
          lines.push(
            `Enter on MACD(${d.macdFast},${d.macdSlow},${d.macdSignal}) crossover${dirLabel}`
          );
        }
        break;
    }

    // Consistent risk model summary
    if ("riskPercent" in d) {
      lines.push(`Risk ${d.riskPercent}% per trade`);
    }
    const slMethod = "slMethod" in d ? d.slMethod : "ATR";
    if (slMethod === "ATR" && "slAtrMultiplier" in d) {
      const atrPeriod = "slAtrPeriod" in d && d.slAtrPeriod ? d.slAtrPeriod : 14;
      lines.push(
        `Stop loss at ${d.slAtrMultiplier}× ATR (${atrPeriod}-bar average price movement)`
      );
    } else if (slMethod === "PIPS" && "slFixedPips" in d) {
      lines.push(`Stop loss at ${d.slFixedPips} pips`);
    } else if (slMethod === "PERCENT" && "slPercent" in d) {
      lines.push(`Stop loss at ${d.slPercent}%`);
    } else if (slMethod === "RANGE_OPPOSITE") {
      lines.push("Stop loss at range opposite");
    }
    // Take profit — single or multiple
    if (
      "multipleTP" in d &&
      d.multipleTP &&
      typeof d.multipleTP === "object" &&
      "enabled" in d.multipleTP &&
      d.multipleTP.enabled
    ) {
      const mtp = d.multipleTP as unknown as {
        tp1Percent: number;
        tp1RMultiple: number;
        tp2RMultiple: number;
      };
      lines.push(
        `Takes partial profit: ${mtp.tp1Percent}% at ${mtp.tp1RMultiple}:1 reward-to-risk, remainder at ${mtp.tp2RMultiple}:1 reward-to-risk`
      );
    } else if ("tpRMultiple" in d) {
      lines.push(`Take profit at ${d.tpRMultiple}:1 reward-to-risk`);
    }

    // Close on opposite signal
    if ("closeOnOpposite" in d && d.closeOnOpposite) {
      lines.push("Closes opposite positions when a new signal fires");
    }

    // Trailing stop from entry strategy
    if (
      "trailingStop" in d &&
      d.trailingStop &&
      typeof d.trailingStop === "object" &&
      "enabled" in d.trailingStop &&
      d.trailingStop.enabled
    ) {
      const ts = d.trailingStop as unknown as {
        method: string;
        atrMultiplier?: number;
        fixedPips?: number;
      };
      if (ts.method === "atr") {
        lines.push(`Trailing stop: ATR × ${ts.atrMultiplier ?? 2.0}`);
      } else {
        lines.push(`Trailing stop: ${ts.fixedPips ?? 30} pips`);
      }
    }

    // Volume confirmation (range breakout)
    if ("volumeConfirmation" in d && d.volumeConfirmation) {
      const period = "volumeConfirmationPeriod" in d ? d.volumeConfirmationPeriod : 20;
      lines.push(`Requires above-average tick volume (${period}-bar) for breakout confirmation`);
    }
  }

  // Indicators — build descriptive entry conditions
  const indicatorDescriptions: string[] = [];
  for (const n of nodes) {
    const d = n.data;
    if (!("indicatorType" in d)) continue;

    const tf = "timeframe" in d ? ` (${d.timeframe})` : "";

    switch (d.indicatorType) {
      case "moving-average": {
        const method = "method" in d ? d.method : "MA";
        const period = "period" in d ? d.period : "";
        indicatorDescriptions.push(`${method} ${period} crossover signal${tf}`);
        break;
      }
      case "rsi": {
        const period = "period" in d ? d.period : 14;
        const ob = "overboughtLevel" in d ? d.overboughtLevel : 70;
        const os = "oversoldLevel" in d ? d.oversoldLevel : 30;
        indicatorDescriptions.push(`RSI(${period}) crosses ${os}/${ob} levels${tf}`);
        break;
      }
      case "macd":
        indicatorDescriptions.push(`MACD signal line crossover${tf}`);
        break;
      case "bollinger-bands": {
        const period = "period" in d ? d.period : 20;
        indicatorDescriptions.push(`Bollinger Bands(${period}) breakout${tf}`);
        break;
      }
      case "atr": {
        const period = "period" in d ? d.period : 14;
        indicatorDescriptions.push(`ATR(${period}) volatility filter${tf}`);
        break;
      }
      case "adx": {
        const period = "period" in d ? d.period : 14;
        indicatorDescriptions.push(`ADX(${period}) trend strength filter${tf}`);
        break;
      }
      case "stochastic":
        indicatorDescriptions.push(`Stochastic oscillator crossover${tf}`);
        break;
      case "cci": {
        const period = "period" in d ? d.period : 14;
        indicatorDescriptions.push(`CCI(${period}) level crossover${tf}`);
        break;
      }
      case "ichimoku": {
        const tenkan = "tenkanPeriod" in d ? d.tenkanPeriod : 9;
        const kijun = "kijunPeriod" in d ? d.kijunPeriod : 26;
        indicatorDescriptions.push(
          `Ichimoku(${tenkan}/${kijun}) Tenkan/Kijun crossover + cloud${tf}`
        );
        break;
      }
    }
  }

  // Price action
  for (const n of nodes) {
    const d = n.data;
    if (!("priceActionType" in d)) continue;

    switch (d.priceActionType) {
      case "candlestick-pattern":
        indicatorDescriptions.push("Candlestick pattern detection");
        break;
      case "support-resistance":
        indicatorDescriptions.push("Support/Resistance level reaction");
        break;
      case "range-breakout":
        indicatorDescriptions.push("Range breakout entry");
        break;
    }
  }

  if (indicatorDescriptions.length === 1) {
    lines.push(`Enter when ${indicatorDescriptions[0]}`);
  } else if (indicatorDescriptions.length > 1) {
    lines.push(`Enter when ${indicatorDescriptions.join(" + ")}`);
  }

  // Direction
  const hasBuy = nodes.some((n) => n.type === "place-buy");
  const hasSell = nodes.some((n) => n.type === "place-sell");

  if (hasBuy && hasSell) {
    lines.push("Trade both long and short");
  } else if (hasBuy) {
    lines.push("Go long (buy only)");
  } else if (hasSell) {
    lines.push("Go short (sell only)");
  }

  // Position sizing from buy/sell data
  const sizingSource = nodes.find((n) => n.type === "place-buy" || n.type === "place-sell");
  if (sizingSource) {
    const d = sizingSource.data;
    if ("method" in d) {
      switch (d.method) {
        case "FIXED_LOT":
          if ("fixedLot" in d) lines.push(`Risk ${d.fixedLot} lots per trade`);
          break;
        case "RISK_PERCENT":
          if ("riskPercent" in d) lines.push(`Risk ${d.riskPercent}% of balance per trade`);
          break;
      }
    }
  }

  // Stop loss
  for (const n of nodes) {
    if (n.type !== "stop-loss") continue;
    const d = n.data;
    if (!("method" in d)) continue;

    switch (d.method) {
      case "FIXED_PIPS":
        lines.push(`Stop loss at ${"fixedPips" in d ? d.fixedPips : 50} pips`);
        break;
      case "ATR_BASED":
        lines.push(`ATR-based stop loss (${"atrMultiplier" in d ? d.atrMultiplier : 1.5}x)`);
        break;
      case "INDICATOR":
        lines.push("Indicator-based stop loss");
        break;
    }
  }

  // Take profit
  for (const n of nodes) {
    if (n.type !== "take-profit") continue;
    const d = n.data;
    if (!("method" in d)) continue;

    switch (d.method) {
      case "FIXED_PIPS":
        lines.push(`Take profit at ${"fixedPips" in d ? d.fixedPips : 100} pips`);
        break;
      case "RISK_REWARD":
        lines.push(`Close at ${"riskRewardRatio" in d ? d.riskRewardRatio : 2}:1 reward-to-risk`);
        break;
      case "ATR_BASED":
        lines.push(`ATR-based take profit (${"atrMultiplier" in d ? d.atrMultiplier : 3}x)`);
        break;
    }
  }

  // Trade management
  for (const n of nodes) {
    const d = n.data;
    if (!("managementType" in d)) continue;

    switch (d.managementType) {
      case "breakeven-stop":
        lines.push("Move stop to breakeven in profit");
        break;
      case "trailing-stop":
        lines.push(`Trail stop by ${"trailPips" in d ? d.trailPips + " pips" : "indicator"}`);
        break;
      case "partial-close":
        lines.push(`Partial close ${"closePercent" in d ? d.closePercent + "%" : ""} at target`);
        break;
      case "lock-profit":
        lines.push("Lock profit with progressive SL");
        break;
    }
  }

  // Close conditions
  for (const n of nodes) {
    if (n.type !== "close-condition") continue;
    lines.push("Close on opposite signal");
  }

  // Time exit
  for (const n of nodes) {
    if (n.type !== "time-exit") continue;
    const d = n.data;
    lines.push(
      `Exit after ${"exitAfterBars" in d ? d.exitAfterBars : "?"} bars (${"exitTimeframe" in d ? d.exitTimeframe : ""})`
    );
  }

  return lines;
}

export function StrategySummary({ nodes }: StrategySummaryProps): React.ReactNode {
  const [expanded, setExpanded] = useState(false);
  const lines = useMemo(() => buildNaturalLanguageSummary(nodes), [nodes]);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[rgba(79,70,229,0.05)] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <svg
            className="w-4 h-4 text-[#A78BFA]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Strategy Summary
          {lines.length > 0 && (
            <span className="text-[10px] font-medium text-[#64748B] bg-[rgba(100,116,139,0.2)] px-1.5 py-0.5 rounded">
              {lines.length}
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {nodes.length === 0 ? (
            <p className="text-xs text-[#64748B] leading-relaxed">
              Add blocks to the canvas to see a live summary of your strategy.
            </p>
          ) : lines.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-[#94A3B8] mb-2">This strategy will:</p>
              <ul className="space-y-1.5">
                {lines.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-[#CBD5E1] leading-relaxed"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-[#22D3EE] flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-[#64748B] leading-relaxed">
              Connect your blocks to see the strategy description.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
