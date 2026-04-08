import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app/app-nav";
import { AppBreadcrumbs } from "@/components/app/app-breadcrumbs";
import { resolveTier } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { ReferralsClient } from "./referrals-client";

export const metadata: Metadata = { title: "Referrals | Algo Studio" };

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?expired=true");

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { tier: true, status: true, currentPeriodEnd: true, manualPeriodEnd: true },
  });
  const tier = resolveTier(sub);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });

  return (
    <div className="min-h-screen">
      <AppNav activeItem="referrals" session={session} tier={tier} />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AppBreadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Referrals" }]} />
        <h1 className="mt-4 text-xl font-bold text-[#F1F5F9] tracking-tight">Referral Program</h1>
        <ReferralsClient referralCode={user?.referralCode ?? null} />
      </main>
    </div>
  );
}
