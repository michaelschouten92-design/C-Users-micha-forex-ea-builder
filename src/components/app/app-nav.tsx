import Link from "next/link";
import { signOut } from "@/lib/auth";
import { NotificationCenter } from "@/components/app/notification-center";
import { MobileNavMenu } from "@/app/app/components/mobile-nav-menu";

export type NavItem = "build" | "evaluate" | "monitor" | "risk" | "settings";

interface AppNavProps {
  activeItem?: NavItem;
  session: { user: { email?: string | null } };
  tier: "FREE" | "PRO" | "ELITE";
  firstProjectId: string | null;
  monitorStatus?: "healthy" | "warning" | "critical";
}

const NAV_LINKS: {
  key: NavItem;
  label: string;
  href: (firstProjectId: string | null) => string;
}[] = [
  { key: "build", label: "Build", href: (id) => (id ? `/app/projects/${id}` : "/app") },
  { key: "monitor", label: "Monitor", href: () => "/app/monitor" },
  { key: "risk", label: "Risk", href: () => "/app/risk" },
  { key: "settings", label: "Settings", href: () => "/app/settings" },
];

const MONITOR_DOT_COLOR: Record<string, string> = {
  healthy: "#22C55E",
  warning: "#F59E0B",
  critical: "#EF4444",
};

export function AppNav({ activeItem, session, tier, firstProjectId, monitorStatus }: AppNavProps) {
  return (
    <nav
      role="navigation"
      aria-label="Dashboard navigation"
      className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="text-xl font-bold text-white hover:text-[#A78BFA] transition-colors"
            >
              AlgoStudio
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/app/evaluate"
              className="text-sm px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg transition-colors font-medium hidden sm:inline-block"
            >
              Evaluate Strategy
            </Link>
            <span className="text-sm text-[#CBD5E1] hidden md:inline">{session.user.email}</span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium border ${
                tier === "ELITE"
                  ? "bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/50"
                  : tier === "PRO"
                    ? "bg-[#4F46E5]/20 text-[#A78BFA] border-[#4F46E5]/50"
                    : "bg-[rgba(79,70,229,0.2)] text-[#A78BFA] border-[rgba(79,70,229,0.3)]"
              }`}
            >
              {tier}
            </span>
            <NotificationCenter />
            {NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href(firstProjectId)}
                className={`text-sm transition-colors duration-200 hidden sm:inline-flex items-center gap-1.5 ${
                  activeItem === link.key
                    ? "text-[#22D3EE] font-medium"
                    : "text-[#94A3B8] hover:text-[#22D3EE]"
                }`}
              >
                {link.label}
                {link.key === "monitor" && monitorStatus && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: MONITOR_DOT_COLOR[monitorStatus] }}
                    title={
                      monitorStatus === "critical"
                        ? "Strategy degraded"
                        : monitorStatus === "warning"
                          ? "Strategy needs attention"
                          : "All strategies healthy"
                    }
                  />
                )}
              </Link>
            ))}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
              className="hidden sm:block"
            >
              <button
                type="submit"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Sign Out
              </button>
            </form>
            <MobileNavMenu firstProjectId={firstProjectId} />
          </div>
        </div>
      </div>
    </nav>
  );
}
