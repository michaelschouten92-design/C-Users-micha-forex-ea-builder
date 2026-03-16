import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Roadmap — AlgoStudio",
  description:
    "See what we're building next. AlgoStudio roadmap with recently shipped features, current priorities, and future plans for strategy monitoring and governance.",
  alternates: { canonical: "/roadmap" },
  openGraph: {
    title: "AlgoStudio Roadmap — See What's Coming",
    description:
      "From advanced analytics to broker integrations. See every feature we're building for strategy monitoring and governance.",
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
    title: "Automated Drift Detection",
    description:
      "Continuous monitoring that flags when live performance deviates from backtest baselines.",
    tag: "Monitoring",
    shipped: "Q1 2026",
  },
  {
    title: "Public Proof Pages",
    description:
      "Share independently verifiable strategy proof pages with hash-chain integrity and Monte Carlo analysis.",
    tag: "Verification",
    shipped: "Q1 2026",
  },
  {
    title: "Strategy Discovery",
    description: "Public directory of curated, verified strategies with live performance metrics.",
    tag: "Discovery",
    shipped: "Q1 2026",
  },
  {
    title: "Governance Ladder",
    description:
      "Multi-level verification pipeline from submission through validation to monitoring.",
    tag: "Governance",
    shipped: "Q4 2025",
  },
  {
    title: "Monte Carlo Analysis",
    description:
      "Survival-rate simulation to stress-test strategy robustness under randomized conditions.",
    tag: "Analytics",
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
    title: "Live Strategy Monitoring",
    description: "Real-time heartbeat tracking, trade logs, and alerts for deployed strategies.",
    tag: "Monitoring",
    shipped: "Q2 2025",
  },
  {
    title: "Hash-Chain Trade Ledger",
    description:
      "Tamper-evident trade recording with cryptographic hash chains for independent verification.",
    tag: "Verification",
    shipped: "Q1 2025",
  },
];

const IN_PROGRESS: RoadmapItem[] = [];

const PLANNED: RoadmapItem[] = [
  {
    title: "Broker API Integration",
    description: "Connect to brokers directly for automated trade data ingestion and monitoring.",
    tag: "Integration",
    timeline: "Q3 2026",
  },
  {
    title: "Multi-Account Monitoring",
    description:
      "Monitor the same strategy across multiple broker accounts with consolidated reporting.",
    tag: "Monitoring",
    timeline: "Q3 2026",
  },
  {
    title: "Custom Risk Rules",
    description: "Define custom risk thresholds that signal alerts when conditions are breached.",
    tag: "Governance",
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
            className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-lg p-5 hover:border-[rgba(255,255,255,0.10)] transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">{item.title}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(99,102,241,0.10)] text-[#818CF8] border border-[rgba(99,102,241,0.20)] whitespace-nowrap shrink-0">
                {item.tag}
              </span>
            </div>
            <p className="text-xs text-[#71717A] leading-relaxed">{item.description}</p>
            {showShipped && item.shipped && (
              <p className="text-[10px] text-[#22C55E] font-medium mt-2">Shipped {item.shipped}</p>
            )}
            {showTimeline && item.timeline && (
              <p className="text-[10px] text-[#A1A1AA] font-medium mt-2">Target: {item.timeline}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-[#09090B]">
      <SiteNav />

      <main className="pt-32 pb-16 px-4 sm:px-6 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#FAFAFA] mb-4">
              AlgoStudio Roadmap
            </h1>
            <p className="text-lg text-[#A1A1AA] max-w-2xl mx-auto">
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
          <div className="text-center mt-16 border-t border-[rgba(255,255,255,0.06)] pt-12">
            <h2 className="text-2xl font-bold text-[#FAFAFA] mb-3">Have a feature request?</h2>
            <p className="text-[#A1A1AA] mb-6">
              We prioritize based on user feedback. Let us know what would make AlgoStudio more
              useful for you.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-[#6366F1] text-[#FAFAFA] px-6 py-3 rounded-lg font-medium hover:bg-[#818CF8] transition-colors"
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
