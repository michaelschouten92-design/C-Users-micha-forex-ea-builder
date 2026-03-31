"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatPnl } from "./utils";

interface DailyPnlEntry {
  date: string;
  pnl: number;
}

interface TradingCalendarProps {
  dailyPnl: DailyPnlEntry[];
}

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatMonthYear(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function TradingCalendar({ dailyPnl }: TradingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));

  // Build a map of date string -> pnl for quick lookup
  const pnlMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of dailyPnl) {
      map.set(entry.date, entry.pnl);
    }
    return map;
  }, [dailyPnl]);

  // Determine navigable range from available data
  const { minMonth, maxMonth } = useMemo(() => {
    if (dailyPnl.length === 0) return { minMonth: null, maxMonth: null };
    const dates = dailyPnl.map((e) => new Date(e.date));
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    return { minMonth: startOfMonth(min), maxMonth: startOfMonth(max) };
  }, [dailyPnl]);

  const canGoPrev = minMonth !== null && currentMonth.getTime() > minMonth.getTime();
  const canGoNext = maxMonth !== null && currentMonth.getTime() < maxMonth.getTime();

  const handlePrev = () => {
    if (!canGoPrev) return;
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNext = () => {
    if (!canGoNext) return;
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Build grid cells for the current month
  const cells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday=0 ... Sunday=6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const result: { day: number | null; dateStr: string | null; isWeekend: boolean }[] = [];

    // Leading empty cells
    for (let i = 0; i < startDow; i++) {
      result.push({ day: null, dateStr: null, isWeekend: false });
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({ day: d, dateStr, isWeekend });
    }

    // Trailing empty cells to fill the last row
    while (result.length % 7 !== 0) {
      result.push({ day: null, dateStr: null, isWeekend: false });
    }

    return result;
  }, [currentMonth]);

  // Max absolute P&L for the month (for opacity scaling)
  const maxAbsPnl = useMemo(() => {
    let max = 0;
    for (const cell of cells) {
      if (cell.dateStr && pnlMap.has(cell.dateStr)) {
        max = Math.max(max, Math.abs(pnlMap.get(cell.dateStr)!));
      }
    }
    return max;
  }, [cells, pnlMap]);

  // Monthly summary stats
  const summary = useMemo(() => {
    const monthEntries: { date: string; pnl: number }[] = [];
    for (const cell of cells) {
      if (cell.dateStr && pnlMap.has(cell.dateStr)) {
        monthEntries.push({ date: cell.dateStr, pnl: pnlMap.get(cell.dateStr)! });
      }
    }

    const tradingDays = monthEntries.length;
    const winDays = monthEntries.filter((e) => e.pnl > 0).length;
    const lossDays = monthEntries.filter((e) => e.pnl < 0).length;
    const total = monthEntries.reduce((sum, e) => sum + e.pnl, 0);

    let best: { date: string; pnl: number } | null = null;
    let worst: { date: string; pnl: number } | null = null;
    for (const e of monthEntries) {
      if (!best || e.pnl > best.pnl) best = e;
      if (!worst || e.pnl < worst.pnl) worst = e;
    }

    return { tradingDays, winDays, lossDays, total, best, worst };
  }, [cells, pnlMap]);

  // Check if this month has any data
  const hasData = summary.tradingDays > 0;

  function getCellBg(pnl: number): string {
    if (maxAbsPnl === 0) return "transparent";
    const ratio = Math.abs(pnl) / maxAbsPnl;
    const opacity = 0.1 + ratio * 0.3; // 0.1 to 0.4
    const color = pnl > 0 ? "16, 185, 129" : "239, 68, 68"; // #10B981 or #EF4444
    return `rgba(${color}, ${opacity})`;
  }

  function formatShortDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="bg-[#0F0A1A] border border-[#1E293B]/60 rounded-lg p-4">
      {/* Month/year header with navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={`p-1 rounded transition-colors ${
            canGoPrev
              ? "text-[#475569] hover:text-white cursor-pointer"
              : "text-[#1E293B] cursor-not-allowed"
          }`}
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="text-sm font-medium text-white">{formatMonthYear(currentMonth)}</span>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className={`p-1 rounded transition-colors ${
            canGoNext
              ? "text-[#475569] hover:text-white cursor-pointer"
              : "text-[#1E293B] cursor-not-allowed"
          }`}
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[9px] uppercase tracking-wider text-[#475569] py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((cell, idx) => {
          const hasPnl = cell.dateStr !== null && pnlMap.has(cell.dateStr);
          const pnl = hasPnl ? pnlMap.get(cell.dateStr!)! : null;

          return (
            <div
              key={idx}
              className="min-w-[50px] min-h-[44px] relative rounded-sm p-1 flex flex-col"
              style={{
                backgroundColor: pnl !== null ? getCellBg(pnl) : "transparent",
                border:
                  cell.day !== null && pnl === null
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "1px solid transparent",
              }}
            >
              {cell.day !== null && (
                <>
                  <span
                    className={`text-[9px] leading-none ${
                      cell.isWeekend && pnl === null ? "text-[#1E293B]" : "text-[#475569]"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {pnl !== null && (
                    <span
                      className={`text-[10px] tabular-nums mt-auto text-center leading-tight ${
                        pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                      }`}
                    >
                      {formatPnl(pnl).replace("$", "$\u200B")}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty month message */}
      {!hasData && (
        <p className="text-center text-[10px] text-[#475569] py-4">
          No trading data for {formatMonthYear(currentMonth)}
        </p>
      )}

      {/* Summary row */}
      {hasData && (
        <div className="mt-3 pt-3 border-t border-[#1E293B]/60 grid grid-cols-3 gap-x-4 gap-y-2">
          <div>
            <span className="text-[10px] text-[#475569]">Trading days </span>
            <span className="text-[10px] text-white">{summary.tradingDays}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#475569]">Win days </span>
            <span className="text-[10px] text-[#10B981]">{summary.winDays}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#475569]">Loss days </span>
            <span className="text-[10px] text-[#EF4444]">{summary.lossDays}</span>
          </div>
          {summary.best && (
            <div>
              <span className="text-[10px] text-[#475569]">Best day </span>
              <span className="text-[10px] text-white">
                {formatPnl(summary.best.pnl)}{" "}
                <span className="text-[#475569]">({formatShortDate(summary.best.date)})</span>
              </span>
            </div>
          )}
          {summary.worst && (
            <div>
              <span className="text-[10px] text-[#475569]">Worst day </span>
              <span className="text-[10px] text-white">
                {formatPnl(summary.worst.pnl)}{" "}
                <span className="text-[#475569]">({formatShortDate(summary.worst.date)})</span>
              </span>
            </div>
          )}
          <div>
            <span className="text-[10px] text-[#475569]">Total </span>
            <span
              className={`text-[10px] ${summary.total >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
            >
              {formatCurrency(summary.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
