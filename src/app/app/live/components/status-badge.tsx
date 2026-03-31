"use client";

export const STATUS_TOOLTIPS: Record<string, string> = {
  ONLINE: "EA is connected and actively trading. Heartbeat received within the last 2 minutes.",
  OFFLINE: "EA has not sent a heartbeat recently. Check your MT5 terminal and internet connection.",
  ERROR: "EA reported an error. Check the error message below for details.",
};

export function StatusBadge({
  status,
  animate,
}: {
  status: "ONLINE" | "OFFLINE" | "ERROR";
  animate?: boolean;
}) {
  if (status === "ONLINE") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-[#10B981] ${animate ? "animate-pulse" : ""}`}
        title={STATUS_TOOLTIPS.ONLINE}
      >
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        Online
      </span>
    );
  }
  if (status === "ERROR") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EF4444]"
        title={STATUS_TOOLTIPS.ERROR}
      >
        <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
        Error
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]"
      title={STATUS_TOOLTIPS.OFFLINE}
    >
      <span className="w-2 h-2 rounded-full bg-[#64748B]" />
      Offline
    </span>
  );
}
