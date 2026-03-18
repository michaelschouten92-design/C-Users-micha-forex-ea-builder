"use client";

import { useState } from "react";

export function ShareActions() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent("Verified live account track record monitored by AlgoStudio.")}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`;

  return (
    <div className="flex items-center justify-center gap-4 mt-3">
      <button
        onClick={handleCopy}
        className="text-[10px] text-[#818CF8] hover:text-white transition-colors"
      >
        {copied ? "✓ Copied" : "Copy link"}
      </button>
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-[#818CF8] hover:text-white transition-colors"
      >
        Share on X
      </a>
    </div>
  );
}
