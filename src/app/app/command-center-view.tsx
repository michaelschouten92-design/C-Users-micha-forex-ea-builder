"use client";

/**
 * CommandCenterView — client component for deployment grid with filters and sorting.
 *
 * Each card is Layer 1 (instance truth) — one deployment's actual health.
 * Receives pre-loaded instance data from the server component.
 * All filtering and sorting is client-side (no round-trips).
 */

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { InstanceStatusCard } from "@/components/app/instance-status-card";
import type { CommandCenterInstance } from "./load-command-center-data";

// ── Filter types ─────────────────────────────────────────

type FilterValue = "all" | "healthy" | "at_risk" | "attention";
type SortValue = "health_asc" | "health_desc" | "recent" | "name";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "healthy", label: "Clear" },
  { value: "at_risk", label: "At Risk" },
  { value: "attention", label: "Needs Attention" },
];

const SORTS: { value: SortValue; label: string }[] = [
  { value: "health_asc", label: "Health (low first)" },
  { value: "health_desc", label: "Health (high first)" },
  { value: "recent", label: "Recent activity" },
  { value: "name", label: "Name (A-Z)" },
];

// ── Filter logic ─────────────────────────────────────────

function matchesFilter(inst: CommandCenterInstance, filter: FilterValue): boolean {
  switch (filter) {
    case "all":
      return true;
    case "healthy":
      return inst.governanceState === "CLEAR";
    case "at_risk":
      return (
        inst.governanceState === "REVIEW_REQUIRED" ||
        inst.governanceState === "RESTRICTED" ||
        inst.governanceState === "INVALIDATED"
      );
    case "attention":
      return (
        inst.governanceState === "INVALIDATED" ||
        inst.governanceState === "RESTRICTED" ||
        inst.status === "OFFLINE" ||
        inst.status === "ERROR" ||
        !inst.hasHealthData
      );
  }
}

function getFilterCount(instances: CommandCenterInstance[], filter: FilterValue): number {
  return instances.filter((inst) => matchesFilter(inst, filter)).length;
}

// ── Sort logic ───────────────────────────────────────────

function sortInstances(
  instances: CommandCenterInstance[],
  sort: SortValue
): CommandCenterInstance[] {
  const sorted = [...instances];
  switch (sort) {
    case "health_asc":
      return sorted.sort((a, b) => (a.healthScore ?? -1) - (b.healthScore ?? -1));
    case "health_desc":
      return sorted.sort((a, b) => (b.healthScore ?? -1) - (a.healthScore ?? -1));
    case "recent":
      return sorted.sort((a, b) => {
        const ta = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
        const tb = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
        return tb - ta;
      });
    case "name":
      return sorted.sort((a, b) => a.eaName.localeCompare(b.eaName));
  }
}

// ── Governance state priority for default sort ──────────

const STATE_PRIORITY: Record<string, number> = {
  INVALIDATED: 0,
  RESTRICTED: 1,
  REVIEW_REQUIRED: 2,
  OBSERVATION: 3,
  CLEAR: 4,
};

// ── Component ────────────────────────────────────────────

interface CommandCenterViewProps {
  instances: CommandCenterInstance[];
}

export function CommandCenterView({ instances }: CommandCenterViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filter, setFilter] = useState<FilterValue>(
    (searchParams.get("filter") as FilterValue) || "all"
  );
  const [sort, setSort] = useState<SortValue>(
    (searchParams.get("sort") as SortValue) || "health_asc"
  );

  const filtered = useMemo(() => {
    let result = instances.filter((inst) => matchesFilter(inst, filter));

    // Apply sort — for health_asc, also sub-sort by monitoring status priority
    result = sortInstances(result, sort);

    if (sort === "health_asc") {
      result.sort((a, b) => {
        const pa = STATE_PRIORITY[a.governanceState] ?? 5;
        const pb = STATE_PRIORITY[b.governanceState] ?? 5;
        if (pa !== pb) return pa - pb;
        return (a.healthScore ?? -1) - (b.healthScore ?? -1);
      });
    }

    return result;
  }, [instances, filter, sort]);

  function updateParams(newFilter: FilterValue, newSort: SortValue) {
    const params = new URLSearchParams();
    if (newFilter !== "all") params.set("filter", newFilter);
    if (newSort !== "health_asc") params.set("sort", newSort);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/app", { scroll: false });
  }

  return (
    <div>
      {/* Filters + Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const count = getFilterCount(instances, f.value);
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => {
                  setFilter(f.value);
                  updateParams(f.value, sort);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#6366F1] text-white"
                    : "bg-[#111114] text-[#71717A] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:text-white"
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${active ? "text-white/70" : "text-[#71717A]/70"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort dropdown */}
        <select
          value={sort}
          onChange={(e) => {
            const newSort = e.target.value as SortValue;
            setSort(newSort);
            updateParams(filter, newSort);
          }}
          className="bg-[#111114] text-[#FAFAFA] text-xs border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#6366F1] appearance-none cursor-pointer"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Deployment Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((instance) => (
            <InstanceStatusCard key={instance.id} instance={instance} />
          ))}
        </div>
      ) : (
        <EmptyState filter={filter} />
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterValue }) {
  const messages: Record<FilterValue, { title: string; detail: string }> = {
    all: {
      title: "No live deployments connected",
      detail: "Attach the AlgoStudio Monitor EA to a chart in MT5 to start sending telemetry.",
    },
    healthy: {
      title: "No healthy deployments",
      detail: "All deployments are either awaiting data or require attention.",
    },
    at_risk: {
      title: "No deployments at risk",
      detail: "All monitored deployments are operating within baseline.",
    },
    attention: {
      title: "Nothing needs attention",
      detail: "All deployments are healthy or under observation.",
    },
  };

  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-[rgba(255,255,255,0.06)] rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-[#818CF8]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <p className="text-sm text-[#A1A1AA] mb-1">{messages[filter].title}</p>
        <p className="text-xs text-[#71717A]">{messages[filter].detail}</p>
      </div>
    </div>
  );
}
