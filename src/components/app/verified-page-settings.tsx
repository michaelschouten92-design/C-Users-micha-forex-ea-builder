"use client";

import { useState, useEffect } from "react";
import { showSuccess, showError } from "@/lib/toast";

interface VerifiedPageConfig {
  id: string;
  slug: string;
  isPublic: boolean;
  showEquityCurve: boolean;
  showTradeLog: boolean;
  showHealthStatus: boolean;
  pinnedInstanceId: string | null;
}

interface InstanceOption {
  id: string;
  eaName: string;
  symbol: string | null;
  status: string;
}

interface VerifiedPageSettingsProps {
  projectId: string;
  instances: InstanceOption[];
}

export function VerifiedPageSettings({ projectId, instances }: VerifiedPageSettingsProps) {
  const [config, setConfig] = useState<VerifiedPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/projects/${projectId}/verified-page`);
        if (res.ok) {
          const data = await res.json();
          setConfig(data.page);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [projectId]);

  async function handleSave(updates: Partial<VerifiedPageConfig>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/verified-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.page);
        showSuccess("Page settings updated");
      } else {
        const data = await res.json();
        showError(data.error || "Failed to update settings");
      }
    } catch {
      showError("Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(key: keyof VerifiedPageConfig) {
    if (!config) return;
    handleSave({ [key]: !config[key] });
  }

  function copyPublicUrl() {
    if (!config) return;
    const url = `${window.location.origin}/strategy/${config.slug}`;
    navigator.clipboard.writeText(url).then(() => showSuccess("URL copied to clipboard"));
  }

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)] animate-pulse">
        <div className="h-4 bg-[#1A0626] rounded w-40 mb-3" />
        <div className="space-y-2">
          <div className="h-8 bg-[#1A0626] rounded" />
          <div className="h-8 bg-[#1A0626] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-[#0A0118]/50 border border-[rgba(79,70,229,0.1)] space-y-4">
      <h3 className="text-sm font-medium text-white">Verified Strategy Page</h3>

      {!config ? (
        <div>
          <p className="text-xs text-[#7C8DB0] mb-3">
            Create a public page to share your verified strategy performance.
          </p>
          <button
            onClick={() => handleSave({ isPublic: false })}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] disabled:opacity-50 transition-all"
          >
            {saving ? "Creating..." : "Create Page"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Public toggle */}
          <ToggleRow
            label="Public"
            description="Make this page visible to anyone with the link"
            checked={config.isPublic}
            onChange={() => handleToggle("isPublic")}
          />

          {/* Section toggles */}
          <ToggleRow
            label="Equity Curve"
            description="Show equity chart on public page"
            checked={config.showEquityCurve}
            onChange={() => handleToggle("showEquityCurve")}
          />
          <ToggleRow
            label="Trade Log"
            description="Show individual trade records"
            checked={config.showTradeLog}
            onChange={() => handleToggle("showTradeLog")}
          />
          <ToggleRow
            label="Health Status"
            description="Show live health monitoring badge"
            checked={config.showHealthStatus}
            onChange={() => handleToggle("showHealthStatus")}
          />

          {/* Pinned instance selector */}
          <div>
            <label className="text-xs text-[#7C8DB0] block mb-1">Pinned Instance</label>
            <select
              value={config.pinnedInstanceId || ""}
              onChange={(e) => handleSave({ pinnedInstanceId: e.target.value || null })}
              className="w-full px-3 py-2 text-sm bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg text-white focus:border-[#4F46E5] focus:outline-none"
            >
              <option value="">Select an instance...</option>
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.eaName} {inst.symbol ? `(${inst.symbol})` : ""} — {inst.status}
                </option>
              ))}
            </select>
          </div>

          {/* Copy URL */}
          <div className="flex items-center gap-2 pt-2">
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/strategy/${config.slug}`}
              className="flex-1 px-3 py-2 text-xs bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-lg text-[#7C8DB0] font-mono"
            />
            <button
              onClick={copyPublicUrl}
              className="px-3 py-2 text-xs font-medium bg-[#4F46E5]/20 text-[#A78BFA] border border-[#4F46E5]/20 rounded-lg hover:bg-[#4F46E5]/30 transition-all"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-[10px] text-[#7C8DB0]">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-[#4F46E5]" : "bg-[#1A0626] border border-[rgba(79,70,229,0.2)]"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
