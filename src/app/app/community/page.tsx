import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { MarketplaceClient } from "./marketplace-client";

/**
 * Mask an email address for public display.
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***@***.com";
  const visible = localPart.substring(0, 3);
  return `${visible}***@${domain}`;
}

const CATEGORIES = [
  "scalping",
  "trend-following",
  "breakout",
  "mean-reversion",
  "grid",
  "martingale",
  "hedging",
  "news-trading",
  "other",
] as const;

export default async function CommunityPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const templates = await prisma.userTemplate.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: { select: { email: true } },
      ratings: { select: { rating: true } },
    },
  });

  const total = await prisma.userTemplate.count({ where: { isPublic: true } });

  const initialTemplates = templates.map((t) => {
    const ratingSum = t.ratings.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = t.ratings.length > 0 ? ratingSum / t.ratings.length : 0;

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      buildJson: t.buildJson as unknown,
      authorEmail: maskEmail(t.user.email),
      downloads: t.downloads,
      tags: t.tags,
      category: t.category,
      avgRating: Math.round(avgRating * 10) / 10,
      ratingCount: t.ratings.length,
      createdAt: t.createdAt.toISOString(),
    };
  });

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
              <span className="text-xs text-[#A78BFA] font-medium tracking-wider uppercase hidden sm:inline">
                Marketplace
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#CBD5E1] hidden sm:inline">{session.user.email}</span>
              <Link
                href="/app"
                className="text-sm text-[#94A3B8] hover:text-[#22D3EE] transition-colors duration-200"
              >
                Dashboard
              </Link>
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

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Marketplace" }]} />
        <MarketplaceClient
          userId={session.user.id}
          initialTemplates={initialTemplates}
          initialCategories={CATEGORIES}
          initialTotal={total}
        />
      </main>
    </div>
  );
}
