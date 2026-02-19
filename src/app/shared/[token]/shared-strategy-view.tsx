"use client";

import { useMemo } from "react";
import { ReactFlowProvider, ReactFlow, Background, Controls, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { BuildJsonSchema, BuilderNodeData } from "@/types/builder";
import { buildNaturalLanguageSummary } from "@/app/app/projects/[id]/builder/strategy-summary";
import type { BuilderNode } from "@/types/builder";

interface SharedStrategyViewProps {
  buildJson: BuildJsonSchema;
}

const CATEGORY_COLORS: Record<string, string> = {
  entrystrategy: "#10B981",
  indicator: "#22D3EE",
  priceaction: "#F59E0B",
  timing: "#F59E0B",
  risk: "#EF4444",
  trademanagement: "#A78BFA",
  trading: "#6366F1",
  filter: "#64748B",
};

function ReadOnlyCanvas({ buildJson }: { buildJson: BuildJsonSchema }) {
  const nodes = useMemo(() => (buildJson.nodes as Node[]) ?? [], [buildJson]);
  const edges = useMemo(() => buildJson.edges ?? [], [buildJson]);

  return (
    <div className="h-[400px] rounded-xl overflow-hidden border border-[rgba(79,70,229,0.2)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "#4F46E5", strokeWidth: 2 },
        }}
      >
        <Background gap={15} size={1} color="rgba(79, 70, 229, 0.15)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function SharedStrategyView({ buildJson }: SharedStrategyViewProps) {
  const nodes = useMemo(
    () => (buildJson.nodes ?? []) as Node<BuilderNodeData>[],
    [buildJson.nodes]
  );
  const summaryLines = useMemo(
    () => buildNaturalLanguageSummary(nodes as unknown as BuilderNode[]),
    [nodes]
  );

  return (
    <div className="space-y-6">
      {/* Read-only canvas */}
      <ReactFlowProvider>
        <ReadOnlyCanvas buildJson={buildJson} />
      </ReactFlowProvider>

      {/* Strategy summary */}
      {summaryLines.length > 0 && (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#A78BFA] mb-3">Strategy Summary</h3>
          <ul className="space-y-2">
            {summaryLines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#CBD5E1]">
                <svg
                  className="w-4 h-4 text-[#22D3EE] flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Block list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {nodes.map((node) => {
          const data = node.data;
          const color = CATEGORY_COLORS[data.category] ?? "#64748B";
          return (
            <div
              key={node.id}
              className="bg-[#1E293B] border border-[rgba(79,70,229,0.15)] rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium text-white">{data.label}</span>
              </div>
              <p className="text-[10px] text-[#7C8DB0] uppercase tracking-wider">
                {data.category
                  .replace("entrystrategy", "Entry Strategy")
                  .replace("trademanagement", "Trade Management")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
