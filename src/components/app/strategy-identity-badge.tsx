"use client";

import { useState } from "react";

interface StrategyIdentityBadgeProps {
  strategyId: string;
  fingerprint?: string;
  versionNo?: number;
}

export function StrategyIdentityBadge({
  strategyId,
  fingerprint,
  versionNo,
}: StrategyIdentityBadgeProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(strategyId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#4F46E5]/10 border border-[#4F46E5]/20 hover:border-[#4F46E5]/40 transition-all group"
      title={fingerprint ? `Fingerprint: ${fingerprint.substring(0, 16)}...` : "Click to copy"}
    >
      <svg
        className="w-3.5 h-3.5 text-[#A78BFA]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
      <span className="text-xs font-mono font-medium text-[#A78BFA] group-hover:text-white transition-colors">
        {strategyId}
      </span>
      {versionNo !== undefined && (
        <span className="text-[10px] font-medium text-[#7C8DB0] bg-[#1A0626] px-1.5 py-0.5 rounded">
          v{versionNo}
        </span>
      )}
      {copied && <span className="text-[10px] text-[#10B981]">Copied!</span>}
    </button>
  );
}
