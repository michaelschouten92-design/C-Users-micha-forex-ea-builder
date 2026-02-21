"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface PlanLimitConfig {
  id: string;
  tier: string;
  maxProjects: number;
  maxExportsPerMonth: number;
  canExportMQL5: boolean;
  updatedAt: string;
}

const TIER_LABELS: Record<string, { name: string; color: string }> = {
  FREE: { name: "Free", color: "border-[#7C8DB0]/50" },
  PRO: { name: "Pro", color: "border-[#4F46E5]/50" },
  ELITE: { name: "Elite", color: "border-[#A78BFA]/50" },
};

export function PlanLimitsTab() {
  const [configs, setConfigs] = useState<PlanLimitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<PlanLimitConfig>>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      const res = await apiClient.get<{ data: PlanLimitConfig[] }>("/api/admin/plan-limits");
      setConfigs(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function getEditValue(tier: string, field: keyof PlanLimitConfig) {
    const edit = edits[tier];
    if (edit && field in edit) return edit[field];
    const config = configs.find((c) => c.tier === tier);
    return config ? config[field] : undefined;
  }

  function setEditValue(tier: string, field: string, value: number | boolean) {
    setEdits((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }));
  }

  async function handleSave(tier: string) {
    const config = configs.find((c) => c.tier === tier);
    if (!config) return;
    setSaving(tier);
    try {
      const edit = edits[tier] || {};
      await apiClient.put("/api/admin/plan-limits", {
        tier,
        maxProjects: edit.maxProjects ?? config.maxProjects,
        maxExportsPerMonth: edit.maxExportsPerMonth ?? config.maxExportsPerMonth,
        canExportMQL5: edit.canExportMQL5 ?? config.canExportMQL5,
      });
      showSuccess("Saved", `${tier} limits updated`);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[tier];
        return next;
      });
      fetchConfigs();
    } catch (err) {
      showError("Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div className="text-[#94A3B8] py-8 text-center">Loading plan limits...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Plan Limits Configuration</h2>
      <p className="text-sm text-[#94A3B8] mb-6">
        Configure limits per tier. Changes apply immediately. Use 999999 for unlimited.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["FREE", "PRO", "ELITE"] as const).map((tier) => {
          const label = TIER_LABELS[tier];
          const hasEdits = !!edits[tier];
          return (
            <div key={tier} className={`rounded-lg border ${label.color} bg-[#1A0626]/60 p-6`}>
              <h3 className="text-lg font-bold text-white mb-4">{label.name}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#94A3B8] mb-1">Max Projects</label>
                  <input
                    type="number"
                    min={0}
                    value={(getEditValue(tier, "maxProjects") as number) ?? 0}
                    onChange={(e) =>
                      setEditValue(tier, "maxProjects", parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#94A3B8] mb-1">Max Exports / Month</label>
                  <input
                    type="number"
                    min={0}
                    value={(getEditValue(tier, "maxExportsPerMonth") as number) ?? 0}
                    onChange={(e) =>
                      setEditValue(tier, "maxExportsPerMonth", parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-[#0F0318] border border-[rgba(79,70,229,0.3)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4F46E5] transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-[#94A3B8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(getEditValue(tier, "canExportMQL5") as boolean) ?? true}
                      onChange={(e) => setEditValue(tier, "canExportMQL5", e.target.checked)}
                      className="accent-[#4F46E5]"
                    />
                    MQL5
                  </label>
                </div>
                <button
                  onClick={() => handleSave(tier)}
                  disabled={saving === tier || !hasEdits}
                  className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition-colors"
                >
                  {saving === tier ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
