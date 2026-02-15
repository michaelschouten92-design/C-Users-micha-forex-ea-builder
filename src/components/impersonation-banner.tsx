"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

export function ImpersonationBanner() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  if (!session?.user?.impersonatorId) return null;

  async function handleStop() {
    setStopping(true);
    try {
      const res = await apiClient.post<{ stopImpersonation: boolean }>(
        "/api/admin/users/stop-impersonate"
      );
      if (res.stopImpersonation) {
        await updateSession({ stopImpersonation: true });
        router.push("/app/admin");
        router.refresh();
      }
    } catch {
      setStopping(false);
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black text-center py-2 px-4 text-sm font-medium">
      Impersonating <span className="font-bold">{session.user.impersonatingEmail}</span>
      <button
        onClick={handleStop}
        disabled={stopping}
        className="ml-4 bg-black/20 hover:bg-black/30 disabled:opacity-50 px-3 py-0.5 rounded text-xs font-semibold transition-colors"
      >
        {stopping ? "Stopping..." : "Stop"}
      </button>
    </div>
  );
}
