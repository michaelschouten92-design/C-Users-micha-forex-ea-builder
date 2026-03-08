/**
 * AI Strategy Insights — Analyzes backtest results using OpenAI.
 *
 * Takes parsed backtest metrics and a sample of trades, sends them to OpenAI
 * for deep analysis, and returns structured findings.
 */

import { getOpenAIClient, AI_ANALYSIS_MODEL } from "./openai";
import { logger } from "./logger";
import { openaiCircuit, CircuitOpenError } from "./circuit-breaker";
import type { ParsedMetrics, ParsedDeal } from "./backtest-parser/types";

// ============================================
// Types
// ============================================

export interface StrategyAnalysisInput {
  eaName: string | null;
  symbol: string;
  timeframe: string;
  period: string;
  initialDeposit: number;
  metrics: ParsedMetrics;
  healthScore: number;
  healthStatus: string;
  /** A representative sample of deals (max 200 to keep token count reasonable) */
  deals: ParsedDeal[];
}

export interface StrategyAnalysisResult {
  analysis: string;
  weaknesses: StrategyWeakness[];
  model: string;
}

export interface StrategyWeakness {
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendation: string;
}

// ============================================
// System prompt
// ============================================

const SYSTEM_PROMPT = `You are an expert quantitative trading analyst reviewing MT5 backtest results. Provide a professional, honest assessment of the strategy's viability for live trading.

You will receive strategy metadata, performance metrics, a health score, and a sample of trades.

Analyze the strategy using this framework. Each section should interpret the data, not just restate it.

1. Edge Quality
Evaluate whether the strategy shows a statistically meaningful edge.
Focus on: win rate vs payoff ratio, profit factor, expectancy per trade.

2. Risk Structure
Assess how risk manifests: drawdown depth, loss clustering, volatility of returns.

3. Stability
Evaluate whether the edge appears stable or fragile.
Look for: dependence on a few large trades, asymmetric win/loss distribution, signs of regime sensitivity.

4. Overfitting Risk
Identify signals such as: extremely high win rates (>80%), very few trades, extreme profit factor (>5) with low trade count, suspiciously smooth equity curve.

5. Practical Deployment Risk
Consider what could break in live trading: slippage sensitivity, low trade frequency, fat-tail losses, spread dependency.

6. Edge Decay Risk
Assess the probability that the strategy's edge will degrade in live conditions.
Consider: dependence on a small number of large winners, unstable payoff distribution, long flat periods, low trade count, regime sensitivity.
Classify decay risk as LOW, MEDIUM, or HIGH and explain why in 1-2 sentences.

Behavior rules:
- Do not simply restate raw metrics — interpret what they mean for the strategy
- Be concise, specific, and statistically grounded
- Do not make claims unsupported by the provided metrics or trade sample
- Keep the analysis field under 800 words
- Focus on actionable insights

You MUST respond with valid JSON only. No markdown fences, no prose outside the JSON object.

Required JSON schema:
{
  "analysis": "Full analysis text in markdown format covering all sections above",
  "weaknesses": [
    {
      "category": "OVERFITTING | RISK_MANAGEMENT | MARKET_DEPENDENCY | TRADE_FREQUENCY | PROFITABILITY | ROBUSTNESS | DRAWDOWN",
      "severity": "HIGH | MEDIUM | LOW",
      "description": "Specific finding referencing actual numbers and its implication",
      "recommendation": "Actionable recommendation"
    }
  ]
}`;

// ============================================
// Core function
// ============================================

/**
 * Analyze a backtest using OpenAI.
 * Returns structured analysis or throws if the API is unavailable.
 */
export async function analyzeStrategy(
  input: StrategyAnalysisInput
): Promise<StrategyAnalysisResult | null> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error("AI analysis is not available — OPENAI_API_KEY not configured");
  }

  // Limit deals to 200 to keep token count reasonable
  const dealSample = input.deals.slice(0, 200);

  const userMessage = buildUserMessage(input, dealSample);

  let response;
  try {
    response = await openaiCircuit.execute(() =>
      openai.chat.completions.create(
        {
          model: AI_ANALYSIS_MODEL,
          max_tokens: 2048,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        },
        { timeout: 45000 }
      )
    );
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      logger.warn("AI analysis skipped — circuit breaker open");
    } else {
      logger.error({ error: err }, "AI strategy analysis API call failed");
    }
    return null;
  }

  // Extract text from response
  const fullText = response.choices[0]?.message?.content?.trim() ?? "";
  if (!fullText) {
    throw new Error("OpenAI returned empty analysis content");
  }

  // Parse structured JSON response
  const { analysis, weaknesses } = parseAnalysisJson(fullText);

  logger.info(
    {
      model: response.model,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
    },
    "AI strategy analysis completed"
  );

  return {
    analysis,
    weaknesses,
    model: response.model,
  };
}

// ============================================
// Helpers
// ============================================

