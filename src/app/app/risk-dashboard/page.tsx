import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RiskDashboardClient } from "./risk-dashboard-client";

export default async function RiskDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Risk Dashboard</h1>
          <p className="text-[#7C8DB0] mt-2">Portfolio-level risk monitoring and analysis</p>
        </div>
        <RiskDashboardClient />
      </div>
    </div>
  );
}
