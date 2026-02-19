import type { BuildJsonSchema, BuilderNode, BuilderEdge, Timeframe } from "@/types/builder";
import { generateMagicNumber } from "@/types/builder";

// ============================================
// RULE-BASED STRATEGY PARSER
// ============================================

interface ParsedTimeframe {
  timeframe: Timeframe;
  label: string;
}

interface ParsedPeriods {
  fast: number;
  slow: number;
}

const TIMEFRAME_MAP: Record<string, Timeframe> = {
  m1: "M1",
  m5: "M5",
  m15: "M15",
  m30: "M30",
  h1: "H1",
  h4: "H4",
  d1: "D1",
  w1: "W1",
};

const DEFAULT_TRADING_DAYS = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

/** Parse a timeframe token from the user description. */
function parseTimeframe(lower: string): ParsedTimeframe {
  const match = lower.match(/\b(m1|m5|m15|m30|h1|h4|d1|w1)\b/i);
  if (match) {
    const key = match[1].toLowerCase();
    const tf = TIMEFRAME_MAP[key];
    if (tf) {
      return { timeframe: tf, label: tf };
    }
  }
  return { timeframe: "H1", label: "H1" };
}

/** Parse period numbers from text like "50/200", "50 200", "20 and 50 ema". */
function parsePeriods(lower: string): ParsedPeriods {
  const periodMatch = lower.match(/(\d{1,4})\s*[/,&and\s]+\s*(\d{1,4})/);
  if (periodMatch) {
    const a = parseInt(periodMatch[1], 10);
    const b = parseInt(periodMatch[2], 10);
    const fast = Math.min(a, b);
    const slow = Math.max(a, b);
    if (fast >= 1 && fast <= 1000 && slow >= 1 && slow <= 1000 && fast !== slow) {
      return { fast, slow };
    }
  }
  return { fast: 50, slow: 200 };
}

/** Parse an RSI period from text like "rsi 21" or "rsi(7)". */
function parseRsiPeriod(lower: string): number {
  const match = lower.match(/rsi\s*\(?(\d{1,3})\)?/);
  if (match) {
    const period = parseInt(match[1], 10);
    if (period >= 2 && period <= 500) {
      return period;
    }
  }
  return 14;
}

