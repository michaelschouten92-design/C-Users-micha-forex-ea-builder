"use client";

import { useState, useEffect } from "react";
import type { ConnectionStatus } from "../use-live-stream";

export function computeTimeLabel(lastUpdated: Date | null): string {
  if (!lastUpdated) return "Never";
  const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
  if (seconds < 5) return "Just now";
  return `${seconds}s ago`;
}

export const CONNECTION_STATUS_CONFIG: Record<
  ConnectionStatus,
  { color: string; label: string; ping: boolean }
> = {
  connecting: { color: "#F59E0B", label: "Connecting", ping: false },
  connected: { color: "#10B981", label: "Live", ping: true },
  "fallback-polling": { color: "#F59E0B", label: "Updating", ping: false },
  disconnected: { color: "#EF4444", label: "Offline", ping: false },
};

export function ConnectionIndicator({
  connectionStatus,
  lastUpdated,
}: {
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
}) {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(() => computeTimeLabel(lastUpdated));

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      setTimeSinceUpdate(computeTimeLabel(lastUpdated));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const config = CONNECTION_STATUS_CONFIG[connectionStatus];

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs"
      style={{
        borderColor: `${config.color}20`,
        backgroundColor: `${config.color}08`,
        color: config.color,
      }}
    >
      <span className="relative flex h-2 w-2">
        {config.ping && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
            style={{ backgroundColor: config.color }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: config.color }}
        />
      </span>
      <span className="font-medium">
        {config.label}
        {lastUpdated ? (
          <span className="text-[#7C8DB0] font-normal"> · {timeSinceUpdate}</span>
        ) : null}
      </span>
    </div>
  );
}
