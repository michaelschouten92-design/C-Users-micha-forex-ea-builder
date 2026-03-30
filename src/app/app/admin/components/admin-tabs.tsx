"use client";

import { useState } from "react";

export type AdminTab =
  | "dashboard"
  | "users"
  | "audit"
  | "revenue"
  | "exports"
  | "analytics"
  | "announcements"
  | "live-eas"
  | "plan-limits"
  | "system-health"
  | "incidents";

interface TabGroup {
  label: string;
  tabs: { id: AdminTab; label: string }[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    label: "Dashboard",
    tabs: [{ id: "dashboard", label: "Overview" }],
  },
  {
    label: "Users",
    tabs: [
      { id: "users", label: "All Users" },
      { id: "audit", label: "Audit Log" },
    ],
  },
  {
    label: "Operations",
    tabs: [
      { id: "live-eas", label: "Live EAs" },
      { id: "incidents", label: "Incidents" },
      { id: "system-health", label: "System Health" },
    ],
  },
  {
    label: "Revenue",
    tabs: [
      { id: "revenue", label: "Dashboard" },
      { id: "exports", label: "Exports" },
      { id: "analytics", label: "Insights" },
    ],
  },
  {
    label: "Settings",
    tabs: [
      { id: "announcements", label: "Announcements" },
      { id: "plan-limits", label: "Plan Limits" },
    ],
  },
];

function findGroupForTab(tabId: AdminTab): string {
  for (const group of TAB_GROUPS) {
    if (group.tabs.some((t) => t.id === tabId)) return group.label;
  }
  return TAB_GROUPS[0].label;
}

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  const [activeGroup, setActiveGroup] = useState(() => findGroupForTab(activeTab));

  const currentGroup = TAB_GROUPS.find((g) => g.label === activeGroup) ?? TAB_GROUPS[0];

  return (
    <div className="mb-6">
      {/* Group pills */}
      <div className="flex gap-1.5 mb-3 p-1 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-lg w-fit">
        {TAB_GROUPS.map((group) => (
          <button
            key={group.label}
            onClick={() => {
              setActiveGroup(group.label);
              onTabChange(group.tabs[0].id);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeGroup === group.label
                ? "bg-[#6366F1] text-white shadow-sm"
                : "text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      {currentGroup.tabs.length > 1 && (
        <div className="flex gap-1">
          {currentGroup.tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[rgba(99,102,241,0.15)] text-[#818CF8]"
                  : "text-[#71717A] hover:text-[#A1A1AA]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
