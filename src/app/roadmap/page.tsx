import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/marketing/breadcrumbs";

const breadcrumbs = [
  { name: "Home", href: "/" },
  { name: "Roadmap", href: "/roadmap" },
];

export const metadata: Metadata = {
  title: "Product Roadmap — MT5 Monitoring Features | Algo Studio",
  description:
    "See what's shipped, in progress, and planned. Algo Studio roadmap for MT5 strategy monitoring: drift detection, mobile app, broker API integration, and more.",
  alternates: { canonical: "/roadmap" },
  openGraph: {
    title: "Algo Studio Roadmap — See What's Coming",
    description:
      "From advanced analytics to broker integrations. See every feature we're building for strategy monitoring and governance.",
    images: ["/opengraph-image"],
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
    title: "Live Edge Score",
    description:
      "Real-time composite score comparing live performance against backtest baseline across profit factor, win rate, drawdown, and return.",
    tag: "Monitoring",
    shipped: "Q2 2026",
  },
  {
    title: "Predictive Edge Decay",
    description:
      "Linear regression on health snapshots projecting when your edge will break, with estimated daily loss and break-even timeline.",
    tag: "Analytics",
    shipped: "Q2 2026",
  },
  {
    title: "Telegram Alerts",
    description:
      "Real-time Telegram notifications for strategy alerts — edge drift, health degradation, monitor offline, and more.",
    tag: "Alerts",
    shipped: "Q2 2026",
  },
  {
    title: "Automated Drift Detection",
    description:
      "CUSUM-based statistical testing that detects persistent shifts in strategy expectancy.",
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
    title: "Live Strategy Monitoring",
    description:
      "Real-time heartbeat tracking, trade logs, and governance lifecycle for deployed strategies.",
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

const IN_PROGRESS: RoadmapItem[] = [
  {
    title: "Mobile App (iOS & Android)",
    description:
      "Native monitoring app with push notifications. Monitor your strategies and receive alerts on your phone.",
    tag: "Mobile",
    timeline: "2026",
  },
];

const PLANNED: RoadmapItem[] = [
  {
    title: "Broker API Integration",
    description: "Connect to brokers directly for automated trade data ingestion — no EA required.",
    tag: "Integration",
    timeline: "2026",
  },
  {
    title: "Per-Symbol Health Monitoring",
    description:
      "Independent health scoring per symbol for multi-pair strategies, instead of aggregate-only.",
    tag: "Monitoring",
    timeline: "2026",
  },
  {
    title: "Smart Inactivity Detection",
    description:
      "Adaptive inactivity thresholds based on your strategy's baseline trade frequency.",
    tag: "Monitoring",
    timeline: "2026",
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
          <div key={item.title} className="glass-card p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">{item.title}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.04)] text-[#A1A1AA] border border-[rgba(255,255,255,0.1)] whitespace-nowrap shrink-0">
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
    <div id="main-content" className="min-h-screen flex flex-col bg-[#08080A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <SiteNav />

      <main className="pt-32 pb-16 px-4 sm:px-6 flex-1">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbs} />
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-[28px] md:text-[42px] font-extrabold text-[#FAFAFA] tracking-tight mb-5">
              Product roadmap
            </h1>
            <p className="text-base text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
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
              We prioritize based on user feedback. Let us know what would make Algo Studio more
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
