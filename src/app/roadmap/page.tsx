import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Roadmap — AlgoStudio",
  description:
    "See what we're building next. AlgoStudio roadmap with recently shipped features, current priorities, and future plans for the MT5/MT4 EA builder.",
  alternates: { canonical: "/roadmap" },
  openGraph: {
    title: "AlgoStudio Roadmap — See What's Coming",
    description:
      "From cloud backtesting to broker integrations. See every feature we're building for the visual MT5/MT4 EA builder.",
  },
};

interface RoadmapItem {
  title: string;
  description: string;
  tag: string;
  shipped?: string;
  timeline?: string;
}

const SHIPPED: RoadmapItem[] = [
  {
    title: "MQL4 Export",
    description:
      "Export strategies as MQL4 code for MetaTrader 4 compatibility (Pro and Elite plans).",
    tag: "Code Gen",
    shipped: "Q4 2025",
  },
  {
    title: "Multi-Level Take Profit",
    description: "Three staged TP levels with automatic SL management after each level is hit.",
    tag: "Trade Management",
    shipped: "Q4 2025",
  },
  {
    title: "ICT/SMC Nodes",
    description:
      "Order blocks, fair value gaps, and market structure detection for smart money strategies.",
    tag: "Price Action",
    shipped: "Q3 2025",
  },
  {
    title: "Backtest Report Importer",
    description:
      "Upload MT5 backtest HTML reports and visualize performance metrics inside AlgoStudio.",
    tag: "Analytics",
    shipped: "Q3 2025",
  },
  {
    title: "Live EA Dashboard",
    description:
      "Monitor your deployed EAs in real-time with heartbeat tracking, trade logs, and alerts.",
    tag: "Monitoring",
    shipped: "Q2 2025",
  },
  {
    title: "Community Marketplace",
    description:
      "Share and discover strategies built by other traders. Rate, download, and customize.",
    tag: "Platform",
    shipped: "Q2 2025",
  },
  {
    title: "Grid / Pyramid Entry",
    description:
      "Place orders at regular intervals or add to winning positions with configurable lot multipliers.",
    tag: "Trading",
    shipped: "Q1 2025",
  },
];

const IN_PROGRESS: RoadmapItem[] = [
  {
    title: "AI Strategy Generator",
    description:
      "Describe a strategy in plain English and get auto-generated node layouts. Rule-based MVP live now.",
    tag: "AI",
    timeline: "Q1 2026",
  },
  {
    title: "Multi-Pair Strategies",
    description: "Run a single strategy across multiple currency pairs with correlation filtering.",
    tag: "Trading",
    timeline: "Q1 2026",
  },
  {
    title: "Cloud Backtesting",
    description: "Run backtests directly from AlgoStudio without needing MetaTrader installed.",
    tag: "Infrastructure",
    timeline: "Q2 2026",
  },
];

const PLANNED: RoadmapItem[] = [
  {
    title: "Advanced Optimization",
    description:
      "Walk-forward optimization and Monte Carlo analysis to validate strategy robustness before going live.",
    tag: "Analytics",
    timeline: "Q2 2026",
  },
  {
    title: "Broker API Integration",
    description: "Connect to brokers directly for live deployment without manual file copying.",
    tag: "Integration",
    timeline: "Q3 2026",
  },
  {
    title: "TradingView Integration",
    description:
      "Import TradingView Pine Script signals as entry triggers for your AlgoStudio EAs.",
    tag: "Integration",
    timeline: "Q3 2026",
  },
  {
    title: "Advanced ML Nodes",
    description:
      "Machine learning-based signal nodes for pattern recognition and adaptive strategies.",
    tag: "AI",
    timeline: "Q4 2026",
  },
];

interface SectionProps {
  title: string;
  color: string;
  dotColor: string;
  items: RoadmapItem[];
  showShipped?: boolean;
  showTimeline?: boolean;
}

function RoadmapSection({
  title,
  color,
  dotColor,
  items,
  showShipped,
  showTimeline,
}: SectionProps) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <span className={`w-3 h-3 rounded-full ${dotColor}`} />
        <h2 className={`text-xl font-bold ${color}`}>{title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-lg p-5 hover:border-[rgba(79,70,229,0.3)] transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(79,70,229,0.15)] text-[#A78BFA] border border-[rgba(79,70,229,0.2)] whitespace-nowrap shrink-0">
                {item.tag}
              </span>
            </div>
            <p className="text-xs text-[#7C8DB0] leading-relaxed">{item.description}</p>
            {showShipped && item.shipped && (
              <p className="text-[10px] text-[#22C55E] font-medium mt-2">Shipped {item.shipped}</p>
            )}
            {showTimeline && item.timeline && (
              <p className="text-[10px] text-[#94A3B8] font-medium mt-2">Target: {item.timeline}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <div id="main-content" className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="pt-32 pb-16 px-4 sm:px-6 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">AlgoStudio Roadmap</h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              See what we have shipped, what we are building now, and what is planned for the
              future. Your feedback shapes our priorities.
            </p>
          </div>

          {/* Timeline Sections */}
          <RoadmapSection
            title="Recently Shipped"
            color="text-[#22C55E]"
            dotColor="bg-[#22C55E]"
            items={SHIPPED}
            showShipped
          />

          <RoadmapSection
            title="In Progress"
            color="text-[#EAB308]"
            dotColor="bg-[#EAB308]"
            items={IN_PROGRESS}
            showTimeline
          />

          <RoadmapSection
            title="Planned"
            color="text-[#3B82F6]"
            dotColor="bg-[#3B82F6]"
            items={PLANNED}
            showTimeline
          />

          {/* CTA */}
          <div className="text-center mt-16 border-t border-[rgba(79,70,229,0.1)] pt-12">
            <h2 className="text-2xl font-bold text-white mb-3">Have a feature request?</h2>
            <p className="text-[#94A3B8] mb-6">
              We prioritize based on user feedback. Let us know what would make AlgoStudio more
              useful for you.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-[#4F46E5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6366F1] transition-colors"
            >
              Vote for Features
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
