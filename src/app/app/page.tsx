import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateProjectButton } from "./components/create-project-button";
import { ProjectList } from "./components/project-list";
import { SubscriptionPanel } from "./components/subscription-panel";
import { EmailVerificationBanner } from "./components/email-verification-banner";
import { features } from "@/lib/env";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Get start of current month for export count (UTC to match backend)
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [projects, subscription, exportCount, user] = await Promise.all([
    prisma.project.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { versions: true },
        },
        versions: {
          orderBy: { versionNo: "desc" },
          take: 1,
          select: { buildJson: true },
        },
        tags: {
          select: { tag: true },
        },
      },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.exportJob.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, discordId: true },
    }),
  ]);

  // Determine effective tier (mirror getCachedTier logic to account for expired/cancelled)
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
      <nav className="bg-[#1A0626]/80 backdrop-blur-sm border-b border-[rgba(79,70,229,0.2)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">AlgoStudio</h1>
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Trading Studio
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#CBD5E1] hidden sm:inline">{session.user.email}</span>
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
              <Link
                href="/app/settings"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Settings
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {user && !user.emailVerified && <EmailVerificationBanner />}

      <main id="main-content" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Subscription Panel */}
        <SubscriptionPanel
          tier={tier}
          subscriptionStatus={subscription?.status ?? undefined}
          projectCount={projects.length}
          exportCount={exportCount}
          hasStripeSubscription={!!subscription?.stripeSubId}
        />

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">My Projects</h2>
          <CreateProjectButton />
        </div>

        <ProjectList projects={projects} />
      </main>
    </div>
  );
}
