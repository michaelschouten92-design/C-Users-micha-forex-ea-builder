/**
 * Prop firm landing page data — source for /prop-firms/[slug] programmatic pages.
 *
 * IMPORTANT: prop firm rules change frequently (typically quarterly). Every
 * entry has a `lastVerified` date. Before rendering a page for a firm whose
 * `lastVerified` is > 90 days old, the page template must display a "rules
 * may have changed" disclaimer linking to the firm's official rules page.
 *
 * DO NOT rely on this file as source-of-truth for compliance. The rules here
 * are summarized for SEO discoverability and comparison; the firm's own
 * website is authoritative. The Feature `officialUrl` is always linked
 * prominently on every generated page.
 *
 * Adding a firm: append to PROP_FIRMS, set `lastVerified` to today's ISO
 * date, ensure slug is unique. Run src/data/prop-firms.test.ts.
 */

export interface PropFirmProgram {
  name: string;
  /** Number of challenge phases (0 = instant funding, 1 = one-step, 2 = two-step). */
  phases: 0 | 1 | 2;
  /** Typical account sizes in USD. Informational, not exhaustive. */
  accountSizes: readonly number[];
  /** Profit target for first phase, as percentage of account. */
  profitTargetPhase1Pct: number | null;
  /** Profit target for second phase (null if one-step or instant). */
  profitTargetPhase2Pct: number | null;
  /** Maximum daily loss as percentage of account. */
  maxDailyLossPct: number;
  /** Maximum overall drawdown as percentage of account. */
  maxOverallDrawdownPct: number;
}

export interface PropFirmFAQ {
  q: string;
  a: string;
}

export type EAPolicy =
  | "allowed" // EAs freely permitted
  | "allowed-with-restrictions" // permitted with rules (no copy-trade, no news, etc.)
  | "case-by-case" // approval required
  | "restricted" // limited categories only
  | "prohibited";

export interface PropFirm {
  slug: string;
  name: string;
  /** Absolute URL to the firm's homepage. Always outbound-linked on the page. */
  officialUrl: string;
  /** Year founded (for E-E-A-T trust signals). */
  founded: number;
  /** ISO 3166-1 alpha-2 (e.g., "CZ" for Czech Republic). */
  hqCountryCode: string;
  hqCity: string;
  /** Short one-sentence positioning summary. */
  tagline: string;
  /** 2-3 paragraphs of overview content, rendered verbatim in the hero section. */
  overview: string;

  programs: readonly PropFirmProgram[];
  eaPolicy: EAPolicy;
  /** Human-readable restrictions (e.g., "No high-frequency scalping, no copy trading"). */
  eaRestrictions: readonly string[];
  /** Typical payout split ("90/10" means trader gets 90%). */
  payoutSplit: string;
  /** Are weekend / holding overnight allowed for funded accounts? */
  holdOvernight: boolean;
  holdWeekend: boolean;

  /** Algo Studio self-assessed compatibility, 1-10. Documented heuristic, not marketing fluff. */
  algoStudioCompatibility: {
    score: number;
    summary: string;
    fitsWell: readonly string[];
    caveats: readonly string[];
  };

  /** Recommended EA configuration notes for this firm's rules. */
  configurationNotes: readonly string[];

  faqs: readonly PropFirmFAQ[];

  /** ISO date "YYYY-MM-DD" when this entry was last sanity-checked. Critical. */
  lastVerified: string;

  /** Slugs of sibling firms to cross-link. */
  relatedFirms: readonly string[];
}

