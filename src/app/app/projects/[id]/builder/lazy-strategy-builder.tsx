"use client";

import dynamic from "next/dynamic";
import type { BuildJsonSchema } from "@/types/builder";

const StrategyBuilder = dynamic(
  () => import("./strategy-builder").then((mod) => ({ default: mod.StrategyBuilder })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center h-full bg-[#0D0D12]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#A1A1AA] text-sm">Loading builder...</p>
        </div>
      </div>
    ),
  }
);

interface LazyStrategyBuilderProps {
  projectId: string;
  latestVersion?: {
    id: string;
    versionNo: number;
    buildJson: BuildJsonSchema;
  } | null;
  canExportMQL5?: boolean;
  tier?: string;
}

export function LazyStrategyBuilder(props: LazyStrategyBuilderProps) {
  return <StrategyBuilder {...props} />;
}
