/**
 * Feature landing page data — source for /features/[slug] programmatic pages.
 *
 * Each entry is real Algo Studio functionality, grounded in existing FAQ + About
 * copy. Content is deliberately long-form for SEO (600-1000 words per field
 * when rendered) — these are not templates for thin content.
 *
 * Adding a new feature: append to FEATURES, ensure the slug is unique, run
 * src/data/features.test.ts to validate shape.
 */

export interface FeatureFAQ {
  q: string;
  a: string;
}

export interface FeatureSection {
  heading: string;
  /** Rendered as semantic HTML (paragraphs auto-split on blank line). No user input. */
  body: string;
}

export interface Feature {
  slug: string;
  /** H1 + <title> base — page metadata appends "| Algo Studio" to title. */
  name: string;
  /** Meta title override when default is too long. Keep ≤ 60 chars. */
  metaTitle: string;
  /** Meta description. Keep 140-158 chars. */
  metaDescription: string;
  /** Hero subheading, 1-2 sentences. */
  tagline: string;
  /** Primary target keyword for internal SEO tracking (not rendered). */
  primaryKeyword: string;
  /** Secondary keywords tracked for long-tail (not rendered). */
  secondaryKeywords: readonly string[];
  /** Ordered long-form sections below the hero. */
  sections: readonly FeatureSection[];
  faqs: readonly FeatureFAQ[];
  /** Slugs of sibling features to cross-link. */
  relatedFeatures: readonly string[];
  /** Blog post slugs from src/lib/blog/posts.ts that are topically related. */
  relatedBlogPosts: readonly string[];
}

