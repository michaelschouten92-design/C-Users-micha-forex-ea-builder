import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Footer } from "@/components/marketing/footer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "System Status — Algo Studio",
  description:
    "Check the current status of Algo Studio services including the web application, live EA dashboard, and API endpoints.",
  alternates: { canonical: "/status" },
  openGraph: {
    title: "Algo Studio System Status",
    description: "Real-time status of all Algo Studio services and infrastructure.",
    images: ["/opengraph-image"],
  },
};

export const revalidate = 60; // revalidate every 60 seconds

type ServiceStatus = "operational" | "degraded" | "outage";

interface Service {
  name: string;
  description: string;
  status: ServiceStatus;
}

async function checkServices(): Promise<Service[]> {
  // Database check
  let dbStatus: ServiceStatus = "operational";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "outage";
  }

  // Heartbeat freshness: check if any instance received a heartbeat in last 5 min
  let telemetryStatus: ServiceStatus = "operational";
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentHeartbeats = await prisma.liveEAInstance.count({
      where: {
        status: "ONLINE",
        lastHeartbeat: { gte: fiveMinAgo },
        deletedAt: null,
      },
    });
    // If there are active instances but none have recent heartbeats, telemetry may be degraded
    const totalActive = await prisma.liveEAInstance.count({
      where: { deletedAt: null, status: { in: ["ONLINE", "ERROR"] } },
    });
    if (totalActive > 0 && recentHeartbeats === 0) {
      telemetryStatus = "degraded";
    }
  } catch {
    // If we can't check, don't mark as outage — DB check already covers that
    telemetryStatus = dbStatus === "outage" ? "outage" : "operational";
  }

  return [
    {
      name: "Web Application",
      description: "Dashboard, builder, and all user-facing pages",
      status: "operational", // If this page renders, web app is up
    },
    {
      name: "Database",
      description: "User data, projects, and strategy storage",
      status: dbStatus,
    },
    {
      name: "EA Telemetry",
      description: "Real-time EA monitoring, heartbeats, and trade logging",
      status: telemetryStatus,
    },
    {
      name: "API Endpoints",
      description: "All REST API endpoints for the platform",
      status: dbStatus === "outage" ? "degraded" : "operational",
    },
  ];
}

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

export default async function StatusPage() {
  const services = await checkServices();
  const overall = getOverallStatus(services);
  const checkedAt = new Date().toISOString();

  return (
    <div id="main-content" className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="pt-32 pb-16 px-4 sm:px-6 flex-1">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">System Status</h1>
            <p className="text-[#94A3B8]">Current operational status of Algo Studio services.</p>
          </div>

          {/* Overall Status */}
          <div className={`rounded-xl border p-6 mb-8 text-center ${overall.bgColor}`}>
            <span className={`text-2xl font-bold ${overall.color}`}>{overall.label}</span>
          </div>

          {/* Service List */}
          <div className="space-y-3 mb-12">
            {services.map((service) => {
              const config = getStatusConfig(service.status);
              return (
                <div
                  key={service.name}
                  className="glass-card rounded-lg p-4 flex items-center justify-between"
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

          {/* Status Updates */}
          <div className="glass-card rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-2">Stay Informed</h2>
            <p className="text-sm text-[#94A3B8]">
              For real-time status updates and incident notifications, follow us on{" "}
              <a
                href="https://x.com/AlgoStudio_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#22D3EE] hover:underline"
              >
                Twitter/X
              </a>
              .
            </p>
          </div>

          {/* Last Checked */}
          <p className="text-xs text-[#7C8DB0] text-center">
            Last checked:{" "}
            {new Date(checkedAt).toLocaleString("en-US", {
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
