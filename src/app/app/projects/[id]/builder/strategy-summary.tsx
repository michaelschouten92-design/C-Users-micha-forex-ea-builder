"use client";

import { useMemo, useState } from "react";
import type { BuilderNode, BuilderEdge } from "@/types/builder";

interface StrategySummaryProps {
  nodes: BuilderNode[];
  edges: BuilderEdge[];
}

interface SummaryLine {
  icon: string;
  text: string;
}

function buildTimingLines(nodes: BuilderNode[]): SummaryLine[] {
  const lines: SummaryLine[] = [];

  for (const n of nodes) {
    const d = n.data;

    if (n.type === "always") {
      lines.push({ icon: "clock", text: "Timing: Always active" });
    } else if (n.type === "trading-session" && "session" in d) {
      lines.push({ icon: "clock", text: `Timing: ${d.session} Session` });
    } else if (n.type === "custom-times") {
      lines.push({ icon: "clock", text: "Timing: Custom schedule" });
    }
  }

  return lines;
}

function buildIndicatorLines(nodes: BuilderNode[]): SummaryLine[] {
  const lines: SummaryLine[] = [];

  for (const n of nodes) {
    const d = n.data;
    if (!("indicatorType" in d)) continue;

    const tf = "timeframe" in d ? ` on ${d.timeframe}` : "";

    switch (d.indicatorType) {
      case "moving-average":
        lines.push({
          icon: "chart",
          text: `Signal: ${"method" in d ? d.method : "MA"}(${"period" in d ? d.period : ""})${tf}`,
        });
        break;
      case "rsi":
        lines.push({
          icon: "chart",
          text: `Signal: RSI(${"period" in d ? d.period : 14}) OB:${"overboughtLevel" in d ? d.overboughtLevel : 70} OS:${"oversoldLevel" in d ? d.oversoldLevel : 30}${tf}`,
        });
        break;
      case "macd":
        lines.push({ icon: "chart", text: `Signal: MACD crossover${tf}` });
        break;
      case "bollinger-bands":
        lines.push({
          icon: "chart",
          text: `Signal: Bollinger Bands(${"period" in d ? d.period : 20})${tf}`,
        });
        break;
      case "atr":
        lines.push({ icon: "chart", text: `Signal: ATR(${"period" in d ? d.period : 14})${tf}` });
        break;
      case "adx":
        lines.push({ icon: "chart", text: `Signal: ADX(${"period" in d ? d.period : 14})${tf}` });
        break;
      case "stochastic":
        lines.push({ icon: "chart", text: `Signal: Stochastic${tf}` });
        break;
      case "cci":
        lines.push({ icon: "chart", text: `Signal: CCI(${"period" in d ? d.period : 14})${tf}` });
        break;
      case "williams-r":
        lines.push({
          icon: "chart",
          text: `Signal: Williams %R(${"period" in d ? d.period : 14})${tf}`,
        });
        break;
      case "parabolic-sar":
        lines.push({ icon: "chart", text: `Signal: Parabolic SAR${tf}` });
        break;
      case "momentum":
        lines.push({
          icon: "chart",
          text: `Signal: Momentum(${"period" in d ? d.period : 14})${tf}`,
        });
        break;
      case "envelopes":
        lines.push({
          icon: "chart",
          text: `Signal: Envelopes(${"period" in d ? d.period : 14})${tf}`,
        });
        break;
    }
  }

  return lines;
}

function buildPriceActionLines(nodes: BuilderNode[]): SummaryLine[] {
  const lines: SummaryLine[] = [];

  for (const n of nodes) {
    const d = n.data;
    if (!("priceActionType" in d)) continue;

    switch (d.priceActionType) {
      case "candlestick-pattern":
        lines.push({ icon: "candle", text: "Signal: Candlestick pattern" });
        break;
      case "support-resistance":
        lines.push({ icon: "candle", text: "Signal: Support/Resistance levels" });
        break;
      case "range-breakout":
        lines.push({ icon: "candle", text: "Signal: Range breakout" });
        break;
    }
  }

  return lines;
}

function buildDirectionLines(nodes: BuilderNode[]): SummaryLine[] {
  const hasBuy = nodes.some((n) => n.type === "place-buy");
  const hasSell = nodes.some((n) => n.type === "place-sell");

  if (hasBuy && hasSell) {
    return [{ icon: "trade", text: "Direction: Buy & Sell" }];
  } else if (hasBuy) {
    return [{ icon: "trade", text: "Direction: Buy only" }];
  } else if (hasSell) {
    return [{ icon: "trade", text: "Direction: Sell only" }];
  }

  return [];
}

