"use client";

import { useState, useRef, useEffect } from "react";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface ShareTrackRecordButtonProps {
  instanceId: string;
}

export function ShareTrackRecordButton({ instanceId }: ShareTrackRecordButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleGenerateLink() {
    setLoading(true);
    try {
      const res = await fetch(`/api/track-record/share/${instanceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      });

      if (res.status === 403) {
        showError("Pro or Elite subscription required to share track records");
        return;
      }

      if (!res.ok) {
        showError("Failed to generate share link");
        return;
      }

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
    } catch {
      showError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeLink() {
    setRevoking(true);
    try {
      const res = await fetch(`/api/track-record/share/${instanceId}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
      });

      if (!res.ok) {
        showError("Failed to revoke share link");
        return;
      }

      setShareUrl(null);
      showSuccess("Share link revoked");
    } catch {
      showError("Something went wrong");
    } finally {
      setRevoking(false);
    }
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showSuccess("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && !shareUrl) {
            handleGenerateLink();
          }
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4F46E5]/20 text-[#A78BFA] border border-[#4F46E5]/30 hover:bg-[#4F46E5]/30 transition-all duration-200"
        title="Share track record"
        aria-label="Share track record"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#1A0626] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Share Track Record</h3>
          <p className="text-xs text-[#7C8DB0] mb-3">
            Generate a verified proof bundle link that anyone can view and independently verify.
            Expires after 30 days.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating proof bundle...
            </div>
          ) : shareUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-lg text-xs text-[#CBD5E1] font-mono truncate"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-[#4F46E5] text-white text-xs font-medium rounded-lg hover:bg-[#6366F1] transition-colors flex-shrink-0"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={handleRevokeLink}
                disabled={revoking}
                className="w-full px-3 py-2 text-xs text-[#EF4444] border border-[rgba(239,68,68,0.3)] rounded-lg hover:bg-[rgba(239,68,68,0.1)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {revoking ? "Revoking..." : "Revoke Link"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateLink}
              className="w-full px-3 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#6366F1] transition-colors"
            >
              Generate Share Link
            </button>
          )}
        </div>
      )}
    </div>
  );
}