/** Sanitize a string for safe inclusion in the prompt — strip XML-like tags to prevent injection. */
function sanitizeForPrompt(value: string): string {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildUserMessage(input: StrategyAnalysisInput, deals: ParsedDeal[]): string {
  const m = input.metrics;
  const eaName = sanitizeForPrompt(input.eaName || "Unknown EA");
  const symbol = sanitizeForPrompt(input.symbol);
  const timeframe = sanitizeForPrompt(input.timeframe);
  const period = sanitizeForPrompt(input.period);

  const parts: string[] = [
    "<strategy_data>",
    `<metadata>`,
    `  <ea_name>${eaName}</ea_name>`,
    `  <symbol>${symbol}</symbol>`,
    `  <timeframe>${timeframe}</timeframe>`,
    `  <period>${period}</period>`,
    `  <initial_deposit>${input.initialDeposit}</initial_deposit>`,
    `  <health_score>${input.healthScore}/100 (${input.healthStatus})</health_score>`,
    `</metadata>`,
    "",
    `<metrics>`,
    `  Total Net Profit: $${m.totalNetProfit.toFixed(2)}`,
    `  Profit Factor: ${m.profitFactor.toFixed(2)}`,
    `  Max Drawdown: ${m.maxDrawdownPct.toFixed(2)}%${m.maxDrawdownAbs != null ? ` ($${m.maxDrawdownAbs.toFixed(2)})` : ""}`,
    `  Expected Payoff: $${m.expectedPayoff.toFixed(2)}`,
    `  Total Trades: ${m.totalTrades}`,
    `  Win Rate: ${m.winRate.toFixed(1)}%`,
  ];

  if (m.sharpeRatio != null) parts.push(`  Sharpe Ratio: ${m.sharpeRatio.toFixed(2)}`);
  if (m.recoveryFactor != null) parts.push(`  Recovery Factor: ${m.recoveryFactor.toFixed(2)}`);
  if (m.longWinRate != null) parts.push(`  Long Win Rate: ${m.longWinRate.toFixed(1)}%`);
  if (m.shortWinRate != null) parts.push(`  Short Win Rate: ${m.shortWinRate.toFixed(1)}%`);
  if (m.grossProfit != null) parts.push(`  Gross Profit: $${m.grossProfit.toFixed(2)}`);
  if (m.grossLoss != null) parts.push(`  Gross Loss: $${m.grossLoss.toFixed(2)}`);
  if (m.largestProfitTrade != null)
    parts.push(`  Largest Profit Trade: $${m.largestProfitTrade.toFixed(2)}`);
  if (m.largestLossTrade != null)
    parts.push(`  Largest Loss Trade: $${m.largestLossTrade.toFixed(2)}`);
  if (m.maxConsecutiveWins != null) parts.push(`  Max Consecutive Wins: ${m.maxConsecutiveWins}`);
  if (m.maxConsecutiveLosses != null)
    parts.push(`  Max Consecutive Losses: ${m.maxConsecutiveLosses}`);

  parts.push(`</metrics>`);

  if (deals.length > 0) {
    parts.push("", `<trades count="${deals.length}" total="${input.deals.length}">`);
    parts.push("ticket | time | type | volume | price | profit");
    parts.push("--- | --- | --- | --- | --- | ---");

    for (const d of deals) {
      if (d.type === "balance") continue;
      parts.push(
        `${d.ticket} | ${d.openTime} | ${d.type} | ${d.volume} | ${d.price} | ${d.profit.toFixed(2)}`
      );
    }
    parts.push("</trades>");
  }

  parts.push("</strategy_data>");
  parts.push("", "Please analyze this strategy thoroughly based on the data above.");

  return parts.join("\n");
}

// ============================================
// AI Strategy Optimizer
// ============================================

export interface ParameterOptimization {
  parameter: string;
  currentValue: string;
  suggestedValue: string;
  expectedImpact: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
}

interface OptimizeStrategyInput {
  eaName: string | null;
  symbol: string;
  timeframe: string;
  initialDeposit: number;
  metrics: ParsedMetrics;
  deals: ParsedDeal[];
  weaknesses: Array<{
    category: string;
    severity: string;
    description: string;
    recommendation: string;
  }>;
}

const OPTIMIZER_SYSTEM_PROMPT = `You are an expert quantitative trading strategy optimizer. Your job is to suggest concrete parameter changes for an MT5 Expert Advisor based on its backtest performance data and identified weaknesses.

You will receive:
1. Strategy metrics (profit factor, drawdown, win rate, etc.)
2. A sample of trades
3. Previously identified weaknesses

Rules:
- Suggest 3-7 optimizations
- Be specific with parameter names and values
- Base suggestions on actual data, not generic advice
- Confidence: HIGH = very likely to help, MEDIUM = probable improvement, LOW = worth testing
- If you can infer parameters from trade patterns (e.g., SL/TP from price gaps, timeframe from trade frequency), suggest those
- Include risk management parameters (lot size, max positions, SL, TP)
- Include timing parameters if relevant (session filters, day-of-week)
- Focus on the most impactful changes first

You MUST respond with valid JSON only. No markdown, no prose outside the JSON object.

Required JSON schema:
{
  "optimizations": [
    {
      "parameter": "Stop Loss (pips)",
      "currentValue": "50",
      "suggestedValue": "35",
      "expectedImpact": "Reduce max drawdown by ~15%",
      "confidence": "HIGH",
      "reasoning": "..."
    }
  ]
}`;

/**
 * Generate parameter optimization suggestions using OpenAI.
 */
export async function optimizeStrategy(
  input: OptimizeStrategyInput
): Promise<ParameterOptimization[]> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error("AI optimization is not available — OPENAI_API_KEY not configured");
  }

  const m = input.metrics;
  const eaName = input.eaName ? sanitizeForPrompt(input.eaName) : "Unknown EA";

  const parts: string[] = [
    `<strategy_data>`,
    `<metadata>`,
    `  EA: ${eaName}`,
    `  Symbol: ${sanitizeForPrompt(input.symbol)}`,
    `  Timeframe: ${sanitizeForPrompt(input.timeframe)}`,
    `  Initial Deposit: $${input.initialDeposit}`,
    `</metadata>`,
    `<metrics>`,
    `  Profit Factor: ${m.profitFactor.toFixed(2)}`,
    `  Max Drawdown: ${m.maxDrawdownPct.toFixed(2)}%`,
    `  Win Rate: ${m.winRate.toFixed(1)}%`,
    `  Total Trades: ${m.totalTrades}`,
    `  Expected Payoff: $${m.expectedPayoff.toFixed(2)}`,
    `  Net Profit: $${m.totalNetProfit.toFixed(2)}`,
  ];
  if (m.sharpeRatio != null) parts.push(`  Sharpe Ratio: ${m.sharpeRatio.toFixed(2)}`);
  if (m.recoveryFactor != null) parts.push(`  Recovery Factor: ${m.recoveryFactor.toFixed(2)}`);
  parts.push(`</metrics>`);

  if (input.weaknesses.length > 0) {
    parts.push(`<identified_weaknesses>`);
    for (const w of input.weaknesses) {
      parts.push(`  [${w.severity}] ${w.category}: ${w.description}`);
    }
    parts.push(`</identified_weaknesses>`);
  }

  if (input.deals.length > 0) {
    parts.push(`<trade_sample count="${input.deals.length}">`);
    parts.push(`ticket | type | volume | profit`);
    for (const d of input.deals.slice(0, 50)) {
      if (d.type === "balance") continue;
      parts.push(`${d.ticket} | ${d.type} | ${d.volume} | ${d.profit.toFixed(2)}`);
    }
    parts.push(`</trade_sample>`);
  }

  parts.push(`</strategy_data>`);
  parts.push("", "Suggest concrete parameter optimizations based on this data.");

  let response;
  try {
    response = await openaiCircuit.execute(() =>
      openai.chat.completions.create(
        {
          model: AI_ANALYSIS_MODEL,
          max_tokens: 2048,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: OPTIMIZER_SYSTEM_PROMPT },
            { role: "user", content: parts.join("\n") },
          ],
        },
        { timeout: 45000 }
      )
    );
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      logger.warn("AI optimization skipped — circuit breaker open");
    } else {
      logger.error({ error: err }, "AI strategy optimization API call failed");
    }
    return [];
  }

  const fullText = response.choices[0]?.message?.content?.trim() ?? "";
  if (!fullText) {
    throw new Error("OpenAI returned empty optimization content");
  }

  return extractOptimizations(fullText);
}

