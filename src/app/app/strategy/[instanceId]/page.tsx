import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { loadStrategyDetail } from "./load-strategy-detail";
import { StrategyHeader } from "@/components/app/strategy-header";
import { SystemRecommendation } from "@/components/app/system-recommendation";
import { LivePerformanceGrid } from "@/components/app/live-performance-grid";
import { BaselineComparison } from "@/components/app/baseline-comparison";
import { IncidentPreviewList } from "@/components/app/incident-preview-list";
import { DiagnosticsPanel } from "@/components/app/diagnostics-panel";
import { GovernanceContextPanel } from "@/components/app/governance-context-panel";
import { HealthScoreBreakdown } from "@/components/app/health-score-breakdown";

interface PageProps {
  params: Promise<{ instanceId: string }>;
}

export default async function StrategyDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?expired=true");
  }

  const { instanceId } = await params;
  const data = await loadStrategyDetail(instanceId, session.user.id);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* 1. Header — name, status, lifecycle, health, last eval */}
        <StrategyHeader data={data} />

        {/* 2. System Recommendation — action-oriented decision panel */}
        <SystemRecommendation level={data.recommendation} reason={data.recommendationReason} />

        {/* 3 + 4. Live Performance + Baseline vs Live — side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LivePerformanceGrid health={data.health} />
          <BaselineComparison health={data.health} />
        </div>

        {/* 5. Recent Incidents — always visible, urgency-sorted */}
        <IncidentPreviewList incidents={data.incidents} />

        {/* 6. Monitoring Diagnostics — collapsed by default */}
        <DiagnosticsPanel latestRun={data.latestRun} health={data.health} />

        {/* 7. Governance Context — collapsed by default */}
        <GovernanceContextPanel data={data} />

        {/* 8. Health Score Breakdown — secondary, collapsed */}
        <HealthScoreBreakdown health={data.health} history={data.healthHistory} />
      </div>
    </div>
  );
}
