"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "./project-card";
import { CreateProjectButton } from "./create-project-button";
import { getCsrfHeaders } from "@/lib/api-client";
import { STRATEGY_PRESETS } from "@/lib/strategy-presets";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    versions: number;
  };
};

type SortOption = "updated" | "created" | "name";

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.3)]",
  STARTER: "bg-[rgba(79,70,229,0.15)] text-[#A78BFA] border-[rgba(79,70,229,0.3)]",
  PRO: "bg-[rgba(168,85,247,0.15)] text-[#A855F7] border-[rgba(168,85,247,0.3)]",
};

function OnboardingEmpty() {
  const router = useRouter();
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  async function createFromPreset(presetId: string) {
    const preset = STRATEGY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setLoadingPreset(presetId);
    try {
      // Create project
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({
          name: preset.name,
          description: preset.description,
        }),
      });

      if (!res.ok) return;
      const project = await res.json();

      // Save preset buildJson as first version
      await fetch(`/api/projects/${project.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ buildJson: preset.buildJson }),
      });

      router.push(`/app/projects/${project.id}`);
    } finally {
      setLoadingPreset(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="bg-gradient-to-br from-[#1A0626] to-[#0F172A] border border-[rgba(79,70,229,0.2)] rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#22D3EE] flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          Welcome to AlgoStudio
        </h3>
        <p className="text-[#94A3B8] max-w-md mx-auto mb-6">
          Build automated trading strategies for MetaTrader 5 with a visual drag-and-drop builder. Start from a template or create a blank project.
        </p>
        <CreateProjectButton />
      </div>

      {/* Template section */}
      <div>
        <h3 className="text-sm font-medium text-[#64748B] uppercase tracking-wide mb-4">
          Or start from a template
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STRATEGY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => createFromPreset(preset.id)}
              disabled={loadingPreset !== null}
              className="text-left bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-5 hover:border-[rgba(79,70,229,0.4)] hover:shadow-[0_4px_24px_rgba(79,70,229,0.15)] disabled:opacity-50 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white group-hover:text-[#22D3EE] transition-colors">
                  {preset.name}
                </h4>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${TIER_COLORS[preset.tier]}`}>
                  {preset.tier}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] line-clamp-2 mb-3">
                {preset.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-[#64748B]">
                <span>{preset.buildJson.nodes.length} blocks</span>
                <span>{preset.buildJson.edges.length} connections</span>
              </div>
              {loadingPreset === preset.id && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[#A78BFA]">
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating project...
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectList({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated");

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    let result = projects;
    if (query) {
      result = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    return [...result].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "updated":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [projects, search, sort]);

  if (projects.length === 0) {
    return <OnboardingEmpty />;
  }

  return (
    <div>
      {/* Search and Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-[#CBD5E1] focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
        >
          <option value="updated">Last updated</option>
          <option value="created">Newest first</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#64748B]">
          <p className="text-sm">No projects match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