function extractOptimizations(text: string): ParameterOptimization[] {
  try {
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.optimizations)
        ? parsed.optimizations
        : [];

    return items
      .filter(
        (o: Record<string, unknown>) =>
          o.parameter && o.currentValue && o.suggestedValue && o.expectedImpact
      )
      .map((o: Record<string, unknown>) => ({
        parameter: String(o.parameter),
        currentValue: String(o.currentValue),
        suggestedValue: String(o.suggestedValue),
        expectedImpact: String(o.expectedImpact),
        confidence: (["HIGH", "MEDIUM", "LOW"].includes(String(o.confidence))
          ? String(o.confidence)
          : "MEDIUM") as ParameterOptimization["confidence"],
        reasoning: String(o.reasoning || ""),
      }));
  } catch {
    logger.warn("Failed to parse AI optimizations JSON");
    return [];
  }
}

function parseAnalysisJson(text: string): { analysis: string; weaknesses: StrategyWeakness[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("OpenAI returned invalid analysis JSON");
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.analysis !== "string" || !obj.analysis.trim()) {
    throw new Error("OpenAI returned invalid analysis JSON");
  }

  const analysis = obj.analysis.trim();
  const rawWeaknesses = Array.isArray(obj.weaknesses) ? obj.weaknesses : [];

  const weaknesses = rawWeaknesses
    .filter(
      (w: Record<string, unknown>) => w.category && w.severity && w.description && w.recommendation
    )
    .map((w: Record<string, unknown>) => ({
      category: String(w.category),
      severity: (["HIGH", "MEDIUM", "LOW"].includes(String(w.severity))
        ? String(w.severity)
        : "MEDIUM") as StrategyWeakness["severity"],
      description: String(w.description),
      recommendation: String(w.recommendation),
    }));

  return { analysis, weaknesses };
}
