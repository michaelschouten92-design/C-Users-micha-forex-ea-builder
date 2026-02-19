"use client";

import { useState } from "react";

type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  buildJson: unknown;
};

type NodeInfo = {
  type: string;
  label: string;
  category: string;
};

function extractNodes(buildJson: unknown): NodeInfo[] {
  if (!buildJson || typeof buildJson !== "object") return [];
  const json = buildJson as { nodes?: { type?: string; data?: Record<string, unknown> }[] };
  if (!Array.isArray(json.nodes)) return [];

  return json.nodes.map((node) => ({
    type: node.type ?? "unknown",
    label: (node.data?.label as string) ?? node.type ?? "Unknown",
    category: (node.data?.category as string) ?? "other",
  }));
}

function extractSettings(buildJson: unknown): Record<string, string> {
  if (!buildJson || typeof buildJson !== "object") return {};
  const json = buildJson as { nodes?: { data?: Record<string, unknown> }[] };
  if (!Array.isArray(json.nodes)) return {};

  const settings: Record<string, string> = {};
  for (const node of json.nodes) {
    if (!node.data) continue;
    const data = node.data;

    if (data.entryType && typeof data.entryType === "string") {
      settings["Entry Strategy"] = data.entryType;
    }
    if (data.stopLoss !== undefined) {
      settings["Stop Loss"] = String(data.stopLoss);
    }
    if (data.takeProfit !== undefined) {
      settings["Take Profit"] = String(data.takeProfit);
    }
    if (data.lotSize !== undefined) {
      settings["Lot Size"] = String(data.lotSize);
    }
    if (data.period !== undefined) {
      settings["Period"] = String(data.period);
    }
    if (data.timeframe !== undefined) {
      settings["Timeframe"] = String(data.timeframe);
    }
    if (data.trailingStop !== undefined) {
      settings["Trailing Stop"] = String(data.trailingStop);
    }
  }

  return settings;
}

function groupNodesByCategory(nodes: NodeInfo[]): Record<string, NodeInfo[]> {
  const grouped: Record<string, NodeInfo[]> = {};
  for (const node of nodes) {
    const cat = node.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(node);
  }
  return grouped;
}

const CATEGORY_LABELS: Record<string, string> = {
  entrystrategy: "Entry Strategy",
  timing: "Timing",
  trademanagement: "Trade Management",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  entrystrategy: "text-[#10B981]",
  timing: "text-[#F59E0B]",
  trademanagement: "text-[#A78BFA]",
  other: "text-[#64748B]",
};

function EmptyColumn() {
  return (
    <div className="flex-1 bg-[#1A0626] border border-dashed border-[rgba(79,70,229,0.3)] rounded-xl p-6 flex items-center justify-center min-h-[300px]">
      <p className="text-sm text-[#7C8DB0]">Select a project to compare</p>
    </div>
  );
}

function ProjectColumnContent({ project }: { project: ProjectSummary }) {
  const nodes = extractNodes(project.buildJson);
  const settings = extractSettings(project.buildJson);
  const nodesByCategory = groupNodesByCategory(nodes);

  return (
    <div className="flex-1 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h3 className="font-semibold text-white text-lg mb-1 truncate" title={project.name}>
        {project.name}
      </h3>
      {project.description && (
        <p className="text-xs text-[#94A3B8] mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Node Types */}
      <div className="mb-6">
        <h4 className="text-xs uppercase tracking-wider text-[#7C8DB0] font-medium mb-3">
          Node Types ({nodes.length})
        </h4>
        {nodes.length === 0 ? (
          <p className="text-xs text-[#64748B]">No nodes in this strategy</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(nodesByCategory).map(([category, categoryNodes]) => (
              <div key={category}>
                <p
                  className={`text-[10px] uppercase tracking-wider font-medium mb-1 ${CATEGORY_COLORS[category] ?? "text-[#64748B]"}`}
                >
                  {CATEGORY_LABELS[category] ?? category}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categoryNodes.map((node, i) => (
                    <span
                      key={`${node.type}-${i}`}
                      className="text-xs px-2 py-0.5 rounded-full bg-[rgba(79,70,229,0.1)] text-[#CBD5E1] border border-[rgba(79,70,229,0.2)]"
                    >
                      {node.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key Settings */}
      <div>
        <h4 className="text-xs uppercase tracking-wider text-[#7C8DB0] font-medium mb-3">
          Key Settings
        </h4>
        {Object.keys(settings).length === 0 ? (
          <p className="text-xs text-[#64748B]">No settings found</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-xs text-[#7C8DB0]">{key}</span>
                <span className="text-xs text-[#CBD5E1] font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectColumn({ project }: { project: ProjectSummary | null }) {
  if (!project) {
    return <EmptyColumn />;
  }
  return <ProjectColumnContent project={project} />;
}

export function CompareClient({ projects }: { projects: ProjectSummary[] }) {
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  const leftProject = projects.find((p) => p.id === leftId) ?? null;
  const rightProject = projects.find((p) => p.id === rightId) ?? null;

  if (projects.length < 2) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-12 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Not enough projects</h3>
        <p className="text-sm text-[#94A3B8]">
          You need at least two projects to compare strategies.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="left-project"
            className="block text-xs uppercase tracking-wider text-[#7C8DB0] font-medium mb-2"
          >
            Project A
          </label>
          <select
            id="left-project"
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-[#CBD5E1] focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === rightId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="right-project"
            className="block text-xs uppercase tracking-wider text-[#7C8DB0] font-medium mb-2"
          >
            Project B
          </label>
          <select
            id="right-project"
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-[#CBD5E1] focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === leftId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProjectColumn project={leftProject} />
        <ProjectColumn project={rightProject} />
      </div>
    </div>
  );
}
