import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppNav } from "@/components/app/app-nav";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { RiskPageTabs } from "./risk-page-tabs";

export const metadata: Metadata = {
  title: "Risk — Monte Carlo Simulator, Position Sizing & Portfolio Risk | AlgoStudio",
  description:
    "Run Monte Carlo simulations, compare position sizing methods, and monitor portfolio-level risk across all your live strategies.",
};

export default async function RiskPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  let tier: "FREE" | "PRO" | "ELITE" = (subscription?.tier as "FREE" | "PRO" | "ELITE") ?? "FREE";
  if (tier !== "FREE") {
    const isActive = subscription?.status === "active" || subscription?.status === "trialing";
    const isExpired = subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date();
    if (!isActive || isExpired) {
      tier = "FREE";
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav activeItem="risk" session={session} tier={tier} firstProjectId={null} />

      <main id="main-content" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Risk" }]} />

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Risk</h1>
          <p className="text-[#94A3B8]">
            Simulate strategy risk, compare position sizing methods, and monitor portfolio-level
            risk.
          </p>
        </div>

        <RiskPageTabs />
      </main>
    </div>
  );
}
