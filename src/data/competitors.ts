/**
 * Competitor comparison data — source for /alternatives/[slug] pages.
 *
 * These pages target "{competitor} alternative" and "{competitor} vs Algo Studio"
 * queries. The approach is honest comparison, not pure shilling — pages that
 * admit where the competitor wins rank better and convert better than fluff.
 *
 * IMPORTANT: competitor pricing and feature sets change. Every entry has
 * `lastVerified`. Page templates should display a disclaimer when > 90 days
 * old and always link to the competitor's official pricing page.
 *
 * Adding a competitor: append to COMPETITORS, ensure slug is unique. The
 * feature matrix must cover the same FEATURE_DIMENSIONS so comparison is
 * consistent across pages.
 */

export type FeatureLevel = "full" | "partial" | "limited" | "none";

/**
 * Dimensions compared across all competitors. New dimensions require updating
 * every competitor + algoStudio entry. Keep this stable.
 */
export const FEATURE_DIMENSIONS = [
  {
    key: "autoTracking",
    label: "Automatic trade tracking from MT5",
    description: "Live trade ingestion from MetaTrader 5 without manual import.",
  },
  {
    key: "driftDetection",
    label: "Statistical drift detection",
    description: "CUSUM or equivalent statistical monitoring of live vs backtest.",
  },
  {
    key: "healthScore",
    label: "Composite health scoring",
    description: "Single-number score aggregating multiple performance dimensions.",
  },
  {
    key: "monteCarlo",
    label: "Monte Carlo analysis",
    description: "Trade-shuffled simulations to estimate drawdown distribution.",
  },
  {
    key: "cryptographicProof",
    label: "Cryptographic hash-chain proof",
    description: "Tamper-evident track record verifiable without trust.",
  },
  {
    key: "autoHalt",
    label: "Automated strategy halt",
    description: "System can automatically stop a drifting EA.",
  },
  {
    key: "publicProofPages",
    label: "Shareable public proof pages",
    description: "Verified track records with public URLs.",
  },
  {
    key: "freeTier",
    label: "Free tier with full features",
    description: "All core features available on a free plan.",
  },
  {
    key: "alerting",
    label: "Telegram / Discord / email alerts",
    description: "Real-time notifications for important events.",
  },
  {
    key: "tradeJournal",
    label: "Manual trade journaling + notes",
    description: "Structured trade annotations and review workflow.",
  },
] as const;

export type FeatureKey = (typeof FEATURE_DIMENSIONS)[number]["key"];

export type FeatureMatrix = Record<FeatureKey, FeatureLevel>;

export interface CompetitorFAQ {
  q: string;
  a: string;
}

export interface Competitor {
  slug: string;
  name: string;
  officialUrl: string;
  founded: number;
  /**
   * Primary category — informs page positioning and SERP intent alignment.
   * "tracker" = live performance tracking (MyFxBook, FxBlue)
   * "journal" = manual trade journaling (Edgewonk, Tradervue)
   * "analyzer" = backtest/optimization tools (not direct competitors)
   */
  category: "tracker" | "journal" | "analyzer" | "hybrid";

  tagline: string;
  /** Honest 2-3 paragraph overview. Not marketing copy. */
  overview: string;

  pricing: {
    hasFreeTier: boolean;
    /** Cheapest paid tier monthly price, null if free only or per-quote. */
    paidMonthlyFromUsd: number | null;
    /** Brief pricing model summary. */
    summary: string;
  };

  /** Things the competitor does well. Being honest builds credibility. */
  pros: readonly string[];
  /** Things the competitor does poorly or lacks. */
  cons: readonly string[];

  features: FeatureMatrix;

  /**
   * Honest "when to choose {competitor} over Algo Studio" section.
   * Not every competitor comparison should end in "choose us" — pages that
   * admit legitimate use cases for the competitor rank + convert better.
   */
  whenToChooseThem: readonly string[];

  /**
   * Honest "when Algo Studio is the better choice" section.
   */
  whenToChooseUs: readonly string[];

