"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function StrategyDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[strategy detail error boundary]", error.message, error.digest);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
      <div role="alert" className="text-center p-8 max-w-lg">
        <h2 className="text-xl font-bold text-white mb-3">Strategy details unavailable</h2>
        <p className="text-sm text-[#A1A1AA] mb-6">
          An error occurred while loading this strategy. Your live EA continues running
          independently.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#6366F1]/90 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/app/live"
            className="px-5 py-2 border border-[rgba(255,255,255,0.10)] text-[#FAFAFA] text-sm rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            Back to Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