/** Generate a BuildJsonSchema from a natural-language strategy description. */
export function generateStrategy(description: string): BuildJsonSchema {
  const lower = description.toLowerCase();
  const nodes: BuilderNode[] = [];
  const edges: BuilderEdge[] = [];

  let nodeIndex = 0;
  let yPosition = 0;
  const X_CENTER = 300;
  const Y_STEP = 180;

  function addNode(id: string, type: string, data: Record<string, unknown>): string {
    const nodeId = `ai_${id}_${nodeIndex++}`;
    nodes.push({
      id: nodeId,
      type: type as BuilderNode["type"],
      position: { x: X_CENTER, y: yPosition },
      data: data as BuilderNode["data"],
    });
    yPosition += Y_STEP;
    return nodeId;
  }

  function addEdge(source: string, target: string): void {
    edges.push({
      id: `e_${source}_${target}`,
      source,
      target,
    });
  }

  // --- Detect timing / session ---
  let timingNodeId: string;

  if (lower.includes("london") && (lower.includes("new york") || lower.includes("ny"))) {
    timingNodeId = addNode("timing", "trading-session", {
      label: "London/NY Overlap",
      category: "timing",
      timingType: "trading-session",
      session: "LONDON_NY_OVERLAP",
      tradingDays: DEFAULT_TRADING_DAYS,
    });
  } else if (lower.includes("london")) {
    timingNodeId = addNode("timing", "trading-session", {
      label: "London Session",
      category: "timing",
      timingType: "trading-session",
      session: "LONDON",
      tradingDays: DEFAULT_TRADING_DAYS,
    });
  } else if (lower.includes("new york") || lower.includes("ny session")) {
    timingNodeId = addNode("timing", "trading-session", {
      label: "New York Session",
      category: "timing",
      timingType: "trading-session",
      session: "NEW_YORK",
      tradingDays: DEFAULT_TRADING_DAYS,
    });
  } else if (lower.includes("tokyo") || lower.includes("asian")) {
    timingNodeId = addNode("timing", "trading-session", {
      label: "Tokyo Session",
      category: "timing",
      timingType: "trading-session",
      session: "TOKYO",
      tradingDays: DEFAULT_TRADING_DAYS,
    });
  } else if (lower.includes("sydney")) {
    timingNodeId = addNode("timing", "trading-session", {
      label: "Sydney Session",
      category: "timing",
      timingType: "trading-session",
      session: "SYDNEY",
      tradingDays: DEFAULT_TRADING_DAYS,
    });
  } else {
    timingNodeId = addNode("timing", "trading-session", {
      label: "London Session",
      category: "timing",
      timingType: "trading-session",
      session: "LONDON",
      tradingDays: DEFAULT_TRADING_DAYS,
    });
  }

  // --- Detect timeframe ---
  const { timeframe } = parseTimeframe(lower);

  // --- Detect entry strategy type ---
  // Use entry strategy composite nodes (same as strategy-presets) for best codegen compatibility.

  const usesEma =
    lower.includes("ema") || lower.includes("moving average") || lower.includes("ma crossover");
  const usesRsiReversal =
    lower.includes("rsi") &&
    (lower.includes("reversal") ||
      lower.includes("mean reversion") ||
      lower.includes("overbought") ||
      lower.includes("oversold"));
  const usesMacd = lower.includes("macd");
  const usesBreakout = lower.includes("breakout") || lower.includes("range");
  const usesDivergence = lower.includes("divergence");
  const usesTrendPullback =
    lower.includes("pullback") || lower.includes("pull back") || lower.includes("dip buy");

  // Determine SL method and TP multiplier
  const usesAtrStop = lower.includes("atr");
  const slMethod = usesAtrStop ? "ATR" : "PIPS";
  const tpRMultiple = 2;
  const riskPercent = 1;

  let entryNodeId: string | null = null;

  if (usesEma && !usesBreakout) {
    const periods = parsePeriods(lower);
    const hasRsiFilter = lower.includes("rsi") && !usesRsiReversal;
    entryNodeId = addNode("entry", "ema-crossover-entry", {
      label: "EMA Crossover",
      category: "entrystrategy",
      entryType: "ema-crossover",
      direction: "BOTH",
      timeframe,
      fastEma: periods.fast,
      slowEma: periods.slow,
      riskPercent,
      slMethod,
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple,
      htfTrendFilter: false,
      htfTimeframe: "H4",
      htfEma: 200,
      rsiConfirmation: hasRsiFilter,
      rsiPeriod: hasRsiFilter ? parseRsiPeriod(lower) : 14,
      rsiLongMax: 60,
      rsiShortMin: 40,
      minEmaSeparation: 0,
    });
  } else if (usesDivergence) {
    const indicator = usesMacd ? "MACD" : "RSI";
    entryNodeId = addNode("entry", "divergence-entry", {
      label: `${indicator} Divergence`,
      category: "entrystrategy",
      entryType: "divergence",
      direction: "BOTH",
      timeframe,
      indicator,
      rsiPeriod: parseRsiPeriod(lower),
      appliedPrice: "CLOSE",
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      lookbackBars: 20,
      minSwingBars: 5,
      riskPercent,
      slMethod,
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple,
    });
  } else if (usesMacd) {
    entryNodeId = addNode("entry", "macd-crossover-entry", {
      label: "MACD Crossover",
      category: "entrystrategy",
      entryType: "macd-crossover",
      direction: "BOTH",
      timeframe,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      macdSignalType: "SIGNAL_CROSS",
      appliedPrice: "CLOSE",
      riskPercent,
      slMethod,
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple,
      htfTrendFilter: false,
      htfTimeframe: "H4",
      htfEma: 200,
    });
  } else if (usesRsiReversal) {
    entryNodeId = addNode("entry", "rsi-reversal-entry", {
      label: "RSI Reversal",
      category: "entrystrategy",
      entryType: "rsi-reversal",
      direction: "BOTH",
      timeframe,
      rsiPeriod: parseRsiPeriod(lower),
      oversoldLevel: 30,
      overboughtLevel: 70,
      appliedPrice: "CLOSE",
      riskPercent,
      slMethod,
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.2,
      tpRMultiple: 1.5,
      trendFilter: false,
      trendEma: 200,
    });
  } else if (usesTrendPullback) {
    entryNodeId = addNode("entry", "trend-pullback-entry", {
      label: "Trend Pullback",
      category: "entrystrategy",
      entryType: "trend-pullback",
      direction: "BOTH",
      timeframe,
      trendEma: 200,
      pullbackRsiPeriod: 14,
      rsiPullbackLevel: 40,
      pullbackMaxDistance: 2.0,
      riskPercent,
      slMethod,
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple,
      requireEmaBuffer: false,
      useAdxFilter: false,
      adxPeriod: 14,
      adxThreshold: 25,
    });
  } else if (usesBreakout) {
    entryNodeId = addNode("entry", "range-breakout-entry", {
      label: "Range Breakout",
      category: "entrystrategy",
      entryType: "range-breakout",
      direction: "BOTH",
      timeframe,
      rangePeriod: 20,
      rangeMethod: "CUSTOM_TIME",
      rangeTimeframe: timeframe,
      breakoutEntry: "CANDLE_CLOSE",
      breakoutTimeframe: timeframe,
      customStartHour: 0,
      customStartMinute: 0,
      customEndHour: 8,
      customEndMinute: 0,
      useServerTime: true,
      bufferPips: 2,
      riskPercent,
      slMethod,
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple,
      cancelOpposite: true,
      closeAtTime: false,
      closeAtHour: 17,
      closeAtMinute: 0,
      minRangePips: 0,
      maxRangePips: 0,
      htfTrendFilter: false,
      htfTimeframe: "H4",
      htfEma: 200,
    });
  } else {
    // Default: EMA crossover
    entryNodeId = addNode("entry", "ema-crossover-entry", {
      label: "EMA Crossover",
      category: "entrystrategy",
      entryType: "ema-crossover",
      direction: "BOTH",
      timeframe,
      fastEma: 50,
      slowEma: 200,
      riskPercent,
      slMethod,
      slFixedPips: 50,
      slPercent: 1,
      slAtrMultiplier: 1.5,
      tpRMultiple,
      htfTrendFilter: false,
      htfTimeframe: "H4",
      htfEma: 200,
      rsiConfirmation: false,
      rsiPeriod: 14,
      rsiLongMax: 60,
      rsiShortMin: 40,
      minEmaSeparation: 0,
    });
  }

  // --- Connect timing to entry ---
  addEdge(timingNodeId, entryNodeId);

  // --- Optional: add trailing stop if mentioned ---
  if (lower.includes("trailing")) {
    const trailNodeId = addNode("trail", "trailing-stop", {
      label: "Trailing Stop",
      category: "trademanagement",
      managementType: "trailing-stop",
      method: usesAtrStop ? "ATR_BASED" : "FIXED_PIPS",
      trailPips: 15,
      trailAtrMultiplier: 1,
      trailAtrPeriod: 14,
      trailPercent: 50,
      startAfterPips: 10,
    });
    addEdge(entryNodeId, trailNodeId);
  }

  // --- Optional: add breakeven stop if mentioned ---
  if (lower.includes("breakeven") || lower.includes("break even") || lower.includes("be stop")) {
    const beNodeId = addNode("be", "breakeven-stop", {
      label: "Stop Loss to Breakeven",
      category: "trademanagement",
      managementType: "breakeven-stop",
      trigger: "PIPS",
      triggerPips: 20,
      triggerPercent: 1,
      triggerAtrMultiplier: 1,
      triggerAtrPeriod: 14,
      lockPips: 5,
    });
    addEdge(entryNodeId, beNodeId);
  }

  // --- Optional: add max spread filter ---
  if (lower.includes("spread")) {
    const spreadNodeId = addNode("spread", "max-spread", {
      label: "Max Spread",
      category: "timing",
      filterType: "max-spread",
      maxSpreadPips: 30,
    });
    // Insert before timing: re-wire
    addEdge(spreadNodeId, timingNodeId);
  }

  const now = new Date().toISOString();

  return {
    version: "1.2",
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 0.8 },
    metadata: {
      createdAt: now,
      updatedAt: now,
    },
    settings: {
      magicNumber: generateMagicNumber(),
      comment: "AI Generated Strategy",
      maxOpenTrades: 1,
      allowHedging: false,
      maxTradesPerDay: 0,
      maxDailyProfitPercent: 0,
      maxDailyLossPercent: 0,
    },
  };
}

