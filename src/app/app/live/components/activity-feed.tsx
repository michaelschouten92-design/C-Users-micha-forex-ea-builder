"use client";

import { formatPnl, formatRelativeTime } from "./utils";

export interface FeedItem {
  id: string;
  symbol: string;
  type: string; // BUY or SELL
  profit: number;
  lots?: number;
  eaName: string;
  closeTime: string | null;
  isNew?: boolean; // just arrived via SSE
}

interface ActivityFeedProps {
  items: FeedItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-[11px] text-[#475569]">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          Waiting for trades...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 px-3 py-1.5 rounded transition-colors ${
            item.isNew ? "bg-white/[0.04] border border-[#1E293B]/40" : "hover:bg-white/[0.02]"
          }`}
        >
          {/* Type badge */}
          <span
            className={`text-[9px] font-bold w-7 text-center py-0.5 rounded ${
              item.type === "BUY"
                ? "bg-[#10B981]/10 text-[#10B981]"
                : "bg-[#EF4444]/10 text-[#EF4444]"
            }`}
          >
            {item.type === "BUY" ? "B" : "S"}
          </span>

          {/* Symbol */}
          <span className="text-[11px] font-semibold text-[#CBD5E1] w-[70px] truncate">
            {item.symbol}
          </span>

          {/* Lots */}
          {item.lots != null && (
            <span className="text-[10px] text-[#475569] tabular-nums w-[40px]">
              {item.lots.toFixed(2)}
            </span>
          )}

          {/* P&L */}
          <span
            className={`text-[11px] font-semibold tabular-nums flex-1 ${
              item.profit > 0
                ? "text-[#10B981]"
                : item.profit < 0
                  ? "text-[#EF4444]"
                  : "text-[#64748B]"
            }`}
          >
            {formatPnl(item.profit)}
          </span>

          {/* EA name + time */}
          <span className="text-[9px] text-[#475569] truncate max-w-[120px] text-right">
            {item.eaName}
          </span>
          <span className="text-[9px] text-[#334155] w-[50px] text-right flex-shrink-0">
            {formatRelativeTime(item.closeTime)}
          </span>
        </div>
      ))}
    </div>
  );
}