export const FEATURES: readonly Feature[] = [
  {
    slug: "drift-detection",
    name: "EA Drift Detection",
    metaTitle: "EA Drift Detection for MT5 Expert Advisors | Algo Studio",
    metaDescription:
      "Catch Expert Advisor degradation weeks before your equity curve shows it. CUSUM statistical drift detection on live MT5 strategies, free.",
    tagline:
      "Catch Expert Advisor degradation weeks before your equity curve shows it. CUSUM statistical monitoring on every live MT5 strategy.",
    primaryKeyword: "ea drift detection",
    secondaryKeywords: [
      "expert advisor drift",
      "mt5 strategy degradation",
      "ea performance decay",
      "cusum trading strategy",
      "detect ea failing",
    ],
    sections: [
      {
        heading: "Why drift kills profitable EAs",
        body: "Every Expert Advisor eventually stops working. Market regime shifts, broker spreads widen, volatility compresses — the specific conditions that made your backtest profitable disappear. The problem is not that this happens. The problem is that you usually discover it after five figures of drawdown, when the equity curve finally bends down hard enough to ignore.\n\nMost traders spot drift too late for two reasons. First, equity curves are noisy — a real drawdown looks identical to normal variance until it is obviously not. Second, human pattern-matching on P&L charts is terrible. You see what you want to see, and the EA keeps trading. Drift detection fixes both problems with statistics instead of intuition.",
      },
      {
        heading: "How CUSUM detects drift before the chart does",
        body: "Algo Studio uses CUSUM — cumulative sum control charts — the same statistical technique that flags manufacturing defects in semiconductor fabs and catches quality regressions in large software systems. The method is simple: accumulate every deviation from your backtest baseline, and when the running sum crosses a calibrated threshold, flag the strategy.\n\nUnlike a simple rolling-window P&L check, CUSUM accumulates directional evidence over time. A run of small losses that would individually look like noise adds up. By the time the sum crosses threshold, you have high confidence the shift is real — not a coincidence — and you can act before the raw equity curve makes it visually obvious.\n\nEach live strategy gets its own CUSUM chart computed against its own uploaded backtest baseline. Thresholds are tuned per strategy based on backtest variance, not global defaults. This is why drift detection is a baseline-required feature: without a backtest, there is no statistical reference point.",
      },
      {
        heading: "What drift detection is not",
        body: "Drift detection is not a stop-loss. It does not kick in on a single bad trade, a drawdown, or a single losing day. Those are normal. CUSUM specifically looks for persistent directional change in the distribution of outcomes — the kind of slow bleed that degrades a strategy over weeks.\n\nIt is also not a prediction of future losses. It is a current-state signal: your EA is now trading outside its historical distribution. What you do with that signal is up to you — pause the strategy, reduce size, investigate broker changes, or re-optimize. Algo Studio surfaces the alert; you decide.",
      },
      {
        heading: "From alert to action: auto-halt governance",
        body: "If you don't want to be woken up by alerts, Algo Studio can halt a drifting EA automatically. When CUSUM crosses your configured threshold, the system issues a governance action to the monitor EA running inside MetaTrader. The EA stops opening new trades on the next tick. Existing positions are untouched — you decide whether to close them manually or let them run.\n\nAuto-halt is opt-in per strategy and off by default. For most traders, a Telegram alert plus a 15-minute cooldown to investigate is the right workflow. But for prop firm accounts where a single runaway day can blow the account, auto-halt is the safety net that makes algorithmic trading survivable.",
      },
    ],
    faqs: [
      {
        q: "How is drift detection different from a trailing drawdown alert?",
        a: "A drawdown alert fires after losses. Drift detection fires when the pattern of outcomes shifts, regardless of current P&L. A strategy can be in drift while still up on the month — CUSUM catches the distribution change early, before losses accumulate.",
      },
      {
        q: "Does drift detection work without a backtest baseline?",
        a: "No. Drift is measured against your own backtest — without a reference distribution, there is nothing to deviate from. Live monitoring still works without a baseline, but drift detection and health scoring require uploading one.",
      },
      {
        q: "How often does the CUSUM run?",
        a: "After every closed trade. The algorithm is incremental — each new trade updates the running sum in O(1) time, so there is no performance cost to checking continuously rather than on a schedule.",
      },
      {
        q: "Can I tune the sensitivity?",
        a: "Yes. The default CUSUM parameters are calibrated to flag drift with ~95% confidence after a statistically meaningful sample. Aggressive users can tighten thresholds; defensive users can loosen them. Sensitivity is set per strategy.",
      },
    ],
    relatedFeatures: ["health-score", "auto-halt", "monte-carlo"],
    relatedBlogPosts: [
      "avoid-overfitting-expert-advisor",
      "risk-management-for-forex-ea",
      "5-mistakes-automating-trading-strategies",
    ],
  },
  {
    slug: "health-score",
    name: "Strategy Health Score",
    metaTitle: "MT5 Strategy Health Score — Live vs Backtest | Algo Studio",
    metaDescription:
      "Composite 0-100 health score comparing live MT5 EA performance to backtest baseline across return, drawdown, win rate, volatility, and trade frequency.",
    tagline:
      "One number that tells you whether your EA is still the EA you backtested. Five weighted metrics, updated after every trade.",
    primaryKeyword: "ea health score",
    secondaryKeywords: [
      "trading strategy health score",
      "mt5 ea performance score",
      "live vs backtest comparison",
      "ea scorecard",
    ],
    sections: [
      {
        heading: "Five metrics, one score",
        body: "Every live trade updates five independently-scored dimensions: return rate, maximum drawdown, win rate, return volatility, and trade frequency. Each is compared to your uploaded backtest baseline and normalized to a 0-100 component score. The overall health score is a weighted composite.\n\nWeights are not democratic. Drawdown and volatility get the most weight because they are the first things to move when an EA starts breaking. Return rate matters but is noisy over short windows. Win rate and trade frequency round out the picture — a strategy trading half as often as its backtest is usually a sign something upstream changed.",
      },
      {
        heading: "Why composite beats single-metric monitoring",
        body: "Any single metric can mislead. Profit factor looks fine during a losing streak if the few wins are large. Win rate looks fine while average loss grows. Drawdown is backward-looking. Individually, each can be gamed or masked. Together, they move in correlated ways when an EA is genuinely breaking — and diverge in ways that reveal specific failure modes.\n\nA composite also reduces false positives. Any single metric may breach threshold for normal variance reasons. Requiring several components to degrade in concert is a much stronger signal than any one alarm.",
      },
      {
        heading: "Reading the score",
        body: "A healthy strategy sits at 75-100. Scores between 50-75 indicate the strategy is trading within an acceptable but wider-than-expected envelope — worth a look, not an alarm. Below 50, something specific has gone wrong: compare the component breakdown to see whether it is drawdown, trade frequency, or volatility that is driving the degradation. The component view almost always points at the root cause faster than inspecting raw trades.",
      },
    ],
    faqs: [
      {
        q: "Is the health score the same as drift detection?",
        a: "No. Health score is a composite snapshot of current performance versus baseline. Drift detection is a statistical trigger on accumulating directional change. A strategy can have a high health score while drift detection fires (meaning: still profitable overall, but the pattern is shifting). Both matter.",
      },
      {
        q: "What data feeds the health score?",
        a: "Closed trades from the monitor EA running inside your MetaTrader 5 terminal. Aggregated per-trade outcomes (timestamp, symbol, side, P&L, duration, slippage) are hashed into the proof chain and fed into the scoring pipeline.",
      },
      {
        q: "How quickly does the score update?",
        a: "Within seconds of a closed trade arriving. The pipeline is incremental — the score is recomputed from the new trade + previous aggregates, not from scratch — so latency is effectively just network round-trip.",
      },
    ],
    relatedFeatures: ["drift-detection", "monte-carlo", "proof-of-record"],
    relatedBlogPosts: [
      "backtest-your-ea-metatrader5",
      "risk-management-for-forex-ea",
      "avoid-overfitting-expert-advisor",
    ],
  },
  {
    slug: "monte-carlo",
    name: "Monte Carlo Backtest Analysis",
    metaTitle: "MT5 Monte Carlo Simulation for Expert Advisors | Algo Studio",
    metaDescription:
      "Monte Carlo analysis on MT5 backtests: 10,000 trade-shuffled simulations reveal survival probability, worst-case drawdown, and equity curve robustness.",
    tagline:
      "Your backtest is one sample of thousands of possible histories. Monte Carlo tells you how lucky the path you got was.",
    primaryKeyword: "monte carlo backtest mt5",
    secondaryKeywords: [
      "ea monte carlo simulation",
      "backtest robustness test",
      "monte carlo expert advisor",
      "trade sequence randomization",
    ],
    sections: [
      {
        heading: "A backtest is one path; Monte Carlo shows the distribution",
        body: "Your MT5 Strategy Tester produces one equity curve: the specific sequence of trades that happened, in the order they happened. That is a single sample from the distribution of all possible orderings of those same trades. If you had taken the same trades in a different sequence — say, the month of losses before the month of gains instead of after — the maximum drawdown on the curve could be drastically different, even though the final P&L is identical.\n\nMonte Carlo reshuffles the trade sequence thousands of times to produce a distribution of possible equity curves. The 5th percentile curve shows you a realistic worst case. The median curve shows what is typical. The spread between them tells you how dependent the strategy is on lucky trade ordering.",
      },
      {
        heading: "What survival probability actually means",
        body: "Algo Studio runs 10,000 shuffled simulations per backtest upload and reports: median drawdown, 95th percentile drawdown, survival probability (percentage of simulations that do not breach a target maximum drawdown), and expected days to recovery.\n\nA strategy with 60% survival means four in ten sequence orderings of the same trades breach your drawdown tolerance. That is often surprising — and it is exactly the surprise that separates traders who know their risk from traders who got lucky. Survival below 70% typically means the strategy is too thin (not enough trades, or too dependent on a few large winners). Survival above 90% is robust.",
      },
      {
        heading: "When Monte Carlo reveals curve fitting",
        body: "If your backtest P&L is €10,000 but the 5th percentile Monte Carlo outcome is −€3,000, you have a curve-fit strategy. The specific sequence of trades that produced the backtest is an outlier among possible orderings — in most parallel universes, the same trades lose money.\n\nThis is the fastest curve-fitting detector for EAs that pass a traditional backtest. It does not require out-of-sample data, walk-forward testing, or parameter sweeps. It works on the trade list you already have.",
      },
    ],
    faqs: [
      {
        q: "What does Monte Carlo assume about trade independence?",
        a: "It assumes trades can be resampled with replacement or reordered. This is a reasonable approximation for most strategies but breaks down for strategies with path dependence (e.g., pyramiding, martingale, grid systems). For those, Monte Carlo underestimates tail risk.",
      },
      {
        q: "Can I run Monte Carlo on live trades instead of backtests?",
        a: "Currently the analysis runs at backtest upload. Running Monte Carlo on the live trade sample is a planned feature — see the roadmap.",
      },
      {
        q: "How many simulations are enough?",
        a: "Algo Studio uses 10,000 simulations per analysis, which produces tight confidence intervals on percentile estimates. Diminishing returns kick in beyond ~5,000 — we do 10k because it is still fast.",
      },
    ],
    relatedFeatures: ["drift-detection", "health-score", "proof-of-record"],
    relatedBlogPosts: [
      "backtest-your-ea-metatrader5",
      "avoid-overfitting-expert-advisor",
      "risk-management-trading-bots",
    ],
  },
  {
    slug: "proof-of-record",
    name: "Cryptographic Proof of Trading Record",
    metaTitle: "Tamper-Proof Trading Track Records | Algo Studio",
    metaDescription:
      "Cryptographic proof of live trading performance. Hash-chain integrity, independent verification, and exportable proof bundles for prop firms and investors.",
    tagline:
      "A trading record that nobody can edit — not you, not us, not a hosting provider. Hash-chain integrity, independent verification.",
    primaryKeyword: "verified trading track record",
    secondaryKeywords: [
      "tamper proof trading record",
      "cryptographic trading proof",
      "trading performance verification",
      "ea track record proof",
      "forex myfxbook alternative proof",
    ],
    sections: [
      {
        heading: "The problem with screenshotted track records",
        body: "Trading track records are easy to fake. Screenshots of MyFxBook, edited account statements, cherry-picked periods, even the MT5 'Investor password' view can be misleading. Prop firms, investors, and copy-trading subscribers all face the same problem: the track record they are shown is almost impossible to independently verify.\n\nThe industry has worked around this with trusted third parties — MyFxBook, FxBlue, the occasional auditor — but these are fundamentally honor-based. They read data from your account and display it. If the third party is compromised or colludes, the record is worthless.",
      },
      {
        heading: "How hash-chain proof works",
        body: "Algo Studio assigns a cryptographic hash to every trade event the moment it is ingested. Each hash includes the previous trade's hash, so any attempt to edit, delete, or reorder past trades invalidates every subsequent hash in the chain — detectable instantly, without trusting us.\n\nThe chain root is published periodically. A third party with the root can verify any trade in the history by recomputing hashes forward from the signed point. Editing a single loss-making trade three months ago is arithmetically impossible without rewriting the entire chain since that trade — and the published roots prevent that.\n\nThis is the same primitive that makes blockchains tamper-evident, applied to trade ledgers rather than currency.",
      },
      {
        heading: "Proof bundles for prop firms and investors",
        body: "A proof bundle is a single JSON file containing the full trade history, the hash chain, signed roots, and the backtest baseline for drift computation. Anyone can download the bundle from a public proof page and run the included verifier (or upload it to /verify on algo-studio.com) to independently confirm the record has not been edited since each trade was logged.\n\nThis works for prop firm applications (prove live profitability before applying), investor due diligence (signal providers can share a verifiable track record), and regulatory needs (keep an immutable audit trail).",
      },
    ],
    faqs: [
      {
        q: "Can Algo Studio forge a track record?",
        a: "Not without invalidating the hash chain. Every trade is signed incrementally, and chain roots are published publicly. Forgery would require retroactively signing a new chain that matches a previously-published root — mathematically intractable.",
      },
      {
        q: "What happens if I disconnect the EA for a week?",
        a: "The gap is visible and timestamped. The proof chain does not falsely fill in the missing period. Traders and prop firms can see exactly when live data was collected and when it was not.",
      },
      {
        q: "Is the proof bundle compatible with MyFxBook or similar?",
        a: "No. The bundle format is specific to Algo Studio's chain. However, the underlying trade data can be exported as MT5 standard HTML reports separately for use with other tools.",
      },
    ],
    relatedFeatures: ["health-score", "monte-carlo", "auto-halt"],
    relatedBlogPosts: ["what-is-an-expert-advisor", "5-mistakes-automating-trading-strategies"],
  },
  {
    slug: "auto-halt",
    name: "Automatic EA Halt on Drift",
    metaTitle: "Automatic EA Halt on Strategy Drift | Algo Studio",
    metaDescription:
      "Auto-stop your MT5 Expert Advisor when drift is detected. Governance actions push to the monitor EA, halting new trades without touching open positions.",
    tagline:
      "When statistical drift crosses threshold, your EA stops opening new trades automatically. Open positions are preserved — you decide what to do next.",
    primaryKeyword: "auto halt ea",
    secondaryKeywords: [
      "stop ea on drift",
      "mt5 ea governance",
      "ea kill switch",
      "auto disable expert advisor",
    ],
    sections: [
      {
        heading: "Alerts are not enough for unattended accounts",
        body: "Telegram alerts work when you are at a desk. They fail when a strategy breaks at 3am on a Saturday, when you are on a flight, or when the drift-triggering condition is a slow bleed that looks innocuous individually. Prop firm accounts with daily drawdown limits compound the problem: a single bad 24-hour run from a drifting EA can blow the account before you read the notification.\n\nAuto-halt closes the loop. When the drift threshold is crossed, Algo Studio pushes a governance action to the monitor EA running inside your MetaTrader 5 terminal. On the next market tick, the EA stops opening new trades. No human in the loop required.",
      },
      {
        heading: "What auto-halt does not touch",
        body: "Open positions are preserved. Auto-halt is a stop-entry signal, not a close-all. This is intentional — forcing market exits during news spikes or off-hours liquidity vacuums causes more damage than the drift itself.\n\nYou decide whether to close positions manually, trail them with a tighter stop, or let the existing exit logic run. The EA will not open new entries until you re-enable it from the dashboard.",
      },
      {
        heading: "Per-strategy, opt-in, reversible",
        body: "Auto-halt is off by default and configured per strategy. Some traders want it on for prop firm accounts where the daily drawdown rule is the real risk. Others want alerts only for personal accounts where they prefer a discretionary decision. Both are valid; the system supports both.\n\nEvery auto-halt event is logged as a governance action, signed into the same proof chain as trades. The full history of start/halt/resume events is auditable.",
      },
    ],
    faqs: [
      {
        q: "Can I override auto-halt for a specific strategy?",
        a: "Yes. Toggle auto-halt per strategy in settings. You can also resume a halted strategy from the dashboard once you've confirmed the drift was transient or resolved.",
      },
      {
        q: "What happens to pending orders?",
        a: "Pending orders (limit, stop) are left in place. Auto-halt prevents new order placement — it does not cancel existing orders. Cancel them manually if needed.",
      },
      {
        q: "Does auto-halt work if the EA is offline when drift triggers?",
        a: "The governance action is queued. The next time the monitor EA connects, it receives the halt directive before resuming trading.",
      },
    ],
    relatedFeatures: ["drift-detection", "health-score"],
    relatedBlogPosts: [
      "risk-management-for-forex-ea",
      "risk-management-trading-bots",
      "prop-firm-ea-settings",
    ],
  },
] as const;

export function getFeatureBySlug(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug);
}

export function getAllFeatures(): readonly Feature[] {
  return FEATURES;
}

export function getRelatedFeatures(slug: string): Feature[] {
  const feat = getFeatureBySlug(slug);
  if (!feat) return [];
  return feat.relatedFeatures
    .map((s) => getFeatureBySlug(s))
    .filter((f): f is Feature => f !== undefined);
}
