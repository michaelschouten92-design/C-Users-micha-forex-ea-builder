"use client";

import { useState } from "react";
import { AdminPageHeader } from "../components/admin-page-header";
import { LiveEAsTab } from "../components/live-eas-tab";
import { IncidentsTab } from "../components/incidents-tab";
import { SystemHealthTab } from "../components/system-health-tab";

type SubTab = "live-eas" | "incidents" | "system-health";

export default function AdminOperationsPage() {
  const [subTab, setSubTab] = useState<SubTab>("live-eas");

  const tabs: { id: SubTab; label: string }[] = [
    { id: "live-eas", label: "Live EAs" },
    { id: "incidents", label: "Incidents" },
    { id: "system-health", label: "System Health" },
  ];

  return (
    <>
      <AdminPageHeader title="Operations" subtitle="Live monitoring and system health" />

      <div className="flex gap-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              subTab === tab.id
                ? "bg-[rgba(99,102,241,0.12)] text-[#818CF8]"
                : "text-[#71717A] hover:text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.04)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "live-eas" && <LiveEAsTab />}
      {subTab === "incidents" && <IncidentsTab />}
      {subTab === "system-health" && <SystemHealthTab />}
    </>
  );
}
