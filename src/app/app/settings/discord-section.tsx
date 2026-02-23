"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError, showInfo } from "@/lib/toast";

interface DiscordStatus {
  enabled: boolean;
  connected?: boolean;
  discordId?: string | null;
  isPrimaryLogin?: boolean;
}

export function DiscordSection() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch("/api/discord/status")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: DiscordStatus) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  }, []);

  // Handle callback URL params
  useEffect(() => {
    const discordParam = searchParams.get("discord");
    if (!discordParam) return;

    switch (discordParam) {
      case "connected":
        showSuccess("Discord connected successfully");
        break;
      case "denied":
        showInfo("Discord connection cancelled");
        break;
      case "already_linked":
        showError("This Discord account is already linked to another user");
        break;
      case "error":
        showError("Something went wrong connecting Discord");
        break;
    }

    // Clean up URL params
    const url = new URL(window.location.href);
    url.searchParams.delete("discord");
    window.history.replaceState({}, "", url.toString());
  }, [searchParams]);

  async function handleUnlink() {
    setUnlinking(true);
    try {
      const res = await fetch("/api/discord/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Failed to disconnect Discord");
      } else {
        showSuccess("Discord disconnected");
        setStatus((prev) => (prev ? { ...prev, connected: false, discordId: null } : prev));
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setUnlinking(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-[#1E293B] rounded w-1/3" />
          <div className="h-4 bg-[#1E293B] rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(239,68,68,0.2)] rounded-xl p-6">
        <p className="text-sm text-[#EF4444]">Failed to load Discord status</p>
      </div>
    );
  }

  // Hide section entirely if Discord is not enabled
  if (!status?.enabled) {
    return null;
  }

  return (
    <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
        Discord
      </h2>

      {status.connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-sm text-[#94A3B8]">Discord connected</span>
            {status.discordId && (
              <span className="text-xs text-[#7C8DB0] truncate max-w-[200px] inline-block align-bottom">
                ({status.discordId})
              </span>
            )}
          </div>

          {status.isPrimaryLogin ? (
            <p className="text-xs text-[#7C8DB0]">
              Discord is your login method and cannot be disconnected.
            </p>
          ) : (
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="px-4 py-2 text-sm font-medium text-[#EF4444] border border-[rgba(239,68,68,0.3)] rounded-lg hover:bg-[rgba(239,68,68,0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {unlinking ? "Disconnecting..." : "Disconnect Discord"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[#94A3B8]">
            Connect your Discord account to automatically join our server and get your subscription
            role.
          </p>
          <a
            href="/api/discord/link"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5865F2] rounded-lg hover:bg-[#4752C4] transition-all duration-200"
          >
            Connect Discord
          </a>
        </div>
      )}
    </div>
  );
}
