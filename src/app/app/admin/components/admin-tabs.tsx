"use client";

export type AdminTab =
  | "users"
  | "audit"
  | "revenue"
  | "exports"
  | "analytics"
  | "announcements"
  | "live-eas";

const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "users", label: "Users", icon: "\uD83D\uDC65" },
  { id: "audit", label: "Audit Log", icon: "\uD83D\uDCCB" },
  { id: "revenue", label: "Revenue", icon: "\uD83D\uDCB0" },
  { id: "exports", label: "Exports", icon: "\uD83D\uDCE6" },
  { id: "analytics", label: "Analytics", icon: "\uD83D\uDCCA" },
  { id: "announcements", label: "Announcements", icon: "\uD83D\uDCE2" },
  { id: "live-eas", label: "Live EAs", icon: "\uD83D\uDCE1" },
];

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            activeTab === tab.id
              ? "bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/25"
              : "bg-[#1A0626]/60 text-[#94A3B8] border border-[rgba(79,70,229,0.2)] hover:border-[rgba(79,70,229,0.4)] hover:text-white"
          }`}
        >
          <span className="mr-1.5">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
