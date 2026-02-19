"use client";

import { useState } from "react";
import Link from "next/link";

type UpsellBannerProps = {
  variant: "export-limit" | "mql4-locked" | "trade-management";
  exportsUsed?: number;
  exportLimit?: number;
};

interface VariantConfig {
  message: string;
  cta: string;
  storageKey: string;
}

function getVariantConfig(
  variant: UpsellBannerProps["variant"],
  exportsUsed?: number,
  exportLimit?: number
): VariantConfig {
  switch (variant) {
    case "export-limit":
      return {
        message: `You've used ${exportsUsed ?? 0} of ${exportLimit ?? 3} exports this month. Upgrade for unlimited exports.`,
        cta: "Upgrade to Pro",
        storageKey: "upsell-dismissed-export-limit",
      };
    case "mql4-locked":
      return {
        message:
          "MQL4 export is available on Pro and Elite plans. Upgrade to build for MetaTrader 4.",
        cta: "Unlock MQL4",
        storageKey: "upsell-dismissed-mql4",
      };
    case "trade-management":
      return {
        message:
          "Unlock advanced trade management features like partial close, multi-level TP, and lock profit with Pro.",
        cta: "Upgrade Now",
        storageKey: "upsell-dismissed-trade-mgmt",
      };
  }
}

export function UpsellBanner({ variant, exportsUsed, exportLimit }: UpsellBannerProps) {
  const config = getVariantConfig(variant, exportsUsed, exportLimit);

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(config.storageKey);
    if (!stored) return false;
    // Allow re-showing after 7 days
    const dismissedAt = parseInt(stored, 10);
    if (isNaN(dismissedAt)) return false;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < sevenDays;
  });

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(config.storageKey, String(Date.now()));
  }

  return (
    <div className="relative bg-gradient-to-r from-[#4F46E5]/15 via-[#A78BFA]/10 to-[#22D3EE]/15 border border-[rgba(79,70,229,0.3)] rounded-xl p-4 overflow-hidden">
      {/* Gradient accent top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#4F46E5] via-[#A78BFA] to-[#22D3EE]" />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/20 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-[#A78BFA]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <p className="text-sm text-[#CBD5E1]">{config.message}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_16px_rgba(79,70,229,0.3)] whitespace-nowrap"
          >
            {config.cta}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
          <button
            onClick={handleDismiss}
            className="text-[#7C8DB0] hover:text-white p-1 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