/** Build a human-readable summary of the generated strategy. */
export function describeStrategy(description: string): string {
  const lower = description.toLowerCase();
  const parts: string[] = [];

  // Session
  if (lower.includes("london") && (lower.includes("new york") || lower.includes("ny"))) {
    parts.push("Trades during London/NY overlap session");
  } else if (lower.includes("london")) {
    parts.push("Trades during London session");
  } else if (lower.includes("new york") || lower.includes("ny session")) {
    parts.push("Trades during New York session");
  } else if (lower.includes("tokyo") || lower.includes("asian")) {
    parts.push("Trades during Tokyo/Asian session");
  } else {
    parts.push("Trades during London session (default)");
  }

  // Timeframe
  const { label } = parseTimeframe(lower);
  parts.push(`Timeframe: ${label}`);

  // Entry
  const usesEma = lower.includes("ema") || lower.includes("moving average");
  const usesBreakout = lower.includes("breakout") || lower.includes("range");
  const usesMacd = lower.includes("macd");
  const usesRsiReversal =
    lower.includes("rsi") && (lower.includes("reversal") || lower.includes("mean reversion"));
  const usesDivergence = lower.includes("divergence");
  const usesTrendPullback = lower.includes("pullback") || lower.includes("pull back");

  if (usesEma && !usesBreakout) {
    const periods = parsePeriods(lower);
    parts.push(`Entry: EMA(${periods.fast}/${periods.slow}) crossover`);
    if (lower.includes("rsi") && !usesRsiReversal) {
      parts.push(`RSI filter enabled (period ${parseRsiPeriod(lower)})`);
    }
  } else if (usesDivergence) {
    const indicator = usesMacd ? "MACD" : "RSI";
    parts.push(`Entry: ${indicator} divergence reversal`);
  } else if (usesMacd) {
    parts.push("Entry: MACD(12,26,9) signal line crossover");
  } else if (usesRsiReversal) {
    parts.push(`Entry: RSI reversal at extremes (period ${parseRsiPeriod(lower)})`);
  } else if (usesTrendPullback) {
    parts.push("Entry: Trend pullback (EMA 200 trend + RSI dip)");
  } else if (usesBreakout) {
    parts.push("Entry: Range breakout of recent price range");
  } else {
    parts.push("Entry: EMA(50/200) crossover (default)");
  }

  // Risk
  parts.push("Risk: 1% per trade");
  if (lower.includes("atr")) {
    parts.push("Stop loss: ATR-based (1.5x ATR)");
  } else {
    parts.push("Stop loss: 50 pips fixed");
  }
  parts.push("Take profit: 2R risk-reward");

  // Extras
  if (lower.includes("trailing")) {
    parts.push("Trailing stop enabled");
  }
  if (lower.includes("breakeven") || lower.includes("break even")) {
    parts.push("Breakeven stop enabled");
  }

  return parts.join("\n");
}

/** Example prompts for the UI. */
export const EXAMPLE_PROMPTS: string[] = [
  "EMA crossover on H4 with RSI filter",
  "Breakout strategy for London session with ATR stops",
  "RSI reversal on M15 with trailing stop",
  "MACD crossover during New York session on H1",
  "50/200 EMA trend following on D1",
  "RSI divergence strategy with breakeven stop",
  "Trend pullback on H4 with ATR stop loss",
];
