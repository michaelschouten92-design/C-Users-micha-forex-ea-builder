"use client";

import { useState, useEffect } from "react";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

export function HandleSetting() {
  const [handle, setHandle] = useState("");
  const [savedHandle, setSavedHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/account/handle")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.handle) {
          setHandle(data.handle);
          setSavedHandle(data.handle);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!handle.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/account/handle", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ handle: handle.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSavedHandle(data.handle);
        showSuccess("Handle saved");
      } else {
        showError(data.error || "Failed to save handle");
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <div className="h-6 bg-[#0A0118] rounded w-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-2">Public Handle</h2>
      <p className="text-sm text-[#94A3B8] mb-4">
        Your public handle is used for your trader profile URL and proof pages.
        {savedHandle && (
          <span className="block mt-1 text-xs text-[#7C8DB0]">
            Your profile: <span className="text-[#A78BFA] font-mono">/@{savedHandle}</span>
          </span>
        )}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C8DB0] text-sm">@</span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
            maxLength={30}
            placeholder="your-handle"
            className="w-full pl-8 pr-3 py-2.5 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || handle.trim().length < 3 || handle === savedHandle}
          className="px-5 py-2.5 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {saving ? "Saving..." : savedHandle ? "Update" : "Claim"}
        </button>
      </div>
      <p className="text-[10px] text-[#7C8DB0] mt-2">
        3-30 characters, letters, numbers, hyphens and underscores only.
      </p>
    </div>
  );
}
