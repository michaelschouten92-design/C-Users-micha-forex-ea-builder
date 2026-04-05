import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { loadStrategyDetail } from "./load-strategy-detail";
import { StrategyHeader } from "@/components/app/strategy-header";
import { SystemRecommendation } from "@/components/app/system-recommendation";
import { LivePerformanceGrid } from "@/components/app/live-performance-grid";
import { BaselineComparison } from "@/components/app/baseline-comparison";
import { IncidentPreviewList } from "@/components/app/incident-preview-list";
import { IncidentTimeline } from "@/components/app/incident-timeline";
import { DiagnosticsPanel } from "@/components/app/diagnostics-panel";
import { GovernanceContextPanel } from "@/components/app/governance-context-panel";
import { HealthScoreBreakdown } from "@/components/app/health-score-breakdown";
import { EdgeScorePanel } from "@/components/app/edge-score-panel";
import { EdgeDecayPanel } from "@/components/app/edge-decay-panel";
import { StrategyAggregateSummary } from "@/components/app/strategy-aggregate-summary";
import { VersionLineagePanel } from "@/components/app/version-lineage-panel";
import { GovernancePanel } from "@/components/app/governance-panel";
import { InvestigationPanel } from "@/components/app/investigation-panel";

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

        {/* ── Edge Score ────────────────────────────────────── */}
        {data.edgeScore && <EdgeScorePanel edgeScore={data.edgeScore} />}

        {/* ── Edge Decay Projection (only shown when declining) ── */}
        {data.edgeProjection && (
          <EdgeDecayPanel
            projection={data.edgeProjection}
            eaName={data.eaName}
            instanceId={data.id}
          />
        )}

        {/* ── Control Layer ─────────────────────────────────── */}

        {/* 2. System Recommendation — action-oriented decision panel */}
        <SystemRecommendation level={data.recommendation} reason={data.recommendationReason} />

        {/* 3. Governance Verdict — control-layer conclusion */}
        <GovernancePanel governance={data.governance} />

        {/* 4. Investigation — why is this strategy flagged? (shown only when WARNING/DEGRADED/drift) */}
        <InvestigationPanel
          health={data.health}
          healthHistory={data.healthHistory}
          lifecycleState={data.lifecycleState}
        />

        {/* ── Monitoring Truth ──────────────────────────────── */}

        <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider pt-2">
          Monitoring
        </p>

        {/* 5 + 6. Live Performance + Baseline vs Live — side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LivePerformanceGrid health={data.health} />
          <BaselineComparison health={data.health} />
        </div>

        {/* 6. Recent Incidents — always visible, urgency-sorted */}
        <IncidentPreviewList incidents={data.incidents} />

        {/* 7. Event Timeline — collapsed, chronological audit view */}
        <IncidentTimeline
          latestRun={data.latestRun}
          health={data.health}
          incidents={data.incidents}
        />

        {/* 8. Monitoring Diagnostics — collapsed by default */}
        <DiagnosticsPanel latestRun={data.latestRun} health={data.health} />

        {/* ── Context ───────────────────────────────────────── */}

        <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider pt-2">
          Context
        </p>

        {/* 9. Governance Context — collapsed by default */}
        <GovernanceContextPanel data={data} />

        {/* 10. Strategy Aggregate — Layer 2 derived, collapsed, secondary */}
        {data.strategyAggregate && <StrategyAggregateSummary aggregate={data.strategyAggregate} />}

        {/* 11. Version Lineage — strategy version lifecycle, collapsed, secondary */}
        {data.strategyLineage && (
          <VersionLineagePanel
            versionNo={data.versionNo}
            currency={data.versionCurrency}
            lineage={data.strategyLineage}
          />
        )}

        {/* 12. Health Score Breakdown — secondary, collapsed */}
        <HealthScoreBreakdown health={data.health} history={data.healthHistory} />
      </div>
    </div>
  );
}
