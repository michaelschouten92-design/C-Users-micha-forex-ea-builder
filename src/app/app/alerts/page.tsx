import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app/app-nav";
import { getCachedTier } from "@/lib/plan-limits";
import { AlertHistoryClient } from "./alert-history-client";

export const metadata = {
  title: "Alert History | AlgoStudio",
};

export default async function AlertHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tier = await getCachedTier(session.user.id);

  return (
    <div className="min-h-screen bg-[#09090B]">
      <AppNav session={session} tier={tier} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Alert History</h1>
          <p className="text-sm text-[#7C8DB0] mt-1">
            All alerts and notifications sent to your configured channels.
          </p>
        </div>
        <AlertHistoryClient />
      </main>
    </div>
  );
}
