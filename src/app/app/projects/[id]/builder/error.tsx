"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function BuilderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0A1A]">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Builder Error</h2>
        <p className="text-[#94A3B8] mb-2">An error occurred in the strategy builder.</p>
        <p className="text-[#7C8DB0] text-sm mb-6">
          Your work has likely been saved automatically. Try reloading the page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#4F46E5] text-white rounded-lg hover:bg-[#6366F1] transition-colors"
          >
            Try Again
          </button>
          <a
            href="/app"
            className="px-6 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