export const PROP_FIRMS: readonly PropFirm[] = [
  {
    slug: "ftmo",
    name: "FTMO",
    officialUrl: "https://ftmo.com",
    founded: 2015,
    hqCountryCode: "CZ",
    hqCity: "Prague",
    tagline:
      "The most established prop firm for retail forex traders — two-step Challenge with explicit EA permission.",
    overview:
      "FTMO is the veteran of the retail prop firm space, having funded tens of thousands of traders since 2015. Their two-step Challenge → Verification → Funded pipeline is the model that most competitors imitate. For EA traders, FTMO is a safe default choice because the rules are clearly documented, the platform supports MetaTrader 5, and Expert Advisors are explicitly permitted (with documented restrictions).\n\nThe firm has tightened rules over the years as arbitrage strategies proliferated, so check the latest Terms & Conditions on ftmo.com before applying. In particular, the consistency rule and news-trading restrictions have seen multiple revisions.",
    programs: [
      {
        name: "FTMO Challenge",
        phases: 2,
        accountSizes: [10_000, 25_000, 50_000, 100_000, 200_000],
        profitTargetPhase1Pct: 10,
        profitTargetPhase2Pct: 5,
        maxDailyLossPct: 5,
        maxOverallDrawdownPct: 10,
      },
    ],
    eaPolicy: "allowed-with-restrictions",
    eaRestrictions: [
      "No high-frequency scalping (holding positions for very short durations)",
      "No copy trading from external signal sources",
      "No latency arbitrage or price-feed exploitation",
      "News trading may be restricted during high-impact events — check current T&Cs",
    ],
    payoutSplit: "80/20 (up to 90/10 with Scaling Plan)",
    holdOvernight: true,
    holdWeekend: true,
    algoStudioCompatibility: {
      score: 9,
      summary:
        "Excellent fit. FTMO's clearly-defined drawdown rules align with Algo Studio's health scoring and auto-halt functionality.",
      fitsWell: [
        "Drift detection catches EA degradation before daily loss limit is hit",
        "Auto-halt prevents runaway losses on FTMO's strict daily-loss rule",
        "Verified track record makes Scaling Plan applications straightforward",
      ],
      caveats: [
        "High-frequency scalpers should check current FTMO HFT policy",
        "Baseline backtest must reflect realistic spread/commission on FTMO's broker",
      ],
    },
    configurationNotes: [
      "Set Algo Studio's auto-halt threshold tighter than FTMO's 5% daily loss limit — you need headroom for the governance action to land",
      "Use FTMO's allowed broker's spread/commission profile when uploading your backtest baseline, not a retail MT5 default",
      "Enable Telegram alerts for drift detection AND auto-halt — redundancy matters on Challenge accounts",
    ],
    faqs: [
      {
        q: "Are EAs allowed on FTMO Challenge accounts?",
        a: "Yes, Expert Advisors are explicitly allowed on FTMO Challenge and Verification accounts. There are restrictions on high-frequency scalping, copy trading from external signal services, and latency arbitrage. Check the current T&Cs on ftmo.com before submitting.",
      },
      {
        q: "What happens to my EA if I breach FTMO's daily loss limit?",
        a: "The account is immediately terminated. This is why the combination of Algo Studio's drift detection + auto-halt is especially valuable for FTMO accounts — the auto-halt triggers before you reach the daily loss limit, giving you a chance to investigate instead of blowing the account.",
      },
      {
        q: "Can I run the same EA on multiple FTMO accounts?",
        a: "Technically yes, but FTMO's rules prohibit running identical strategies across multiple accounts to amplify payouts. They detect this. Monitor each account independently in Algo Studio.",
      },
      {
        q: "Does FTMO allow weekend position holding?",
        a: "As of last verification, yes. Overnight and weekend holding are permitted on FTMO Challenge and funded accounts. Always check current rules before relying on this.",
      },
    ],
    lastVerified: "2026-04-13",
    relatedFirms: ["e8", "fundednext", "the-funded-trader"],
  },
  {
    slug: "e8",
    name: "E8 Markets",
    officialUrl: "https://e8markets.com",
    founded: 2021,
    hqCountryCode: "CZ",
    hqCity: "Prague",
    tagline:
      "E8 Markets (formerly E8 Funding) offers flexible evaluation formats including single-step and instant-funding programs for EA traders.",
    overview:
      "E8 Markets is one of the newer prop firms that built its reputation on program flexibility. Where FTMO sticks to a rigid two-step Challenge, E8 offers single-step, two-step, and instant-funding variants with different profit targets and pricing. For EA traders, this means picking the evaluation format that best matches how long a strategy takes to reach its edge.\n\nE8's E-Lite (instant funding) program in particular is interesting for EAs with consistent low-variance edges — no evaluation phase, but tighter drawdown rules. Check e8markets.com for current program availability and rules.",
    programs: [
      {
        name: "E8 Evaluation",
        phases: 2,
        accountSizes: [25_000, 50_000, 100_000, 250_000],
        profitTargetPhase1Pct: 8,
        profitTargetPhase2Pct: 5,
        maxDailyLossPct: 5,
        maxOverallDrawdownPct: 8,
      },
      {
        name: "E8 Track",
        phases: 1,
        accountSizes: [25_000, 50_000, 100_000],
        profitTargetPhase1Pct: 8,
        profitTargetPhase2Pct: null,
        maxDailyLossPct: 4,
        maxOverallDrawdownPct: 8,
      },
    ],
    eaPolicy: "allowed-with-restrictions",
    eaRestrictions: [
      "No copy trading from external signal services",
      "No HFT or tick-scalping strategies",
      "Consistency rule may apply on some programs — avoid single oversized wins",
    ],
    payoutSplit: "80/20 (with bonuses available)",
    holdOvernight: true,
    holdWeekend: true,
    algoStudioCompatibility: {
      score: 8,
      summary: "Strong fit for EA traders with multiple program options to match strategy type.",
      fitsWell: [
        "Instant-funding (E-Lite) program suits EAs with consistent low-variance edges",
        "Drift detection valuable on tighter 4% daily loss programs",
      ],
      caveats: [
        "Consistency rules on some programs penalize EAs with occasional large winners",
        "Verify current program rules — E8 has revised programs multiple times",
      ],
    },
    configurationNotes: [
      "For E8's instant funding (E-Lite), use Algo Studio's Monte Carlo analysis to verify your strategy's worst-case drawdown fits the 4% daily limit",
      "Health score threshold should be set higher than usual — E8's consistency rule penalizes large single wins, so monitor win-size variance",
    ],
    faqs: [
      {
        q: "Can I use an EA on E8 Markets?",
        a: "Yes, E8 Markets permits Expert Advisors on their evaluation and funded accounts. HFT and external copy-trading are restricted. Check current E8 Markets T&Cs before applying.",
      },
      {
        q: "Which E8 program is best for EAs?",
        a: "Depends on your strategy. For EAs with consistent low-variance edges, the instant-funding E-Lite program skips evaluation but has tighter daily loss limits. For EAs that need time to demonstrate edge, the standard two-step evaluation is safer.",
      },
      {
        q: "Does E8 have a consistency rule that affects EAs?",
        a: "Some E8 programs enforce a consistency rule — no single trading day can contribute more than a certain percentage of total profit. EAs with occasional large winners can inadvertently breach this. Review your backtest P&L distribution in Algo Studio before choosing the program.",
      },
    ],
    lastVerified: "2026-04-13",
    relatedFirms: ["ftmo", "fundednext", "the-funded-trader"],
  },
  {
    slug: "fundednext",
    name: "FundedNext",
    officialUrl: "https://fundednext.com",
    founded: 2022,
    hqCountryCode: "AE",
    hqCity: "Dubai",
    tagline:
      "Dubai-based prop firm with aggressive scaling, weekend hold permissions, and flexible EA rules.",
    overview:
      "FundedNext has grown rapidly since 2022 by offering account sizes and payout structures that differentiate from the FTMO-style template. Their scaling plan is aggressive — account sizes can grow substantially with consistent profitability. For EA traders, FundedNext is attractive because weekend holding and overnight positions are permitted across most programs.\n\nRules have evolved quickly as the firm has scaled. Always check fundednext.com for current program specifications. The firm has offered both two-step Evaluation and one-step Express programs.",
    programs: [
      {
        name: "FundedNext Evaluation",
        phases: 2,
        accountSizes: [15_000, 25_000, 50_000, 100_000, 200_000],
        profitTargetPhase1Pct: 8,
        profitTargetPhase2Pct: 5,
        maxDailyLossPct: 5,
        maxOverallDrawdownPct: 10,
      },
      {
        name: "FundedNext Express",
        phases: 1,
        accountSizes: [5_000, 15_000, 25_000, 50_000, 100_000],
        profitTargetPhase1Pct: 10,
        profitTargetPhase2Pct: null,
        maxDailyLossPct: 5,
        maxOverallDrawdownPct: 10,
      },
    ],
    eaPolicy: "allowed-with-restrictions",
    eaRestrictions: [
      "No mass market order abuse",
      "No copy trading between accounts",
      "News trading may be restricted — check T&Cs",
    ],
    payoutSplit: "80/20 (up to 90/10 with scaling)",
    holdOvernight: true,
    holdWeekend: true,
    algoStudioCompatibility: {
      score: 8,
      summary:
        "Good fit, particularly for swing EAs that benefit from overnight and weekend holding.",
      fitsWell: [
        "Swing EAs with overnight/weekend holding strategies",
        "One-step Express program for EAs with proven edge",
      ],
      caveats: [
        "Verify current payout and scaling terms — these have changed several times",
        "Dubai jurisdiction means different regulatory framework than EU-based firms",
      ],
    },
    configurationNotes: [
      "Weekend holding is explicitly allowed — safe to let swing EAs run over the weekend",
      "For Express (one-step) accounts, tighten auto-halt threshold — no second chance",
    ],
    faqs: [
      {
        q: "Does FundedNext allow EAs?",
        a: "Yes, FundedNext permits Expert Advisors on both Evaluation and Express programs. Standard restrictions apply: no copy trading between accounts, no obvious market abuse patterns.",
      },
      {
        q: "Can I hold positions over the weekend with FundedNext?",
        a: "Yes, FundedNext permits weekend holding as of last verification. This makes it suitable for swing EAs that cannot reasonably flatten all positions by Friday close.",
      },
      {
        q: "Is FundedNext's Express (one-step) better than Evaluation for EAs?",
        a: "Express is faster to fund but has a higher profit target and no second chance. Evaluation gives your EA more runway to demonstrate edge. If your backtest Monte Carlo survival probability is >90%, Express is viable. Below that, Evaluation is safer.",
      },
    ],
    lastVerified: "2026-04-13",
    relatedFirms: ["ftmo", "e8", "the-funded-trader"],
  },
  {
    slug: "the-funded-trader",
    name: "The Funded Trader",
    officialUrl: "https://thefundedtraderprogram.com",
    founded: 2021,
    hqCountryCode: "US",
    hqCity: "Orlando, Florida",
    tagline:
      "US-based prop firm with multiple challenge tracks — Standard, Rapid, Royal, and Knight — each with different rules for different EA styles.",
    overview:
      "The Funded Trader (TFT) is a US-based prop firm that has built a reputation for offering multiple challenge formats, letting traders choose the rule set that best fits their strategy. Standard and Rapid are the most common for EA traders. The Royal program adds higher payout potential; the Knight program has unique scaling mechanics.\n\nTFT's EA policy has historically been permissive, but like all prop firms, has added restrictions as abuse patterns emerged. Always verify current rules on thefundedtraderprogram.com.",
    programs: [
      {
        name: "TFT Standard Challenge",
        phases: 2,
        accountSizes: [10_000, 25_000, 50_000, 100_000, 200_000, 400_000],
        profitTargetPhase1Pct: 10,
        profitTargetPhase2Pct: 5,
        maxDailyLossPct: 5,
        maxOverallDrawdownPct: 10,
      },
      {
        name: "TFT Rapid Challenge",
        phases: 2,
        accountSizes: [10_000, 25_000, 50_000, 100_000, 200_000],
        profitTargetPhase1Pct: 8,
        profitTargetPhase2Pct: 4,
        maxDailyLossPct: 4,
        maxOverallDrawdownPct: 6,
      },
    ],
    eaPolicy: "allowed-with-restrictions",
    eaRestrictions: [
      "No HFT / tick-scalping",
      "No arbitrage or latency exploitation",
      "No copy trading from external sources",
    ],
    payoutSplit: "80/20 (higher on Royal program)",
    holdOvernight: true,
    holdWeekend: true,
    algoStudioCompatibility: {
      score: 7,
      summary:
        "Good fit, but Rapid's tighter drawdown rules demand disciplined risk configuration.",
      fitsWell: [
        "Standard Challenge gives EAs breathing room to handle normal variance",
        "Multiple account sizes up to $400k for scaling proven EAs",
      ],
      caveats: [
        "Rapid's 4% daily / 6% max drawdown is tight — many backtested EAs fail Monte Carlo survival at these limits",
        "US regulatory environment can introduce broker liquidity differences from EU-focused firms",
      ],
    },
    configurationNotes: [
      "Before choosing Rapid, run your backtest through Algo Studio's Monte Carlo — 6% overall drawdown is a hard limit that many EAs fail statistically",
      "Standard Challenge's 10% overall drawdown is more forgiving for EAs with higher variance",
    ],
    faqs: [
      {
        q: "Can I use EAs on The Funded Trader?",
        a: "Yes, TFT permits Expert Advisors on all challenge programs. Restrictions include no HFT, no arbitrage, and no external copy trading. Confirm current rules on their official site.",
      },
      {
        q: "Which TFT program fits EA traders best?",
        a: "Standard Challenge is safer for EAs with higher variance. Rapid Challenge is more capital-efficient but has tight drawdown limits — run your backtest through Monte Carlo to verify your EA can survive 6% overall drawdown statistically.",
      },
    ],
    lastVerified: "2026-04-13",
    relatedFirms: ["ftmo", "e8", "fundednext"],
  },
] as const;

export function getPropFirmBySlug(slug: string): PropFirm | undefined {
  return PROP_FIRMS.find((f) => f.slug === slug);
}

export function getAllPropFirms(): readonly PropFirm[] {
  return PROP_FIRMS;
}

/** Returns true if the firm's rules were verified more than N days ago. */
export function isStaleEntry(firm: PropFirm, maxAgeDays = 90): boolean {
  const verified = new Date(firm.lastVerified).getTime();
  const ageDays = (Date.now() - verified) / (1000 * 60 * 60 * 24);
  return ageDays > maxAgeDays;
}

export function getRelatedPropFirms(slug: string): PropFirm[] {
  const firm = getPropFirmBySlug(slug);
  if (!firm) return [];
  return firm.relatedFirms
    .map((s) => getPropFirmBySlug(s))
    .filter((f): f is PropFirm => f !== undefined);
}
