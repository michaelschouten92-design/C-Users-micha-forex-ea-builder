"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";
import { defaultSwrConfig } from "@/lib/swr";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import type { Session } from "next-auth";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <ImpersonationBanner />
      <SWRConfig value={defaultSwrConfig}>{children}</SWRConfig>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1E293B",
            border: "1px solid rgba(79, 70, 229, 0.3)",
            color: "#F8FAFC",
          },
          classNames: {
            success: "!border-emerald-500/30",
            error: "!border-red-500/30",
            warning: "!border-amber-500/30",
            info: "!border-blue-500/30",
          },
        }}
        richColors
        closeButton
      />
    </SessionProvider>
  );
}
