"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";

export default function SuspendedPage() {
  const { data: session } = useSession();
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    // Fetch suspended reason from user detail (uses a lightweight API call)
    apiClient
      .get<{ suspendedReason: string | null }>(`/api/auth/suspended-info`)
      .then((res) => setReason(res.suspendedReason))
      .catch((err) => {
        console.error("Failed to fetch suspended info:", err);
      });
  }, [session]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-[#111114]/80 p-8 text-center">
        <div className="text-4xl mb-4">&#x26D4;</div>
        <h1 className="text-2xl font-bold text-white mb-3">Account Suspended</h1>
        <p className="text-[#A1A1AA] mb-4">Your account has been suspended by an administrator.</p>
        {reason && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-[#A1A1AA]">
              <span className="text-red-400 font-medium">Reason:</span>{" "}
              <span className="text-white">{reason}</span>
            </p>
          </div>
        )}
        <p className="text-sm text-[#71717A] mb-6">
          If you believe this is an error, please email{" "}
          <a href="mailto:support@algo-studio.com" className="text-[#818CF8] hover:underline">
            support@algo-studio.com
          </a>{" "}
          with your account email. We will respond within 48 hours.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sign out of suspended account"
          className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white text-sm px-6 py-2 rounded transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
