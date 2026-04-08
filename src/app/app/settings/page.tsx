import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Settings | Algo Studio" };
import { redirect } from "next/navigation";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { AppNav } from "@/components/app/app-nav";
import { SubscriptionPanel } from "../components/subscription-panel";
import { SettingsContent } from "./settings-content";
import { resolveTier } from "@/lib/plan-limits";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const [subscription, user, monitoredAccountCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, maxDrawdownPct: true },
    }),
    prisma.terminalConnection.count({
      where: {
        userId: session.user.id,
        deletedAt: null,
        instances: { some: { deletedAt: null } },
      },
    }),
  ]);

  const tier = resolveTier(subscription);

  return (
    <div className="min-h-screen">
      <AppNav activeItem="settings" session={session} tier={tier} />

      <main id="main-content" className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Settings" }]} />
        <h1 className="text-2xl font-bold text-white mb-8">Account Settings</h1>

        <SubscriptionPanel
          tier={tier}
          subscriptionStatus={subscription?.status ?? undefined}
          monitoredAccountCount={monitoredAccountCount}
          hasStripeSubscription={!!subscription?.stripeSubId}
          currentPeriodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
          emailVerified={!!user?.emailVerified}
          scheduledDowngradeTier={
            subscription?.scheduledDowngradeTier && subscription.scheduledDowngradeTier !== "FREE"
              ? (subscription.scheduledDowngradeTier as string)
              : null
          }
        />

        <SettingsContent
          email={session.user.email || ""}
          emailVerified={!!user?.emailVerified}
          maxDrawdownPct={user?.maxDrawdownPct ?? null}
          tier={tier}
        />
      </main>
    </div>
  );
}
