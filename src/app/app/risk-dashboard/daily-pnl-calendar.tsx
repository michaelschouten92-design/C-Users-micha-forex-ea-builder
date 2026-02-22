"use client";

interface DailyPnlEntry {
  date: string;
  pnl: number;
}

interface DailyPnlCalendarProps {
  data: DailyPnlEntry[];
}

export function DailyPnlCalendar({ data }: DailyPnlCalendarProps) {
  const cellSize = 14;
  const cellGap = 2;
  const totalSize = cellSize + cellGap;

  // Build a map of date -> pnl
  const pnlMap = new Map<string, number>();
  for (const entry of data) {
    pnlMap.set(entry.date, entry.pnl);
  }

  // Find max absolute value for color scaling
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));

  // Generate last 90 days
  const today = new Date();
  const days: { date: string; dayOfWeek: number; weekIndex: number }[] = [];

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 89);

  // Find the Monday of the start week
  const startDay = startDate.getDay(); // 0=Sun
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  const firstMonday = new Date(startDate);
  firstMonday.setDate(firstMonday.getDate() + mondayOffset);

  let currentDate = new Date(firstMonday);
  let weekIndex = 0;

  while (currentDate <= today) {
    const dayOfWeek = currentDate.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6

    days.push({
      date: currentDate.toISOString().split("T")[0],
      dayOfWeek: adjustedDay,
      weekIndex,
    });

    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate.getDay() === 1 || (currentDate.getDay() === 0 && adjustedDay !== 6)) {
      // Actually, let's simplify
    }
    if (adjustedDay === 6) weekIndex++;
  }

  const numWeeks = weekIndex + 1;
  const width = numWeeks * totalSize + 30;
  const height = 7 * totalSize + 20;

  function getColor(pnl: number | undefined): string {
    if (pnl === undefined) return "rgba(79,70,229,0.05)";
    if (pnl === 0) return "rgba(79,70,229,0.1)";
    const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
    if (pnl > 0) {
      return `rgba(16,185,129,${0.15 + intensity * 0.65})`;
    }
    return `rgba(239,68,68,${0.15 + intensity * 0.65})`;
  }

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: "140px" }}>
        {/* Day labels */}
        {dayLabels.map((label, i) =>
          label ? (
            <text
              key={i}
              x={0}
              y={i * totalSize + cellSize + 16}
              className="text-[9px]"
              fill="#7C8DB0"
            >
              {label}
            </text>
          ) : null
        )}
        {/* Cells */}
        {days.map((day) => {
          const pnl = pnlMap.get(day.date);
          return (
            <rect
              key={day.date}
              x={day.weekIndex * totalSize + 30}
              y={day.dayOfWeek * totalSize + 16}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={getColor(pnl)}
              className="cursor-pointer"
            >
              <title>
                {day.date}: {pnl !== undefined ? `$${pnl.toFixed(2)}` : "No trades"}
              </title>
            </rect>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-[#7C8DB0]">
        <span>Loss</span>
        <div className="flex gap-0.5">
          {[0.8, 0.5, 0.2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ background: `rgba(239,68,68,${i})` }}
            />
          ))}
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(79,70,229,0.1)" }} />
          {[0.2, 0.5, 0.8].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ background: `rgba(16,185,129,${i})` }}
            />
          ))}
        </div>
        <span>Profit</span>
      </div>
    </div>
  );
}
