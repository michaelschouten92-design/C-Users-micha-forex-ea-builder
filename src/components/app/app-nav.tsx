import Link from "next/link";
import { signOut } from "@/lib/auth";
import { MobileNavMenu } from "@/app/app/components/mobile-nav-menu";
import { NotificationBell } from "./notification-bell";
import { OnboardingHelpButton } from "@/components/onboarding/OnboardingModal";
import { TIER_DISPLAY_NAMES, type PlanTier } from "@/lib/plans";

export type NavItem = "evaluate" | "monitor" | "alerts" | "settings";

interface AppNavProps {
  activeItem?: NavItem;
  session: { user: { email?: string | null } };
  tier: PlanTier;
  monitorStatus?: "healthy" | "warning" | "critical";
}

const NAV_LINKS: {
  key: NavItem;
  label: string;
  href: () => string;
}[] = [
  { key: "monitor", label: "Command Center", href: () => "/app/live" },
  { key: "evaluate", label: "Evaluate Strategy", href: () => "/app/evaluate" },
  { key: "alerts", label: "Alerts", href: () => "/app/alerts" },
  { key: "settings", label: "Settings", href: () => "/app/settings" },
];

const MONITOR_DOT_COLOR: Record<string, string> = {
  healthy: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",
};

export function AppNav({ activeItem, session, tier, monitorStatus }: AppNavProps) {
  return (
    <nav
      role="navigation"
      aria-label="Dashboard navigation"
      className="bg-[#111114] border-b border-[rgba(255,255,255,0.06)] sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="text-xl font-bold text-white hover:text-[#818CF8] transition-colors"
            >
              Algo Studio
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#A1A1AA] hidden md:inline">{session.user.email}</span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium border ${
                tier === "INSTITUTIONAL"
                  ? "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50"
                  : tier === "ELITE"
                    ? "bg-[#818CF8]/20 text-[#818CF8] border-[#818CF8]/50"
                    : tier === "PRO"
                      ? "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/50"
                      : "bg-[rgba(255,255,255,0.06)] text-[#818CF8] border-[rgba(255,255,255,0.10)]"
              }`}
            >
              {TIER_DISPLAY_NAMES[tier]}
            </span>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href()}
                className={`text-sm transition-colors duration-200 hidden sm:inline-flex items-center gap-1.5 ${
                  activeItem === link.key
                    ? "text-[#818CF8] font-medium"
                    : "text-[#71717A] hover:text-white"
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
            <OnboardingHelpButton />
            <NotificationBell />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
              className="hidden sm:block"
            >
              <button
                type="submit"
                className="text-sm text-[#71717A] hover:text-white transition-colors duration-200"
              >
                Sign Out
              </button>
            </form>
            <MobileNavMenu activeItem={activeItem} />
          </div>
        </div>
      </div>
    </nav>
  );
}
