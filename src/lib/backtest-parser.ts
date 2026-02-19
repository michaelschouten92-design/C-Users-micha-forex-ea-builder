/**
 * Parser for MetaTrader 5 Strategy Tester HTML reports (.htm files).
 *
 * Extracts key performance metrics from the report HTML and returns
 * a structured result object.
 */

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  netProfit: number;
  sharpeRatio: number;
  recoveryFactor: number;
  expectedPayoff: number;
  totalProfit: number;
  totalLoss: number;
  largestWin: number;
  largestLoss: number;
  averageWin: number;
  averageLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  initialDeposit: number;
  finalBalance: number;
  equityCurve: EquityPoint[];
}

export interface EquityPoint {
  trade: number;
  equity: number;
}

/**
 * Extract a numeric value from an MT5 report cell by label.
 * Searches for <td> containing the label text, then reads the next <td> value.
 */
function extractMetric(html: string, label: string): number {
  // MT5 reports use table rows with label in one cell and value in the next
  // Pattern: <td ...>Label</td><td ...>Value</td>
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<td[^>]*>[^<]*${escapedLabel}[^<]*</td>\\s*<td[^>]*>([^<]+)</td>`,
    "i"
  );
  const match = html.match(pattern);
  if (!match) return 0;

  // Clean the value: remove spaces, currency symbols, % signs
  const raw = match[1]
    .trim()
    .replace(/[\s$%]/g, "")
    .replace(/&nbsp;/g, "");
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract a percentage value from a parenthesized portion like "1234.56 (12.34%)"
 */
function extractPercentFromParens(html: string, label: string): number {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<td[^>]*>[^<]*${escapedLabel}[^<]*</td>\\s*<td[^>]*>([^<]+)</td>`,
    "i"
  );
  const match = html.match(pattern);
  if (!match) return 0;

  const parenMatch = match[1].match(/\(([^)]+)%\)/);
  if (!parenMatch) return 0;

  const parsed = parseFloat(parenMatch[1].replace(/[\s]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Try to extract equity curve data from the report.
 * MT5 reports sometimes include deal/trade tables with running equity.
 */
function extractEquityCurve(html: string, initialDeposit: number): EquityPoint[] {
  const points: EquityPoint[] = [];

  // Start with initial deposit
  points.push({ trade: 0, equity: initialDeposit });

  // Look for the deals table - MT5 reports have a table with columns:
  // Time, Deal, Symbol, Type, Direction, Volume, Price, Order, Commission, Fee, Swap, Profit, Balance
  // We extract Profit and compute running balance
  const dealsTableMatch = html.match(
    /<table[^>]*>[\s\S]*?<tr[^>]*>[\s\S]*?Deal[\s\S]*?Profit[\s\S]*?Balance[\s\S]*?<\/tr>([\s\S]*?)<\/table>/i
  );

  if (dealsTableMatch) {
    const tableBody = dealsTableMatch[1];
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let tradeIndex = 0;

    while ((rowMatch = rowPattern.exec(tableBody)) !== null) {
      const cells: string[] = [];
      const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
        cells.push(
          cellMatch[1]
            .trim()
            .replace(/&nbsp;/g, "")
            .replace(/<[^>]*>/g, "")
        );
      }

      // The Balance column is typically the last column
      if (cells.length > 0) {
        const balanceStr = cells[cells.length - 1].replace(/[\s$]/g, "");
        const balance = parseFloat(balanceStr);
        if (!isNaN(balance) && balance > 0) {
          tradeIndex++;
          points.push({ trade: tradeIndex, equity: balance });
        }
      }
    }
  }

  // If we couldn't extract from deals table, generate from net profit
  if (points.length <= 1) {
    return points;
  }

  return points;
}

/**
 * Parse an MT5 Strategy Tester HTML report and extract key metrics.
 */
export function parseMT5Report(html: string): BacktestResult {
  // Core metrics
  const totalTrades = extractMetric(html, "Total Trades") || extractMetric(html, "Total trades");
  const netProfit =
    extractMetric(html, "Total Net Profit") || extractMetric(html, "Total net profit");
  const profitFactor = extractMetric(html, "Profit Factor") || extractMetric(html, "Profit factor");
  const expectedPayoff =
    extractMetric(html, "Expected Payoff") || extractMetric(html, "Expected payoff");
  const sharpeRatio = extractMetric(html, "Sharpe Ratio") || extractMetric(html, "Sharpe ratio");
  const recoveryFactor =
    extractMetric(html, "Recovery Factor") || extractMetric(html, "Recovery factor");

  // Drawdown
  const maxDrawdown =
    extractMetric(html, "Maximal Drawdown") ||
    extractMetric(html, "Maximum Drawdown") ||
    extractMetric(html, "Balance Drawdown Maximal") ||
    extractMetric(html, "Equity Drawdown Maximal");

  const maxDrawdownPercent =
    extractPercentFromParens(html, "Maximal Drawdown") ||
    extractPercentFromParens(html, "Maximum Drawdown") ||
    extractPercentFromParens(html, "Balance Drawdown Maximal") ||
    extractPercentFromParens(html, "Equity Drawdown Maximal");

  // Win/Loss totals
  const totalProfit = extractMetric(html, "Gross Profit") || extractMetric(html, "Gross profit");
  const totalLoss = Math.abs(
    extractMetric(html, "Gross Loss") || extractMetric(html, "Gross loss")
  );

  // Trade details
  const largestWin =
    extractMetric(html, "Largest profit trade") || extractMetric(html, "Largest Profit Trade");
  const largestLoss = Math.abs(
    extractMetric(html, "Largest loss trade") || extractMetric(html, "Largest Loss Trade")
  );
  const averageWin =
    extractMetric(html, "Average profit trade") || extractMetric(html, "Average Profit Trade");
  const averageLoss = Math.abs(
    extractMetric(html, "Average loss trade") || extractMetric(html, "Average Loss Trade")
  );

  // Consecutive
  const maxConsecutiveWins =
    extractMetric(html, "Maximum consecutive wins") || extractMetric(html, "Max consecutive wins");
  const maxConsecutiveLosses =
    extractMetric(html, "Maximum consecutive losses") ||
    extractMetric(html, "Max consecutive losses");

  // Win rate - sometimes directly in report, otherwise calculate
  let winRate = extractMetric(html, "Win Rate") || extractMetric(html, "Win rate");
  if (winRate === 0 && totalTrades > 0) {
    // Try to extract short/long trades won
    const shortWon = extractMetric(html, "Short Trades \\(won %\\)");
    const longWon = extractMetric(html, "Long Trades \\(won %\\)");
    if (shortWon > 0 || longWon > 0) {
      winRate = (shortWon + longWon) / 2;
    }
  }

  // Deposit / Balance
  const initialDeposit =
    extractMetric(html, "Initial Deposit") || extractMetric(html, "Initial deposit") || 10000;
  const finalBalance = initialDeposit + netProfit;

  // Equity curve
  const equityCurve = extractEquityCurve(html, initialDeposit);

  return {
    totalTrades,
    winRate,
    profitFactor,
    maxDrawdown,
    maxDrawdownPercent,
    netProfit,
    sharpeRatio,
    recoveryFactor,
    expectedPayoff,
    totalProfit,
    totalLoss,
    largestWin,
    largestLoss,
    averageWin,
    averageLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    initialDeposit,
    finalBalance,
    equityCurve,
  };
}
