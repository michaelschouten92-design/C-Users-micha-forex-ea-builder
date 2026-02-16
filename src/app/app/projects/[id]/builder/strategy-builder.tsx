"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { StrategyCanvas } from "./strategy-canvas";
import { CanvasErrorBoundary } from "./error-boundary";
import type { BuildJsonSchema } from "@/types/builder";

interface StrategyBuilderProps {
  projectId: string;
  latestVersion?: {
    id: string;
    versionNo: number;
    buildJson: BuildJsonSchema;
  } | null;
  canExportMQL5?: boolean;
  canExportMQL4?: boolean;
  tier?: string;
}

export function StrategyBuilder({
  projectId,
  latestVersion,
  canExportMQL5 = false,
  canExportMQL4 = false,
  tier,
}: StrategyBuilderProps) {
  return (
    <CanvasErrorBoundary>
      <ReactFlowProvider>
        <StrategyCanvas
          projectId={projectId}
          initialData={latestVersion?.buildJson ?? null}
          canExportMQL5={canExportMQL5}
          canExportMQL4={canExportMQL4}
          userTier={tier}
        />
      </ReactFlowProvider>
    </CanvasErrorBoundary>
  );
}
