/**
 * Multilingual label dictionary for MT5 report metric extraction.
 *
 * MT5 Strategy Tester reports use label-based rows (e.g., "Total Net Profit")
 * in the user's terminal language. This dictionary maps known labels across
 * EN, DE, ES, RU, FR, and PT to canonical metric keys.
 */

export type MetricKey =
  | "totalNetProfit"
  | "grossProfit"
  | "grossLoss"
  | "profitFactor"
  | "expectedPayoff"
  | "maxDrawdown"
  | "sharpeRatio"
  | "recoveryFactor"
  | "totalTrades"
  | "shortPositionsWon"
  | "longPositionsWon"
  | "profitTradesPercent"
  | "lossTradesPercent"
  | "largestProfitTrade"
  | "largestLossTrade"
  | "avgProfitTrade"
  | "avgLossTrade"
  | "maxConsecutiveWins"
  | "maxConsecutiveLosses"
  | "initialDeposit"
  | "symbol"
  | "period"
  | "balance";

/** Map from lowercase label text → canonical metric key */
const LABEL_MAP: Record<string, MetricKey> = {};

const TRANSLATIONS: Record<MetricKey, string[]> = {
  totalNetProfit: [
    "total net profit",
    "nettogewinn gesamt",
    "beneficio neto total",
    "итого чистая прибыль",
    "profit net total",
    "lucro líquido total",
  ],
  grossProfit: [
    "gross profit",
    "bruttogewinn",
    "beneficio bruto",
    "валовая прибыль",
    "profit brut",
    "lucro bruto",
  ],
  grossLoss: [
    "gross loss",
    "bruttoverlust",
    "pérdida bruta",
    "валовой убыток",
    "perte brute",
    "perda bruta",
  ],
  profitFactor: [
    "profit factor",
    "gewinnfaktor",
    "factor de beneficio",
    "прибыльность",
    "facteur de profit",
    "fator de lucro",
  ],
  expectedPayoff: [
    "expected payoff",
    "erwartete auszahlung",
    "beneficio esperado",
    "математическое ожидание",
    "gain espéré",
    "retorno esperado",
  ],
  maxDrawdown: [
    "maximal drawdown",
    "balance drawdown maximal",
    "equity drawdown maximal",
    "maximaler drawdown",
    "drawdown máximo",
    "максимальная просадка",
    "drawdown maximal",
    "drawdown máximo do saldo",
  ],
  sharpeRatio: [
    "sharpe ratio",
    "sharpe-ratio",
    "ratio de sharpe",
    "коэффициент шарпа",
    "ratio de sharpe",
    "índice de sharpe",
  ],
  recoveryFactor: [
    "recovery factor",
    "erholungsfaktor",
    "factor de recuperación",
    "фактор восстановления",
    "facteur de récupération",
    "fator de recuperação",
  ],
  totalTrades: [
    "total trades",
    "trades gesamt",
    "total de transacciones",
    "всего сделок",
    "total des transactions",
    "total de negociações",
  ],
  shortPositionsWon: [
    "short positions (won %)",
    "short-positionen (gewinn %)",
    "posiciones cortas (% de ganancia)",
    "короткие позиции (% выигравших)",
    "positions courtes (% de gain)",
    "posições curtas (% ganhas)",
  ],
  longPositionsWon: [
    "long positions (won %)",
    "long-positionen (gewinn %)",
    "posiciones largas (% de ganancia)",
    "длинные позиции (% выигравших)",
    "positions longues (% de gain)",
    "posições longas (% ganhas)",
  ],
  profitTradesPercent: [
    "profit trades (% of total)",
    "gewinn-trades (% des gesamt)",
    "transacciones con beneficio (% del total)",
    "прибыльные сделки (% от всех)",
    "transactions profitables (% du total)",
    "negociações com lucro (% do total)",
  ],
  lossTradesPercent: [
    "loss trades (% of total)",
    "verlust-trades (% des gesamt)",
    "transacciones con pérdida (% del total)",
    "убыточные сделки (% от всех)",
    "transactions à perte (% du total)",
    "negociações com perda (% do total)",
  ],
  largestProfitTrade: [
    "largest profit trade",
    "größter gewinntrade",
    "mayor transacción con beneficio",
    "самая большая прибыльная сделка",
    "plus grande transaction profitable",
    "maior negociação com lucro",
  ],
  largestLossTrade: [
    "largest loss trade",
    "größter verlusttrade",
    "mayor transacción con pérdida",
    "самая большая убыточная сделка",
    "plus grande transaction à perte",
    "maior negociação com perda",
  ],
  avgProfitTrade: [
    "average profit trade",
    "durchschnittlicher gewinntrade",
    "transacción de beneficio media",
    "средняя прибыльная сделка",
    "transaction profitable moyenne",
    "negociação com lucro média",
  ],
  avgLossTrade: [
    "average loss trade",
    "durchschnittlicher verlusttrade",
    "transacción de pérdida media",
    "средняя убыточная сделка",
    "transaction à perte moyenne",
    "negociação com perda média",
  ],
  maxConsecutiveWins: [
    "maximum consecutive wins",
    "maximale aufeinanderfolgende gewinne",
    "máximo de ganancias consecutivas",
    "максимальная серия выигрышей",
    "gains consécutifs maximum",
    "máximo de vitórias consecutivas",
  ],
  maxConsecutiveLosses: [
    "maximum consecutive losses",
    "maximale aufeinanderfolgende verluste",
    "máximo de pérdidas consecutivas",
    "максимальная серия проигрышей",
    "pertes consécutives maximum",
    "máximo de derrotas consecutivas",
  ],
  initialDeposit: [
    "initial deposit",
    "anfangseinlage",
    "depósito inicial",
    "начальный депозит",
    "dépôt initial",
    "depósito inicial",
  ],
  symbol: ["symbol", "symbol", "símbolo", "символ", "symbole", "símbolo"],
  period: ["period", "zeitraum", "período", "период", "période", "período"],
  balance: ["balance", "saldo", "balance", "баланс", "solde", "saldo"],
};

// Build the reverse lookup map
for (const [key, labels] of Object.entries(TRANSLATIONS)) {
  for (const label of labels) {
    LABEL_MAP[label.toLowerCase()] = key as MetricKey;
  }
}

/**
 * Look up a metric key from a label string found in the HTML report.
 * Returns null if no known metric matches.
 */
export function lookupMetricKey(label: string): MetricKey | null {
  const normalized = label.toLowerCase().trim();

  // Exact match first
  if (LABEL_MAP[normalized]) return LABEL_MAP[normalized];

  // Fuzzy: check if any known label is a substring of the input
  for (const [knownLabel, key] of Object.entries(LABEL_MAP)) {
    if (normalized.includes(knownLabel)) {
      return key;
    }
  }

  return null;
}