  /** Step-by-step migration guide if the competitor user wants to switch. */
  migrationSteps: readonly string[];

  faqs: readonly CompetitorFAQ[];

  lastVerified: string;

  relatedCompetitors: readonly string[];
}

/**
 * Algo Studio's own feature levels, used as reference on every comparison page.
 * Update if core features change.
 */
export const ALGO_STUDIO_FEATURES: FeatureMatrix = {
  autoTracking: "full",
  driftDetection: "full",
  healthScore: "full",
  monteCarlo: "full",
  cryptographicProof: "full",
  autoHalt: "full",
  publicProofPages: "full",
  freeTier: "full",
  alerting: "full",
  tradeJournal: "partial",
} as const;

export const COMPETITORS: readonly Competitor[] = [
  {
    slug: "myfxbook",
    name: "MyFxBook",
    officialUrl: "https://www.myfxbook.com",
    founded: 2009,
    category: "tracker",
    tagline:
      "The legacy standard for public forex track records — broad adoption, stagnant feature set.",
    overview:
      "MyFxBook has been the default place to display a verified forex track record for over a decade. Its strength is ubiquity: almost every broker supports auto-import, and most prop firms and signal service subscribers expect to see a MyFxBook link. That adoption is real and worth acknowledging.\n\nThe weakness is that the product has barely evolved since the early 2010s. Features like drift detection, health scoring, and cryptographic proof are absent. Verification is honor-based — MyFxBook reads from your account via investor password and displays the results. There is no mathematical guarantee that the record is tamper-proof, and tampering incidents have been documented.\n\nMyFxBook is the right choice if you need the wide adoption and do not need modern analytics. Algo Studio is the right choice if you need verifiable proof and statistical monitoring.",
    pricing: {
      hasFreeTier: true,
      paidMonthlyFromUsd: null,
      summary: "Free core features; revenue primarily from broker affiliate integrations.",
    },
    pros: [
      "Industry-standard — widely recognized by prop firms and signal subscribers",
      "Automatic broker integration for hundreds of brokers",
      "Free core features with no paywall for basic tracking",
      "Large community presence (forums, public track records)",
    ],
    cons: [
      "No statistical drift detection — just raw equity curve display",
      "Verification is trust-based (investor password), not cryptographically proven",
      "No Monte Carlo or backtest comparison analytics",
      "Stagnant feature development — largely unchanged since mid-2010s",
      "Affiliate-driven broker recommendations can create conflicts of interest",
    ],
    features: {
      autoTracking: "full",
      driftDetection: "none",
      healthScore: "none",
      monteCarlo: "none",
      cryptographicProof: "none",
      autoHalt: "none",
      publicProofPages: "full",
      freeTier: "full",
      alerting: "limited",
      tradeJournal: "limited",
    },
    whenToChooseThem: [
      "You need the widest possible adoption — prop firms and signal subscribers are familiar with MyFxBook links specifically",
      "You want a purely descriptive track record without analytics overhead",
      "You have a portfolio of diverse broker connections MyFxBook already integrates with",
    ],
    whenToChooseUs: [
      "You want cryptographic proof that your track record cannot be edited after the fact",
      "You need drift detection to catch EA degradation before it costs you",
      "You run MT5 Expert Advisors and want governance tooling (auto-halt, health scoring)",
      "You want Monte Carlo analysis of your backtests for robustness verification",
    ],
    migrationSteps: [
      "Export your MyFxBook trade history (account → Settings → Export to CSV)",
      "Install the Algo Studio monitor EA on your MetaTrader 5 terminal",
      "Upload your most recent backtest as the baseline for drift detection",
      "Algo Studio begins tracking live trades from the moment the monitor EA connects",
      "If you need MyFxBook adoption during transition, keep both running in parallel — there is no conflict",
    ],
    faqs: [
      {
        q: "Can Algo Studio import my existing MyFxBook history?",
        a: "Partial import is possible via CSV export. However, imported history cannot be cryptographically signed retroactively — it enters the proof chain as 'imported, unverified'. Only trades that flow through the live monitor EA are cryptographically proven.",
      },
      {
        q: "Is Algo Studio free like MyFxBook?",
        a: "Yes. The free Baseline plan includes all features — drift detection, health scoring, cryptographic proof, auto-halt, alerts — with a 1-account limit. Paid plans scale the number of monitored accounts, not feature access.",
      },
      {
        q: "Does Algo Studio work with the same brokers as MyFxBook?",
        a: "Algo Studio connects via the MetaTrader 5 terminal, so any MT5-compatible broker works. Unlike MyFxBook's broker-by-broker API integration, this approach is broker-agnostic — if your broker supports MT5, Algo Studio monitors it.",
      },
      {
        q: "Can I keep my MyFxBook account while using Algo Studio?",
        a: "Yes, the two are fully compatible. Many traders keep a MyFxBook page for adoption and Algo Studio for analytics. The monitor EA does not conflict with MyFxBook's investor-password reader.",
      },
    ],
    lastVerified: "2026-04-13",
    relatedCompetitors: ["fxblue", "tradervue", "edgewonk"],
  },
  {
    slug: "fxblue",
    name: "FxBlue",
    officialUrl: "https://www.fxblue.com",
    founded: 2010,
    category: "tracker",
    tagline:
      "Lean, free forex performance tracker with solid MT4/MT5 support and minimal feature creep.",
    overview:
      "FxBlue is MyFxBook's quieter contemporary — a tracker that has held onto a loyal user base by staying focused on reliable data ingestion and not much else. For traders who find MyFxBook cluttered, FxBlue is the minimalist alternative. Like MyFxBook, it supports MT4 and MT5 and produces public track record pages.\n\nThe feature set is narrower than MyFxBook's. There are fewer analytics views, less community integration, no signal marketplace. FxBlue users typically pair the tracker with other tools for analysis. This is neither a strength nor weakness — just a different product philosophy.\n\nAs with MyFxBook, FxBlue's verification is trust-based. There is no cryptographic record integrity. Tampering is not arithmetically detectable.",
    pricing: {
      hasFreeTier: true,
      paidMonthlyFromUsd: null,
      summary:
        "Fully free for retail traders; paid products are separate tools (Market Maker, Hedger).",
    },
    pros: [
      "Completely free for retail tracking",
      "Clean, no-nonsense interface without clutter",
      "Reliable MT4 + MT5 data ingestion",
      "Offers additional retail trading tools beyond tracking",
    ],
    cons: [
      "Smaller community / less adoption than MyFxBook",
      "No drift detection or advanced analytics",
      "No cryptographic proof of record integrity",
      "No dedicated prop firm / EA monitoring features",
      "Minimal alerting options",
    ],
    features: {
      autoTracking: "full",
      driftDetection: "none",
      healthScore: "none",
      monteCarlo: "none",
      cryptographicProof: "none",
      autoHalt: "none",
      publicProofPages: "full",
      freeTier: "full",
      alerting: "limited",
      tradeJournal: "none",
    },
    whenToChooseThem: [
      "You want the absolute simplest forex tracker with zero feature overhead",
      "You already use other FxBlue tools (Market Maker, Hedger) and want everything in one account",
    ],
    whenToChooseUs: [
      "You run EAs and need drift detection, health scoring, or auto-halt",
      "You need cryptographic proof for prop firm applications or investor demos",
      "You want Monte Carlo analysis of your backtests",
      "You want governance tooling, not just display of P&L",
    ],
    migrationSteps: [
      "Keep FxBlue running if you still want its tracker page",
      "Install the Algo Studio monitor EA — it does not conflict with FxBlue's data collection",
      "Upload a backtest baseline to unlock drift detection and health scoring",
      "Use Algo Studio for analytics; use FxBlue only if you specifically need the FxBlue tracker URL",
    ],
    faqs: [
      {
        q: "Is FxBlue better than Algo Studio?",
        a: "For simple display of P&L, FxBlue is lighter. For monitoring EAs, detecting drift, and producing verifiable proof of performance, Algo Studio is substantially more capable. The right choice depends on what you need the tool to do.",
      },
      {
        q: "Can I use both FxBlue and Algo Studio?",
        a: "Yes. They collect data independently through different mechanisms and do not conflict.",
      },
    ],
    lastVerified: "2026-04-13",
    relatedCompetitors: ["myfxbook", "tradervue", "edgewonk"],
  },
  {
    slug: "tradervue",
    name: "Tradervue",
    officialUrl: "https://www.tradervue.com",
    founded: 2011,
    category: "journal",
    tagline:
      "Manual trade journal focused on review, notes, and discretionary improvement — not EA monitoring.",
    overview:
      "Tradervue is the long-standing trade journal for discretionary traders. Its core value is structured review: attach notes and screenshots to trades, tag setups, track which patterns actually work, and run reports on your own behavior over time. For a systematic EA trader, most of this workflow is irrelevant — the EA does not benefit from discretionary notes.\n\nTradervue does support automated broker import, so it can ingest EA trades, but the product is built around the trader reviewing and journaling, not around statistical monitoring of the system. There is no drift detection, health scoring, or governance. It is a journal, not a monitor.\n\nTradervue is a fine choice for traders whose workflow is primarily manual trade review. For algorithmic trading where the system needs monitoring more than the trader needs journaling, it is the wrong tool.",
    pricing: {
      hasFreeTier: true,
      paidMonthlyFromUsd: 29,
      summary:
        "Free tier for basic journaling; paid plans add unlimited trades, advanced reports, and futures support.",
    },
    pros: [
      "Best-in-class journaling workflow for discretionary traders",
      "Rich notes, tags, and screenshot attachment per trade",
      "Detailed reports on trader behavior and setup performance",
      "Mature product with years of refinement",
    ],
    cons: [
      "Built for discretionary trading — not the right tool for EAs",
      "No statistical drift detection for algorithmic strategies",
      "No backtest comparison or Monte Carlo analysis",
      "No cryptographic proof of record integrity",
      "Paid tier required for unlimited trade history",
    ],
    features: {
      autoTracking: "partial",
      driftDetection: "none",
      healthScore: "limited",
      monteCarlo: "none",
      cryptographicProof: "none",
      autoHalt: "none",
      publicProofPages: "limited",
      freeTier: "limited",
      alerting: "none",
      tradeJournal: "full",
    },
    whenToChooseThem: [
      "You trade discretionarily and your edge comes from pattern recognition plus disciplined review",
      "You need structured journaling with tags, notes, and screenshot attachment",
      "Your workflow is trader-centric, not system-centric",
    ],
    whenToChooseUs: [
      "Your trades come from an EA and you need monitoring, not journaling",
      "You need drift detection and statistical monitoring, not review workflow",
      "You need verifiable proof of an algorithmic track record for prop firms or investors",
    ],
    migrationSteps: [
      "If you journal discretionary trades AND run EAs, use both — they serve different purposes",
      "For EA-only workflows, Algo Studio replaces the monitoring use case Tradervue was never built for",
    ],
    faqs: [
      {
        q: "Can Tradervue monitor my EA like Algo Studio does?",
        a: "Tradervue can import trades from your broker, but it does not detect drift, compute health scores, or run statistical monitoring. It is a journal — it displays and helps you review trades, rather than monitoring whether a system is still working as backtested.",
      },
      {
        q: "Is Algo Studio a replacement for Tradervue?",
        a: "For EA monitoring, yes. For discretionary trade journaling, no — Algo Studio has basic trade logging but does not replicate Tradervue's tag/note/review workflow. Many traders use both for different parts of their workflow.",
      },
    ],
    lastVerified: "2026-04-13",
    relatedCompetitors: ["edgewonk", "myfxbook", "fxblue"],
  },
  {
    slug: "edgewonk",
    name: "Edgewonk",
    officialUrl: "https://edgewonk.com",
    founded: 2014,
    category: "journal",
    tagline: "Premium trading journal for discretionary traders focused on behavioral analytics.",
    overview:
      "Edgewonk competes directly with Tradervue in the discretionary journal space, with heavier emphasis on behavioral analytics — tracking emotional state, rule adherence, and decision quality over time. Like Tradervue, it is a journal, not a system monitor.\n\nFor systematic EA traders, Edgewonk's strengths are mostly wasted. The behavioral tracking is designed for humans making decisions, not for algorithms executing predefined logic. Auto-import from brokers works, but the product's workflow assumes a trader reviewing trades — not a system being monitored statistically.\n\nChoose Edgewonk if discretionary review and behavioral analytics are core to how you improve as a trader. Choose Algo Studio if you need to know whether your EA still works.",
    pricing: {
      hasFreeTier: false,
      paidMonthlyFromUsd: 15,
      summary:
        "One-time license per year, no free tier. Paid products positioned as professional tools.",
    },
    pros: [
      "Behavioral analytics — emotion, rule adherence, decision quality",
      "One-time annual payment model preferred by some traders over subscriptions",
      "Well-regarded for discretionary trader improvement workflows",
      "Custom strategy templates and tagging",
    ],
    cons: [
      "No free tier",
      "Built for discretionary trading; limited value for EAs",
      "No drift detection, health scoring, or Monte Carlo",
      "No cryptographic proof of record",
      "No governance tooling for algorithmic strategies",
    ],
    features: {
      autoTracking: "partial",
      driftDetection: "none",
      healthScore: "none",
      monteCarlo: "none",
      cryptographicProof: "none",
      autoHalt: "none",
      publicProofPages: "none",
      freeTier: "none",
      alerting: "limited",
      tradeJournal: "full",
    },
    whenToChooseThem: [
      "You are a discretionary trader who improves through behavioral analytics",
      "You want emotion and rule-adherence tracking alongside P&L",
      "You prefer annual licenses over monthly subscriptions",
    ],
    whenToChooseUs: [
      "Your trading is algorithmic and your main need is system monitoring",
      "You want a free tier with full features",
      "You need verifiable proof of your track record",
      "You need drift detection and governance on MT5 EAs",
    ],
    migrationSteps: [
      "Edgewonk and Algo Studio serve different workflows — usually no migration needed, they coexist",
      "If you are moving from discretionary to systematic trading, Edgewonk becomes less relevant and Algo Studio becomes more so",
    ],
    faqs: [
      {
        q: "Is Edgewonk suitable for EA traders?",
        a: "Edgewonk's core value is behavioral analysis of discretionary decisions. For EAs, those decisions are fixed in code — there is nothing behavioral to analyze. Edgewonk can still import trades, but you get a small fraction of its value compared to a system monitor like Algo Studio.",
      },
      {
        q: "Does Algo Studio have journaling features like Edgewonk?",
        a: "Basic trade logging, yes. Behavioral analytics, no — and deliberately so. Algo Studio's focus is system monitoring. Many algorithmic traders find they need no journal at all once their EAs are under statistical monitoring.",
      },
    ],
    lastVerified: "2026-04-13",
    relatedCompetitors: ["tradervue", "myfxbook", "fxblue"],
  },
] as const;

export function getCompetitorBySlug(slug: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.slug === slug);
}

export function getAllCompetitors(): readonly Competitor[] {
  return COMPETITORS;
}

export function getRelatedCompetitors(slug: string): Competitor[] {
  const comp = getCompetitorBySlug(slug);
  if (!comp) return [];
  return comp.relatedCompetitors
    .map((s) => getCompetitorBySlug(s))
    .filter((c): c is Competitor => c !== undefined);
}

export function isStaleEntry(comp: Competitor, maxAgeDays = 90): boolean {
  const verified = new Date(comp.lastVerified).getTime();
  const ageDays = (Date.now() - verified) / (1000 * 60 * 60 * 24);
  return ageDays > maxAgeDays;
}
