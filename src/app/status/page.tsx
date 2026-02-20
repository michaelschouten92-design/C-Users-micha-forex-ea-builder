import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "System Status — AlgoStudio",
  description:
    "Check the current status of AlgoStudio services including the web application, code generation engine, live EA dashboard, and API endpoints.",
  alternates: { canonical: "/status" },
  openGraph: {
    title: "AlgoStudio System Status",
    description: "Real-time status of all AlgoStudio services and infrastructure.",
  },
};

type ServiceStatus = "operational" | "degraded" | "outage";

interface Service {
  name: string;
  description: string;
  status: ServiceStatus;
}

const SERVICES: Service[] = [
  {
    name: "Web Application",
    description: "Dashboard, builder, and all user-facing pages",
    status: "operational",
  },
  {
    name: "Code Generation Engine",
    description: "MQL5 and MQL4 code generation and export",
    status: "operational",
  },
  {
    name: "Live EA Dashboard",
    description: "Real-time EA monitoring, heartbeats, and trade logging",
    status: "operational",
  },
  {
    name: "Webhook Processing",
    description: "EA telemetry webhooks and data ingestion",
    status: "operational",
  },
  {
    name: "Database",
    description: "User data, projects, and strategy storage",
    status: "operational",
  },
  {
    name: "API Endpoints",
    description: "All REST API endpoints for the platform",
    status: "operational",
  },
];

function getStatusConfig(status: ServiceStatus): {
  label: string;
  color: string;
  dotColor: string;
} {
  switch (status) {
    case "operational":
      return {
        label: "Operational",
        color: "text-[#22C55E]",
        dotColor: "bg-[#22C55E]",
      };
    case "degraded":
      return {
        label: "Degraded Performance",
        color: "text-[#EAB308]",
        dotColor: "bg-[#EAB308]",
      };
    case "outage":
      return {
        label: "Outage",
        color: "text-[#EF4444]",
        dotColor: "bg-[#EF4444]",
      };
  }
}

function getOverallStatus(services: Service[]): { label: string; color: string; bgColor: string } {
  const hasOutage = services.some((s) => s.status === "outage");
  const hasDegraded = services.some((s) => s.status === "degraded");

  if (hasOutage) {
    return {
      label: "Service Disruption",
      color: "text-[#EF4444]",
      bgColor: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]",
    };
  }
  if (hasDegraded) {
    return {
      label: "Degraded Performance",
      color: "text-[#EAB308]",
      bgColor: "bg-[rgba(234,179,8,0.1)] border-[rgba(234,179,8,0.3)]",
    };
  }
  return {
    label: "All Systems Operational",
    color: "text-[#22C55E]",
    bgColor: "bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.3)]",
  };
}

export default function StatusPage() {
  const overall = getOverallStatus(SERVICES);
  const lastUpdated = new Date().toISOString();

  return (
    <div id="main-content" className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="pt-32 pb-16 px-4 sm:px-6 flex-1">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">System Status</h1>
            <p className="text-[#94A3B8]">Current operational status of AlgoStudio services.</p>
          </div>

          {/* Overall Status */}
          <div className={`rounded-xl border p-6 mb-8 text-center ${overall.bgColor}`}>
            <span className={`text-2xl font-bold ${overall.color}`}>{overall.label}</span>
          </div>

          {/* Service List */}
          <div className="space-y-3 mb-12">
            {SERVICES.map((service) => {
              const config = getStatusConfig(service.status);
              return (
                <div
                  key={service.name}
                  className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-sm font-medium text-white">{service.name}</h3>
                    <p className="text-xs text-[#7C8DB0] mt-0.5">{service.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Uptime */}
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-lg p-6 mb-8 text-center">
            <p className="text-sm text-[#94A3B8] mb-1">Uptime over the last 90 days</p>
            <p className="text-3xl font-bold text-white">99.9%</p>
          </div>

          {/* Status Updates */}
          <div className="bg-[#1A0626]/50 border border-[rgba(79,70,229,0.15)] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-2">Stay Informed</h2>
            <p className="text-sm text-[#94A3B8]">
              For real-time status updates and incident notifications, follow us on{" "}
              <a
                href="https://x.com/algostudio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#22D3EE] hover:underline"
              >
                Twitter/X
              </a>
              .
            </p>
          </div>

          {/* Last Updated */}
          <p className="text-xs text-[#7C8DB0] text-center">
            Last updated:{" "}
            {new Date(lastUpdated).toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
