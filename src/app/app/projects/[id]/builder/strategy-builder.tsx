"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { StrategyCanvas } from "./strategy-canvas";
import type { BuildJsonSchema } from "@/types/builder";

interface StrategyBuilderProps {
  projectId: string;
  latestVersion?: {
    id: string;
    versionNo: number;
    buildJson: BuildJsonSchema;
  } | null;
}

export function StrategyBuilder({ projectId, latestVersion }: StrategyBuilderProps) {
  return (
    <ReactFlowProvider>
      <StrategyCanvas
        projectId={projectId}
        initialData={latestVersion?.buildJson ?? null}
      />
    </ReactFlowProvider>
  );
}
