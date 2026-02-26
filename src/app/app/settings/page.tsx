import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { AppNav } from "@/components/app/app-nav";
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
      <AppNav activeItem="settings" session={session} tier={tier} firstProjectId={null} />

      <main id="main-content" className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Settings" }]} />
        <h1 className="text-2xl font-bold text-white mb-8">Account Settings</h1>

        <SubscriptionPanel
          tier={tier}
          subscriptionStatus={subscription?.status ?? undefined}
          projectCount={projectCount}
          exportCount={exportCount}
          hasStripeSubscription={!!subscription?.stripeSubId}
          currentPeriodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
          scheduledDowngradeTier={
            subscription?.scheduledDowngradeTier === "PRO" ||
            subscription?.scheduledDowngradeTier === "ELITE"
              ? subscription.scheduledDowngradeTier
              : null
          }
        />

        <SettingsContent email={session.user.email || ""} emailVerified={!!user?.emailVerified} />
      </main>
    </div>
  );
}
