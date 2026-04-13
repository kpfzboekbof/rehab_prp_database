import Link from "next/link";

import { taipeiDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

const MONTH_NAMES_ZH = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

interface MiniCalendarProps {
  /** Currently-shown month (1-12). */
  year: number;
  month: number;
  /** YYYY-MM-DD of the currently selected call day. */
  selectedDate: string;
  /**
   * Set of Taipei date keys (YYYY-MM-DD) in this month that have at least
   * one pending reminder call. These get a coloured dot under the number.
   */
  busyDays: Set<string>;
}

/**
 * Builds a 6 × 7 grid of Taipei date keys starting from the Sunday on or
 * before the 1st of the month. Same approach as the main month calendar.
 */
function buildGrid(year: number, month: number) {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1, 4, 0, 0));
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
  }).format(firstOfMonth);
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const firstWeekday = weekdayMap[weekdayStr] ?? 0;
  const gridStart = 1 - firstWeekday;

  const cells: Array<{ key: string; day: number; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const dayOffset = gridStart + i;
    const cellDate = new Date(Date.UTC(year, month - 1, dayOffset, 4, 0, 0));
    const key = taipeiDateKey(cellDate);
    const parts = key.split("-");
    const cellYear = Number(parts[0]);
    const cellMonth = Number(parts[1]);
    const cellDay = Number(parts[2]);
    cells.push({
      key,
      day: cellDay,
      inMonth: cellYear === year && cellMonth === month,
    });
  }
  return cells;
}

export function MiniCalendar({
  year,
  month,
  selectedDate,
  busyDays,
}: MiniCalendarProps) {
  const cells = buildGrid(year, month);

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const todayKey = taipeiDateKey(new Date());

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={{
            pathname: "/reminders",
            query: { year: prevYear, month: prevMonth, date: selectedDate },
          }}
          className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
          aria-label="上個月"
        >
          ‹
        </Link>
        <div className="text-sm font-medium text-neutral-900">
          {year} 年 {MONTH_NAMES_ZH[month - 1]}
        </div>
        <Link
          href={{
            pathname: "/reminders",
            query: { year: nextYear, month: nextMonth, date: selectedDate },
          }}
          className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
          aria-label="下個月"
        >
          ›
        </Link>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-neutral-500">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "py-1",
              i === 0 && "text-red-500",
              i === 6 && "text-blue-500",
            )}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          const isSelected = cell.key === selectedDate;
          const isToday = cell.key === todayKey;
          const isBusy = busyDays.has(cell.key);
          const isSunday = i % 7 === 0;
          const isSaturday = i % 7 === 6;

          return (
            <Link
              key={cell.key + "-" + i}
              href={{
                pathname: "/reminders",
                query: { year, month, date: cell.key },
              }}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded text-sm transition-colors",
                cell.inMonth
                  ? "text-neutral-900 hover:bg-neutral-100"
                  : "text-neutral-300 hover:bg-neutral-50",
                isSunday && cell.inMonth && !isSelected && "text-red-500",
                isSaturday && cell.inMonth && !isSelected && "text-blue-500",
                isToday && !isSelected && "ring-1 ring-neutral-400 ring-inset",
                isSelected && "bg-[#1D697C] text-white hover:bg-[#1D697C]",
              )}
            >
              <span>{cell.day}</span>
              {isBusy && !isSelected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#1D697C]" />
              )}
              {isBusy && isSelected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 border-t border-neutral-100 pt-2 text-[10px] text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-[#1D697C]" />
          <span>該日有待電訪</span>
        </div>
      </div>
    </div>
  );
}
