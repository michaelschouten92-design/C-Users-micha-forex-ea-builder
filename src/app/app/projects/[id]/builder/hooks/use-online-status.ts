import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook that tracks browser online/offline status.
 * Uses navigator.onLine events for quick detection, plus an active
 * server ping to verify — navigator.onLine is unreliable on some
 * Windows/VPN/proxy configurations.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const clearRetry = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const verifyAndSetOffline = useCallback(async () => {
    const actuallyOnline = await checkConnection();
    if (actuallyOnline) return; // false alarm from navigator.onLine
    setIsOnline(false);

    // Retry every 5s while offline
    const retry = async () => {
      const online = await checkConnection();
      if (online) {
        setIsOnline(true);
        clearRetry();
      } else {
        retryTimer.current = setTimeout(retry, 5000);
      }
    };
    clearRetry();
    retryTimer.current = setTimeout(retry, 5000);
  }, [checkConnection, clearRetry]);

  // Subscribe to browser online/offline events
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      clearRetry();
    };
    const onOffline = () => {
      verifyAndSetOffline();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearRetry();
    };
  }, [verifyAndSetOffline, clearRetry]);

  // One-time initial check if navigator already reports offline at mount
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (!navigator.onLine) {
      const timer = setTimeout(() => verifyAndSetOffline(), 0);
      return () => clearTimeout(timer);
    }
  }, [verifyAndSetOffline]);

  return isOnline;
}
