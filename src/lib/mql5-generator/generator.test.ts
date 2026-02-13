import { describe, it, expect } from "vitest";
import { generateMQL5Code } from "./generator";
import type { BuildJsonSchema, BuilderNode, BuilderEdge, BuildJsonSettings } from "@/types/builder";

// ============================================
// HELPERS
// ============================================

const DEFAULT_SETTINGS: BuildJsonSettings = {
  magicNumber: 123456,
  comment: "Test EA",
  maxOpenTrades: 1,
  allowHedging: false,
  maxTradesPerDay: 0,
};

function makeBuild(nodes: BuilderNode[], edges: BuilderEdge[] = []): BuildJsonSchema {
  // Auto-generate edges: chain all nodes sequentially if none provided
  if (edges.length === 0 && nodes.length > 1) {
    edges = nodes.slice(0, -1).map((n, i) => ({
      id: `e${i}`,
      source: n.id,
      target: nodes[i + 1].id,
    }));
  }

  return {
    version: "1.0",
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    settings: DEFAULT_SETTINGS,
  };
}

function makeNode(id: string, type: string, data: Record<string, unknown>): BuilderNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: type, ...data },
  } as BuilderNode;
}

// ============================================
// BASIC OUTPUT STRUCTURE
// ============================================

describe("generateMQL5Code", () => {
  describe("basic structure", () => {
    it("generates valid MQL5 with header, includes, and functions", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "TestEA");

      expect(code).toContain("#property copyright");
      expect(code).toContain("#include <Trade\\Trade.mqh>");
      expect(code).toContain("CTrade trade;");
      expect(code).toContain("int OnInit()");
      expect(code).toContain("void OnDeinit(");
      expect(code).toContain("void OnTick()");
      expect(code).toContain("int CountPositions()");
      expect(code).toContain("bool OpenBuy(");
      expect(code).toContain("bool OpenSell(");
      expect(code).toContain("void LogToFile(");
    });

    it("uses project name in header", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "My Strategy");
      expect(code).toContain("My_Strategy");
    });

    it("sanitizes special characters in project name", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "Test@#$Strategy!");
      expect(code).toContain("Test___Strategy_");
    });

    it("applies magic number from settings", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      build.settings.magicNumber = 999999;
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("999999");
    });
  });

  // ============================================
  // TIMING NODES
  // ============================================

  describe("timing nodes", () => {
    it("generates Always timing (no restrictions)", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("bool isTradingTime = true;");
    });

    it("generates Trading Session timing", () => {
      const build = makeBuild([
        makeNode("t1", "trading-session", {
          category: "timing",
          timingType: "trading-session",
          session: "LONDON",
          tradingDays: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
          },
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("London Session");
      expect(code).toContain("08:00");
      expect(code).toContain("17:00");
      expect(code).toContain("day_of_week >= 1 && dt.day_of_week <= 5");
    });

    it("generates Custom Times timing with day filters", () => {
      const build = makeBuild([
        makeNode("t1", "custom-times", {
          category: "timing",
          timingType: "custom-times",
          days: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
          },
          timeSlots: [{ startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Custom Trading Times");
      expect(code).toContain("isDayAllowed");
      expect(code).toContain("currentMinutes >= 540 && currentMinutes < 1020");
    });
  });

  // ============================================
  // INDICATOR NODES
  // ============================================

  describe("indicator nodes", () => {
    it("generates Moving Average code with handle and buffer", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("ma1", "moving-average", {
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: "H1",
          period: 20,
          method: "EMA",
          appliedPrice: "CLOSE",
          shift: 0,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("iMA(_Symbol");
      expect(code).toContain("MODE_EMA");
      expect(code).toContain("PRICE_CLOSE");
      expect(code).toContain("ind0Handle");
      expect(code).toContain("ind0Buffer");
      expect(code).toContain("InpMA0Period");
    });

    it("generates RSI code with overbought/oversold levels", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("rsi1", "rsi", {
          category: "indicator",
          indicatorType: "rsi",
          timeframe: "H1",
          period: 14,
          appliedPrice: "CLOSE",
          overboughtLevel: 70,
          oversoldLevel: 30,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("iRSI(_Symbol");
      expect(code).toContain("InpRSI0Overbought");
      expect(code).toContain("InpRSI0Oversold");
    });

    it("generates MACD code with main and signal buffers", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("macd1", "macd", {
          category: "indicator",
          indicatorType: "macd",
          timeframe: "H1",
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          appliedPrice: "CLOSE",
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("iMACD(_Symbol");
      expect(code).toContain("ind0MainBuffer");
      expect(code).toContain("ind0SignalBuffer");
    });

    it("generates Bollinger Bands code with 3 buffers", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("bb1", "bollinger-bands", {
          category: "indicator",
          indicatorType: "bollinger-bands",
          timeframe: "H1",
          period: 20,
          deviation: 2,
          appliedPrice: "CLOSE",
          shift: 0,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("iBands(_Symbol");
      expect(code).toContain("ind0UpperBuffer");
      expect(code).toContain("ind0MiddleBuffer");
      expect(code).toContain("ind0LowerBuffer");
    });

    it("generates ATR code", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("atr1", "atr", {
          category: "indicator",
          indicatorType: "atr",
          timeframe: "H1",
          period: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("iATR(_Symbol");
    });

    it("generates ADX code with +DI and -DI buffers", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("adx1", "adx", {
          category: "indicator",
          indicatorType: "adx",
          timeframe: "H1",
          period: 14,
          trendLevel: 25,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("iADX(_Symbol");
      expect(code).toContain("ind0PlusDIBuffer");
      expect(code).toContain("ind0MinusDIBuffer");
      expect(code).toContain("InpADX0TrendLevel");
    });
  });

  // ============================================
  // PRICE ACTION NODES
  // ============================================

  describe("price action nodes", () => {
    it("generates Range Breakout code with lookback candles", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("rb1", "range-breakout", {
          category: "priceaction",
          priceActionType: "range-breakout",
          timeframe: "H1",
          rangeType: "PREVIOUS_CANDLES",
          lookbackCandles: 20,
          rangeSession: "ASIAN",
          sessionStartHour: 0,
          sessionStartMinute: 0,
          sessionEndHour: 8,
          sessionEndMinute: 0,
          breakoutDirection: "BOTH",
          entryMode: "ON_CLOSE",
          bufferPips: 2,
          minRangePips: 10,
          maxRangePips: 0,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Range Breakout");
      expect(code).toContain("pa0High");
      expect(code).toContain("pa0Low");
      expect(code).toContain("pa0BreakoutUp");
      expect(code).toContain("pa0BreakoutDown");
      expect(code).toContain("iHighest(_Symbol");
    });

    it("generates Range Breakout with session-based range", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("rb1", "range-breakout", {
          category: "priceaction",
          priceActionType: "range-breakout",
          timeframe: "H1",
          rangeType: "SESSION",
          lookbackCandles: 20,
          rangeSession: "ASIAN",
          sessionStartHour: 0,
          sessionStartMinute: 0,
          sessionEndHour: 8,
          sessionEndMinute: 0,
          breakoutDirection: "BOTH",
          entryMode: "IMMEDIATE",
          bufferPips: 2,
          minRangePips: 10,
          maxRangePips: 0,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("GetSessionRange");
      expect(code).toContain("SYMBOL_ASK");
    });

    it("generates Candlestick Pattern code for engulfing patterns", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("cp1", "candlestick-pattern", {
          category: "priceaction",
          priceActionType: "candlestick-pattern",
          timeframe: "H1",
          patterns: ["ENGULFING_BULLISH", "ENGULFING_BEARISH"],
          minBodySize: 5,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Candlestick Pattern Detection");
      expect(code).toContain("pa0BuySignal");
      expect(code).toContain("pa0SellSignal");
      expect(code).toContain("Bullish Engulfing");
      expect(code).toContain("Bearish Engulfing");
      expect(code).toContain("InpCP0MinBody");
      expect(code).toContain("pa0O1");
      expect(code).toContain("pa0C1");
    });

    it("generates Candlestick Pattern code for shadow-based patterns", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("cp1", "candlestick-pattern", {
          category: "priceaction",
          priceActionType: "candlestick-pattern",
          timeframe: "H1",
          patterns: ["HAMMER", "SHOOTING_STAR"],
          minBodySize: 5,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Hammer");
      expect(code).toContain("Shooting Star");
      expect(code).toContain("pa0UpperShadow1");
      expect(code).toContain("pa0LowerShadow1");
    });

    it("generates Candlestick Pattern code for 3-candle patterns", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("cp1", "candlestick-pattern", {
          category: "priceaction",
          priceActionType: "candlestick-pattern",
          timeframe: "H1",
          patterns: ["MORNING_STAR", "EVENING_STAR", "THREE_WHITE_SOLDIERS", "THREE_BLACK_CROWS"],
          minBodySize: 5,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Morning Star");
      expect(code).toContain("Evening Star");
      expect(code).toContain("Three White Soldiers");
      expect(code).toContain("Three Black Crows");
      // 3-candle patterns require candle 3 data
      expect(code).toContain("pa0O3");
      expect(code).toContain("pa0C3");
      expect(code).toContain("pa0Body3");
    });

    it("does not fetch candle 3 data for 2-candle-only patterns", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("cp1", "candlestick-pattern", {
          category: "priceaction",
          priceActionType: "candlestick-pattern",
          timeframe: "H1",
          patterns: ["ENGULFING_BULLISH", "DOJI"],
          minBodySize: 5,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("pa0O3");
      expect(code).not.toContain("pa0Body3");
    });

    it("generates Support/Resistance code with helper function", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sr1", "support-resistance", {
          category: "priceaction",
          priceActionType: "support-resistance",
          timeframe: "H1",
          lookbackPeriod: 100,
          touchCount: 2,
          zoneSize: 10,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Support/Resistance Detection");
      expect(code).toContain("pa0Support");
      expect(code).toContain("pa0Resistance");
      expect(code).toContain("pa0NearSupport");
      expect(code).toContain("pa0NearResistance");
      expect(code).toContain("FindSR_0");
      expect(code).toContain("InpSR0Lookback");
      expect(code).toContain("InpSR0Touches");
      expect(code).toContain("InpSR0ZoneSize");
      // Recalculates only on new bar
      expect(code).toContain("isNewBar");
    });
  });

  // ============================================
  // TRADING NODES
  // ============================================

  describe("trading nodes", () => {
    it("generates Place Buy with fixed lot", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpBuyLotSize");
      expect(code).toContain("buyLotSize");
      expect(code).toContain("OpenBuy(buyLotSize");
    });

    it("generates Place Sell with risk percent", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "RISK_PERCENT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpSellRiskPercent");
      expect(code).toContain("CalculateLotSize");
      expect(code).toContain("OpenSell(sellLotSize");
    });

    it("generates Stop Loss with fixed pips", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "FIXED_PIPS",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpStopLoss");
      expect(code).toContain("slPips");
    });

    it("generates Take Profit with risk:reward ratio", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "FIXED_PIPS",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("tp1", "take-profit", {
          category: "trading",
          tradingType: "take-profit",
          method: "RISK_REWARD",
          fixedPips: 100,
          riskRewardRatio: 2,
          atrMultiplier: 3,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpRiskReward");
      expect(code).toContain("slPips * InpRiskReward");
    });

    it("generates Stop Loss with ATR-based method", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "ATR_BASED",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("atrHandle");
      expect(code).toContain("InpATRPeriod");
      expect(code).toContain("InpATRMultiplier");
      expect(code).toContain("atrBuffer");
    });
  });

  // ============================================
  // TRADE MANAGEMENT NODES
  // ============================================

  describe("trade management nodes", () => {
    it("generates Breakeven Stop code", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("be1", "breakeven-stop", {
          category: "trademanagement",
          managementType: "breakeven-stop",
          trigger: "PIPS",
          triggerPips: 20,
          triggerPercent: 1,
          triggerAtrMultiplier: 1,
          triggerAtrPeriod: 14,
          lockPips: 5,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Breakeven Stop Management");
      expect(code).toContain("InpBETriggerPips");
      expect(code).toContain("InpBELockPips");
      expect(code).toContain("trade.PositionModify");
    });

    it("generates Trailing Stop code", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("ts1", "trailing-stop", {
          category: "trademanagement",
          managementType: "trailing-stop",
          method: "FIXED_PIPS",
          trailPips: 15,
          trailAtrMultiplier: 1,
          trailAtrPeriod: 14,
          trailPercent: 50,
          startAfterPips: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Trailing Stop Management");
      expect(code).toContain("InpTrailPips");
      expect(code).toContain("InpTrailStartPips");
    });

    it("generates ATR trailing stop with per-bar caching", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("ts1", "trailing-stop", {
          category: "trademanagement",
          managementType: "trailing-stop",
          method: "ATR_BASED",
          trailPips: 15,
          trailAtrMultiplier: 2,
          trailAtrPeriod: 14,
          trailPercent: 50,
          startAfterPips: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Cache ATR per bar");
      expect(code).toContain("static double cachedTrailATR");
      expect(code).toContain("static datetime lastTrailATRBar");
      expect(code).toContain("cachedTrailATR = trailATRBuffer[0]");
      expect(code).toContain("cachedTrailATR / point");
    });

    it("generates Partial Close code with breakeven option", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("pc1", "partial-close", {
          category: "trademanagement",
          managementType: "partial-close",
          closePercent: 50,
          triggerMethod: "PIPS",
          triggerPips: 30,
          triggerPercent: 1,
          moveSLToBreakeven: true,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Partial Close Management");
      expect(code).toContain("InpPartialClosePercent");
      expect(code).toContain("InpPartialCloseTriggerPips");
      expect(code).toContain("PositionClosePartial");
      expect(code).toContain("Move SL to breakeven after partial close");
    });

    it("generates Lock Profit code with percentage method", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("lp1", "lock-profit", {
          category: "trademanagement",
          managementType: "lock-profit",
          method: "PERCENTAGE",
          lockPercent: 50,
          lockPips: 20,
          checkIntervalPips: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Lock Profit Management");
      expect(code).toContain("InpLockProfitPercent");
      expect(code).toContain("InpLockCheckInterval");
    });

    it("generates Breakeven Stop code with ATR trigger", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("be1", "breakeven-stop", {
          category: "trademanagement",
          managementType: "breakeven-stop",
          trigger: "ATR",
          triggerPips: 20,
          triggerPercent: 1,
          triggerAtrMultiplier: 1.5,
          triggerAtrPeriod: 14,
          lockPips: 5,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("beATRHandle");
      expect(code).toContain("beATRBuffer");
      expect(code).toContain("InpBEATRPeriod");
      expect(code).toContain("InpBEATRMultiplier");
    });

    it("generates Breakeven Stop code with percentage trigger", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("be1", "breakeven-stop", {
          category: "trademanagement",
          managementType: "breakeven-stop",
          trigger: "PERCENTAGE",
          triggerPips: 20,
          triggerPercent: 1.5,
          triggerAtrMultiplier: 1,
          triggerAtrPeriod: 14,
          lockPips: 5,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpBETriggerPercent");
      expect(code).toContain("profitPercent");
      expect(code).not.toContain("beATRHandle");
    });

    it("generates Lock Profit code with pips method", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("lp1", "lock-profit", {
          category: "trademanagement",
          managementType: "lock-profit",
          method: "PIPS",
          lockPercent: 50,
          lockPips: 20,
          checkIntervalPips: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Lock Profit Management");
      expect(code).toContain("InpLockProfitPips");
      expect(code).not.toContain("InpLockProfitPercent");
    });

    it("generates Partial Close code without breakeven option", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("pc1", "partial-close", {
          category: "trademanagement",
          managementType: "partial-close",
          closePercent: 50,
          triggerMethod: "PIPS",
          triggerPips: 30,
          triggerPercent: 1,
          moveSLToBreakeven: false,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Partial Close Management");
      expect(code).toContain("PositionClosePartial");
      expect(code).not.toContain("Move SL to breakeven");
    });
  });

  // ============================================
  // ENTRY LOGIC
  // ============================================

  describe("entry logic", () => {
    it("generates buy condition from indicator", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("ma1", "moving-average", {
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: "H1",
          period: 20,
          method: "SMA",
          appliedPrice: "CLOSE",
          shift: 0,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("buyCondition");
      expect(code).toContain("ind0Buffer");
    });

    it("generates both buy and sell conditions from candlestick pattern", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("cp1", "candlestick-pattern", {
          category: "priceaction",
          priceActionType: "candlestick-pattern",
          timeframe: "H1",
          patterns: ["ENGULFING_BULLISH", "ENGULFING_BEARISH"],
          minBodySize: 5,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      // Connect timing -> candlestick -> buy, timing -> candlestick -> sell
      const edges = [
        { id: "e1", source: "t1", target: "cp1" },
        { id: "e2", source: "cp1", target: "b1" },
        { id: "e3", source: "cp1", target: "s1" },
      ];
      build.edges = edges;
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("(pa0BuySignal)");
      expect(code).toContain("(pa0SellSignal)");
    });

    it("generates support/resistance entry conditions", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sr1", "support-resistance", {
          category: "priceaction",
          priceActionType: "support-resistance",
          timeframe: "H1",
          lookbackPeriod: 100,
          touchCount: 2,
          zoneSize: 10,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const edges = [
        { id: "e1", source: "t1", target: "sr1" },
        { id: "e2", source: "sr1", target: "b1" },
        { id: "e3", source: "sr1", target: "s1" },
      ];
      build.edges = edges;
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("(pa0NearSupport)");
      expect(code).toContain("(pa0NearResistance)");
    });

    it("only generates buy logic when only Place Buy node is connected", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("OpenBuy");
      expect(code).not.toContain("OpenSell(sellLotSize");
    });
  });

  // ============================================
  // CONNECTIVITY
  // ============================================

  describe("connectivity", () => {
    it("generates InpMaxSlippage input (no InpMaxSpread — now node-based)", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpMaxSlippage");
      expect(code).not.toContain("InpMaxSpread");
      expect(code).toContain("SetDeviationInPoints(InpMaxSlippage)");
    });

    it("generates minimum bars validation in OnTick", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Bars(_Symbol, PERIOD_CURRENT) < 100");
    });

    it("generates spread filter in OnTick when max-spread node is present", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("ms1", "max-spread", {
          category: "timing",
          filterType: "max-spread",
          maxSpreadPips: 30,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("SYMBOL_SPREAD");
      expect(code).toContain("currentSpread > InpMaxSpread * _pipFactor");
    });

    it("does not generate spread filter when no max-spread node is present", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("SYMBOL_SPREAD");
    });

    it("generates OpenBuy with retry logic and comprehensive error handling", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("TRADE_RETCODE_REQUOTE");
      expect(code).toContain("TRADE_RETCODE_PRICE_OFF");
      expect(code).toContain("TRADE_RETCODE_CONNECTION");
      expect(code).toContain("TRADE_RETCODE_NO_MONEY");
      expect(code).toContain("TRADE_RETCODE_INVALID_VOLUME");
      expect(code).toContain("OpenBuy failed after");
      expect(code).toContain("OpenSell failed after");
      // Margin check before opening
      expect(code).toContain("OrderCalcMargin(ORDER_TYPE_BUY");
      expect(code).toContain("OrderCalcMargin(ORDER_TYPE_SELL");
      expect(code).toContain("ACCOUNT_MARGIN_FREE");
    });

    it("generates per-direction position limits", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const edges = [
        { id: "e1", source: "t1", target: "b1" },
        { id: "e2", source: "t1", target: "s1" },
      ];
      build.edges = edges;
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("CountPositionsByType(POSITION_TYPE_BUY) < 1");
      expect(code).toContain("CountPositionsByType(POSITION_TYPE_SELL) < 1");
    });

    it("uses custom maxBuyPositions/maxSellPositions from settings", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      build.settings.maxBuyPositions = 3;
      build.settings.maxSellPositions = 2;
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("CountPositionsByType(POSITION_TYPE_BUY) < 3");
    });

    it("generates server time for trading session when useServerTime is set", () => {
      const build = makeBuild([
        makeNode("t1", "trading-session", {
          category: "timing",
          timingType: "trading-session",
          session: "LONDON",
          tradingDays: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
          },
          useServerTime: true,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("TimeCurrent()");
      expect(code).toContain("Server Time");
      expect(code).not.toContain("TimeGMT()");
    });

    it("generates server time for custom times when useServerTime is set", () => {
      const build = makeBuild([
        makeNode("t1", "custom-times", {
          category: "timing",
          timingType: "custom-times",
          days: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
          },
          timeSlots: [{ startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
          useServerTime: true,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("TimeCurrent()");
      expect(code).toContain("Server Time");
      expect(code).not.toContain("TimeGMT()");
    });

    it("excludes disconnected nodes from code generation", () => {
      const build = makeBuild(
        [
          makeNode("t1", "always", { category: "timing", timingType: "always" }),
          makeNode("b1", "place-buy", {
            category: "trading",
            tradingType: "place-buy",
            method: "FIXED_LOT",
            fixedLot: 0.1,
            riskPercent: 2,
            minLot: 0.01,
            maxLot: 10,
          }),
          // This RSI is NOT connected to anything
          makeNode("rsi_disconnected", "rsi", {
            category: "indicator",
            indicatorType: "rsi",
            timeframe: "H1",
            period: 14,
            appliedPrice: "CLOSE",
            overboughtLevel: 70,
            oversoldLevel: 30,
          }),
        ],
        // Only connect timing -> buy, leave RSI disconnected
        [{ id: "e1", source: "t1", target: "b1" }]
      );
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("iRSI");
      expect(code).not.toContain("InpRSI");
    });
  });

  // ============================================
  // BUG FIX: Task 5 — ATR TP without SL ATR
  // ============================================

  describe("ATR TP without ATR SL", () => {
    it("generates tpAtrHandle when SL is not ATR-based", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "FIXED_PIPS",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("tp1", "take-profit", {
          category: "trading",
          tradingType: "take-profit",
          method: "ATR_BASED",
          fixedPips: 100,
          riskRewardRatio: 2,
          atrMultiplier: 3,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("tpAtrHandle");
      expect(code).toContain("tpAtrBuffer");
      expect(code).toContain("InpTPATRPeriod");
      expect(code).not.toContain("int atrHandle");
    });

    it("reuses atrBuffer when SL is also ATR-based", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "ATR_BASED",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("tp1", "take-profit", {
          category: "trading",
          tradingType: "take-profit",
          method: "ATR_BASED",
          fixedPips: 100,
          riskRewardRatio: 2,
          atrMultiplier: 3,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("atrBuffer[0]");
      expect(code).toContain("InpTPATRMultiplier");
      expect(code).not.toContain("tpAtrHandle");
    });
  });

  // ============================================
  // BUG FIX: Task 6 — No duplicate currentBarTime
  // ============================================

  describe("duplicate currentBarTime fix", () => {
    it("does not declare currentBarTime twice", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("ma1", "moving-average", {
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: "H1",
          period: 20,
          method: "SMA",
          appliedPrice: "CLOSE",
          shift: 0,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should only have one declaration of currentBarTime (from the template)
      const matches = code.match(/datetime currentBarTime/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(1);
    });
  });

  // ============================================
  // FIX: Task 10 — SL with reversed edge
  // ============================================

  describe("indicator-based SL reversed edge", () => {
    it("resolves indicator when SL is source and indicator is target", () => {
      const build = makeBuild(
        [
          makeNode("t1", "always", { category: "timing", timingType: "always" }),
          makeNode("bb1", "bollinger-bands", {
            category: "indicator",
            indicatorType: "bollinger-bands",
            timeframe: "H1",
            period: 20,
            deviation: 2,
            appliedPrice: "CLOSE",
            shift: 0,
          }),
          makeNode("sl1", "stop-loss", {
            category: "trading",
            tradingType: "stop-loss",
            method: "INDICATOR",
            fixedPips: 50,
            atrMultiplier: 1.5,
            atrPeriod: 14,
          }),
          makeNode("b1", "place-buy", {
            category: "trading",
            tradingType: "place-buy",
            method: "FIXED_LOT",
            fixedLot: 0.1,
            riskPercent: 2,
            minLot: 0.01,
            maxLot: 10,
          }),
        ],
        [
          { id: "e1", source: "t1", target: "bb1" },
          { id: "e2", source: "bb1", target: "b1" },
          // Reversed edge: SL -> indicator
          { id: "e3", source: "sl1", target: "bb1" },
          { id: "e4", source: "t1", target: "sl1" },
        ]
      );
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Indicator-based SL using Bollinger Bands");
      expect(code).toContain("ind0LowerBuffer");
    });
  });

  // ============================================
  // FIX: Task 4 — Partial close uses array search
  // ============================================

  describe("partial close ticket tracking", () => {
    it("uses array search instead of ticket modulo", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("pc1", "partial-close", {
          category: "trademanagement",
          managementType: "partial-close",
          closePercent: 50,
          triggerMethod: "PIPS",
          triggerPips: 30,
          triggerPercent: 1,
          moveSLToBreakeven: true,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("IsPartialClosed(ticket)");
      expect(code).toContain("MarkPartialClosed(ticket)");
      expect(code).toContain("partialClosedTickets");
      expect(code).not.toContain("ticket % 100");
    });
  });

  // ============================================
  // ENHANCEMENT: Task 2 — Multiple timing nodes
  // ============================================

  describe("multiple timing nodes", () => {
    it("combines two timing nodes with OR", () => {
      const build = makeBuild(
        [
          makeNode("t1", "trading-session", {
            category: "timing",
            timingType: "trading-session",
            session: "LONDON",
            tradingDays: {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: false,
              sunday: false,
            },
          }),
          makeNode("t2", "trading-session", {
            category: "timing",
            timingType: "trading-session",
            session: "NEW_YORK",
            tradingDays: {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: false,
              sunday: false,
            },
          }),
          makeNode("b1", "place-buy", {
            category: "trading",
            tradingType: "place-buy",
            method: "FIXED_LOT",
            fixedLot: 0.1,
            riskPercent: 2,
            minLot: 0.01,
            maxLot: 10,
          }),
        ],
        [
          { id: "e1", source: "t1", target: "b1" },
          { id: "e2", source: "t2", target: "b1" },
        ]
      );
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("isTradingTime0");
      expect(code).toContain("isTradingTime1");
      expect(code).toContain("isTradingTime0 || isTradingTime1");
      expect(code).toContain("London Session");
      expect(code).toContain("New York Session");
    });

    it("single timing node uses isTradingTime directly", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("bool isTradingTime = true;");
      expect(code).not.toContain("isTradingTime0");
    });
  });

  // ============================================
  // ENHANCEMENT: Task 1 — AND/OR condition mode
  // ============================================

  describe("condition mode (AND/OR)", () => {
    it("joins conditions with || when conditionMode is OR", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("ma1", "moving-average", {
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: "H1",
          period: 20,
          method: "SMA",
          appliedPrice: "CLOSE",
          shift: 0,
        }),
        makeNode("rsi1", "rsi", {
          category: "indicator",
          indicatorType: "rsi",
          timeframe: "H1",
          period: 14,
          appliedPrice: "CLOSE",
          overboughtLevel: 70,
          oversoldLevel: 30,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      build.settings.conditionMode = "OR";
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("||");
      // Should have || between conditions, not &&
      const buyLine = code.split("\n").find((l: string) => l.includes("bool buyCondition"));
      expect(buyLine).toBeDefined();
      expect(buyLine).toContain("||");
    });

    it("defaults to AND when conditionMode is not set", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("ma1", "moving-average", {
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: "H1",
          period: 20,
          method: "SMA",
          appliedPrice: "CLOSE",
          shift: 0,
        }),
        makeNode("rsi1", "rsi", {
          category: "indicator",
          indicatorType: "rsi",
          timeframe: "H1",
          period: 14,
          appliedPrice: "CLOSE",
          overboughtLevel: 70,
          oversoldLevel: 30,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      const buyLine = code.split("\n").find((l: string) => l.includes("bool buyCondition"));
      expect(buyLine).toBeDefined();
      expect(buyLine).toContain("&&");
    });
  });

  // ============================================
  // FEATURE: Task 3 — Close conditions
  // ============================================

  describe("close conditions", () => {
    it("generates position close logic for close-condition node", () => {
      const build = makeBuild(
        [
          makeNode("t1", "always", { category: "timing", timingType: "always" }),
          makeNode("ma1", "moving-average", {
            category: "indicator",
            indicatorType: "moving-average",
            timeframe: "H1",
            period: 20,
            method: "SMA",
            appliedPrice: "CLOSE",
            shift: 0,
          }),
          makeNode("b1", "place-buy", {
            category: "trading",
            tradingType: "place-buy",
            method: "FIXED_LOT",
            fixedLot: 0.1,
            riskPercent: 2,
            minLot: 0.01,
            maxLot: 10,
          }),
          makeNode("cc1", "close-condition", {
            category: "trading",
            tradingType: "close-condition",
            closeDirection: "BOTH",
          }),
        ],
        [
          { id: "e1", source: "t1", target: "ma1" },
          { id: "e2", source: "ma1", target: "b1" },
          { id: "e3", source: "ma1", target: "cc1" },
        ]
      );
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Exit Signal Conditions");
      expect(code).toContain("closeBuyCondition");
      expect(code).toContain("closeSellCondition");
      expect(code).toContain("CloseBuyPositions()");
      expect(code).toContain("CloseSellPositions()");
    });

    it("only closes BUY when closeDirection is BUY", () => {
      const build = makeBuild(
        [
          makeNode("t1", "always", { category: "timing", timingType: "always" }),
          makeNode("rsi1", "rsi", {
            category: "indicator",
            indicatorType: "rsi",
            timeframe: "H1",
            period: 14,
            appliedPrice: "CLOSE",
            overboughtLevel: 70,
            oversoldLevel: 30,
          }),
          makeNode("b1", "place-buy", {
            category: "trading",
            tradingType: "place-buy",
            method: "FIXED_LOT",
            fixedLot: 0.1,
            riskPercent: 2,
            minLot: 0.01,
            maxLot: 10,
          }),
          makeNode("cc1", "close-condition", {
            category: "trading",
            tradingType: "close-condition",
            closeDirection: "BUY",
          }),
        ],
        [
          { id: "e1", source: "t1", target: "rsi1" },
          { id: "e2", source: "rsi1", target: "b1" },
          { id: "e3", source: "rsi1", target: "cc1" },
        ]
      );
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("closeBuyCondition");
      expect(code).toContain("CloseBuyPositions()");
      expect(code).not.toContain("closeSellCondition");
    });
  });

  // ============================================
  // FEATURE: Max Trades Per Day
  // ============================================

  describe("maxTradesPerDay setting", () => {
    function makeStrategyWithDayLimit(maxTradesPerDay: number) {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("ma1", "moving-average", {
          category: "indicator",
          indicatorType: "moving-average",
          timeframe: "H1",
          period: 20,
          method: "SMA",
          appliedPrice: "CLOSE",
          shift: 0,
        }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "FIXED_PIPS",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("tp1", "take-profit", {
          category: "trading",
          tradingType: "take-profit",
          method: "FIXED_PIPS",
          fixedPips: 100,
          riskRewardRatio: 2,
          atrMultiplier: 3,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      build.settings.maxTradesPerDay = maxTradesPerDay;
      return build;
    }

    it("generates daily trade limit code when maxTradesPerDay > 0", () => {
      const build = makeStrategyWithDayLimit(5);
      const code = generateMQL5Code(build, "DayLimitTest");

      // Should contain daily tracking global variables
      expect(code).toContain("datetime lastTradeDay = 0;");
      expect(code).toContain("int tradesToday = 0;");

      // Should contain day-reset logic
      expect(code).toContain("iTime(_Symbol, PERIOD_D1, 0)");
      expect(code).toContain("if(today != lastTradeDay)");
      expect(code).toContain("tradesToday = 0;");

      // Should contain daily limit in entry condition
      expect(code).toContain("tradesToday < 5");

      // Should increment counter after opening a trade
      expect(code).toContain("tradesToday++");
    });

    it("does NOT generate daily trade limit code when maxTradesPerDay is 0", () => {
      const build = makeStrategyWithDayLimit(0);
      const code = generateMQL5Code(build, "NoDayLimitTest");

      // Should NOT contain daily tracking variables
      expect(code).not.toContain("lastTradeDay");
      expect(code).not.toContain("tradesToday");

      // Should NOT contain daily limit check
      expect(code).not.toContain("PERIOD_D1");
    });

    it("uses the exact maxTradesPerDay value in the condition", () => {
      const build = makeStrategyWithDayLimit(10);
      const code = generateMQL5Code(build, "DayLimit10");
      expect(code).toContain("tradesToday < 10");
    });

    it("includes both maxOpenTrades and maxTradesPerDay in entry condition", () => {
      const build = makeStrategyWithDayLimit(3);
      build.settings.maxOpenTrades = 2;
      const code = generateMQL5Code(build, "CombinedLimits");

      // Should check both limits
      expect(code).toContain("positionsCount < 2");
      expect(code).toContain("tradesToday < 3");
      expect(code).toContain("newBar");
    });

    it("defaults to no daily limit when maxTradesPerDay is undefined", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      // Don't set maxTradesPerDay at all (remove from defaults)
      delete (build.settings as unknown as Record<string, unknown>).maxTradesPerDay;
      const code = generateMQL5Code(build, "NoSetting");

      expect(code).not.toContain("lastTradeDay");
      expect(code).not.toContain("tradesToday");
    });
  });

  // ============================================
  // EMA CROSSOVER ENTRY STRATEGY
  // ============================================

  describe("ema crossover entry strategy", () => {
    const makeEmaCrossoverEntry = (overrides: Record<string, unknown> = {}) =>
      makeNode("entry1", "ema-crossover-entry", {
        category: "entrystrategy",
        entryType: "ema-crossover",
        direction: "BOTH",
        fastEma: 50,
        slowEma: 200,
        appliedPrice: "CLOSE",
        timeframe: "H1",
        riskPercent: 1,
        slMethod: "ATR",
        slFixedPips: 50,
        slPercent: 1,
        slAtrMultiplier: 1.5,
        tpRMultiple: 2,
        htfTrendFilter: false,
        htfTimeframe: "H4",
        htfEma: 200,
        rsiConfirmation: false,
        rsiPeriod: 14,
        rsiLongMax: 60,
        rsiShortMin: 40,
        minEmaSeparation: 0,
        ...overrides,
      });

    it("generates basic EMA crossover buy/sell conditions", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry(),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should create two MA handles (fast + slow)
      expect(code).toContain("iMA(_Symbol");
      // Should have crossover conditions: fast crosses above slow = buy
      expect(code).toContain("DoubleLE");
      expect(code).toContain("DoubleGT");
      // Should generate buy and sell logic
      expect(code).toContain("OpenBuy");
      expect(code).toContain("OpenSell");
    });

    it("generates only buy logic when direction is BUY", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({ direction: "BUY" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpBuyRiskPercent");
      expect(code).not.toContain("InpSellRiskPercent");
    });

    it("generates only sell logic when direction is SELL", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({ direction: "SELL" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("InpBuyRiskPercent");
      expect(code).toContain("InpSellRiskPercent");
    });

    it("passes appliedPrice to all MA indicators", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({ appliedPrice: "HIGH" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("PRICE_HIGH");
    });

    it("generates HTF trend filter conditions when enabled", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({ htfTrendFilter: true, htfTimeframe: "D1", htfEma: 100 }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should have a third MA handle for HTF EMA
      expect(code).toContain("PERIOD_D1");
      // Should filter: price above HTF EMA for buy
      expect(code).toContain("iClose(_Symbol, PERIOD_CURRENT");
    });

    it("passes appliedPrice to HTF EMA when enabled", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({
          htfTrendFilter: true,
          htfTimeframe: "D1",
          htfEma: 100,
          appliedPrice: "LOW",
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // All three MAs should use PRICE_LOW — count occurrences
      const priceMatches = code.match(/PRICE_LOW/g);
      expect(priceMatches).not.toBeNull();
      expect(priceMatches!.length).toBeGreaterThanOrEqual(3);
    });

    it("generates RSI confirmation filter with correct input names", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({
          rsiConfirmation: true,
          rsiPeriod: 14,
          rsiLongMax: 60,
          rsiShortMin: 40,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should create RSI handle
      expect(code).toContain("iRSI(_Symbol");
      // RSI overbought should be 60 (longMax), oversold should be 40 (shortMin)
      expect(code).toContain("Overbought");
      expect(code).toContain("Oversold");
      // Buy condition: RSI < Overbought (longMax)
      expect(code).toContain("DoubleLT");
      // Sell condition: RSI > Oversold (shortMin)
      expect(code).toContain("DoubleGT");
    });

    it("passes appliedPrice to RSI confirmation when enabled", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({
          rsiConfirmation: true,
          rsiPeriod: 14,
          rsiLongMax: 60,
          rsiShortMin: 40,
          appliedPrice: "OPEN",
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // RSI should also use PRICE_OPEN
      const priceMatches = code.match(/PRICE_OPEN/g);
      expect(priceMatches).not.toBeNull();
      // 2 MAs + 1 RSI = 3 indicators using PRICE_OPEN
      expect(priceMatches!.length).toBeGreaterThanOrEqual(3);
    });

    it("generates InpMinEmaSeparation input when minEmaSeparation > 0", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({ minEmaSeparation: 5 }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpMinEmaSeparation");
      expect(code).toContain("MathAbs");
      expect(code).toContain(">= InpMinEmaSeparation");
    });

    it("does not generate minEmaSeparation filter when value is 0", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({ minEmaSeparation: 0 }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("InpMinEmaSeparation");
    });

    it("generates PERCENT SL method with EMA crossover", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({ slMethod: "PERCENT", slPercent: 2 }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpSLPercent");
      expect(code).toContain("slPips");
    });

    it("generates PIPS SL method with EMA crossover", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeEmaCrossoverEntry({ slMethod: "PIPS", slFixedPips: 30 }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpStopLoss");
      expect(code).toContain("slPips");
    });
  });

  // ============================================
  // TREND PULLBACK ENTRY STRATEGY
  // ============================================

  describe("trend pullback entry strategy", () => {
    const makeTrendPullbackEntry = (overrides: Record<string, unknown> = {}) =>
      makeNode("entry1", "trend-pullback-entry", {
        category: "entrystrategy",
        entryType: "trend-pullback",
        direction: "BOTH",
        trendEma: 50,
        pullbackRsiPeriod: 14,
        rsiPullbackLevel: 30,
        pullbackMaxDistance: 2.0,
        requireEmaBuffer: true,
        useAdxFilter: false,
        adxPeriod: 14,
        adxThreshold: 25,
        appliedPrice: "CLOSE",
        timeframe: "H1",
        riskPercent: 1,
        slMethod: "ATR",
        slFixedPips: 50,
        slPercent: 1,
        slAtrMultiplier: 1.5,
        tpRMultiple: 2,
        ...overrides,
      });

    it("generates basic trend pullback with EMA, RSI and proximity check", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry(),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should create MA handle for trend EMA
      expect(code).toContain("iMA(_Symbol");
      // Should create RSI handle for pullback detection
      expect(code).toContain("iRSI(_Symbol");
      // Should have proximity check with InpPullbackMaxDist
      expect(code).toContain("InpPullbackMaxDist");
      // Should generate buy and sell logic
      expect(code).toContain("InpBuyRiskPercent");
      expect(code).toContain("InpSellRiskPercent");
    });

    it("does not generate proximity check when requireEmaBuffer is false", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry({ requireEmaBuffer: false }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should NOT have proximity distance input
      expect(code).not.toContain("InpPullbackMaxDist");
      // Should still have basic MA direction check
      expect(code).toContain("iMA(_Symbol");
      expect(code).toContain("DoubleGT");
    });

    it("generates only buy logic when direction is BUY", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry({ direction: "BUY" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpBuyRiskPercent");
      expect(code).not.toContain("InpSellRiskPercent");
    });

    it("generates only sell logic when direction is SELL", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry({ direction: "SELL" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("InpBuyRiskPercent");
      expect(code).toContain("InpSellRiskPercent");
    });

    it("passes appliedPrice to MA and RSI indicators", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry({ appliedPrice: "HIGH" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Both MA and RSI should use PRICE_HIGH
      const priceMatches = code.match(/PRICE_HIGH/g);
      expect(priceMatches).not.toBeNull();
      expect(priceMatches!.length).toBeGreaterThanOrEqual(2);
    });

    it("generates ADX filter when useAdxFilter is true", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry({ useAdxFilter: true, adxPeriod: 14, adxThreshold: 25 }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should have ADX handle
      expect(code).toContain("iADX(_Symbol");
      // Should have ADX trend level input
      expect(code).toContain("TrendLevel");
    });

    it("does not generate ADX filter when useAdxFilter is false", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry({ useAdxFilter: false }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("iADX(_Symbol");
    });

    it("generates RSI overbought as 100 - rsiPullbackLevel", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry({ rsiPullbackLevel: 30 }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Oversold = 30, overbought = 100 - 30 = 70
      expect(code).toContain("Oversold");
      expect(code).toContain("Overbought");
    });

    it("generates PIPS SL method", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry({ slMethod: "PIPS", slFixedPips: 30 }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpStopLoss");
    });

    it("generates PERCENT SL method", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeTrendPullbackEntry({ slMethod: "PERCENT", slPercent: 2 }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpSLPercent");
    });
  });

  // ============================================
  // RANGE BREAKOUT ENTRY — new range/SL options
  // ============================================

  describe("range breakout entry strategy", () => {
    it("generates CANDLES range with ATR SL (default behavior)", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("entry1", "range-breakout-entry", {
          category: "entrystrategy",
          entryType: "range-breakout",
          direction: "BOTH",
          slFixedPips: 50,
          slPercent: 1,
          rangePeriod: 20,
          rangeMethod: "CANDLES",
          rangeTimeframe: "H1",
          breakoutEntry: "CANDLE_CLOSE",
          breakoutTimeframe: "H1",
          customStartHour: 0,
          customStartMinute: 0,
          customEndHour: 8,
          customEndMinute: 0,
          slMethod: "ATR",
          useServerTime: true,
          riskPercent: 1,
          slAtrMultiplier: 1.5,
          tpRMultiple: 2,
          cancelOpposite: true,
          closeAtTime: false,
          closeAtHour: 17,
          closeAtMinute: 0,
          htfTrendFilter: false,
          htfTimeframe: "H4",
          htfEma: 200,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should use candle-based range with iHighest
      expect(code).toContain("iHighest(_Symbol");
      expect(code).toContain("pa0High");
      expect(code).toContain("pa0Low");
      // Should use ATR-based SL
      expect(code).toContain("atrHandle");
      expect(code).toContain("InpATRMultiplier");
    });

    it("generates CUSTOM_TIME range with TIME_WINDOW", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("entry1", "range-breakout-entry", {
          category: "entrystrategy",
          entryType: "range-breakout",
          direction: "BOTH",
          slFixedPips: 50,
          slPercent: 1,
          rangePeriod: 20,
          rangeMethod: "CUSTOM_TIME",
          rangeTimeframe: "H1",
          breakoutEntry: "CANDLE_CLOSE",
          breakoutTimeframe: "H1",
          customStartHour: 2,
          customStartMinute: 0,
          customEndHour: 6,
          customEndMinute: 30,
          slMethod: "ATR",
          useServerTime: true,
          riskPercent: 1,
          slAtrMultiplier: 1.5,
          tpRMultiple: 2,
          cancelOpposite: true,
          closeAtTime: false,
          closeAtHour: 17,
          closeAtMinute: 0,
          htfTrendFilter: false,
          htfTimeframe: "H4",
          htfEma: 200,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should use TIME_WINDOW / GetSessionRange
      expect(code).toContain("GetSessionRange");
      expect(code).toContain("pa0High");
      expect(code).toContain("pa0Low");
    });

    it("generates RANGE_OPPOSITE SL with directional SL", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("entry1", "range-breakout-entry", {
          category: "entrystrategy",
          entryType: "range-breakout",
          direction: "BOTH",
          slFixedPips: 50,
          slPercent: 1,
          rangePeriod: 20,
          rangeMethod: "CANDLES",
          rangeTimeframe: "H1",
          customStartHour: 0,
          customStartMinute: 0,
          customEndHour: 8,
          customEndMinute: 0,
          slMethod: "RANGE_OPPOSITE",
          useServerTime: true,
          riskPercent: 1,
          slAtrMultiplier: 1.5,
          tpRMultiple: 2,
          cancelOpposite: true,
          closeAtTime: false,
          closeAtHour: 17,
          closeAtMinute: 0,
          htfTrendFilter: false,
          htfTimeframe: "H4",
          htfEma: 200,
          breakoutEntry: "CANDLE_CLOSE",
          breakoutTimeframe: "H1",
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should use range opposite SL
      expect(code).toContain("Range Opposite SL");
      expect(code).toContain("pa0Low");
      expect(code).toContain("pa0High");
      expect(code).toContain("slSellPips");
      // Should NOT have ATR handle for SL
      expect(code).not.toContain("InpATRMultiplier");
    });

    it("generates close-at-time code with optimizable input parameters", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("entry1", "range-breakout-entry", {
          category: "entrystrategy",
          entryType: "range-breakout",
          direction: "BOTH",
          slFixedPips: 50,
          slPercent: 1,
          rangePeriod: 20,
          rangeMethod: "CANDLES",
          rangeTimeframe: "H1",
          breakoutEntry: "CANDLE_CLOSE",
          breakoutTimeframe: "H1",
          customStartHour: 0,
          customStartMinute: 0,
          customEndHour: 8,
          customEndMinute: 0,
          slMethod: "ATR",
          useServerTime: true,
          riskPercent: 1,
          slAtrMultiplier: 1.5,
          tpRMultiple: 2,
          cancelOpposite: true,
          closeAtTime: true,
          closeAtHour: 16,
          closeAtMinute: 30,
          htfTrendFilter: false,
          htfTimeframe: "H4",
          htfEma: 200,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should generate close-at-time logic
      expect(code).toContain("Close range breakout positions at specified time");
      expect(code).toContain("InpRangeCloseHour");
      expect(code).toContain("InpRangeCloseMinute");
      expect(code).toContain("InpRangeCloseHour * 60 + InpRangeCloseMinute");
      expect(code).toContain("PositionClose(ticket)");
      expect(code).toContain("OrderDelete(ticket)");
    });

    it("does not generate close-at-time when disabled", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("entry1", "range-breakout-entry", {
          category: "entrystrategy",
          entryType: "range-breakout",
          direction: "BOTH",
          slFixedPips: 50,
          slPercent: 1,
          rangePeriod: 20,
          rangeMethod: "CANDLES",
          rangeTimeframe: "H1",
          breakoutEntry: "CANDLE_CLOSE",
          breakoutTimeframe: "H1",
          customStartHour: 0,
          customStartMinute: 0,
          customEndHour: 8,
          customEndMinute: 0,
          slMethod: "ATR",
          useServerTime: true,
          riskPercent: 1,
          slAtrMultiplier: 1.5,
          tpRMultiple: 2,
          cancelOpposite: true,
          closeAtTime: false,
          closeAtHour: 17,
          closeAtMinute: 0,
          htfTrendFilter: false,
          htfTimeframe: "H4",
          htfEma: 200,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("InpRangeCloseHour");
    });

    it("generates cancelOpposite OCO logic by default", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("entry1", "range-breakout-entry", {
          category: "entrystrategy",
          entryType: "range-breakout",
          direction: "BOTH",
          slFixedPips: 50,
          slPercent: 1,
          rangePeriod: 20,
          rangeMethod: "CANDLES",
          rangeTimeframe: "H1",
          breakoutEntry: "CANDLE_CLOSE",
          breakoutTimeframe: "H1",
          customStartHour: 0,
          customStartMinute: 0,
          customEndHour: 8,
          customEndMinute: 0,
          slMethod: "ATR",
          useServerTime: true,
          riskPercent: 1,
          slAtrMultiplier: 1.5,
          tpRMultiple: 2,
          cancelOpposite: true,
          closeAtTime: false,
          closeAtHour: 17,
          closeAtMinute: 0,
          htfTrendFilter: false,
          htfTimeframe: "H4",
          htfEma: 200,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("OCO: Cancel pending orders");
      expect(code).toContain("OrderDelete(ticket)");
    });

    it("omits OCO logic when cancelOpposite is false", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("entry1", "range-breakout-entry", {
          category: "entrystrategy",
          entryType: "range-breakout",
          direction: "BOTH",
          slFixedPips: 50,
          slPercent: 1,
          rangePeriod: 20,
          rangeMethod: "CANDLES",
          rangeTimeframe: "H1",
          breakoutEntry: "CANDLE_CLOSE",
          breakoutTimeframe: "H1",
          customStartHour: 0,
          customStartMinute: 0,
          customEndHour: 8,
          customEndMinute: 0,
          slMethod: "ATR",
          useServerTime: true,
          riskPercent: 1,
          slAtrMultiplier: 1.5,
          tpRMultiple: 2,
          cancelOpposite: false,
          closeAtTime: false,
          closeAtHour: 17,
          closeAtMinute: 0,
          htfTrendFilter: false,
          htfTimeframe: "H4",
          htfEma: 200,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("OCO: Cancel pending orders");
    });

    it("generates minRangePips and maxRangePips filtering", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("entry1", "range-breakout-entry", {
          category: "entrystrategy",
          entryType: "range-breakout",
          direction: "BOTH",
          slFixedPips: 50,
          slPercent: 1,
          rangePeriod: 20,
          rangeMethod: "CANDLES",
          rangeTimeframe: "H1",
          breakoutEntry: "CANDLE_CLOSE",
          breakoutTimeframe: "H1",
          customStartHour: 0,
          customStartMinute: 0,
          customEndHour: 8,
          customEndMinute: 0,
          slMethod: "ATR",
          useServerTime: true,
          riskPercent: 1,
          slAtrMultiplier: 1.5,
          tpRMultiple: 2,
          cancelOpposite: true,
          closeAtTime: false,
          closeAtHour: 17,
          closeAtMinute: 0,
          htfTrendFilter: false,
          htfTimeframe: "H4",
          htfEma: 200,
          minRangePips: 10,
          maxRangePips: 100,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpRange0MinRange");
      expect(code).toContain("InpRange0MaxRange");
      expect(code).toContain("pa0Size >= InpRange0MinRange");
      expect(code).toContain("pa0Size <= InpRange0MaxRange");
    });

    it("generates PERCENT SL method with range breakout", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("entry1", "range-breakout-entry", {
          category: "entrystrategy",
          entryType: "range-breakout",
          direction: "BOTH",
          slFixedPips: 50,
          slPercent: 1,
          rangePeriod: 20,
          rangeMethod: "CANDLES",
          rangeTimeframe: "H1",
          breakoutEntry: "CANDLE_CLOSE",
          breakoutTimeframe: "H1",
          customStartHour: 0,
          customStartMinute: 0,
          customEndHour: 8,
          customEndMinute: 0,
          slMethod: "PERCENT",
          useServerTime: true,
          riskPercent: 1,
          slAtrMultiplier: 1.5,
          tpRMultiple: 2,
          cancelOpposite: true,
          closeAtTime: false,
          closeAtHour: 17,
          closeAtMinute: 0,
          htfTrendFilter: false,
          htfTimeframe: "H4",
          htfEma: 200,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpSLPercent");
      expect(code).toContain("pendBuySLPips");
      expect(code).toContain("pendSellSLPips");
    });
  });

  // ============================================
  // Sell lot sizing with directional SL
  // ============================================

  describe("sell lot sizing with directional SL", () => {
    it("uses pendSellSLDist for sell lot sizing with directional SL in range-breakout-only mode", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("rb1", "range-breakout", {
          category: "priceaction",
          priceActionType: "range-breakout",
          rangePeriod: 20,
          breakoutMode: "CLOSE",
          rangeTimeframe: "H1",
          rangeMethod: "CANDLES",
        }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "RANGE_OPPOSITE",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "RISK_PERCENT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // In range-breakout-only mode, lot sizing uses pendSellSLDist (not sellLotSize on every tick)
      expect(code).toContain("CalculateLotSize(InpSellRiskPercent, pendSellSLDist)");
      // Should NOT have dead sellLotSize computation
      expect(code).not.toContain("double sellLotSize = CalculateLotSize");
    });

    it("uses slPips for sell lot sizing without directional SL", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "FIXED_PIPS",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "RISK_PERCENT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Without directional SL, sell should use regular slPips
      expect(code).toContain("CalculateLotSize(InpSellRiskPercent, slPips)");
      expect(code).not.toContain("slSellPips");
    });
  });

  // ============================================
  // FEATURE: Pending Orders
  // ============================================

  describe("pending orders", () => {
    it("generates BuyStop code when orderType is STOP", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "FIXED_PIPS",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("tp1", "take-profit", {
          category: "trading",
          tradingType: "take-profit",
          method: "FIXED_PIPS",
          fixedPips: 100,
          riskRewardRatio: 2,
          atrMultiplier: 3,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
          orderType: "STOP",
          pendingOffset: 15,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("PlaceBuyStop(buyLotSize, slPips, tpPips, InpBuyPendingOffset)");
      expect(code).toContain("InpBuyPendingOffset");
      expect(code).toContain("bool PlaceBuyStop");
      expect(code).toContain("trade.BuyStop");
      expect(code).toContain("DeletePendingOrders");
      expect(code).not.toContain("OpenBuy(buyLotSize");
    });

    it("generates SellLimit code when orderType is LIMIT", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "FIXED_PIPS",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("tp1", "take-profit", {
          category: "trading",
          tradingType: "take-profit",
          method: "FIXED_PIPS",
          fixedPips: 100,
          riskRewardRatio: 2,
          atrMultiplier: 3,
          atrPeriod: 14,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "RISK_PERCENT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
          orderType: "LIMIT",
          pendingOffset: 20,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("PlaceSellLimit(sellLotSize, slPips, tpPips, InpSellPendingOffset)");
      expect(code).toContain("InpSellPendingOffset");
      expect(code).toContain("bool PlaceSellLimit");
      expect(code).toContain("trade.SellLimit");
      expect(code).toContain("DeletePendingOrders");
      expect(code).not.toContain("OpenSell(sellLotSize");
    });

    it("uses OpenBuy/OpenSell for MARKET orderType (default)", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
          orderType: "MARKET",
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const edges = [
        { id: "e1", source: "t1", target: "b1" },
        { id: "e2", source: "t1", target: "s1" },
      ];
      build.edges = edges;
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("OpenBuy(buyLotSize");
      expect(code).toContain("OpenSell(sellLotSize");
      expect(code).not.toContain("PlaceBuyStop");
      expect(code).not.toContain("PlaceSellLimit");
      expect(code).not.toContain("DeletePendingOrders");
    });

    it("generates both buy stop and sell stop when both use pending orders", () => {
      const build = makeBuild(
        [
          makeNode("t1", "always", { category: "timing", timingType: "always" }),
          makeNode("b1", "place-buy", {
            category: "trading",
            tradingType: "place-buy",
            method: "FIXED_LOT",
            fixedLot: 0.1,
            riskPercent: 2,
            minLot: 0.01,
            maxLot: 10,
            orderType: "STOP",
            pendingOffset: 10,
          }),
          makeNode("s1", "place-sell", {
            category: "trading",
            tradingType: "place-sell",
            method: "FIXED_LOT",
            fixedLot: 0.1,
            riskPercent: 2,
            minLot: 0.01,
            maxLot: 10,
            orderType: "STOP",
            pendingOffset: 10,
          }),
        ],
        [
          { id: "e1", source: "t1", target: "b1" },
          { id: "e2", source: "t1", target: "s1" },
        ]
      );
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("PlaceBuyStop");
      expect(code).toContain("PlaceSellStop");
      expect(code).toContain("InpBuyPendingOffset");
      expect(code).toContain("InpSellPendingOffset");
      expect(code).toContain("DeletePendingOrders");
    });
  });

  // ============================================
  // FEATURE: Task 7 — Strategy presets validation
  // ============================================

  describe("strategy presets", () => {
    it("preset buildJson objects are valid for generation", async () => {
      const { STRATEGY_PRESETS } = await import("@/lib/strategy-presets");
      expect(STRATEGY_PRESETS.length).toBe(5);
      for (const preset of STRATEGY_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.buildJson.version).toBe("1.0");
        expect(preset.buildJson.nodes.length).toBeGreaterThan(0);
        expect(preset.buildJson.edges.length).toBeGreaterThan(0);
        // Should not throw
        const code = generateMQL5Code(preset.buildJson, preset.name);
        expect(code).toContain("#property copyright");
        expect(code).toContain("OnTick");
      }
    });
  });

  // ============================================
  // FIX: Lot Size / Risk Calculation Issues
  // ============================================

  describe("lot size / risk calculation fixes", () => {
    it("CalculateLotSize contains warning when slPips is 0", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain('Print("WARNING: CalculateLotSize called with slPips=0');
    });

    it("CalculateLotSize contains comment about points not pips", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("slPips parameter is in POINTS (not pips)");
    });

    it("CalculateLotSize warns on zero balance and zero pipValue", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Account balance/equity is 0, using minimum lot");
      expect(code).toContain("Pip value is 0");
    });

    it("CalculateLotSize handles SYMBOL_VOLUME_MIN being 0", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("SYMBOL_VOLUME_MIN is 0");
      expect(code).toContain("defaulting to 0.01");
    });

    it("generates InpUseEquityForRisk input when RISK_PERCENT buy is used", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "FIXED_PIPS",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "RISK_PERCENT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpUseEquityForRisk");
      expect(code).toContain("Use Equity instead of Balance for risk sizing");
      expect(code).toContain("ACCOUNT_EQUITY");
      expect(code).toContain("ACCOUNT_BALANCE");
    });

    it("generates InpUseEquityForRisk input when RISK_PERCENT sell is used", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "FIXED_PIPS",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "RISK_PERCENT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpUseEquityForRisk");
    });

    it("always generates InpUseEquityForRisk (needed by CalculateLotSize)", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Always present because CalculateLotSize references it
      expect(code).toContain("InpUseEquityForRisk");
    });

    it("uses 10 * _pipFactor instead of 100 for RANGE_OPPOSITE SL floor", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("rb1", "range-breakout", {
          category: "priceaction",
          priceActionType: "range-breakout",
          timeframe: "H1",
          rangeType: "PREVIOUS_CANDLES",
          lookbackCandles: 20,
          rangeSession: "ASIAN",
          sessionStartHour: 0,
          sessionStartMinute: 0,
          sessionEndHour: 8,
          sessionEndMinute: 0,
          breakoutDirection: "BOTH",
          entryMode: "ON_CLOSE",
          bufferPips: 2,
          minRangePips: 10,
          maxRangePips: 0,
        }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "RANGE_OPPOSITE",
          fixedPips: 50,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("10 * _pipFactor)");
      expect(code).not.toMatch(/MathMax\([^)]+, 100\)/);
    });

    it("recalculates lot size for BuyStop with PERCENT SL", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "PERCENT",
          fixedPips: 50,
          slPercent: 1,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("tp1", "take-profit", {
          category: "trading",
          tradingType: "take-profit",
          method: "FIXED_PIPS",
          fixedPips: 100,
          riskRewardRatio: 2,
          atrMultiplier: 3,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "RISK_PERCENT",
          fixedLot: 0.1,
          riskPercent: 1,
          minLot: 0.01,
          maxLot: 10,
          orderType: "STOP",
          pendingOffset: 15,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should recalculate slPips based on pending entry price
      expect(code).toContain("pendEntry = SymbolInfoDouble(_Symbol, SYMBOL_ASK) +");
      expect(code).toContain("adjSlPips = (pendEntry * InpSLPercent / 100.0) / _Point");
      expect(code).toContain("buyLotSize = CalculateLotSize(InpBuyRiskPercent, adjSlPips)");
    });

    it("recalculates lot size for SellLimit with PERCENT SL", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "PERCENT",
          fixedPips: 50,
          slPercent: 1,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("tp1", "take-profit", {
          category: "trading",
          tradingType: "take-profit",
          method: "FIXED_PIPS",
          fixedPips: 100,
          riskRewardRatio: 2,
          atrMultiplier: 3,
          atrPeriod: 14,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "RISK_PERCENT",
          fixedLot: 0.1,
          riskPercent: 1,
          minLot: 0.01,
          maxLot: 10,
          orderType: "LIMIT",
          pendingOffset: 20,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // Should recalculate slPips based on pending entry price
      expect(code).toContain("pendEntry = SymbolInfoDouble(_Symbol, SYMBOL_BID) +");
      expect(code).toContain("adjSlPips = (pendEntry * InpSLPercent / 100.0) / _Point");
      expect(code).toContain("sellLotSize = CalculateLotSize(InpSellRiskPercent, adjSlPips)");
    });

    it("does NOT recalculate lot size for MARKET orders with PERCENT SL", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "PERCENT",
          fixedPips: 50,
          slPercent: 1,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "RISK_PERCENT",
          fixedLot: 0.1,
          riskPercent: 1,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // MARKET orders should NOT have the pendEntry recalculation
      expect(code).not.toContain("pendEntry");
      expect(code).not.toContain("adjSlPips");
    });
  });

  // ============================================
  // AUDIT: Missing indicator tests
  // ============================================

  describe("Stochastic indicator", () => {
    it("generates Stochastic handle and buffers", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sto1", "stochastic", {
          category: "indicator",
          indicatorType: "stochastic",
          timeframe: "H1",
          kPeriod: 14,
          dPeriod: 3,
          slowing: 3,
          overboughtLevel: 80,
          oversoldLevel: 20,
          maMethod: "SMA",
          priceField: "LOWHIGH",
          signalMode: "candle_close",
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("iStochastic");
      expect(code).toContain("InpStoch0KPeriod");
      expect(code).toContain("InpStoch0DPeriod");
      expect(code).toContain("InpStoch0Slowing");
      expect(code).toContain("ind0MainBuffer");
      expect(code).toContain("ind0SignalBuffer");
    });

    it("generates overbought/oversold conditions for Stochastic", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sto1", "stochastic", {
          category: "indicator",
          indicatorType: "stochastic",
          timeframe: "H1",
          kPeriod: 14,
          dPeriod: 3,
          slowing: 3,
          overboughtLevel: 80,
          oversoldLevel: 20,
          maMethod: "SMA",
          priceField: "LOWHIGH",
          signalMode: "every_tick",
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpStoch0Overbought");
      expect(code).toContain("InpStoch0Oversold");
    });
  });

  describe("CCI indicator", () => {
    it("generates CCI handle and overbought/oversold inputs", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("cci1", "cci", {
          category: "indicator",
          indicatorType: "cci",
          timeframe: "H4",
          period: 20,
          overboughtLevel: 100,
          oversoldLevel: -100,
          appliedPrice: "TYPICAL",
          signalMode: "every_tick",
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("iCCI");
      expect(code).toContain("InpCCI0Period");
      expect(code).toContain("PRICE_TYPICAL");
      expect(code).toContain("InpCCI0Overbought");
      expect(code).toContain("InpCCI0Oversold");
    });
  });

  // ============================================
  // AUDIT: Hedging mode
  // ============================================

  describe("hedging mode", () => {
    it("allows simultaneous buy and sell when hedging is enabled", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      build.settings = { ...DEFAULT_SETTINGS, allowHedging: true };
      const code = generateMQL5Code(build, "Test");
      // Should NOT have "CountPositionsByType(POSITION_TYPE_BUY) == 0" check on sell
      expect(code).not.toContain("POSITION_TYPE_BUY) == 0");
      expect(code).not.toContain("POSITION_TYPE_SELL) == 0");
    });

    it("prevents hedging when disabled", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      build.settings = { ...DEFAULT_SETTINGS, allowHedging: false };
      const code = generateMQL5Code(build, "Test");
      // Should have anti-hedge condition
      expect(code).toContain("POSITION_TYPE_BUY) == 0");
    });
  });

  // ============================================
  // AUDIT: Daily P&L limits
  // ============================================

  describe("daily P&L limits", () => {
    it("generates daily profit target check when maxDailyProfitPercent > 0", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      build.settings = { ...DEFAULT_SETTINGS, maxDailyProfitPercent: 3 };
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Daily P&L Protection");
      expect(code).toContain("dailyPnLPercent >= 3");
      expect(code).toContain("Daily profit target reached");
      // Verify flags are declared before conditionals and reset on new day
      expect(code).toContain("static bool profitLimitHit = false");
      expect(code).toContain("profitLimitHit = false;");
      expect(code).toContain("if(profitLimitHit || lossLimitHit) return;");
    });

    it("generates daily loss limit check when maxDailyLossPercent > 0", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      build.settings = { ...DEFAULT_SETTINGS, maxDailyLossPercent: 5 };
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("Daily P&L Protection");
      expect(code).toContain("dailyPnLPercent <= -5");
      expect(code).toContain("Daily loss limit reached");
    });

    it("does NOT generate daily P&L code when both limits are 0", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      build.settings = { ...DEFAULT_SETTINGS, maxDailyProfitPercent: 0, maxDailyLossPercent: 0 };
      const code = generateMQL5Code(build, "Test");
      expect(code).not.toContain("Daily P&L Protection");
    });
  });

  // ============================================
  // AUDIT: Volatility filter
  // ============================================

  describe("volatility filter", () => {
    it("generates ATR-based volatility check when volatility-filter node is present", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("vf1", "volatility-filter", {
          category: "timing",
          filterType: "volatility-filter",
          atrPeriod: 14,
          atrTimeframe: "H1",
          minAtrPips: 10,
          maxAtrPips: 50,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpATRPeriod");
      expect(code).toContain("iATR");
      expect(code).toContain("InpMinATRPips");
      expect(code).toContain("InpMaxATRPips");
    });
  });

  // ============================================
  // Friday close filter
  // ============================================

  describe("friday close filter", () => {
    it("generates friday close code with InpFridayCloseHour and day_of_week == 5", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("fc1", "friday-close", {
          category: "timing",
          filterType: "friday-close",
          closeHour: 17,
          closeMinute: 0,
          useServerTime: true,
          closePending: true,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpFridayCloseHour");
      expect(code).toContain("InpFridayCloseMinute");
      expect(code).toContain("day_of_week == 5");
      expect(code).toContain("PositionClose");
      expect(code).toContain("OrderDelete");
    });

    it("generates friday close without OrderDelete when closePending is false", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("fc1", "friday-close", {
          category: "timing",
          filterType: "friday-close",
          closeHour: 15,
          closeMinute: 30,
          useServerTime: false,
          closePending: false,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpFridayCloseHour");
      expect(code).toContain("day_of_week == 5");
      expect(code).toContain("TimeGMT()");
      expect(code).not.toContain("OrderDelete");
    });
  });

  // ============================================
  // News filter
  // ============================================

  describe("news filter", () => {
    it("generates news filter inputs and helper functions", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("nf1", "news-filter", {
          category: "timing",
          filterType: "news-filter",
          hoursBefore: 0.5,
          hoursAfter: 0.5,
          highImpact: true,
          mediumImpact: false,
          lowImpact: false,
          closePositions: false,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpNewsMinBefore");
      expect(code).toContain("InpNewsMinAfter");
      expect(code).toContain("IsNewsTime");
      expect(code).toContain("RefreshNewsCache");
      expect(code).toContain("LoadNewsFromCSV");
      expect(code).toContain("ExportNewsHistory");
      expect(code).toContain("UpdateNewsCSV");
      expect(code).toContain("g_isTesting");
      expect(code).toContain("SYMBOL_CURRENCY_BASE");
    });

    it("generates close positions code when closePositions is true", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("nf1", "news-filter", {
          category: "timing",
          filterType: "news-filter",
          hoursBefore: 1,
          hoursAfter: 1,
          highImpact: true,
          mediumImpact: false,
          lowImpact: false,
          closePositions: true,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("InpNewsClosePos");
      expect(code).toContain("PositionClose");
      expect(code).toContain("InpNewsHigh");
      expect(code).toContain("InpNewsMedium");
      expect(code).toContain("InpNewsLow");
    });

    it("includes setup guide only when news filter is present", () => {
      const withNews = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("nf1", "news-filter", {
          category: "timing",
          filterType: "news-filter",
          hoursBefore: 0.5,
          hoursAfter: 0.5,
          highImpact: true,
          mediumImpact: false,
          lowImpact: false,
          closePositions: false,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const codeWith = generateMQL5Code(withNews, "Test");
      expect(codeWith).toContain("NEWS FILTER — SETUP GUIDE");
      expect(codeWith).toContain("STEP 1");
      expect(codeWith).toContain("STEP 2");
      expect(codeWith).toContain("STEP 3");
      expect(codeWith).toContain("ea_builder_news.csv");

      const withoutNews = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const codeWithout = generateMQL5Code(withoutNews, "Test");
      expect(codeWithout).not.toContain("NEWS FILTER — SETUP GUIDE");
    });

    it("does not generate close positions loop when closePositions is false", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("nf1", "news-filter", {
          category: "timing",
          filterType: "news-filter",
          hoursBefore: 0.5,
          hoursAfter: 0.5,
          highImpact: true,
          mediumImpact: false,
          lowImpact: false,
          closePositions: false,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("IsNewsTime");
      // The news filter onTick block should NOT contain the close-positions loop
      // (PositionClose appears only in the news filter close block, not from friday-close or other)
      const newsFilterSection = code.split("//--- News filter")[1]?.split("//---")[0] ?? "";
      expect(newsFilterSection).not.toContain("PositionClose");
    });
  });

  // ============================================
  // AUDIT: PERCENT SL directional pricing
  // ============================================

  describe("PERCENT SL directional pricing", () => {
    it("generates slSellPips using BID for sell direction", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("sl1", "stop-loss", {
          category: "trading",
          tradingType: "stop-loss",
          method: "PERCENT",
          fixedPips: 50,
          slPercent: 1,
          atrMultiplier: 1.5,
          atrPeriod: 14,
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
        makeNode("s1", "place-sell", {
          category: "trading",
          tradingType: "place-sell",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      expect(code).toContain("SYMBOL_ASK) * InpSLPercent");
      expect(code).toContain("SYMBOL_BID) * InpSLPercent");
      expect(code).toContain("slSellPips");
    });
  });

  // ============================================
  // AUDIT: Signal mode (candle_close vs every_tick)
  // ============================================

  describe("signal mode", () => {
    it("uses shifted buffer indices for candle_close mode", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("rsi1", "rsi", {
          category: "indicator",
          indicatorType: "rsi",
          timeframe: "H1",
          period: 14,
          overboughtLevel: 70,
          oversoldLevel: 30,
          appliedPrice: "CLOSE",
          signalMode: "candle_close",
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // candle_close mode copies 4 bars and uses [1] and [2] for confirmed closes
      expect(code).toContain("CopyBuffer");
      // RSI crossover uses both s+0 and s+1 indices — with candle_close (s=1), that's [1] and [2]
      expect(code).toContain("Buffer[1]");
      expect(code).toContain("Buffer[2]");
    });

    it("uses current bar indices for every_tick mode", () => {
      const build = makeBuild([
        makeNode("t1", "always", { category: "timing", timingType: "always" }),
        makeNode("rsi1", "rsi", {
          category: "indicator",
          indicatorType: "rsi",
          timeframe: "H1",
          period: 14,
          overboughtLevel: 70,
          oversoldLevel: 30,
          appliedPrice: "CLOSE",
          signalMode: "every_tick",
        }),
        makeNode("b1", "place-buy", {
          category: "trading",
          tradingType: "place-buy",
          method: "FIXED_LOT",
          fixedLot: 0.1,
          riskPercent: 2,
          minLot: 0.01,
          maxLot: 10,
        }),
      ]);
      const code = generateMQL5Code(build, "Test");
      // every_tick mode (s=0) uses [0] and [1] for RSI crossover detection
      expect(code).toContain("Buffer[0]");
      expect(code).toContain("Buffer[1]");
    });
  });
});
