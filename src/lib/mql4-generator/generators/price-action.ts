import type {
  BuilderNode,
  CandlestickPatternNodeData,
  SupportResistanceNodeData,
  RangeBreakoutNodeData,
} from "@/types/builder";
import type { GeneratedCode } from "../types";
import { getTimeframe, getTimeframeEnum } from "../types";
import { createInput } from "./shared";

export function generatePriceActionCode(
  node: BuilderNode,
  index: number,
  code: GeneratedCode
): void {
  const data = node.data;
  const varPrefix = `pa${index}`;

  // Determine price action type
  const priceActionType = ("priceActionType" in data ? data.priceActionType : null) || node.type;

  if (priceActionType) {
    switch (priceActionType) {
      case "range-breakout": {
        const rb = data as RangeBreakoutNodeData;

        // Track range end time for RangeReady check (set in SESSION/TIME_WINDOW branch)
        let rangeEndHourExpr: string | null = null;
        let rangeEndMinExpr: string | null = null;
        let rangeTimeFunc = "TimeCurrent()";

        // Add inputs
        if (rb.rangeType === "PREVIOUS_CANDLES") {
          code.inputs.push(
            createInput(
              node,
              "lookbackCandles",
              `InpRange${index}Lookback`,
              "int",
              rb.lookbackCandles,
              `Range ${index + 1} Lookback Candles`
            )
          );
        }
        code.inputs.push(
          createInput(
            node,
            "bufferPips",
            `InpRange${index}Buffer`,
            "double",
            rb.bufferPips,
            `Range ${index + 1} Buffer (pips)`
          )
        );
        code.inputs.push(
          createInput(
            node,
            "minRangePips",
            `InpRange${index}MinRange`,
            "double",
            rb.minRangePips,
            `Range ${index + 1} Min Size (pips)`
          )
        );
        if (rb.maxRangePips > 0) {
          code.inputs.push(
            createInput(
              node,
              "maxRangePips",
              `InpRange${index}MaxRange`,
              "double",
              rb.maxRangePips,
              `Range ${index + 1} Max Size (pips)`
            )
          );
        }
        code.inputs.push(
          createInput(
            node,
            "timeframe",
            `InpRange${index}Timeframe`,
            "ENUM_AS_TIMEFRAMES",
            getTimeframeEnum(rb.timeframe),
            `Range ${index + 1} Timeframe`
          )
        );
        const breakoutTf =
          ((rb as Record<string, unknown>).breakoutTimeframe as string) ?? rb.timeframe;
        if (breakoutTf !== rb.timeframe) {
          code.inputs.push(
            createInput(
              node,
              "breakoutTimeframe",
              `InpRange${index}BreakoutTF`,
              "ENUM_AS_TIMEFRAMES",
              getTimeframeEnum(breakoutTf),
              `Range ${index + 1} Breakout Timeframe`
            )
          );
        }

        // Add global variables
        code.globalVariables.push(`double ${varPrefix}High;`);
        code.globalVariables.push(`double ${varPrefix}Low;`);
        code.globalVariables.push(`double ${varPrefix}Size;`);
        code.globalVariables.push(`bool ${varPrefix}Valid;`);
        code.globalVariables.push(`datetime ${varPrefix}LastResetDay;`);
        code.globalVariables.push(`bool ${varPrefix}BreakoutUp;`);
        code.globalVariables.push(`bool ${varPrefix}BreakoutDown;`);

        // Generate range calculation code
        code.onTick.push(`// Range Breakout ${index + 1}`);
        code.onTick.push(`datetime ${varPrefix}Today = iTime(Symbol(), PERIOD_D1, 0);`);
        code.onTick.push("");
        code.onTick.push(`//--- Midnight reset: clean slate for new day`);
        code.onTick.push(`if(${varPrefix}Today != ${varPrefix}LastResetDay) {`);
        code.onTick.push(`   ${varPrefix}LastResetDay = ${varPrefix}Today;`);
        code.onTick.push(
          `   ${varPrefix}High = 0; ${varPrefix}Low = 0; ${varPrefix}Valid = false;`
        );
        code.onTick.push(`   for(int i = OrdersTotal() - 1; i >= 0; i--) {`);
        code.onTick.push(`      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;`);
        code.onTick.push(
          `      if(OrderType() > OP_SELL && OrderMagicNumber() == InpMagicNumber && OrderSymbol() == Symbol())`
        );
        code.onTick.push(`         OrderDelete(OrderTicket());`);
        code.onTick.push(`   }`);
        code.onTick.push(
          `   Print("Range ${index + 1}: New day - range reset, pending orders cleared");`
        );
        code.onTick.push(`}`);
        code.onTick.push("");
        code.onTick.push(`if(isNewBar) {`);

        if (rb.rangeType === "PREVIOUS_CANDLES") {
          // Calculate range from previous X candles
          code.onTick.push(
            `int ${varPrefix}HighBar = iHighest(Symbol(), (int)InpRange${index}Timeframe, MODE_HIGH, InpRange${index}Lookback, 1);`
          );
          code.onTick.push(
            `int ${varPrefix}LowBar = iLowest(Symbol(), (int)InpRange${index}Timeframe, MODE_LOW, InpRange${index}Lookback, 1);`
          );
          code.onTick.push(
            `${varPrefix}High = (${varPrefix}HighBar >= 0) ? iHigh(Symbol(), (int)InpRange${index}Timeframe, ${varPrefix}HighBar) : 0;`
          );
          code.onTick.push(
            `${varPrefix}Low = (${varPrefix}LowBar >= 0) ? iLow(Symbol(), (int)InpRange${index}Timeframe, ${varPrefix}LowBar) : 0;`
          );
        } else if (rb.rangeType === "SESSION" || rb.rangeType === "TIME_WINDOW") {
          // Session-based range calculation
          let startHour = rb.sessionStartHour;
          let startMinute = rb.sessionStartMinute;
          let endHour = rb.sessionEndHour;
          let endMinute = rb.sessionEndMinute;

          // Predefined sessions
          if (rb.rangeType === "SESSION" && rb.rangeSession !== "CUSTOM") {
            switch (rb.rangeSession) {
              case "ASIAN":
                startHour = 0;
                startMinute = 0;
                endHour = 8;
                endMinute = 0;
                break;
              case "LONDON":
                startHour = 8;
                startMinute = 0;
                endHour = 16;
                endMinute = 0;
                break;
              case "NEW_YORK":
                startHour = 13;
                startMinute = 0;
                endHour = 21;
                endMinute = 0;
                break;
            }
          }

          // Add helper function for session range calculation
          const useServerTime = rb.useServerTime ?? true;
          const timeFunc = useServerTime ? "TimeCurrent()" : "TimeGMT()";
          if (!code.helperFunctions.some((f) => f.includes("GetSessionRange"))) {
            code.helperFunctions.push(`
//+------------------------------------------------------------------+
//| Get high/low for a specific time range                            |
//+------------------------------------------------------------------+
void GetSessionRange(int tf, int startHour, int startMin, int endHour, int endMin, double &high, double &low, bool useGMT = false)
{
   high = 0;
   low = DBL_MAX;

   datetime startTime = 0, endTime = 0;
   MqlDateTime dt;
   TimeToStruct(useGMT ? TimeGMT() : TimeCurrent(), dt);

   // Set start time (today or yesterday if session hasn't started yet)
   dt.hour = startHour;
   dt.min = startMin;
   dt.sec = 0;
   startTime = StructToTime(dt);

   // Set end time
   dt.hour = endHour;
   dt.min = endMin;
   endTime = StructToTime(dt);

   // If end is before start, session spans midnight (adjust dates)
   if(endTime <= startTime) {
      // Session hasn't ended yet, use yesterday's start
      startTime -= 86400;
   }

   // If current time is before session end, we're looking at today's session
   datetime now = useGMT ? TimeGMT() : TimeCurrent();
   if(now < endTime) {
      // Use yesterday's session
      startTime -= 86400;
      endTime -= 86400;
   }

   // Find bars in this range
   int startBar = iBarShift(Symbol(), tf, startTime, false);
   int endBar = iBarShift(Symbol(), tf, endTime, false);

   if(startBar < 0 || endBar < 0 || startBar <= endBar) {
      high = 0;
      low = 0;
      return;
   }

   // Get high/low — use endBar+1 to exclude the bar at session end (it extends past the session)
   int count = startBar - endBar;
   if(count <= 0) { high = 0; low = 0; return; }
   int highestBar = iHighest(Symbol(), tf, MODE_HIGH, count, endBar + 1);
   int lowestBar = iLowest(Symbol(), tf, MODE_LOW, count, endBar + 1);
   if(highestBar < 0 || lowestBar < 0) { high = 0; low = 0; return; }

   high = iHigh(Symbol(), tf, highestBar);
   low = iLow(Symbol(), tf, lowestBar);
}`);
          }

          // Make custom time window hours optimizable input parameters
          const isCustomRange =
            rb.rangeType === "TIME_WINDOW" ||
            (rb.rangeType === "SESSION" && rb.rangeSession === "CUSTOM");
          if (isCustomRange) {
            const rangeGroup = `Range ${index + 1}`;
            code.inputs.push(
              createInput(
                node,
                "sessionStartHour",
                `InpRange${index}StartHour`,
                "int",
                startHour,
                `Range ${index + 1} Start Hour`,
                rangeGroup
              )
            );
            code.inputs.push(
              createInput(
                node,
                "sessionStartMinute",
                `InpRange${index}StartMin`,
                "int",
                startMinute,
                `Range ${index + 1} Start Minute`,
                rangeGroup
              )
            );
            code.inputs.push(
              createInput(
                node,
                "sessionEndHour",
                `InpRange${index}EndHour`,
                "int",
                endHour,
                `Range ${index + 1} End Hour`,
                rangeGroup
              )
            );
            code.inputs.push(
              createInput(
                node,
                "sessionEndMinute",
                `InpRange${index}EndMin`,
                "int",
                endMinute,
                `Range ${index + 1} End Minute`,
                rangeGroup
              )
            );
            code.onTick.push(
              `GetSessionRange((int)InpRange${index}Timeframe, InpRange${index}StartHour, InpRange${index}StartMin, InpRange${index}EndHour, InpRange${index}EndMin, ${varPrefix}High, ${varPrefix}Low, ${!useServerTime});`
            );
          } else {
            code.onTick.push(
              `GetSessionRange((int)InpRange${index}Timeframe, ${startHour}, ${startMinute}, ${endHour}, ${endMinute}, ${varPrefix}High, ${varPrefix}Low, ${!useServerTime});`
            );
          }

          // Track range end time for RangeReady check
          if (isCustomRange) {
            rangeEndHourExpr = `InpRange${index}EndHour`;
            rangeEndMinExpr = `InpRange${index}EndMin`;
          } else {
            rangeEndHourExpr = String(endHour);
            rangeEndMinExpr = String(endMinute);
          }
          rangeTimeFunc = useServerTime ? "TimeCurrent()" : "TimeGMT()";
        }

        // Calculate range size and validity
        code.onTick.push(
          `${varPrefix}Size = (${varPrefix}High - ${varPrefix}Low) / _Point / _pipFactor; // Range size in pips`
        );

        let validityCondition = `${varPrefix}High > 0 && ${varPrefix}Low > 0 && ${varPrefix}Size >= InpRange${index}MinRange`;
        if (rb.maxRangePips > 0) {
          validityCondition += ` && ${varPrefix}Size <= InpRange${index}MaxRange`;
        }
        code.onTick.push(`${varPrefix}Valid = (${validityCondition});`);
        code.onTick.push(`}`); // end if(isNewBar)

        // Generate breakout detection based on entry mode
        const bufferPoints = `InpRange${index}Buffer * _pipFactor * _Point`;

        if (rb.entryMode === "IMMEDIATE") {
          code.onTick.push(
            `${varPrefix}BreakoutUp = ${varPrefix}Valid && Ask > ${varPrefix}High + ${bufferPoints};`
          );
          code.onTick.push(
            `${varPrefix}BreakoutDown = ${varPrefix}Valid && Bid < ${varPrefix}Low - ${bufferPoints};`
          );
        } else if (rb.entryMode === "ON_CLOSE") {
          const breakoutTfVar =
            breakoutTf !== rb.timeframe
              ? `InpRange${index}BreakoutTF`
              : `InpRange${index}Timeframe`;
          code.onTick.push(
            `${varPrefix}BreakoutUp = ${varPrefix}Valid && iClose(Symbol(), (int)${breakoutTfVar}, 1) > ${varPrefix}High + ${bufferPoints};`
          );
          code.onTick.push(
            `${varPrefix}BreakoutDown = ${varPrefix}Valid && iClose(Symbol(), (int)${breakoutTfVar}, 1) < ${varPrefix}Low - ${bufferPoints};`
          );
        } else if (rb.entryMode === "AFTER_RETEST") {
          // Retest logic: price broke out then came back and is now moving away again
          code.onTick.push(
            `// Retest breakout: previous candle closed beyond range, current candle retested level`
          );
          code.onTick.push(
            `${varPrefix}BreakoutUp = ${varPrefix}Valid && iClose(Symbol(), (int)InpRange${index}Timeframe, 2) > ${varPrefix}High + ${bufferPoints} && iLow(Symbol(), (int)InpRange${index}Timeframe, 1) <= ${varPrefix}High + ${bufferPoints} && iClose(Symbol(), (int)InpRange${index}Timeframe, 1) > ${varPrefix}High;`
          );
          code.onTick.push(
            `${varPrefix}BreakoutDown = ${varPrefix}Valid && iClose(Symbol(), (int)InpRange${index}Timeframe, 2) < ${varPrefix}Low - ${bufferPoints} && iHigh(Symbol(), (int)InpRange${index}Timeframe, 1) >= ${varPrefix}Low - ${bufferPoints} && iClose(Symbol(), (int)InpRange${index}Timeframe, 1) < ${varPrefix}Low;`
          );
        }

        // NewRange: fires once per day when range is valid and ready
        code.globalVariables.push(`datetime ${varPrefix}RangeDay;`);
        code.onTick.push(`bool ${varPrefix}NewDay = (${varPrefix}Today != ${varPrefix}RangeDay);`);
        if (rangeEndHourExpr !== null) {
          // TIME_WINDOW/SESSION: only place orders after range window has closed
          code.onTick.push(`MqlDateTime ${varPrefix}DtNow;`);
          code.onTick.push(`TimeToStruct(${rangeTimeFunc}, ${varPrefix}DtNow);`);
          code.onTick.push(
            `bool ${varPrefix}RangeReady = ((${varPrefix}DtNow.hour * 60 + ${varPrefix}DtNow.min) >= (${rangeEndHourExpr} * 60 + ${rangeEndMinExpr}));`
          );
          code.onTick.push(
            `bool ${varPrefix}NewRange = (${varPrefix}Valid && ${varPrefix}NewDay && ${varPrefix}RangeReady);`
          );
        } else {
          // PREVIOUS_CANDLES: range is always ready once valid
          code.onTick.push(
            `bool ${varPrefix}NewRange = (${varPrefix}Valid && ${varPrefix}NewDay);`
          );
        }
        code.onTick.push(`if(${varPrefix}NewRange) ${varPrefix}RangeDay = ${varPrefix}Today;`);

        // Visual range lines on chart
        code.onTick.push(`if(${varPrefix}Valid && isNewBar) {`);
        code.onTick.push(
          `   ObjectDelete(0, "Range${index}_High"); ObjectDelete(0, "Range${index}_Low");`
        );
        code.onTick.push(
          `   ObjectCreate(0, "Range${index}_High", OBJ_HLINE, 0, 0, ${varPrefix}High);`
        );
        code.onTick.push(
          `   ObjectSetInteger(0, "Range${index}_High", OBJPROP_COLOR, clrDodgerBlue);`
        );
        code.onTick.push(
          `   ObjectSetInteger(0, "Range${index}_High", OBJPROP_STYLE, STYLE_DASH);`
        );
        code.onTick.push(`   ObjectSetInteger(0, "Range${index}_High", OBJPROP_WIDTH, 2);`);
        code.onTick.push(
          `   ObjectCreate(0, "Range${index}_Low", OBJ_HLINE, 0, 0, ${varPrefix}Low);`
        );
        code.onTick.push(
          `   ObjectSetInteger(0, "Range${index}_Low", OBJPROP_COLOR, clrOrangeRed);`
        );
        code.onTick.push(`   ObjectSetInteger(0, "Range${index}_Low", OBJPROP_STYLE, STYLE_DASH);`);
        code.onTick.push(`   ObjectSetInteger(0, "Range${index}_Low", OBJPROP_WIDTH, 2);`);
        code.onTick.push(`}`);

        // Clean up chart objects on deinit
        code.onDeinit.push(`ObjectDelete(0, "Range${index}_High");`);
        code.onDeinit.push(`ObjectDelete(0, "Range${index}_Low");`);

        code.onTick.push("");
        break;
      }

      case "candlestick-pattern": {
        const cp = data as CandlestickPatternNodeData;

        // Add input for minimum body size
        code.inputs.push(
          createInput(
            node,
            "minBodySize",
            `InpCP${index}MinBody`,
            "double",
            cp.minBodySize,
            `Candle Pattern ${index + 1} Min Body (pips)`
          )
        );

        // Global variables for buy/sell signals
        code.globalVariables.push(`bool ${varPrefix}BuySignal;`);
        code.globalVariables.push(`bool ${varPrefix}SellSignal;`);

        // OnTick: fetch OHLC for last 2 candles
        const cpTf = getTimeframe(cp.timeframe);
        code.onTick.push(`// Candlestick Pattern Detection ${index + 1}`);
        code.onTick.push(`${varPrefix}BuySignal = false;`);
        code.onTick.push(`${varPrefix}SellSignal = false;`);
        code.onTick.push(
          `double ${varPrefix}MinBody = InpCP${index}MinBody * _pipFactor * _Point;`
        );
        code.onTick.push(`double ${varPrefix}O1 = iOpen(Symbol(), ${cpTf}, 1);`);
        code.onTick.push(`double ${varPrefix}C1 = iClose(Symbol(), ${cpTf}, 1);`);
        code.onTick.push(`double ${varPrefix}H1 = iHigh(Symbol(), ${cpTf}, 1);`);
        code.onTick.push(`double ${varPrefix}L1 = iLow(Symbol(), ${cpTf}, 1);`);
        code.onTick.push(`double ${varPrefix}O2 = iOpen(Symbol(), ${cpTf}, 2);`);
        code.onTick.push(`double ${varPrefix}C2 = iClose(Symbol(), ${cpTf}, 2);`);
        code.onTick.push(`double ${varPrefix}H2 = iHigh(Symbol(), ${cpTf}, 2);`);
        code.onTick.push(`double ${varPrefix}L2 = iLow(Symbol(), ${cpTf}, 2);`);
        code.onTick.push(`double ${varPrefix}Body1 = MathAbs(${varPrefix}C1 - ${varPrefix}O1);`);
        code.onTick.push(`double ${varPrefix}Body2 = MathAbs(${varPrefix}C2 - ${varPrefix}O2);`);
        code.onTick.push(`double ${varPrefix}Range1 = ${varPrefix}H1 - ${varPrefix}L1;`);

        // Pre-compute shadow values if needed by selected patterns
        const needsShadows = cp.patterns.some((p) => ["HAMMER", "SHOOTING_STAR"].includes(p));
        if (needsShadows) {
          code.onTick.push(
            `double ${varPrefix}UpperBody1 = MathMax(${varPrefix}O1, ${varPrefix}C1);`
          );
          code.onTick.push(
            `double ${varPrefix}LowerBody1 = MathMin(${varPrefix}O1, ${varPrefix}C1);`
          );
          code.onTick.push(
            `double ${varPrefix}UpperShadow1 = ${varPrefix}H1 - ${varPrefix}UpperBody1;`
          );
          code.onTick.push(
            `double ${varPrefix}LowerShadow1 = ${varPrefix}LowerBody1 - ${varPrefix}L1;`
          );
        }

        // Fetch candle 3 OHLC if 3-candle patterns are selected
        const needs3Candles = cp.patterns.some((p) =>
          ["MORNING_STAR", "EVENING_STAR", "THREE_WHITE_SOLDIERS", "THREE_BLACK_CROWS"].includes(p)
        );
        if (needs3Candles) {
          code.onTick.push(`double ${varPrefix}O3 = iOpen(Symbol(), ${cpTf}, 3);`);
          code.onTick.push(`double ${varPrefix}C3 = iClose(Symbol(), ${cpTf}, 3);`);
          code.onTick.push(`double ${varPrefix}Body3 = MathAbs(${varPrefix}C3 - ${varPrefix}O3);`);
        }

        code.onTick.push("");

        // Generate detection code for each selected pattern
        for (const pattern of cp.patterns) {
          switch (pattern) {
            case "ENGULFING_BULLISH":
              code.onTick.push(
                `// Bullish Engulfing: bearish candle 2 engulfed by bullish candle 1`
              );
              code.onTick.push(
                `if(${varPrefix}C2 < ${varPrefix}O2 && ${varPrefix}C1 > ${varPrefix}O1 && ${varPrefix}Body1 >= ${varPrefix}MinBody && ${varPrefix}C1 > ${varPrefix}O2 && ${varPrefix}O1 < ${varPrefix}C2) ${varPrefix}BuySignal = true;`
              );
              break;

            case "ENGULFING_BEARISH":
              code.onTick.push(
                `// Bearish Engulfing: bullish candle 2 engulfed by bearish candle 1`
              );
              code.onTick.push(
                `if(${varPrefix}C2 > ${varPrefix}O2 && ${varPrefix}C1 < ${varPrefix}O1 && ${varPrefix}Body1 >= ${varPrefix}MinBody && ${varPrefix}C1 < ${varPrefix}O2 && ${varPrefix}O1 > ${varPrefix}C2) ${varPrefix}SellSignal = true;`
              );
              break;

            case "DOJI":
              code.onTick.push(
                `// Doji: tiny body relative to range, direction from prior candle context`
              );
              code.onTick.push(
                `if(${varPrefix}Range1 > 0 && ${varPrefix}Body1 <= ${varPrefix}Range1 * 0.1 && ${varPrefix}Range1 >= ${varPrefix}MinBody)`
              );
              code.onTick.push(`{`);
              code.onTick.push(
                `   if(${varPrefix}C2 < ${varPrefix}O2) ${varPrefix}BuySignal = true;  // Doji after bearish = potential reversal up`
              );
              code.onTick.push(
                `   if(${varPrefix}C2 > ${varPrefix}O2) ${varPrefix}SellSignal = true; // Doji after bullish = potential reversal down`
              );
              code.onTick.push(`}`);
              break;

            case "HAMMER":
              code.onTick.push(
                `// Hammer: small body at top, long lower shadow (bullish reversal)`
              );
              code.onTick.push(
                `if(${varPrefix}Body1 >= ${varPrefix}MinBody && ${varPrefix}Range1 > 0 && ${varPrefix}LowerShadow1 >= ${varPrefix}Body1 * 2 && ${varPrefix}UpperShadow1 <= ${varPrefix}Body1 * 0.5) ${varPrefix}BuySignal = true;`
              );
              break;

            case "SHOOTING_STAR":
              code.onTick.push(
                `// Shooting Star: small body at bottom, long upper shadow (bearish reversal)`
              );
              code.onTick.push(
                `if(${varPrefix}Body1 >= ${varPrefix}MinBody && ${varPrefix}Range1 > 0 && ${varPrefix}UpperShadow1 >= ${varPrefix}Body1 * 2 && ${varPrefix}LowerShadow1 <= ${varPrefix}Body1 * 0.5) ${varPrefix}SellSignal = true;`
              );
              break;

            case "MORNING_STAR":
              code.onTick.push(`// Morning Star: 3-candle bullish reversal`);
              code.onTick.push(
                `if(${varPrefix}C3 < ${varPrefix}O3 && ${varPrefix}Body3 >= ${varPrefix}MinBody`
              );
              code.onTick.push(`   && ${varPrefix}Body2 < ${varPrefix}Body3 * 0.5`);
              code.onTick.push(
                `   && ${varPrefix}C1 > ${varPrefix}O1 && ${varPrefix}Body1 >= ${varPrefix}MinBody`
              );
              code.onTick.push(`   && ${varPrefix}C1 > (${varPrefix}O3 + ${varPrefix}C3) / 2)`);
              code.onTick.push(`   ${varPrefix}BuySignal = true;`);
              break;

            case "EVENING_STAR":
              code.onTick.push(`// Evening Star: 3-candle bearish reversal`);
              code.onTick.push(
                `if(${varPrefix}C3 > ${varPrefix}O3 && ${varPrefix}Body3 >= ${varPrefix}MinBody`
              );
              code.onTick.push(`   && ${varPrefix}Body2 < ${varPrefix}Body3 * 0.5`);
              code.onTick.push(
                `   && ${varPrefix}C1 < ${varPrefix}O1 && ${varPrefix}Body1 >= ${varPrefix}MinBody`
              );
              code.onTick.push(`   && ${varPrefix}C1 < (${varPrefix}O3 + ${varPrefix}C3) / 2)`);
              code.onTick.push(`   ${varPrefix}SellSignal = true;`);
              break;

            case "THREE_WHITE_SOLDIERS":
              code.onTick.push(
                `// Three White Soldiers: 3 consecutive bullish candles with higher closes`
              );
              code.onTick.push(
                `if(${varPrefix}C3 > ${varPrefix}O3 && ${varPrefix}Body3 >= ${varPrefix}MinBody`
              );
              code.onTick.push(
                `   && ${varPrefix}C2 > ${varPrefix}O2 && ${varPrefix}Body2 >= ${varPrefix}MinBody && ${varPrefix}C2 > ${varPrefix}C3`
              );
              code.onTick.push(
                `   && ${varPrefix}C1 > ${varPrefix}O1 && ${varPrefix}Body1 >= ${varPrefix}MinBody && ${varPrefix}C1 > ${varPrefix}C2)`
              );
              code.onTick.push(`   ${varPrefix}BuySignal = true;`);
              break;

            case "THREE_BLACK_CROWS":
              code.onTick.push(
                `// Three Black Crows: 3 consecutive bearish candles with lower closes`
              );
              code.onTick.push(
                `if(${varPrefix}C3 < ${varPrefix}O3 && ${varPrefix}Body3 >= ${varPrefix}MinBody`
              );
              code.onTick.push(
                `   && ${varPrefix}C2 < ${varPrefix}O2 && ${varPrefix}Body2 >= ${varPrefix}MinBody && ${varPrefix}C2 < ${varPrefix}C3`
              );
              code.onTick.push(
                `   && ${varPrefix}C1 < ${varPrefix}O1 && ${varPrefix}Body1 >= ${varPrefix}MinBody && ${varPrefix}C1 < ${varPrefix}C2)`
              );
              code.onTick.push(`   ${varPrefix}SellSignal = true;`);
              break;
          }
        }

        code.onTick.push("");
        break;
      }

      case "support-resistance": {
        const sr = data as SupportResistanceNodeData;

        // Add inputs
        code.inputs.push(
          createInput(
            node,
            "lookbackPeriod",
            `InpSR${index}Lookback`,
            "int",
            sr.lookbackPeriod,
            `S/R ${index + 1} Lookback Period`
          )
        );
        code.inputs.push(
          createInput(
            node,
            "touchCount",
            `InpSR${index}Touches`,
            "int",
            sr.touchCount,
            `S/R ${index + 1} Min Touches`
          )
        );
        code.inputs.push(
          createInput(
            node,
            "zoneSize",
            `InpSR${index}ZoneSize`,
            "double",
            sr.zoneSize,
            `S/R ${index + 1} Zone Size (pips)`
          )
        );

        // Global variables for nearest support/resistance levels
        code.globalVariables.push(`double ${varPrefix}Support;`);
        code.globalVariables.push(`double ${varPrefix}Resistance;`);
        code.globalVariables.push(`bool ${varPrefix}NearSupport;`);
        code.globalVariables.push(`bool ${varPrefix}NearResistance;`);

        // Helper function for finding S/R levels via swing point clustering
        const fnName = `FindSR_${index}`;
        code.helperFunctions.push(`
//+------------------------------------------------------------------+
//| Find nearest Support and Resistance levels                        |
//+------------------------------------------------------------------+
void ${fnName}(int tf, int lookback, int minTouches, double zonePips, double &support, double &resistance)
{
   support = 0;
   resistance = 0;

   // Verify sufficient historical data is available
   int availableBars = iBars(Symbol(), tf);
   if(availableBars < lookback + 1)
   {
      static bool warnedOnce = false;
      if(!warnedOnce) { Print("S/R: insufficient history (", availableBars, " bars, need ", lookback + 1, ")"); warnedOnce = true; }
      return;
   }

   double currentPrice = Bid;
   double zonePoints = zonePips * _pipFactor * _Point;

   // Collect swing highs and swing lows
   double levels[];
   int levelCount = 0;
   ArrayResize(levels, lookback); // Pre-allocate

   for(int i = 2; i < lookback - 1; i++)
   {
      double high_i = iHigh(Symbol(), tf, i);
      double low_i  = iLow(Symbol(), tf, i);
      double high_prev = iHigh(Symbol(), tf, i + 1);
      double low_prev  = iLow(Symbol(), tf, i + 1);
      double high_next = iHigh(Symbol(), tf, i - 1);
      double low_next  = iLow(Symbol(), tf, i - 1);

      // Swing high (potential resistance)
      if(high_i >= high_prev && high_i >= high_next)
      {
         if(levelCount < lookback)
         {
            levels[levelCount] = high_i;
            levelCount++;
         }
      }

      // Swing low (potential support)
      if(low_i <= low_prev && low_i <= low_next)
      {
         if(levelCount < lookback)
         {
            levels[levelCount] = low_i;
            levelCount++;
         }
      }
   }

   if(levelCount == 0) return;
   ArrayResize(levels, levelCount); // Trim to actual size

   // Find clusters: count touches within zone for each level
   double bestSupport = 0;
   double bestResistance = 0;

   for(int i = 0; i < levelCount; i++)
   {
      int touches = 0;
      double levelSum = 0;

      for(int j = 0; j < levelCount; j++)
      {
         if(MathAbs(levels[j] - levels[i]) <= zonePoints)
         {
            touches++;
            levelSum += levels[j];
         }
      }

      if(touches < minTouches) continue;

      double avgLevel = levelSum / touches;

      // Nearest support below current price
      if(avgLevel < currentPrice && (bestSupport == 0 || avgLevel > bestSupport))
         bestSupport = avgLevel;
      // Nearest resistance above current price
      if(avgLevel > currentPrice && (bestResistance == 0 || avgLevel < bestResistance))
         bestResistance = avgLevel;
   }

   support = bestSupport;
   resistance = bestResistance;
}`);

        // OnTick: recalculate on new bar, check proximity every tick
        code.onTick.push(`// Support/Resistance Detection ${index + 1}`);
        code.onTick.push(`if(isNewBar || ${varPrefix}Support == 0)`);
        code.onTick.push(`{`);
        code.onTick.push(
          `   ${fnName}((int)${getTimeframe(sr.timeframe)}, InpSR${index}Lookback, InpSR${index}Touches, InpSR${index}ZoneSize, ${varPrefix}Support, ${varPrefix}Resistance);`
        );
        code.onTick.push(`}`);
        code.onTick.push(
          `double ${varPrefix}ZonePoints = InpSR${index}ZoneSize * _pipFactor * _Point;`
        );
        code.onTick.push(`double ${varPrefix}Bid = Bid;`);
        code.onTick.push(
          `${varPrefix}NearSupport = (${varPrefix}Support > 0 && MathAbs(${varPrefix}Bid - ${varPrefix}Support) <= ${varPrefix}ZonePoints);`
        );
        code.onTick.push(
          `${varPrefix}NearResistance = (${varPrefix}Resistance > 0 && MathAbs(${varPrefix}Bid - ${varPrefix}Resistance) <= ${varPrefix}ZonePoints);`
        );
        code.onTick.push("");
        break;
      }
    }
  }
}
