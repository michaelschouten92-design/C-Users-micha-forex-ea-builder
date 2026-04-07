import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppNav } from "@/components/app/app-nav";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { RiskDashboardClient } from "../risk-dashboard/risk-dashboard-client";
import { resolveTier } from "@/lib/plan-limits";

export const metadata: Metadata = {
  title: "Portfolio Risk — Drawdown, Correlation & P&L | Algo Studio",
  description:
    "Monitor portfolio-level risk across all live strategies. Drawdown tracking, strategy correlation, and daily P&L breakdown.",
};

export default async function PortfolioRiskPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const [subscription, user] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { maxDrawdownPct: true },
    }),
  ]);

  const tier = resolveTier(subscription);

  return (
    <div className="min-h-screen">
      <AppNav activeItem="portfolio" session={session} tier={tier} />

      <main id="main-content" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs
          items={[{ label: "Dashboard", href: "/app" }, { label: "Portfolio Risk" }]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Portfolio Risk</h1>
            <p className="text-sm text-[#A1A1AA]">
              Aggregate risk metrics, strategy correlations, and daily P&L across all your accounts.
            </p>
          </div>
          {user?.maxDrawdownPct && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(99,102,241,0.06)] border border-[rgba(99,102,241,0.15)]">
              <svg
                className="w-4 h-4 text-[#6366F1]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <span className="text-xs text-[#A1A1AA]">
                Auto-halt at{" "}
                <span className="text-[#FAFAFA] font-semibold">{user.maxDrawdownPct}%</span>{" "}
                drawdown
              </span>
            </div>
          )}
        </div>

        <RiskDashboardClient />
      </main>
    </div>
  );
}
