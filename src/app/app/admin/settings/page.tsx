"use client";

import { useState } from "react";
import { AdminPageHeader } from "../components/admin-page-header";
import { AnnouncementsTab } from "../components/announcements-tab";
import { PlanLimitsTab } from "../components/plan-limits-tab";

type SubTab = "announcements" | "plan-limits";

export default function AdminSettingsPage() {
  const [subTab, setSubTab] = useState<SubTab>("announcements");

  const tabs: { id: SubTab; label: string }[] = [
    { id: "announcements", label: "Announcements" },
    { id: "plan-limits", label: "Plan Limits" },
  ];

  return (
    <>
      <AdminPageHeader title="Settings" subtitle="Announcements and plan configuration" />

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

      {subTab === "announcements" && <AnnouncementsTab />}
      {subTab === "plan-limits" && <PlanLimitsTab />}
    </>
  );
}