function buildStopLossLines(nodes: BuilderNode[]): SummaryLine[] {
  const lines: SummaryLine[] = [];

  for (const n of nodes) {
    if (n.type !== "stop-loss") continue;
    const d = n.data;
    if (!("method" in d)) continue;

    switch (d.method) {
      case "FIXED_PIPS":
        lines.push({
          icon: "shield",
          text: `Stop Loss: ${"fixedPips" in d ? d.fixedPips : 50} pips`,
        });
        break;
      case "ATR_BASED":
        lines.push({
          icon: "shield",
          text: `Stop Loss: ATR x ${"atrMultiplier" in d ? d.atrMultiplier : 1.5}`,
        });
        break;
      case "INDICATOR":
        lines.push({ icon: "shield", text: "Stop Loss: Indicator-based" });
        break;
    }
  }

  return lines;
}

function buildTakeProfitLines(nodes: BuilderNode[]): SummaryLine[] {
  const lines: SummaryLine[] = [];

  for (const n of nodes) {
    if (n.type !== "take-profit") continue;
    const d = n.data;
    if (!("method" in d)) continue;

    switch (d.method) {
      case "FIXED_PIPS":
        lines.push({
          icon: "target",
          text: `Take Profit: ${"fixedPips" in d ? d.fixedPips : 100} pips`,
        });
        break;
      case "RISK_REWARD":
        lines.push({
          icon: "target",
          text: `Take Profit: ${"riskRewardRatio" in d ? d.riskRewardRatio : 2}:1 R:R`,
        });
        break;
      case "ATR_BASED":
        lines.push({
          icon: "target",
          text: `Take Profit: ATR x ${"atrMultiplier" in d ? d.atrMultiplier : 3}`,
        });
        break;
    }
  }

  return lines;
}

function buildManagementLines(nodes: BuilderNode[]): SummaryLine[] {
  const lines: SummaryLine[] = [];

  for (const n of nodes) {
    const d = n.data;
    if (!("managementType" in d)) continue;

    switch (d.managementType) {
      case "breakeven-stop":
        lines.push({ icon: "gear", text: "Management: Breakeven stop" });
        break;
      case "trailing-stop":
        lines.push({
          icon: "gear",
          text: `Management: Trailing stop ${"trailPips" in d ? d.trailPips + " pips" : ""}`,
        });
        break;
      case "partial-close":
        lines.push({
          icon: "gear",
          text: `Management: Partial close ${"closePercent" in d ? d.closePercent + "%" : ""}`,
        });
        break;
      case "lock-profit":
        lines.push({ icon: "gear", text: "Management: Lock profit" });
        break;
    }
  }

  return lines;
}

function buildTimeExitLines(nodes: BuilderNode[]): SummaryLine[] {
  const lines: SummaryLine[] = [];

  for (const n of nodes) {
    if (n.type !== "time-exit") continue;
    const d = n.data;

    lines.push({
      icon: "clock",
      text: `Exit: After ${"exitAfterBars" in d ? d.exitAfterBars : "?"} bars (${"exitTimeframe" in d ? d.exitTimeframe : ""})`,
    });
  }

  return lines;
}

function buildSummary(nodes: BuilderNode[]): SummaryLine[] {
  return [
    ...buildTimingLines(nodes),
    ...buildIndicatorLines(nodes),
    ...buildPriceActionLines(nodes),
    ...buildDirectionLines(nodes),
    ...buildStopLossLines(nodes),
    ...buildTakeProfitLines(nodes),
    ...buildManagementLines(nodes),
    ...buildTimeExitLines(nodes),
  ];
}

export function StrategySummary({ nodes, edges }: StrategySummaryProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  const summary = useMemo(() => buildSummary(nodes), [nodes]);

  if (nodes.length === 0) return null;

  return (
    <div className="absolute top-14 left-4 z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-xs font-medium bg-[#1E293B]/90 backdrop-blur-sm text-[#94A3B8] hover:text-white border border-[rgba(79,70,229,0.3)] hover:border-[rgba(79,70,229,0.5)] rounded-lg transition-all duration-200"
      >
        {isOpen ? "Hide Summary" : "Strategy Summary"}
      </button>

      {isOpen && summary.length > 0 && (
        <div className="mt-2 w-[280px] bg-[#1A0626]/95 backdrop-blur-sm border border-[rgba(79,70,229,0.3)] rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <h4 className="text-xs font-semibold text-white mb-2">Strategy Overview</h4>
          <div className="space-y-1.5">
            {summary.map((line, i) => (
              <div key={i} className="text-xs text-[#94A3B8] leading-relaxed">
                {line.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {isOpen && summary.length === 0 && (
        <div className="mt-2 w-[280px] bg-[#1A0626]/95 backdrop-blur-sm border border-[rgba(79,70,229,0.3)] rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <p className="text-xs text-[#64748B]">Add blocks to see strategy summary</p>
        </div>
      )}
    </div>
  );
}
