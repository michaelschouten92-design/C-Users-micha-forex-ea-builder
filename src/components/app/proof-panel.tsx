"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { showSuccess } from "@/lib/toast";

interface ProofStatus {
  strategyId: string;
  slug: string;
  isPublic: boolean;
  ladderLevel: string;
  ladderMeta: { label: string; color: string; description: string };
  healthScore: number | null;
  liveTrades: number;
  liveDays: number | null;
  chainIntegrity: boolean;
  requirements: {
    level: string;
    label: string;
    met: boolean;
    description: string;
  }[];
  proofUrl: string;
}

export function ProofPanel({ instanceId }: { instanceId: string }) {
  const [data, setData] = useState<ProofStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/live/${instanceId}/proof-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [instanceId]);

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-[#1A0626] rounded w-32" />
          <div className="h-20 bg-[#1A0626] rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <p className="text-xs text-[#7C8DB0]">
          No proof page linked to this instance. Create a verified strategy page from your project
          settings.
        </p>
      </div>
    );
  }

  function copyProofUrl() {
    if (!data) return;
    navigator.clipboard.writeText(data.proofUrl).then(() => showSuccess("Proof URL copied"));
  }

  return (
    <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)] space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">Proof Status</p>
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
          style={{
            borderColor: `${data.ladderMeta.color}40`,
            backgroundColor: `${data.ladderMeta.color}15`,
            color: data.ladderMeta.color,
          }}
        >
          {data.ladderMeta.label}
        </span>
      </div>

      {/* Level description */}
      <p className="text-xs text-[#94A3B8]">{data.ladderMeta.description}</p>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#0A0118]/50 rounded-lg p-2 text-center">
          <p className="text-sm font-medium text-white">{data.liveTrades}</p>
          <p className="text-[9px] text-[#7C8DB0]">Live Trades</p>
        </div>
        <div className="bg-[#0A0118]/50 rounded-lg p-2 text-center">
          <p className="text-sm font-medium text-white">{data.liveDays ?? 0}d</p>
          <p className="text-[9px] text-[#7C8DB0]">Live Days</p>
        </div>
        <div className="bg-[#0A0118]/50 rounded-lg p-2 text-center">
          <p
            className={`text-sm font-medium ${data.chainIntegrity ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {data.chainIntegrity ? "Valid" : "Broken"}
          </p>
          <p className="text-[9px] text-[#7C8DB0]">Chain</p>
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0]">
          Next Level Requirements
        </p>
        {data.requirements.map((req, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 shrink-0 ${req.met ? "text-[#10B981]" : "text-[#7C8DB0]"}`}>
              {req.met ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                </svg>
              )}
            </span>
            <span className={req.met ? "text-[#94A3B8]" : "text-[#CBD5E1]"}>{req.description}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        {data.isPublic && (
          <Link
            href={`/proof/${data.strategyId}`}
            className="px-3 py-1.5 text-xs font-medium bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] transition-colors"
          >
            View Proof Page
          </Link>
        )}
        <button
          onClick={copyProofUrl}
          className="px-3 py-1.5 text-xs font-medium border border-[rgba(79,70,229,0.2)] text-[#7C8DB0] hover:text-white rounded-lg transition-colors"
        >
          Copy URL
        </button>
      </div>
    </div>
  );
}
