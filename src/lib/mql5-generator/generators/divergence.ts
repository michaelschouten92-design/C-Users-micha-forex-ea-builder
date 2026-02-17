import type { GeneratedCode } from "../types";

/**
 * Adds divergence detection helper functions to the generated MQL5 code.
 * These functions scan for swing highs/lows in price and indicator data
 * to detect bullish and bearish divergences.
 *
 * Call once per generated EA (guarded by caller).
 */
export function generateDivergenceHelpers(code: GeneratedCode): void {
  code.helperFunctions.push(`//+------------------------------------------------------------------+
//| Divergence Detection Helpers                                     |
//+------------------------------------------------------------------+

// Find the bar index of a swing low in a price array.
// A swing low is a bar whose value is <= both its neighbours.
// startBar: first bar to check (inclusive), lookback: max bar to scan,
// minBars: minimum gap from previous found swing.
int DivFindSwingLow(const double &price[], int startBar, int lookback, int minBars)
{
   for(int i = startBar + minBars; i < lookback - 1; i++)
   {
      if(price[i] <= price[i-1] && price[i] <= price[i+1])
         return i;
   }
   return -1;
}

// Find the bar index of a swing high in a price array.
int DivFindSwingHigh(const double &price[], int startBar, int lookback, int minBars)
{
   for(int i = startBar + minBars; i < lookback - 1; i++)
   {
      if(price[i] >= price[i-1] && price[i] >= price[i+1])
         return i;
   }
   return -1;
}

// Check for bullish divergence: price makes lower low, indicator makes higher low.
bool CheckBullishDivergence(const double &priceLow[], const double &indBuffer[], int lookback, int minBars)
{
   int swing1 = DivFindSwingLow(priceLow, 1, lookback, 1);
   if(swing1 < 0) return false;
   int swing2 = DivFindSwingLow(priceLow, swing1, lookback, minBars);
   if(swing2 < 0) return false;
   // Price: lower low (recent swing lower than previous)
   bool priceLowerLow = (priceLow[swing1] < priceLow[swing2]);
   // Indicator: higher low (recent swing higher than previous)
   bool indHigherLow = (indBuffer[swing1] > indBuffer[swing2]);
   return priceLowerLow && indHigherLow;
}

// Check for bearish divergence: price makes higher high, indicator makes lower high.
bool CheckBearishDivergence(const double &priceHigh[], const double &indBuffer[], int lookback, int minBars)
{
   int swing1 = DivFindSwingHigh(priceHigh, 1, lookback, 1);
   if(swing1 < 0) return false;
   int swing2 = DivFindSwingHigh(priceHigh, swing1, lookback, minBars);
   if(swing2 < 0) return false;
   // Price: higher high (recent swing higher than previous)
   bool priceHigherHigh = (priceHigh[swing1] > priceHigh[swing2]);
   // Indicator: lower high (recent swing lower than previous)
   bool indLowerHigh = (indBuffer[swing1] < indBuffer[swing2]);
   return priceHigherHigh && indLowerHigh;
}`);
}
