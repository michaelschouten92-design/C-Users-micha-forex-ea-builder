import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Get Started | Algo Studio" };
import { prisma } from "@/lib/prisma";
import { AppNav } from "@/components/app/app-nav";
import { OnboardingClient } from "./onboarding-client";
import { resolveTier } from "@/lib/plan-limits";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const tier = resolveTier(subscription);

  return (
    <div className="min-h-screen bg-[#09090B]">
      <AppNav session={session} tier={tier} />

      <main className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
        <OnboardingClient />
      </main>
    </div>
  );
}
