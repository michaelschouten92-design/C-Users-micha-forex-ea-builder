"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function SuspendedGuard() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      session?.user?.suspended &&
      pathname !== "/app/suspended" &&
      !pathname.startsWith("/app/admin")
    ) {
      router.replace("/app/suspended");
    }
  }, [session, pathname, router]);

  return null;
}
