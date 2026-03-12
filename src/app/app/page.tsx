import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { shouldRedirectToOnboarding } from "./onboarding-heuristic";

export default async function DashboardPage() {
  let session: { user: { id: string; email?: string | null }; expires?: string } | null = null;
  try {
    session = await auth();
  } catch (err) {
    console.error("[app/page] auth() threw:", err);
  }

  if (!session?.user) {
    redirect("/login?expired=true");
  }

  // ── Server-driven onboarding gate (fail-closed) ──────────
  let onboardingRedirect: string | null;
  try {
    const [strategyCount, liveEACount] = await Promise.all([
      prisma.project.count({ where: { userId: session.user.id, deletedAt: null } }),
      prisma.liveEAInstance.count({ where: { userId: session.user.id, deletedAt: null } }),
    ]);
    onboardingRedirect = shouldRedirectToOnboarding(strategyCount, liveEACount);
  } catch {
    onboardingRedirect = "/app/onboarding?step=scope";
  }
  if (onboardingRedirect) {
    redirect(onboardingRedirect);
  }

  // Command Center is the primary dashboard — redirect to it
  redirect("/app/live");
}
