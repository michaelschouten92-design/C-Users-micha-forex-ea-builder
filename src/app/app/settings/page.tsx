import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { SubscriptionPanel } from "../components/subscription-panel";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [subscription, projectCount, exportCount, user] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.project.count({
      where: { userId: session.user.id, deletedAt: null },
    }),
    prisma.exportJob.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: startOfMonth },
        deletedAt: null,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    }),
  ]);

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
      <nav
        role="navigation"
        aria-label="App navigation"
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
              <span className="text-[#7C8DB0]">/</span>
              <span className="text-[#94A3B8]">Account</span>
            </div>
            <Link href="/app" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content" className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Account" }]} />
        <h1 className="text-2xl font-bold text-white mb-8">Account Settings</h1>

        <SubscriptionPanel
          tier={tier}
          subscriptionStatus={subscription?.status ?? undefined}
          projectCount={projectCount}
          exportCount={exportCount}
          hasStripeSubscription={!!subscription?.stripeSubId}
          currentPeriodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
        />

        <SettingsContent email={session.user.email || ""} emailVerified={!!user?.emailVerified} />
      </main>
    </div>
  );
}
