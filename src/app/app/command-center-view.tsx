"use client";

/**
 * CommandCenterView — client component for strategy grid with filters and sorting.
 *
 * Receives pre-loaded strategies from the server component.
 * All filtering and sorting is client-side (no round-trips).
 */

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StrategyStatusCard } from "@/components/app/strategy-status-card";
import type { CommandCenterStrategy, MonitoringStatus } from "./load-command-center-data";

// ── Filter types ─────────────────────────────────────────

type FilterValue = "all" | "healthy" | "at_risk" | "attention";
type SortValue = "health_asc" | "health_desc" | "recent" | "name";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "healthy", label: "Healthy" },
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

function matchesFilter(s: CommandCenterStrategy, filter: FilterValue): boolean {
  switch (filter) {
    case "all":
      return true;
    case "healthy":
      return s.monitoringStatus === "HEALTHY" && s.hasHealthData;
    case "at_risk":
      return s.monitoringStatus === "AT_RISK" || s.monitoringStatus === "INVALIDATED";
    case "attention":
      return (
        s.monitoringStatus === "INVALIDATED" ||
        s.status === "OFFLINE" ||
        s.status === "ERROR" ||
        !s.hasHealthData
      );
  }
}

function getFilterCount(strategies: CommandCenterStrategy[], filter: FilterValue): number {
  return strategies.filter((s) => matchesFilter(s, filter)).length;
}

// ── Sort logic ───────────────────────────────────────────

function sortStrategies(
  strategies: CommandCenterStrategy[],
  sort: SortValue
): CommandCenterStrategy[] {
  const sorted = [...strategies];
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

// ── Monitoring status priority for default sort ──────────

const STATUS_PRIORITY: Record<MonitoringStatus, number> = {
  INVALIDATED: 0,
  AT_RISK: 1,
  HEALTHY: 2,
};

// ── Component ────────────────────────────────────────────

interface CommandCenterViewProps {
  strategies: CommandCenterStrategy[];
}

export function CommandCenterView({ strategies }: CommandCenterViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filter, setFilter] = useState<FilterValue>(
    (searchParams.get("filter") as FilterValue) || "all"
  );
  const [sort, setSort] = useState<SortValue>(
    (searchParams.get("sort") as SortValue) || "health_asc"
  );

  const filtered = useMemo(() => {
    let result = strategies.filter((s) => matchesFilter(s, filter));

    // Apply sort — for health_asc, also sub-sort by monitoring status priority
    result = sortStrategies(result, sort);

    if (sort === "health_asc") {
      result.sort((a, b) => {
        const pa = STATUS_PRIORITY[a.monitoringStatus];
        const pb = STATUS_PRIORITY[b.monitoringStatus];
        if (pa !== pb) return pa - pb;
        return (a.healthScore ?? -1) - (b.healthScore ?? -1);
      });
    }

    return result;
  }, [strategies, filter, sort]);

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
            const count = getFilterCount(strategies, f.value);
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
                    ? "bg-[#4F46E5] text-white"
                    : "bg-[#1A0626] text-[#7C8DB0] border border-[rgba(79,70,229,0.15)] hover:border-[rgba(79,70,229,0.3)] hover:text-white"
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${active ? "text-white/70" : "text-[#7C8DB0]/70"}`}>
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
          className="bg-[#1A0626] text-[#CBD5E1] text-xs border border-[rgba(79,70,229,0.15)] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#4F46E5] appearance-none cursor-pointer"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Strategy Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((strategy) => (
            <StrategyStatusCard key={strategy.id} strategy={strategy} />
          ))}
        </div>
      ) : (
        <EmptyState filter={filter} />
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterValue }) {
  const messages: Record<FilterValue, string> = {
    all: "No live strategies yet. Connect your first EA to start monitoring.",
    healthy: "No strategies are currently healthy.",
    at_risk: "No strategies are at risk. All clear.",
    attention: "No strategies need attention right now.",
  };

  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-[rgba(79,70,229,0.15)] rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-[#A78BFA]"
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
        <p className="text-sm text-[#7C8DB0]">{messages[filter]}</p>
      </div>
    </div>
  );
}
