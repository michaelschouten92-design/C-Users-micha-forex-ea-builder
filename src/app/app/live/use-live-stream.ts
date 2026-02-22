"use client";

import { useState, useEffect, useRef } from "react";

export type ConnectionStatus = "connecting" | "connected" | "fallback-polling" | "disconnected";

interface LiveStreamState {
  status: ConnectionStatus;
  lastUpdated: Date | null;
}

interface UseLiveStreamOptions {
  onInit: (data: unknown[]) => void;
  onHeartbeat: (data: unknown) => void;
  onTrade: (data: unknown) => void;
  onError: (data: unknown) => void;
  /** Polling interval in ms when falling back to HTTP polling */
  pollingInterval?: number;
  /** URL for polling fallback */
  pollingUrl?: string;
  /** Callback with full data from polling */
  onPollingData?: (data: unknown[]) => void;
}

export function useLiveStream(options: UseLiveStreamOptions): LiveStreamState {
  const { pollingInterval = 10000, pollingUrl = "/api/live/status" } = options;

  const [state, setState] = useState<LiveStreamState>({
    status: "connecting",
    lastUpdated: null,
  });

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const sseAttempted = useRef(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    function startSSE(): void {
      setState((s) => ({ ...s, status: "connecting" }));
      eventSource = new EventSource("/api/live/stream");

      eventSource.addEventListener("init", (e) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(e.data);
          optionsRef.current.onInit(data);
          setState({ status: "connected", lastUpdated: new Date() });
        } catch {
          /* ignore parse errors */
        }
      });

      eventSource.addEventListener("heartbeat", (e) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(e.data);
          optionsRef.current.onHeartbeat(data);
          setState((s) => ({ ...s, lastUpdated: new Date() }));
        } catch {
          /* ignore */
        }
      });

      eventSource.addEventListener("trade", (e) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(e.data);
          optionsRef.current.onTrade(data);
          setState((s) => ({ ...s, lastUpdated: new Date() }));
        } catch {
          /* ignore */
        }
      });

      eventSource.addEventListener("error", (e) => {
        if (cancelled) return;
        // Check if this is a data event or a connection error
        if (e instanceof MessageEvent) {
          try {
            const data = JSON.parse(e.data);
            optionsRef.current.onError(data);
          } catch {
            /* ignore */
          }
          return;
        }
        // Connection error -- fall back to polling
        eventSource?.close();
        eventSource = null;
        if (!cancelled) startPolling();
      });

      eventSource.onerror = () => {
        if (cancelled) return;
        eventSource?.close();
        eventSource = null;
        if (!cancelled) startPolling();
      };
    }

    function startPolling(): void {
      setState((s) => ({ ...s, status: "fallback-polling" }));

      async function poll(): Promise<void> {
        if (cancelled) return;
        try {
          const res = await fetch(pollingUrl);
          if (res.ok) {
            const json = await res.json();
            const data = json.data ?? json;
            if (optionsRef.current.onPollingData) {
              optionsRef.current.onPollingData(Array.isArray(data) ? data : []);
            }
            setState({ status: "fallback-polling", lastUpdated: new Date() });
          }
        } catch {
          setState((s) => ({ ...s, status: "disconnected" }));
        }
      }

      poll();
      pollTimer = setInterval(poll, pollingInterval);
    }

    // Try SSE first
    if (typeof EventSource !== "undefined" && !sseAttempted.current) {
      sseAttempted.current = true;
      startSSE();
    } else {
      startPolling();
    }

    return () => {
      cancelled = true;
      eventSource?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [pollingInterval, pollingUrl]);

  return state;
}
