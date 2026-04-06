import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app/app-nav";
import { getCachedTier } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { AlertHistoryClient } from "./alert-history-client";
import { ChannelsOverview } from "./channels-overview";

export const metadata = {
  title: "Alerts | AlgoStudio",
};

export default async function AlertHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [tier, user, pushSub] = await Promise.all([
    getCachedTier(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { telegramChatId: true },
    }),
    prisma.pushSubscription.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    }),
  ]);

  const channels = {
    telegram: !!user?.telegramChatId,
    push: !!pushSub,
  };

  return (
    <div className="min-h-screen bg-[#09090B]">
      <AppNav activeItem="alerts" session={session} tier={tier} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-sm text-[#7C8DB0] mt-1">Alert history and notification channels.</p>
        </div>
        <ChannelsOverview channels={channels} />
        <AlertHistoryClient />
      </main>
    </div>
  );
}
