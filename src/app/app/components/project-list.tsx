"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "./project-card";
import { CreateProjectButton } from "./create-project-button";
import { getCsrfHeaders } from "@/lib/api-client";
import { STRATEGY_PRESETS } from "@/lib/strategy-presets";
import { showError } from "@/lib/toast";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    versions: number;
  };
  versions?: { versionNo: number }[];
  tags?: { tag: string }[];
};

type SortOption = "updated" | "created" | "name";

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.3)]",
  PRO: "bg-[rgba(129,140,248,0.15)] text-[#818CF8] border-[rgba(129,140,248,0.3)]",
};

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  "ema-crossover": {
    label: "Beginner",
    color: "bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.3)]",
  },
  "rsi-reversal": {
    label: "Beginner",
    color: "bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.3)]",
  },
  "range-breakout": {
    label: "Beginner",
    color: "bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.3)]",
  },
  "macd-crossover": {
    label: "Beginner",
    color: "bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.3)]",
  },
  "trend-pullback": {
    label: "Intermediate",
    color: "bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]",
  },
  divergence: {
    label: "Intermediate",
    color: "bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  indicator: "#818CF8",
  timing: "#F59E0B",
  trading: "#6366F1",
  trademanagement: "#818CF8",
};

function getNodeTypeDots(nodes: { data: Record<string, unknown> }[]) {
  const categories = new Set<string>();
  for (const n of nodes) {
    if (n.data?.category && typeof n.data.category === "string") {
      categories.add(n.data.category);
    }
  }
  return Array.from(categories);
}

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

      if (!res.ok) {
        showError("Failed to create project from template. Please try again.");
        return;
      }
      const project = await res.json();

      // Save preset buildJson as first version
      await fetch(`/api/projects/${project.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ buildJson: preset.buildJson }),
      });

      router.push(`/app/projects/${project.id}`);
    } catch {
      showError("Failed to create project from template. Please try again.");
    } finally {
      setLoadingPreset(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#6366F1] flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Welcome to AlgoStudio</h3>
        <p className="text-[#A1A1AA] max-w-md mx-auto mb-6">
          Build automated trading strategies for MetaTrader 5 with a visual builder. Start from a
          template or create a blank project.
        </p>
        <CreateProjectButton />
      </div>

      {/* Template section */}
      <div>
        <h3 className="text-sm font-medium text-[#71717A] uppercase tracking-wide mb-4">
          Or start from a template
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STRATEGY_PRESETS.map((preset) => {
            const difficulty = DIFFICULTY_MAP[preset.id];
            const nodeCategories = getNodeTypeDots(
              preset.buildJson.nodes as { data: Record<string, unknown> }[]
            );
            return (
              <button
                key={preset.id}
                onClick={() => createFromPreset(preset.id)}
                disabled={loadingPreset !== null}
                className="text-left bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 hover:border-[rgba(255,255,255,0.20)] disabled:opacity-50 transition-colors duration-200 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white group-hover:text-white transition-colors">
                    {preset.name}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    {difficulty && (
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${difficulty.color}`}
                      >
                        {difficulty.label}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${TIER_COLORS[preset.tier]}`}
                    >
                      {preset.tier}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#A1A1AA] line-clamp-2 mb-3">{preset.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-[#71717A]">
                    <span>{preset.buildJson.nodes.length} blocks</span>
                    <span>{preset.buildJson.edges.length} connections</span>
                  </div>
                  {nodeCategories.length > 0 && (
                    <div
                      className="flex items-center gap-1"
                      title={nodeCategories
                        .map((c) =>
                          c
                            .replace("indicator", "Indicator")
                            .replace("trademanagement", "Management")
                        )
                        .join(", ")}
                    >
                      {nodeCategories.map((cat) => (
                        <div
                          key={cat}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[cat] || "#71717A" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {loadingPreset === preset.id && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#818CF8]">
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating project...
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ProjectList({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated");
  const [showTemplates, setShowTemplates] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Collect all unique tags across projects
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const p of projects) {
      for (const t of p.tags ?? []) {
        tagSet.add(t.tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [projects]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  async function createFromPresetInline(presetId: string) {
    const preset = STRATEGY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setLoadingPreset(presetId);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ name: preset.name, description: preset.description }),
      });
      if (!res.ok) {
        showError("Failed to create project from template. Please try again.");
        return;
      }
      const project = await res.json();
      await fetch(`/api/projects/${project.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ buildJson: preset.buildJson }),
      });
      router.push(`/app/projects/${project.id}`);
    } catch {
      showError("Failed to create project from template. Please try again.");
    } finally {
      setLoadingPreset(null);
    }
  }

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    let result = projects;
    if (query) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          (p.tags ?? []).some((t) => t.tag.toLowerCase().includes(query))
      );
    }

    // Tag filter (AND logic - must have all selected tags)
    if (selectedTags.size > 0) {
      const selectedArr = Array.from(selectedTags);
      result = result.filter((p) => {
        const tags = (p.tags ?? []).map((t) => t.tag);
        return selectedArr.every((tag) => tags.includes(tag));
      });
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
  }, [projects, search, sort, selectedTags]);

  if (projects.length === 0) {
    return <OnboardingEmpty />;
  }

  return (
    <div>
      {/* Search and Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A] pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            aria-label="Search projects by name or description"
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#18181B] border border-[rgba(255,255,255,0.10)] rounded-lg text-white placeholder-[#71717A] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent focus:outline-none transition-all duration-200"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sort projects"
          className="px-3 py-2 text-sm bg-[#18181B] border border-[rgba(255,255,255,0.10)] rounded-lg text-[#FAFAFA] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent focus:outline-none transition-all duration-200"
        >
          <option value="updated">Last updated ↓</option>
          <option value="created">Newest first ↓</option>
          <option value="name">Name (A→Z)</option>
        </select>
      </div>

      {/* Tag Filter Chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {allTags.map((tag) => {
            const isActive = selectedTags.has(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all duration-200 ${
                  isActive
                    ? "bg-[#6366F1] text-white border-[#6366F1]"
                    : "bg-transparent text-[#818CF8] border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.06)]"
                }`}
              >
                {tag}
              </button>
            );
          })}
          {selectedTags.size > 1 && (
            <span className="text-xs text-[#71717A] px-1 py-1">(matching all)</span>
          )}
          {(selectedTags.size > 0 || search.trim()) && (
            <button
              onClick={() => {
                setSelectedTags(new Set());
                setSearch("");
              }}
              className="text-xs text-[#71717A] hover:text-white px-2 py-1 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Templates Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-sm text-[#818CF8] hover:text-[#818CF8] transition-colors flex items-center gap-1.5"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${showTemplates ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Browse Templates
        </button>
        {showTemplates && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {STRATEGY_PRESETS.map((preset) => {
              const difficulty = DIFFICULTY_MAP[preset.id];
              const nodeCategories = getNodeTypeDots(
                preset.buildJson.nodes as { data: Record<string, unknown> }[]
              );
              return (
                <button
                  key={preset.id}
                  onClick={() => createFromPresetInline(preset.id)}
                  disabled={loadingPreset !== null}
                  className="text-left bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 hover:border-[rgba(255,255,255,0.20)] disabled:opacity-50 transition-colors duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                      {preset.name}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      {difficulty && (
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${difficulty.color}`}
                        >
                          {difficulty.label}
                        </span>
                      )}
                      {nodeCategories.length > 0 && (
                        <div className="flex items-center gap-0.5">
                          {nodeCategories.map((cat) => (
                            <div
                              key={cat}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: CATEGORY_COLORS[cat] || "#71717A" }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">{preset.description}</p>
                  {loadingPreset === preset.id && (
                    <span className="text-xs text-[#818CF8] mt-2 block">Creating...</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results count */}
      {search.trim() && filtered.length > 0 && (
        <p className="text-xs text-[#71717A] mb-3">
          {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#71717A]">
          <p className="text-sm">
            {search.trim() && selectedTags.size > 0 ? (
              <>No projects match &ldquo;{search}&rdquo; and the selected tags</>
            ) : selectedTags.size > 0 ? (
              "No projects match the selected tags"
            ) : (
              <>No projects match &ldquo;{search}&rdquo;</>
            )}
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedTags(new Set());
            }}
            className="mt-2 text-xs text-[#818CF8] hover:text-[#818CF8] transition-colors"
          >
            Clear all filters
          </button>
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
